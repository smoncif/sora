/**
 * Service pour générer la fiche de poste via webhook N8N
 */

import { SimpleRoleTransaction } from 'lib/types/roleAnalysis';

/**
 * Type de rôle (AFFICHAGE ou GESTION)
 */
export type RoleType = 'AFFICHAGE' | 'GESTION';

/**
 * Interface pour une transaction dans le JSON final
 */
export interface TransactionPayload {
  code: string;
  description: string;
}

/**
 * Interface pour un rôle dans le JSON final
 */
export interface RolePayload {
  roleId: string;
  roleName: string;
  type: RoleType;
  transactions: TransactionPayload[];
}

/**
 * Interface pour le payload JSON envoyé au webhook N8N
 */
export interface JobDescriptionPayload {
  profileName: string;
  roles: RolePayload[];
}

/**
 * Détermine le type de rôle en fonction de son ID
 * Règles :
 * - Si le rôle contient ":D:" ou ":A:" → AFFICHAGE
 * - Si le rôle contient ":M:" ou ":G:" → GESTION
 */
function determineRoleType(roleId: string): RoleType {
  const roleIdUpper = roleId.toUpperCase();
  
  if (roleIdUpper.includes(':D:') || roleIdUpper.includes(':A:')) {
    return 'AFFICHAGE';
  }
  
  if (roleIdUpper.includes(':M:') || roleIdUpper.includes(':G:')) {
    return 'GESTION';
  }
  
  // Par défaut, si aucun indicateur n'est trouvé, on considère comme AFFICHAGE
  return 'AFFICHAGE';
}

/**
 * Génère le payload JSON pour le webhook N8N à partir des rôles sélectionnés
 * 
 * @param businessRoleName Le nom du rôle métier (profileName)
 * @param selectedRoles Les noms des rôles simples sélectionnés par l'utilisateur
 * @param simpleRoleTransactions Toutes les transactions des rôles simples
 * @returns Le payload JSON formaté
 */
export function generateJobDescriptionPayload(
  businessRoleName: string,
  selectedRoles: Set<string>,
  simpleRoleTransactions: SimpleRoleTransaction[]
): JobDescriptionPayload {
  // Filtrer les transactions pour ne garder que celles des rôles sélectionnés
  const filteredTransactions = simpleRoleTransactions.filter(
    tx => selectedRoles.has(tx.simpleRole)
  );
  
  // Grouper les transactions par rôle simple
  const rolesMap = new Map<string, {
    roleId: string;
    roleName: string;
    transactions: TransactionPayload[];
  }>();
  
  filteredTransactions.forEach(tx => {
    const roleId = tx.simpleRole;
    const roleName = tx.roleDescription || tx.simpleRole;
    
    if (!rolesMap.has(roleId)) {
      rolesMap.set(roleId, {
        roleId,
        roleName,
        transactions: []
      });
    }
    
    const roleData = rolesMap.get(roleId)!;
    roleData.transactions.push({
      code: tx.transaction,
      description: tx.transactionDescription || tx.transaction
    });
  });
  
  // Convertir la Map en tableau de rôles avec le type
  const roles: RolePayload[] = Array.from(rolesMap.values()).map(role => ({
    roleId: role.roleId,
    roleName: role.roleName,
    type: determineRoleType(role.roleId),
    transactions: role.transactions
  }));
  
  return {
    profileName: businessRoleName,
    roles
  };
}

/**
 * Interface pour la réponse JSON du webhook N8N (objet unique)
 */
export interface JobDescriptionWebhookResponse {
  jobDescription: string;
  wordCount: number;
  success: boolean;
  sourceModel: string;
  provider: string;
  createdAt: number; // Timestamp Unix
}

/**
 * Envoie le payload au webhook N8N
 * 
 * Deux modes disponibles:
 * 1. Direct (DIRECT_CALL=true): Appel direct depuis le navigateur (requiert CORS)
 * 2. Proxy (DIRECT_CALL=false, défaut): Passe par l'API Next.js (/api/job-description/generate)
 * 
 * @param payload Le payload JSON à envoyer
 * @returns La réponse JSON parsée du webhook
 */
export async function sendJobDescriptionToWebhook(
  payload: JobDescriptionPayload
): Promise<JobDescriptionWebhookResponse> {
  // Mode d'appel: direct ou via proxy API
  const USE_DIRECT_CALL = false; // Mettre à true pour appeler directement le webhook N8N
  
  const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook/generate-job-description';
  const API_URL = '/api/job-description/generate';
  
  const targetURL = USE_DIRECT_CALL ? WEBHOOK_URL : API_URL;
  const callMode = USE_DIRECT_CALL ? 'DIRECT (navigateur → N8N)' : 'PROXY (navigateur → Next.js → N8N)';
  
  console.log('🚀 [CLIENT] Début de l\'appel au webhook N8N');
  console.log('🔀 [CLIENT] Mode d\'appel:', callMode);
  console.log('📍 [CLIENT] URL cible:', targetURL);
  console.log('📦 [CLIENT] Payload envoyé:', {
    profileName: payload.profileName,
    rolesCount: payload.roles.length,
    roles: payload.roles.map(r => ({
      roleId: r.roleId,
      type: r.type,
      transactionCount: r.transactions.length
    }))
  });
  console.log('📄 [CLIENT] Payload complet (JSON):', JSON.stringify(payload, null, 2));
  
  try {
    console.log('⏳ [CLIENT] Envoi de la requête fetch...');
    const startTime = performance.now();
    
    const response = await fetch(targetURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const fetchDuration = performance.now() - startTime;
    console.log(`⏱️ [CLIENT] Requête fetch terminée en ${fetchDuration.toFixed(2)}ms`);
    console.log('📊 [CLIENT] Status de la réponse:', response.status, response.statusText);
    console.log('📋 [CLIENT] Headers de la réponse:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📝 [CLIENT] Corps de la réponse (text):', responseText);
    
    if (!response.ok) {
      console.error('❌ [CLIENT] Réponse HTTP non-OK:', response.status, response.statusText);
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    // Parser la réponse JSON
    try {
      console.log('🔄 [CLIENT] Parsing de la réponse JSON...');
      const jsonResponse: JobDescriptionWebhookResponse = JSON.parse(responseText);
      console.log('✅ [CLIENT] Réponse JSON parsée avec succès:', {
        success: jsonResponse.success,
        wordCount: jsonResponse.wordCount,
        sourceModel: jsonResponse.sourceModel,
        provider: jsonResponse.provider,
        createdAt: jsonResponse.createdAt,
        descriptionLength: jsonResponse.jobDescription?.length || 0
      });
      console.log('📄 [CLIENT] Description complète:', jsonResponse.jobDescription);
      return jsonResponse;
    } catch (parseError) {
      console.error('❌ [CLIENT] Erreur lors du parsing JSON:', parseError);
      console.error('📝 [CLIENT] Texte qui a causé l\'erreur:', responseText);
      throw new Error(`Erreur lors du parsing de la réponse JSON: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`);
    }
  } catch (error) {
    console.error('❌ [CLIENT] Erreur lors de l\'envoi au webhook:', error);
    console.error('🔍 [CLIENT] Type d\'erreur:', error?.constructor?.name);
    console.error('📝 [CLIENT] Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
    console.error('📚 [CLIENT] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Vérifier si c'est une erreur réseau
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 [CLIENT] Erreur de type réseau détectée - Le serveur N8N est probablement inaccessible');
      console.error('💡 [CLIENT] Vérifications suggérées:');
      console.error('   1. Le serveur N8N est-il démarré ?');
      console.error('   2. L\'URL est-elle correcte ?', WEBHOOK_URL);
      console.error('   3. Y a-t-il un problème CORS ?');
      console.error('   4. Le certificat SSL est-il valide ?');
    }
    
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'envoi au webhook: ${error.message}`);
    }
    throw error;
  }
}

