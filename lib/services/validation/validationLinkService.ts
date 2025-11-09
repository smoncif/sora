/**
 * Service de gestion des liens de validation de rôles
 * Supporte les multi-rôles métier (v1.1)
 */

import { createClient } from 'lib/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Paramètres pour créer un lien de validation (multi-rôles)
 */
export interface CreateValidationLinkParams {
  businessRoles: string[];                        // Array des rôles métier (peut être plusieurs)
  selectedRoles: Record<string, string[]>;        // Map {businessRole: [simpleRoles]}
  expirationDate: Date;
  enableTechnicalView: boolean;
  payload: any;                                    // Données complètes pour reconstruction
  createdBy: string;
}

/**
 * Données d'un lien de validation
 */
export interface ValidationLinkData {
  token: string;
  businessRoles: string[];
  selectedRoles: Record<string, string[]>;
  technicalViewEnabled: boolean;
  expiresAt: Date;
  payload: any;
}

export interface GetValidationLinkDataOptions {
  includeFullTransactions?: boolean;
}

/**
 * Paramètres pour soumettre une validation
 */
export interface SubmitValidationParams {
  token: string;
  process?: string;         // 🆕 Processus métier concerné
  results: ValidationResult[];
  validatorInfo?: {
    email?: string;
    name?: string;
  };
}

/**
 * Résultat de validation d'une transaction
 */
export interface TransactionValidationResult {
  transactionCode: string;
  isApproved: boolean | null;                     // true = validé, false = refusé, null = en attente
  comment?: string;
}

/**
 * Résultat de validation d'un rôle simple
 */
export interface ValidationResult {
  roleId: string;
  roleName: string;
  businessRole: string;                           // Rôle métier associé
  isApproved: boolean | null;                     // true = validé, false = refusé, null = en attente
  comment: string;                                // Optionnel (pas de validation requise)
  transactionValidations?: TransactionValidationResult[];  // Validations par transaction (mode technique)
}

export interface ValidationDraft {
  results: ValidationResult[];
  validatorName?: string;
  validatorEmail?: string;
  updatedAt?: string;
}

/**
 * Crée un nouveau lien de validation pour plusieurs rôles métier
 */
export async function createValidationLink(
  params: CreateValidationLinkParams
): Promise<{ token: string; link: string }> {
  const supabase = await createClient();
  const token = uuidv4();
  
  // Validation des paramètres
  if (!params.businessRoles || params.businessRoles.length === 0) {
    throw new Error('Au moins un rôle métier est requis');
  }
  
  if (!params.selectedRoles || Object.keys(params.selectedRoles).length === 0) {
    throw new Error('Au moins un rôle simple sélectionné est requis');
  }
  
  if (params.expirationDate <= new Date()) {
    throw new Error('La date d\'expiration doit être dans le futur');
  }
  
  const { data, error } = await supabase
    .from('role_validation_links')
    .insert({
      token,
      business_roles: params.businessRoles,
      selected_roles: params.selectedRoles,
      technical_view_enabled: params.enableTechnicalView,
      expires_at: params.expirationDate.toISOString(),
      payload: params.payload,
      created_by: params.createdBy,
      status: 'active',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[validationLinkService] Erreur création lien:', error);
    throw new Error('Impossible de créer le lien de validation');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/validation/${token}`;
  
  return { token, link };
}

/**
 * Récupère les données d'un lien de validation par son token
 */
export async function getValidationLinkData(
  token: string,
  options: GetValidationLinkDataOptions = {}
): Promise<ValidationLinkData | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('role_validation_links')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Vérifier expiration
  if (new Date(data.expires_at) < new Date()) {
    // Marquer comme expiré
    await supabase
      .from('role_validation_links')
      .update({ status: 'expired' })
      .eq('id', data.id);
    
    return null;
  }
  
  const rawPayload = data.payload ?? {};
  const payload = options.includeFullTransactions
    ? rawPayload
    : sanitizeValidationPayload(rawPayload);

  return {
    token: data.token,
    businessRoles: data.business_roles as string[],
    selectedRoles: data.selected_roles as Record<string, string[]>,
    technicalViewEnabled: data.technical_view_enabled,
    expiresAt: new Date(data.expires_at),
    payload,
  };
}

function sanitizeValidationPayload(payload: any) {
  if (!payload?.selectedRolesData) {
    return payload;
  }

  const sanitizedSelectedRolesData: Record<string, any[]> = {};

  Object.entries(payload.selectedRolesData).forEach(([businessRole, roles]) => {
    sanitizedSelectedRolesData[businessRole] = (roles as any[]).map((role) => {
      const {
        remainingTransactions = [],
        previewTransactions = [],
        totalTransactions,
        remainingTransactionCount,
        ...rest
      } = role ?? {};

      const preview = Array.isArray(previewTransactions)
        ? previewTransactions
        : [];
      const remaining = Array.isArray(remainingTransactions)
        ? remainingTransactions
        : [];
      const total =
        typeof totalTransactions === 'number'
          ? totalTransactions
          : preview.length + remaining.length;
      const remainingCount =
        typeof remainingTransactionCount === 'number'
          ? remainingTransactionCount
          : Math.max(total - preview.length, 0);

      return {
        ...rest,
        previewTransactions: preview,
        totalTransactions: total,
        remainingTransactionCount: remainingCount,
      };
    });
  });

  return {
    ...payload,
    selectedRolesData: sanitizedSelectedRolesData,
  };
}

/**
 * Soumet les résultats de validation
 */
export async function submitValidationResults(
  params: SubmitValidationParams
): Promise<void> {
  const supabase = await createClient();
  
  // Validation des paramètres
  if (!params.results || params.results.length === 0) {
    throw new Error('Au moins une validation est requise');
  }
  
  // Récupérer le lien
  const { data: linkData, error: linkError } = await supabase
    .from('role_validation_links')
    .select('id, status, expires_at')
    .eq('token', params.token)
    .single();
  
  if (linkError || !linkData) {
    throw new Error('Lien de validation introuvable');
  }
  
  // Vérifier que le lien n'est pas expiré
  if (new Date(linkData.expires_at) < new Date()) {
    throw new Error('Ce lien de validation a expiré');
  }
  
  // Vérifier que le lien n'est pas déjà complété (optionnel - permet plusieurs validations)
  // if (linkData.status === 'completed') {
  //   throw new Error('Ce lien a déjà été validé');
  // }
  
  // Insérer les résultats
  const { error: resultsError } = await supabase
    .from('role_validation_results')
    .insert({
      link_id: linkData.id,
      process: params.process || 'Non assigné', // 🆕 Processus
      validator_email: params.validatorInfo?.email,
      validator_name: params.validatorInfo?.name,
      results: params.results,
    });
  
  if (resultsError) {
    console.error('[validationLinkService] Erreur soumission résultats:', resultsError);
    console.error('[validationLinkService] Code erreur:', resultsError.code);
    console.error('[validationLinkService] Message:', resultsError.message);
    console.error('[validationLinkService] Détails:', resultsError.details);
    throw new Error(`Impossible de soumettre les résultats: ${resultsError.message || resultsError.code}`);
  }

  // Supprimer le brouillon éventuel pour ce processus
  await supabase
    .from('role_validation_drafts')
    .delete()
    .eq('link_id', linkData.id)
    .eq('process', params.process || 'Non assigné');
}

/**
 * Récupère tous les liens d'un utilisateur
 */
export async function getUserValidationLinks(
  userId: string
): Promise<any[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('role_validation_links')
    .select(`
      id,
      token,
      business_roles,
      created_at,
      expires_at,
      status,
      role_validation_results (
        id,
        submitted_at,
        validator_email,
        validator_name
      )
    `)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[validationLinkService] Erreur récupération liens:', error);
    throw new Error('Impossible de récupérer les liens de validation');
  }
  
  return data || [];
}

/**
 * Récupère les résultats de validation pour un lien spécifique
 */
export async function getValidationResults(
  token: string
): Promise<any[]> {
  const supabase = await createClient();
  
  // Récupérer le lien
  const { data: linkData } = await supabase
    .from('role_validation_links')
    .select('id')
    .eq('token', token)
    .single();
  
  if (!linkData) {
    throw new Error('Lien de validation introuvable');
  }
  
  // Récupérer les résultats
  const { data, error } = await supabase
    .from('role_validation_results')
    .select('*')
    .eq('link_id', linkData.id)
    .order('submitted_at', { ascending: false });
  
  if (error) {
    console.error('[validationLinkService] Erreur récupération résultats:', error);
    throw new Error('Impossible de récupérer les résultats');
  }
  
  return data || [];
}

/**
 * Récupère les résultats de validation pour un processus spécifique
 */
export async function getValidationResultsByProcess(
  token: string,
  process: string
): Promise<ValidationResult[] | null> {
  const supabase = await createClient();
  
  // Récupérer le lien
  const { data: linkData, error: linkError } = await supabase
    .from('role_validation_links')
    .select('id')
    .eq('token', token)
    .single();
  
  if (linkError || !linkData) {
    return null;
  }
  
  // Récupérer les résultats pour ce processus
  const { data, error } = await supabase
    .from('role_validation_results')
    .select('results')
    .eq('link_id', linkData.id)
    .eq('process', process)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  const results = data.results as ValidationResult[];
  return results;
}

/**
 * Récupère le brouillon de validation pour un processus
 */
export async function getValidationDraft(
  token: string,
  process: string
): Promise<ValidationDraft | null> {
  const supabase = await createClient();

  const { data: linkData, error: linkError } = await supabase
    .from('role_validation_links')
    .select('id')
    .eq('token', token)
    .single();

  if (linkError || !linkData) {
    return null;
  }

  const { data, error } = await supabase
    .from('role_validation_drafts')
    .select('results, validator_name, validator_email, updated_at')
    .eq('link_id', linkData.id)
    .eq('process', process)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    results: (data.results as ValidationResult[]) ?? [],
    validatorName: data.validator_name ?? undefined,
    validatorEmail: data.validator_email ?? undefined,
    updatedAt: data.updated_at ?? undefined,
  };
}

/**
 * Sauvegarde ou met à jour un brouillon de validation
 */
export async function saveValidationDraft(
  params: SubmitValidationParams
): Promise<ValidationDraft> {
  const supabase = await createClient();

  const { data: linkData, error: linkError } = await supabase
    .from('role_validation_links')
    .select('id, expires_at')
    .eq('token', params.token)
    .single();

  if (linkError || !linkData) {
    throw new Error('Lien de validation introuvable');
  }

  if (new Date(linkData.expires_at) < new Date()) {
    throw new Error('Ce lien de validation a expiré');
  }

  const payload = {
    link_id: linkData.id,
    process: params.process || 'Non assigné',
    results: params.results ?? [],
    validator_name: params.validatorInfo?.name ?? null,
    validator_email: params.validatorInfo?.email ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('role_validation_drafts')
    .upsert(payload, { onConflict: 'link_id,process' })
    .select('results, validator_name, validator_email, updated_at')
    .single();

  if (error || !data) {
    console.error('[validationLinkService] Erreur sauvegarde brouillon:', error);
    throw new Error('Impossible de sauvegarder le brouillon');
  }

  return {
    results: (data.results as ValidationResult[]) ?? [],
    validatorName: data.validator_name ?? undefined,
    validatorEmail: data.validator_email ?? undefined,
    updatedAt: data.updated_at ?? undefined,
  };
}

