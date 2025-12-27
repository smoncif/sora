/**
 * Composants unifiés pour l'affichage harmonisé des risques SoD
 * 
 * Ces composants remplacent et unifient :
 * - SodRiskSection / SodCompositeRiskSection / UserSodRiskSection
 * - SodFunctionGrid / SodCompositeFunctionGrid / FunctionByRoleSection
 * 
 * Avantages :
 * - ✅ Un seul point de maintenance
 * - ✅ Cohérence visuelle garantie
 * - ✅ Futures mises à jour du thème appliquées partout
 */

export { UnifiedRiskSection } from './UnifiedRiskSection';
export { UnifiedFunctionGrid } from './UnifiedFunctionGrid';
export { UnifiedFunctionCard } from './UnifiedFunctionCard';
export type { UnifiedRiskSectionProps } from './UnifiedRiskSection';
export type { UnifiedFunctionGridProps } from './UnifiedFunctionGrid';
export type { UnifiedFunctionCardProps } from './UnifiedFunctionCard';



