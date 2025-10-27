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
 * Envoie le payload au webhook N8N via l'API Next.js (proxy pour éviter CORS)
 * 
 * @param payload Le payload JSON à envoyer
 * @returns La réponse du webhook
 */
export async function sendJobDescriptionToWebhook(
  payload: JobDescriptionPayload
): Promise<any> {
  try {
    // Appeler notre route API Next.js qui fait le proxy vers N8N
    const response = await fetch('/api/job-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de l'envoi au webhook: ${error.message}`);
    }
    throw error;
  }
}

