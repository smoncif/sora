import { useEffect, useRef, useCallback } from 'react';
import { RoleMetrics } from 'lib/types/roleAnalysis';

type WorkerResponse = {
  type: string;
  success: boolean;
  data?: any;
  error?: string;
};

type UseRoleAnalysisWorkerReturn = {
  sortData: (data: RoleMetrics[], sortBy: keyof RoleMetrics, sortDirection: 'asc' | 'desc') => Promise<RoleMetrics[]>;
  filterData: (data: RoleMetrics[], searchTerm: string) => Promise<RoleMetrics[]>;
  processMetrics: (data: RoleMetrics[]) => Promise<{
    totalRoles: number;
    averageScores: {
      coverage: number;
      quality: number;
      security: number;
      overall: number;
    };
    distributions: {
      scores: number[];
      transactions: number[];
    };
  }>;
};

export const useRoleAnalysisWorker = (): UseRoleAnalysisWorkerReturn => {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialisation du worker
    workerRef.current = new Worker(new URL('../workers/roleAnalysisWorker.ts', import.meta.url));

    return () => {
      // Nettoyage du worker
      workerRef.current?.terminate();
    };
  }, []);

  const executeWorkerTask = useCallback(<T>(type: string, payload: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker non initialisé'));
        return;
      }

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const { type: responseType, success, data, error } = event.data;

        if (responseType === type) {
          workerRef.current?.removeEventListener('message', handleMessage);
          
          if (success) {
            resolve(data as T);
          } else {
            reject(new Error(error || 'Une erreur est survenue'));
          }
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type, payload });
    });
  }, []);

  const sortData = useCallback(
    (data: RoleMetrics[], sortBy: keyof RoleMetrics, sortDirection: 'asc' | 'desc') => {
      return executeWorkerTask<RoleMetrics[]>('SORT_DATA', { data, sortBy, sortDirection });
    },
    [executeWorkerTask]
  );

  const filterData = useCallback(
    (data: RoleMetrics[], searchTerm: string) => {
      return executeWorkerTask<RoleMetrics[]>('FILTER_DATA', { data, searchTerm });
    },
    [executeWorkerTask]
  );

  const processMetrics = useCallback(
    (data: RoleMetrics[]) => {
      return executeWorkerTask<{
        totalRoles: number;
        averageScores: {
          coverage: number;
          quality: number;
          security: number;
          overall: number;
        };
        distributions: {
          scores: number[];
          transactions: number[];
        };
      }>('PROCESS_METRICS', { data });
    },
    [executeWorkerTask]
  );

  return {
    sortData,
    filterData,
    processMetrics
  };
}; 

