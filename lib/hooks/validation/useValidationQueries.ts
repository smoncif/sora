'use client';

import { useQuery, useQueryClient, QueryKey, useMutation } from '@tanstack/react-query';
import type { TransactionSortField, SortDirection } from 'lib/components/validation/TransactionTableView/TransactionTableView';
import type { SubmitValidationParams, ValidationResult } from 'lib/services/validation/validationLinkService';
import type { TransactionPreview } from 'lib/types/sapModule';

const BASE_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...BASE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Validation API error (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (!payload?.success) {
    throw new Error(payload?.error ?? 'Validation API unknown error');
  }

  return payload.data as T;
}

export interface ValidationLinkResponse {
  token: string;
  businessRoles: string[];
  selectedRoles: Record<string, string[]>;
  technicalViewEnabled: boolean;
  expiresAt: string;
  payload: any;
}

export type SubmittedProcessesResponse = string[];

export interface ProcessResultsResponse {
  roleId: string;
  roleName: string;
  businessRole: string;
  isApproved: boolean | null;
  comment?: string;
  transactionValidations?: {
    transactionCode: string;
    isApproved: boolean | null;
    comment?: string;
  }[];
}

export interface ProcessDraftResponse {
  results: ValidationResult[];
  validatorName?: string;
  validatorEmail?: string;
  updatedAt?: string;
}

interface ValidationLinkQueryOptions {
  initialData?: ValidationLinkResponse;
}

export function useValidationLinkQuery(
  token: string | undefined,
  options: ValidationLinkQueryOptions = {}
) {
  return useQuery({
    queryKey: ['validation', token] satisfies QueryKey,
    queryFn: async () => {
      if (!token) {
        throw new Error('Token manquant pour la validation');
      }
      return fetchJson<ValidationLinkResponse>(`/api/validation/${token}`);
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    initialData: options.initialData,
  });
}

interface SubmittedProcessesQueryOptions {
  initialData?: SubmittedProcessesResponse;
}

export function useSubmittedProcessesQuery(
  token: string | undefined,
  options: SubmittedProcessesQueryOptions = {}
) {
  return useQuery({
    queryKey: ['validation', token, 'submitted-processes'] satisfies QueryKey,
    queryFn: async () => {
      if (!token) {
        throw new Error('Token manquant pour la récupération des processus');
      }
      return fetchJson<SubmittedProcessesResponse>(`/api/validation/submitted-processes/${token}`);
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    initialData: options.initialData,
  });
}

export function useProcessResultsQuery(
  token: string | undefined,
  processName: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const enabled = Boolean(token && processName && options.enabled !== false);

  return useQuery({
    queryKey: ['validation', token, 'process-results', processName] satisfies QueryKey,
    queryFn: async () => {
      if (!token || !processName) {
        throw new Error('Token ou nom de processus manquant');
      }
      return fetchJson<ProcessResultsResponse[]>(
        `/api/validation/results/${token}/${encodeURIComponent(processName)}`
      );
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrefetchProcessResults() {
  const queryClient = useQueryClient();

  return async (token: string, processName: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['validation', token, 'process-results', processName] satisfies QueryKey,
      queryFn: () =>
        fetchJson<ProcessResultsResponse[]>(
          `/api/validation/results/${token}/${encodeURIComponent(processName)}`
        ),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export interface RoleTransactionsChunkResponse {
  transactions: TransactionPreview[];
  nextOffset: number;
  hasMore: boolean;
  totalTransactions: number;
  previewCount: number;
  sortedCodes?: string[];
}

export async function fetchRoleTransactionsChunk(
  token: string,
  businessRole: string,
  roleId: string,
  offset: number,
  limit: number,
  includePreview = false,
  sortField: TransactionSortField = 'transaction',
  sortDirection: SortDirection = 'asc'
): Promise<RoleTransactionsChunkResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sortField,
    sortDirection,
  });

  if (includePreview) {
    params.set('includePreview', 'true');
  }

  return fetchJson<RoleTransactionsChunkResponse>(
    `/api/validation/transactions/${token}/${encodeURIComponent(
      businessRole
    )}/${encodeURIComponent(roleId)}?${params.toString()}`
  );
}

export function useProcessDraftQuery(
  token: string | undefined,
  processName: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const enabled = Boolean(token && processName && options.enabled !== false);

  return useQuery({
    queryKey: ['validation', token, 'process-draft', processName] satisfies QueryKey,
    queryFn: async () => {
      if (!token || !processName) {
        throw new Error('Token ou nom de processus manquant');
      }
      return fetchJson<ProcessDraftResponse | null>(
        `/api/validation/drafts/${token}/${encodeURIComponent(processName)}`
      );
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveValidationDraftMutation(token: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: Omit<SubmitValidationParams, 'token'>) => {
      if (!token) {
        throw new Error('Token manquant pour la sauvegarde du brouillon');
      }
      return fetchJson<ProcessDraftResponse>('/api/validation/save-draft', {
        method: 'POST',
        body: JSON.stringify({ ...params, token }),
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['validation', token, 'process-draft', variables.process ?? 'Non assigné'],
      });
    },
  });
}
