/**
 * Index des services de validation
 * Exports centralisés
 */

export {
  createValidationLink,
  getValidationLinkData,
  submitValidationResults,
  getUserValidationLinks,
  getValidationResults,
  getValidationResultsByProcess,
} from './validationLinkService';

export type {
  CreateValidationLinkParams,
  ValidationLinkData,
  SubmitValidationParams,
  ValidationResult,
} from './validationLinkService';

