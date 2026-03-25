import { parseExcelFile } from '../services/role/simplifiedAnalysisService';
import {
  parseUserExcelFile,
  transformUserDataToAnalysisFormat,
} from '../services/analysis/userAnalysisParsingService';
import type { BusinessRoleTransaction, SimpleRoleTransaction } from '../types/roleAnalysis';

type AnalysisFileType = 'roles' | 'users';

interface ParseFilePayload {
  arrayBuffer: ArrayBuffer;
  fileName: string;
  fileType: AnalysisFileType;
}

interface ParseCompletePayload {
  fileType: AnalysisFileType;
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  userAnalysisData: {
    users: { id: string; transactions: string[]; executionCount: number }[];
    businessRoleMappings: { businessRole: string; simpleRole: string }[];
  } | null;
  warnings: string[];
}

let cancelled = false;

const postProgress = (progress: number, message: string) => {
  (self as unknown as Worker).postMessage({
    type: 'PROGRESS',
    progress,
    message,
  });
};

const postError = (message: string) => {
  (self as unknown as Worker).postMessage({
    type: 'ERROR',
    error: message,
  });
};

const parseInWorker = async (payload: ParseFilePayload) => {
  const tStart = Date.now();
  cancelled = false;

  const file = new File([payload.arrayBuffer], payload.fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  postProgress(20, 'Initialisation du parser...');
  if (cancelled) return;

  if (payload.fileType === 'users') {
    postProgress(45, 'Parsing du fichier utilisateurs...');
    const parsed = await parseUserExcelFile(file, {
      maxFileSize: 50 * 1024 * 1024,
    });
    if (cancelled) return;

    postProgress(70, 'Transformation des données utilisateurs...');
    const transformed = transformUserDataToAnalysisFormat(parsed);
    if (cancelled) return;

    console.log(`📦 [AnalysisWorker] users parsed in ${Date.now() - tStart}ms`, {
      warnings: parsed.warnings.length,
      userCount: transformed.userAnalysisData?.users.length ?? 0,
    });

    const completePayload: ParseCompletePayload = {
      fileType: 'users',
      businessRoleTransactions: transformed.businessRoleTransactions,
      simpleRoleTransactions: transformed.simpleRoleTransactions,
      userAnalysisData: transformed.userAnalysisData,
      warnings: parsed.warnings,
    };

    postProgress(100, 'Parsing terminé');
    console.log(
      `➡️ [AnalysisWorker] users COMPLETE posted (payload sizes)`,
      {
        businessRoleTransactions: completePayload.businessRoleTransactions.length,
        simpleRoleTransactions: completePayload.simpleRoleTransactions.length,
        userCount: completePayload.userAnalysisData?.users.length ?? 0,
      }
    );
    (self as unknown as Worker).postMessage({
      type: 'COMPLETE',
      data: completePayload,
    });
    return;
  }

  postProgress(45, 'Parsing du fichier rôles...');
  const parsed = await parseExcelFile(file, {
    maxFileSize: 50 * 1024 * 1024,
  });
  if (cancelled) return;

  console.log(`📦 [AnalysisWorker] roles parsed in ${Date.now() - tStart}ms`, {
    warnings: parsed.warnings.length,
  });

  const completePayload: ParseCompletePayload = {
    fileType: 'roles',
    businessRoleTransactions: parsed.businessRoleTransactions,
    simpleRoleTransactions: parsed.simpleRoleTransactions,
    userAnalysisData: null,
    warnings: parsed.warnings,
  };

  postProgress(100, 'Parsing terminé');
  console.log(
    `➡️ [AnalysisWorker] roles COMPLETE posted (payload sizes)`,
    {
      businessRoleTransactions: completePayload.businessRoleTransactions.length,
      simpleRoleTransactions: completePayload.simpleRoleTransactions.length,
    }
  );
  (self as unknown as Worker).postMessage({
    type: 'COMPLETE',
    data: completePayload,
  });
};

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, payload } = event.data ?? {};

  if (type === 'CANCEL') {
    cancelled = true;
    (self as unknown as Worker).postMessage({ type: 'CANCELLED' });
    return;
  }

  if (type !== 'PARSE_FILE') {
    postError(`Type de message non supporté: ${String(type)}`);
    return;
  }

  try {
    await parseInWorker(payload as ParseFilePayload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur inconnue pendant le parsing';
    postError(message);
  }
});

export {};
