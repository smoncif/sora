/**
 * Service pour générer la fiche de poste via webhook N8N
 */

import { SimpleRoleTransaction } from 'lib/types/roleAnalysis';

/**
 * Type de rôle (AFFICHAGE ou CREATION)
 */
export type RoleType = 'AFFICHAGE' | 'CREATION';

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
 * - Si le rôle contient ":M:" ou ":G:" → CREATION
 */
function determineRoleType(roleId: string): RoleType {
  const roleIdUpper = roleId.toUpperCase();
  
  if (roleIdUpper.includes(':D:') || roleIdUpper.includes(':A:')) {
    return 'AFFICHAGE';
  }
  
  if (roleIdUpper.includes(':M:') || roleIdUpper.includes(':G:')) {
    return 'CREATION';
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
 * TEST : Envoie des données de test minimales au webhook N8N
 * Utilisé pour déboguer les problèmes de connexion CORS
 */
export async function testWebhookConnection(): Promise<void> {
  const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook/generate-job-description';
  
  console.log('🧪 Test du webhook N8N avec données minimales: {test: 1}');
  
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({test: 1})
  })
    .then(async response => {
      console.log('📥 Réponse reçue:', response.status, response.statusText);
      console.log('📋 Headers:', response.headers);
      
      // Lire le contenu comme texte d'abord
      const text = await response.text();
      console.log('📄 Contenu brut de la réponse:', text);
      
      // Essayer de parser comme JSON
      try {
        const data = JSON.parse(text);
        console.log('✅ Données JSON:', data);
        alert('✅ Test réussi ! Vérifiez la console pour les détails.');
      } catch (jsonError) {
        console.log('⚠️ La réponse n\'est pas du JSON valide');
        alert('⚠️ La réponse n\'est pas du JSON. Vérifiez la console pour le contenu.');
      }
    })
    .catch(error => {
      console.error('❌ Erreur lors du test:', error);
      alert(`❌ Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      throw error;
    });
}

/**
 * Envoie le payload au webhook N8N directement depuis le navigateur
 * 
 * Note: L'appel direct fonctionne car N8N doit autoriser les requêtes CORS
 * Depuis le navigateur, le certificat auto-signé du tunnel est accepté
 * 
 * @param payload Le payload JSON à envoyer
 * @returns La réponse du webhook
 */
export async function sendJobDescriptionToWebhook(
  payload: JobDescriptionPayload
): Promise<Response> {
  const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook/generate-job-description';
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'envoi au webhook: ${error.message}`);
    }
    throw error;
  }
}

