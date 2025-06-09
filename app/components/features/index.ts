/**
 * Barrel file principal pour les composants de fonctionnalités
 * 
 * Exporte tous les composants depuis les sous-modules organisés
 */

// Export des sous-modules
export * from './admin';
export * from './roleAnalysis';
export * from './fileUpload';

// Export des composants spécifiques restants
export { default as RoleHistoryTimeline } from '../common/RoleHistoryTimeline/RoleHistoryTimeline'; 
