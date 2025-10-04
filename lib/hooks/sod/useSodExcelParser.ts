/**
 * Hook pour parser les fichiers Excel SoD de manière asynchrone via Web Worker
 */

import { useState, useCallback, useRef } from 'react';
import { SodRawRecord } from 'lib/types/sodAnalysis';

export interface ParseProgress {
  progress: number; // 0-100
  message: string;
}

export interface UseSodExcelParserReturn {
  parsing: boolean;
  progress: ParseProgress | null;
  error: string | null;
  parsedData: SodRawRecord[] | null;
  parseFile: (file: File) => Promise<void>;
  cancelParsing: () => void;
  reset: () => void;
}

export function useSodExcelParser(): UseSodExcelParserReturn {
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<SodRawRecord[] | null>(null);
  
  const workerRef = useRef<Worker | null>(null);

  /**
   * Parse un fichier Excel
   */
  const parseFile = useCallback(async (file: File) => {
    setParsing(true);
    setProgress({ progress: 0, message: 'Initialisation...' });
    setError(null);
    setParsedData(null);

    try {
      // Lire le fichier en ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Créer le Web Worker
      workerRef.current = new Worker('/workers/sodParsingWorker.js');

      // Écouter les messages du worker
      workerRef.current.onmessage = (event) => {
        const { type, progress: prog, message, data, error: err } = event.data;

        switch (type) {
          case 'PROGRESS':
            setProgress({ progress: prog, message });
            break;

          case 'COMPLETE':
            setParsedData(data as SodRawRecord[]);
            setParsing(false);
            setProgress({ progress: 100, message: 'Terminé !' });
            // Nettoyer le worker
            if (workerRef.current) {
              workerRef.current.terminate();
              workerRef.current = null;
            }
            break;

          case 'ERROR':
            setError(err || 'Erreur lors du parsing');
            setParsing(false);
            // Nettoyer le worker
            if (workerRef.current) {
              workerRef.current.terminate();
              workerRef.current = null;
            }
            break;

          case 'CANCELLED':
            setParsing(false);
            setProgress(null);
            break;
        }
      };

      // Gérer les erreurs du worker
      workerRef.current.onerror = (err) => {
        console.error('Worker error:', err);
        setError('Erreur du Web Worker');
        setParsing(false);
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      };

      // Envoyer le fichier au worker
      workerRef.current.postMessage({
        type: 'PARSE_FILE',
        payload: {
          arrayBuffer,
          chunkSize: 10000, // 10k lignes par chunk
        },
      });
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du parsing');
      setParsing(false);
    }
  }, []);

  /**
   * Annuler le parsing en cours
   */
  const cancelParsing = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setParsing(false);
    setProgress(null);
  }, []);

  /**
   * Réinitialiser l'état
   */
  const reset = useCallback(() => {
    cancelParsing();
    setError(null);
    setParsedData(null);
    setProgress(null);
  }, [cancelParsing]);

  return {
    parsing,
    progress,
    error,
    parsedData,
    parseFile,
    cancelParsing,
    reset,
  };
}

