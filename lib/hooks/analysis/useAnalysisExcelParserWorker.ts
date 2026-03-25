import { useCallback, useRef, useState } from 'react';
import type { BusinessRoleTransaction, SimpleRoleTransaction } from 'lib/types/roleAnalysis';

type AnalysisFileType = 'roles' | 'users';

/** Buffer déjà lu pour éviter un second `file.arrayBuffer()` après la validation (`preReadBuffer` évite le conflit avec `File#arrayBuffer`) */
export type AnalysisParseFileInput =
  | File
  | { preReadBuffer: ArrayBuffer; fileName: string };

export interface AnalysisParserProgress {
  progress: number;
  message: string;
}

export interface AnalysisWorkerParsedData {
  fileType: AnalysisFileType;
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  userAnalysisData: {
    users: { id: string; transactions: string[]; executionCount: number }[];
    businessRoleMappings: { businessRole: string; simpleRole: string }[];
  } | null;
  warnings: string[];
}

interface WorkerProgressMessage {
  type: 'PROGRESS';
  progress: number;
  message: string;
}

interface WorkerCompleteMessage {
  type: 'COMPLETE';
  data: AnalysisWorkerParsedData;
}

interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
}

interface WorkerCancelledMessage {
  type: 'CANCELLED';
}

type WorkerResponse =
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage
  | WorkerCancelledMessage;

export interface UseAnalysisExcelParserWorkerReturn {
  parsing: boolean;
  progress: AnalysisParserProgress | null;
  error: string | null;
  parseFile: (
    input: AnalysisParseFileInput,
    fileType: AnalysisFileType
  ) => Promise<AnalysisWorkerParsedData>;
  cancelParsing: () => void;
  reset: () => void;
}

export function useAnalysisExcelParserWorker(): UseAnalysisExcelParserWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<AnalysisParserProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Timings pour comprendre les lenteurs "Parsing terminé" (souvent causées par le transfert payload)
  const runIdRef = useRef(0);
  const startAtRef = useRef<number>(0);
  const progress100AtRef = useRef<number | null>(null);

  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const cancelParsing = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL' });
      cleanupWorker();
    }
    setParsing(false);
    setProgress(null);
  }, [cleanupWorker]);

  const reset = useCallback(() => {
    cancelParsing();
    setError(null);
  }, [cancelParsing]);

  const parseFile = useCallback(
    (
      input: AnalysisParseFileInput,
      fileType: AnalysisFileType
    ): Promise<AnalysisWorkerParsedData> => {
      runIdRef.current += 1;
      const runId = runIdRef.current;
      startAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      progress100AtRef.current = null;

      setParsing(true);
      setError(null);
      setProgress({ progress: 10, message: 'Préparation du parsing...' });

      return new Promise((resolve, reject) => {
        try {
          const worker = new Worker(
            new URL('../../workers/analysisParsing.worker.ts', import.meta.url)
          );
          workerRef.current = worker;

          worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const message = event.data;

            if (message.type === 'PROGRESS') {
              if (message.progress === 100) {
                progress100AtRef.current =
                  typeof performance !== 'undefined' ? performance.now() : Date.now();
                console.log(
                  `📥 [AnalysisParser][run ${runId}] PROGRESS 100 reçu (fileType=${fileType})`,
                  { progressMessage: message.message }
                );
              }

              setProgress({ progress: message.progress, message: message.message });
              return;
            }

            if (message.type === 'COMPLETE') {
              const nowAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
              const startMs = nowAt - startAtRef.current;
              const delta100ToComplete =
                progress100AtRef.current != null ? nowAt - progress100AtRef.current : null;

              console.log(
                `✅ [AnalysisParser][run ${runId}] COMPLETE reçu`,
                {
                  fileType,
                  totalMs: Math.round(startMs),
                  delta100ToCompleteMs:
                    delta100ToComplete == null ? null : Math.round(delta100ToComplete),
                  payload: {
                    businessRoleTransactions: message.data.businessRoleTransactions.length,
                    simpleRoleTransactions: message.data.simpleRoleTransactions.length,
                    userCount: message.data.userAnalysisData?.users.length ?? null,
                  },
                }
              );

              setParsing(false);
              setProgress({ progress: 100, message: 'Parsing terminé' });
              cleanupWorker();
              resolve(message.data);
              return;
            }

            if (message.type === 'CANCELLED') {
              console.log(`🛑 [AnalysisParser][run ${runId}] CANCELLED`);
              setParsing(false);
              setProgress(null);
              progress100AtRef.current = null;
              cleanupWorker();
              reject(new Error('Parsing annulé'));
              return;
            }

            if (message.type === 'ERROR') {
              console.log(`❌ [AnalysisParser][run ${runId}] ERROR`, { error: message.error });
              setParsing(false);
              setProgress(null);
              progress100AtRef.current = null;
              setError(message.error);
              cleanupWorker();
              reject(new Error(message.error));
            }
          };

          worker.onerror = () => {
            const workerError = 'Erreur du worker de parsing Analysis';
            console.log(`❌ [AnalysisParser][run ${runId}] worker.onerror`, { workerError });
            setParsing(false);
            setProgress(null);
            setError(workerError);
            progress100AtRef.current = null;
            cleanupWorker();
            reject(new Error(workerError));
          };

          const postPayload = (arrayBuffer: ArrayBuffer, fileName: string) => {
            worker.postMessage({
              type: 'PARSE_FILE',
              payload: {
                arrayBuffer,
                fileName,
                fileType,
              },
            });
          };

          if (!(input instanceof File)) {
            postPayload(input.preReadBuffer, input.fileName);
          } else {
            input
              .arrayBuffer()
              .then((arrayBuffer) => postPayload(arrayBuffer, input.name))
              .catch((readError) => {
                const message =
                  readError instanceof Error
                    ? readError.message
                    : 'Erreur de lecture du fichier';
                setParsing(false);
                setProgress(null);
                setError(message);
                progress100AtRef.current = null;
                cleanupWorker();
                reject(new Error(message));
              });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Erreur inconnue du parser worker';
          setParsing(false);
          setProgress(null);
          setError(message);
          progress100AtRef.current = null;
          cleanupWorker();
          reject(new Error(message));
        }
      });
    },
    [cleanupWorker]
  );

  return {
    parsing,
    progress,
    error,
    parseFile,
    cancelParsing,
    reset,
  };
}
