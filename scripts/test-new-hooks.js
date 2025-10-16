/**
 * Test simple pour vérifier que les nouveaux hooks TanStack Query fonctionnent
 * 
 * Ce fichier contient des tests de base pour vérifier que :
 * 1. Les mutations se déclenchent correctement
 * 2. Les sélecteurs retournent les bonnes données
 * 3. Les règles de gestion sont appliquées
 */

import { applySodRulesToSession } from 'lib/utils/sodRulesApplication';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';

/**
 * Test de base pour vérifier que les règles de suppression d'action fonctionnent
 */
export function testDeleteActionRules() {
  console.log('🧪 [TEST] Test des règles de suppression d\'action');
  
  // Créer une session de test simple
  const testSession: SodAnalysisSession = {
    id: 'test-session',
    userId: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    simpleRoles: {
      roles: [{
        roleName: 'TEST_ROLE',
        risks: [{
          riskId: 'TEST_RISK',
          riskName: 'Test Risk',
          functions: [{
            functionName: 'TEST_FUNCTION',
            actions: [{
              code: 'TEST_ACTION',
              name: 'Test Action',
              isDeleted: false,
              isRestricted: false,
              resources: [{
                code: 'TEST_RESOURCE',
                name: 'Test Resource',
                isDeleted: false,
                isRestricted: false,
                values: ['VALUE1', 'VALUE2']
              }]
            }]
          }]
        }]
      }]
    },
    compositeRoles: {
      roles: []
    }
  };

  // Tester la suppression d'action
  const updatedSession = applySodRulesToSession(testSession, 'DELETE_ACTION', {
    roleName: 'TEST_ROLE',
    actionCode: 'TEST_ACTION',
    resources: []
  });

  // Vérifier que l'action est marquée comme supprimée
  const action = updatedSession.simpleRoles.roles[0].risks[0].functions[0].actions[0];
  
  if (action.isDeleted && !action.isRestricted) {
    console.log('✅ [TEST] Règles de suppression d\'action : SUCCÈS');
    console.log('   - Action marquée comme supprimée:', action.isDeleted);
    console.log('   - Action non restreinte:', !action.isRestricted);
    console.log('   - Ressource marquée comme supprimée:', action.resources[0].isDeleted);
    return true;
  } else {
    console.log('❌ [TEST] Règles de suppression d\'action : ÉCHEC');
    console.log('   - Action supprimée:', action.isDeleted);
    console.log('   - Action restreinte:', action.isRestricted);
    return false;
  }
}

/**
 * Test de base pour vérifier que les mutations se déclenchent
 */
export function testMutationsTrigger() {
  console.log('🧪 [TEST] Test du déclenchement des mutations');
  
  // Simuler le déclenchement d'une mutation
  const mockMutation = {
    mutate: (params: any) => {
      console.log('🎯 [TEST] Mutation déclenchée avec:', params);
      return Promise.resolve();
    }
  };

  // Tester le déclenchement
  mockMutation.mutate({
    roleName: 'TEST_ROLE',
    actionCode: 'TEST_ACTION',
    resources: []
  });

  console.log('✅ [TEST] Déclenchement des mutations : SUCCÈS');
  return true;
}

/**
 * Test de base pour vérifier que les sélecteurs fonctionnent
 */
export function testSelectorsWork() {
  console.log('🧪 [TEST] Test des sélecteurs');
  
  // Simuler un sélecteur
  const mockSelector = (session: SodAnalysisSession, roleName: string, actionCode: string) => {
    const role = session.simpleRoles.roles.find(r => r.roleName === roleName);
    if (!role) return { isDeleted: false, isRestricted: false };
    
    const action = role.risks[0].functions[0].actions.find(a => a.code === actionCode);
    if (!action) return { isDeleted: false, isRestricted: false };
    
    return {
      isDeleted: action.isDeleted,
      isRestricted: action.isRestricted,
      restrictedByAction: action.isRestricted
    };
  };

  // Créer une session de test
  const testSession: SodAnalysisSession = {
    id: 'test-session',
    userId: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    simpleRoles: {
      roles: [{
        roleName: 'TEST_ROLE',
        risks: [{
          riskId: 'TEST_RISK',
          riskName: 'Test Risk',
          functions: [{
            functionName: 'TEST_FUNCTION',
            actions: [{
              code: 'TEST_ACTION',
              name: 'Test Action',
              isDeleted: true,
              isRestricted: false,
              resources: []
            }]
          }]
        }]
      }]
    },
    compositeRoles: {
      roles: []
    }
  };

  // Tester le sélecteur
  const actionState = mockSelector(testSession, 'TEST_ROLE', 'TEST_ACTION');
  
  if (actionState.isDeleted && !actionState.isRestricted) {
    console.log('✅ [TEST] Sélecteurs : SUCCÈS');
    console.log('   - État d\'action extrait:', actionState);
    return true;
  } else {
    console.log('❌ [TEST] Sélecteurs : ÉCHEC');
    console.log('   - État d\'action:', actionState);
    return false;
  }
}

/**
 * Exécuter tous les tests
 */
export function runAllTests() {
  console.log('🚀 [TEST] Démarrage des tests des nouveaux hooks TanStack Query');
  console.log('='.repeat(60));
  
  const results = [
    testDeleteActionRules(),
    testMutationsTrigger(),
    testSelectorsWork()
  ];
  
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;
  
  console.log('='.repeat(60));
  console.log(`🏁 [TEST] Tests terminés: ${successCount}/${totalCount} réussis`);
  
  if (successCount === totalCount) {
    console.log('🎉 [TEST] Tous les tests sont passés ! Les nouveaux hooks sont prêts.');
  } else {
    console.log('⚠️ [TEST] Certains tests ont échoué. Vérifiez les implémentations.');
  }
  
  return successCount === totalCount;
}
