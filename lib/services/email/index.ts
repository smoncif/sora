/**
 * Index des services email
 * Exports centralisés
 */

export {
  sendValidationEmail,
  generateDefaultEmailTemplate,
  formatExpirationDate,
  formatBusinessRolesList,
  replaceTemplateVariables,
  countTotalSimpleRoles,
} from './emailValidationService';

export type {
  EmailTemplateVariables,
  SendValidationEmailParams,
} from './emailValidationService';




