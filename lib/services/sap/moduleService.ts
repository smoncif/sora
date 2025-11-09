/**
 * Service pour récupérer les modules et transactions SAP depuis Supabase
 */

import { createClient } from 'lib/utils/supabase/client';

export interface TransactionModule {
  transaction: string;
  module: string;
  moduleDescription: string;
  // Hiérarchie complète avec descriptions
  level1Module?: string;
  level1Description?: string;
  level2Module?: string;
  level2Description?: string;
  level3Module?: string;
  level3Description?: string;
}

/**
 * Récupère les modules pour une liste de transactions
 * 
 * @param transactionCodes - Liste des codes de transactions
 * @returns Map des transactions vers leurs modules
 */
export async function getTransactionModules(
  transactionCodes: string[]
): Promise<Map<string, TransactionModule>> {
  const supabase = createClient();
  
  // 🚀 OPTIMISATION : Limiter à 1000 transactions max par requête
  const BATCH_SIZE = 1000;
  const moduleMap = new Map<string, TransactionModule>();
  
  // Diviser en batches si nécessaire
  for (let i = 0; i < transactionCodes.length; i += BATCH_SIZE) {
    const batch = transactionCodes.slice(i, i + BATCH_SIZE);
    // Requête pour récupérer les modules des transactions
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        transaction,
        modules:module_id (
          module,
          description
        )
      `)
      .in('transaction', batch);

    if (error) {
      console.error('❌ Erreur lors de la récupération des modules:', error);
      continue; // Continuer avec le prochain batch
    }

    // Récupérer les modules parents pour enrichir la hiérarchie
    const allModuleIds = new Set<string>();
    data?.forEach((item: any) => {
      if (item.modules?.module) {
        const moduleId = item.modules.module;
        allModuleIds.add(moduleId);
        
        // Extraire les modules parents
        const parts = moduleId.split('-');
        if (parts.length >= 2) {
          allModuleIds.add(parts[0]); // L1
          allModuleIds.add(`${parts[0]}-${parts[1]}`); // L2
        } else if (parts.length >= 1) {
          allModuleIds.add(parts[0]); // L1
        }
      }
    });

    // Récupérer les descriptions de tous les modules de la hiérarchie
    const { data: modulesData, error: modulesError } = await supabase
      .from('modules')
      .select('module, description')
      .in('module', Array.from(allModuleIds));

    if (modulesError) {
      console.error('❌ Erreur lors de la récupération des descriptions des modules:', modulesError);
    }

    // Créer un Map des descriptions
    const moduleDescriptions = new Map<string, string>();
    modulesData?.forEach((mod: any) => {
      moduleDescriptions.set(mod.module, mod.description);
    });

    // Construire la Map finale avec hiérarchie complète
    data?.forEach((item: any) => {
      if (item.modules) {
        const moduleId = item.modules.module;
        const parts = moduleId.split('-');
        
        // Niveau 1
        const level1Module = parts.length >= 1 ? parts[0] : undefined;
        const level1Description = level1Module ? moduleDescriptions.get(level1Module) : undefined;
        
        // Niveau 2
        const level2Module = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : undefined;
        const level2Description = level2Module ? moduleDescriptions.get(level2Module) : undefined;
        
        // Niveau 3+
        const level3Module = parts.length >= 3 ? moduleId : undefined;
        const level3Description = level3Module ? moduleDescriptions.get(level3Module) : undefined;

        moduleMap.set(item.transaction, {
          transaction: item.transaction,
          module: moduleId,
          moduleDescription: item.modules.description,
          level1Module,
          level1Description,
          level2Module,
          level2Description,
          level3Module,
          level3Description,
        });
      }
    });
    
  }

  return moduleMap;
}

/**
 * Récupère le module d'une seule transaction
 * 
 * @param transactionCode - Code de la transaction
 * @returns Module de la transaction ou null
 */
export async function getTransactionModule(
  transactionCode: string
): Promise<TransactionModule | null> {
  const modules = await getTransactionModules([transactionCode]);
  return modules.get(transactionCode) || null;
}

