/**
 * Exports des composants SoD
 */

// Navigation
export { SodStepperNavigation } from './navigation/SodStepperNavigation';
export { 
  SodNavigationButton, 
  SodNavigationSlider, 
  SodRemediationTable 
} from './navigation';

// Upload
export { SodParsingProgress } from './upload/SodParsingProgress';
export { SodFileUploadSection } from './upload/SodFileUploadSection';

// Progress
export { SodParsingProgress as SodParsingProgressNew } from './progress/SodParsingProgress';
export { SodParsingProgressDetailed } from './progress/SodParsingProgressDetailed';

// Auto-selection
export { SodAutoSelectionSection } from './autoselection/SodAutoSelectionSection';

// Results
export { SodAnalysisResults } from './results/SodAnalysisResults';

// Shared components
export { SodRiskLevelBadge, SodRiskLevelIcon, SodRiskLevelText } from './shared/SodRiskLevelBadge';

// Display components - Base
export { SodValueChip, SodValueList } from './display/SodValueChip';
export { SodResourceItem } from './display/SodResourceItem';
export { SodActionItem } from './display/SodActionItem';

// Display components - Rôles Simples
export { SodFunctionGrid } from './display/SodFunctionGrid';
export { SodRiskSection } from './display/SodRiskSection';
export { SodSimpleRoleCard } from './display/SodSimpleRoleCard';

// Display components - Rôles Composites
export { SodSimpleRoleInCompositeItem } from './display/SodSimpleRoleInCompositeItem';
export { SodCompositeFunctionGrid } from './display/SodCompositeFunctionGrid';
export { SodCompositeRiskSection } from './display/SodCompositeRiskSection';
export { SodCompositeRoleCard } from './display/SodCompositeRoleCard';

// Suspense Components (Optimized)
export { SodSimpleRoleCardSuspense, SodCompositeRoleCardSuspense } from './suspense/SodAnalysisResultsSuspense';

// Skeleton Components (Performance)
export { 
  SodSimpleRoleCardSkeleton, 
  SodCompositeRoleCardSkeleton,
  SodActionSkeleton,
  SodSimpleRoleSkeleton,
  SkeletonGrid,
  useSkeletonProps,
  SkeletonGridWithMessage
} from './skeleton';


