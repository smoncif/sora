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
 * Envoie le payload au webhook N8N directement depuis le navigateur
 * 
 * Note: L'appel direct fonctionne car N8N doit autoriser les requêtes CORS
 * Depuis le navigateur, le certificat auto-signé du tunnel est accepté
 * 
 * @param payload Le payload JSON à envoyer
 * @returns La réponse JSON parsée du webhook
 */
export async function sendJobDescriptionToWebhook(
  payload: JobDescriptionPayload
): Promise<JobDescriptionWebhookResponse> {
  const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook/generate-job-description';
  
  // 🔍 LOG 1: Début de l'appel webhook
  console.log('🚀 [WEBHOOK] Début de l\'appel au webhook N8N');
  console.log('📍 [WEBHOOK] URL:', WEBHOOK_URL);
  console.log('📦 [WEBHOOK] Payload:', JSON.stringify(payload, null, 2));
  
  try {
    // 🔍 LOG 2: Avant le fetch
    console.log('⏳ [WEBHOOK] Envoi de la requête fetch...');
    const startTime = Date.now();
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const fetchDuration = Date.now() - startTime;
    
    // 🔍 LOG 3: Réponse reçue
    console.log(`✅ [WEBHOOK] Réponse reçue en ${fetchDuration}ms`);
    console.log('📊 [WEBHOOK] Status:', response.status, response.statusText);
    console.log('📋 [WEBHOOK] Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    
    // 🔍 LOG 4: Corps de la réponse
    console.log('📄 [WEBHOOK] Réponse brute (premiers 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      console.error('❌ [WEBHOOK] Réponse HTTP non-OK:', response.status, response.statusText);
      console.error('📄 [WEBHOOK] Corps complet de l\'erreur:', responseText);
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    // Parser la réponse JSON
    try {
      console.log('🔄 [WEBHOOK] Parsing de la réponse JSON...');
      const jsonResponse: JobDescriptionWebhookResponse = JSON.parse(responseText);
      console.log('✅ [WEBHOOK] JSON parsé avec succès');
      console.log('📊 [WEBHOOK] Réponse:', jsonResponse);
      return jsonResponse;
    } catch (parseError) {
      console.error('❌ [WEBHOOK] Erreur de parsing JSON:', parseError);
      console.error('📄 [WEBHOOK] Texte qui a causé l\'erreur:', responseText);
      throw new Error(`Erreur lors du parsing de la réponse JSON: ${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}`);
    }
  } catch (error) {
    // 🔍 LOG 5: Erreur détaillée
    console.error('❌ [WEBHOOK] Erreur lors de l\'envoi au webhook');
    console.error('🔍 [WEBHOOK] Type d\'erreur:', error instanceof TypeError ? 'TypeError (Network/CORS/SSL)' : error instanceof Error ? error.constructor.name : typeof error);
    console.error('📝 [WEBHOOK] Message:', error instanceof Error ? error.message : String(error));
    console.error('🔍 [WEBHOOK] Stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Détection spécifique des erreurs SSL/Network
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('🔒 [WEBHOOK] Erreur "Failed to fetch" détectée - Causes possibles:');
      console.error('   1. Problème SSL/Certificat');
      console.error('   2. Serveur N8N inaccessible');
      console.error('   3. Problème CORS');
      console.error('   4. Pas de connexion Internet');
      console.error('💡 [WEBHOOK] Vérifiez que le serveur N8N est accessible:', WEBHOOK_URL);
    }
    
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'envoi au webhook: ${error.message}`);
    }
    throw error;
  }
}

