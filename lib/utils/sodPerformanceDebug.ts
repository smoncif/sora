/**
 * Utilitaires de debugging pour diagnostiquer les problèmes de performance SoD
 * 
 * Ce fichier contient des fonctions de logging pour identifier :
 * 1. Les changements de référence du contexte
 * 2. Les re-rendus inutiles des composants
 * 3. Les changements de callbacks
 * 4. Les problèmes de mémoïsation
 */

// Compteur global pour les renders
let renderCount = 0;
let navigationCount = 0;

/**
 * Log un changement de contexte
 */
export function logContextChange(
  location: string,
  contextData: {
    deletedActionsSize: number;
    restrictedActionsSize: number;
    restrictedResourcesSize: number;
  }
) {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔄 [CONTEXT CHANGED] ${location}
╠════════════════════════════════════════════════════════════════
║ Deleted Actions: ${contextData.deletedActionsSize}
║ Restricted Actions: ${contextData.restrictedActionsSize}
║ Restricted Resources: ${contextData.restrictedResourcesSize}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log un changement de page
 */
export function logPageChange(page: number, totalPages: number) {
  navigationCount++;
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 📄 [PAGE CHANGE] Navigation #${navigationCount}
╠════════════════════════════════════════════════════════════════
║ Page: ${page} / ${totalPages}
║ Timestamp: ${new Date().toISOString()}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log un render de composant
 */
export function logComponentRender(
  componentName: string,
  props: any,
  reason?: string
) {
  renderCount++;
  console.log(`
🎨 [RENDER #${renderCount}] ${componentName}
   ${reason ? `Raison: ${reason}` : ''}
   Props: ${JSON.stringify(props, null, 2).substring(0, 200)}...
  `);
}

/**
 * Log une comparaison React.memo
 */
export function logMemoComparison(
  componentName: string,
  comparison: {
    shouldNotRerender: boolean;
    changes: Record<string, boolean>;
  }
) {
  const changedProps = Object.entries(comparison.changes)
    .filter(([_, changed]) => changed)
    .map(([prop]) => prop);

  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔍 [MEMO COMPARISON] ${componentName}
╠════════════════════════════════════════════════════════════════
║ Should NOT re-render: ${comparison.shouldNotRerender ? '✅ OUI' : '❌ NON'}
║ Changed props: ${changedProps.length > 0 ? changedProps.join(', ') : 'Aucune'}
╠════════════════════════════════════════════════════════════════
${Object.entries(comparison.changes)
  .map(([prop, changed]) => `║ ${changed ? '❌' : '✅'} ${prop}`)
  .join('\n')}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log un changement de callback
 */
export function logCallbackChange(callbackName: string, dependencies: any[]) {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔄 [CALLBACK CHANGED] ${callbackName}
╠════════════════════════════════════════════════════════════════
║ Dependencies: ${dependencies.length}
║ Timestamp: ${new Date().toISOString()}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log le début d'une opération de pagination
 */
export function logPaginationStart(
  page: number,
  rolesCount: number,
  rolesPerPage: number
) {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ ⏱️  [PAGINATION START]
╠════════════════════════════════════════════════════════════════
║ Page: ${page}
║ Total Roles: ${rolesCount}
║ Roles Per Page: ${rolesPerPage}
║ Start Index: ${(page - 1) * rolesPerPage}
║ End Index: ${page * rolesPerPage}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log la fin d'une opération de pagination
 */
export function logPaginationEnd(duration: number, rolesRendered: number) {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ ✅ [PAGINATION END]
╠════════════════════════════════════════════════════════════════
║ Duration: ${duration.toFixed(2)}ms
║ Roles Rendered: ${rolesRendered}
║ Avg per Role: ${(duration / rolesRendered).toFixed(2)}ms
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Log l'application d'état
 */
export function logStateApplication(
  rolesCount: number,
  duration: number,
  contextSize: number
) {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 🔧 [STATE APPLICATION]
╠════════════════════════════════════════════════════════════════
║ Roles Processed: ${rolesCount}
║ Duration: ${duration.toFixed(2)}ms
║ Context Size: ${contextSize} actions/resources
║ Avg per Role: ${(duration / rolesCount).toFixed(2)}ms
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Réinitialiser les compteurs
 */
export function resetDebugCounters() {
  renderCount = 0;
  navigationCount = 0;
  console.log('🔄 [DEBUG] Compteurs réinitialisés');
}

/**
 * Afficher un résumé des performances
 */
export function logPerformanceSummary() {
  console.log(`
╔════════════════════════════════════════════════════════════════
║ 📊 [PERFORMANCE SUMMARY]
╠════════════════════════════════════════════════════════════════
║ Total Renders: ${renderCount}
║ Total Navigations: ${navigationCount}
║ Avg Renders per Navigation: ${navigationCount > 0 ? (renderCount / navigationCount).toFixed(2) : 'N/A'}
╚════════════════════════════════════════════════════════════════
  `);
}

/**
 * Créer un timer de performance
 */
export function createPerformanceTimer(label: string) {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`⏱️  [TIMER] ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
}
