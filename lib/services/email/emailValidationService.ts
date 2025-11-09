/**
 * Service d'envoi d'emails de validation
 * Supporte les templates multi-rôles métier (v1.1)
 */

/**
 * Variables disponibles dans les templates email
 */
export interface EmailTemplateVariables {
  link: string;
  businessRoleCount: number;        // Nombre de rôles métier
  businessRolesList: string;        // Liste formatée (• Comptable Junior\n• Comptable Senior)
  roleCount: number;                // Nombre total de rôles simples
  expiration: string;               // Date formatée
  requester: string;                // Nom de l'utilisateur qui partage
}

/**
 * Paramètres pour envoyer un email de validation
 */
export interface SendValidationEmailParams {
  recipients: string[];
  subject: string;
  body: string;
  link: string;
}

/**
 * Génère le template email par défaut pour multi-rôles
 */
export function generateDefaultEmailTemplate(
  variables: EmailTemplateVariables
): { subject: string; body: string } {
  const subject = `Validation requise - ${variables.businessRoleCount} Rôle(s) Métier`;
  
  const body = `Bonjour,

Vous êtes invité(e) à valider la composition de ${variables.businessRoleCount} rôle(s) métier :
${variables.businessRolesList}

Cette validation concerne au total ${variables.roleCount} rôle(s) simple(s).

Veuillez accéder au lien suivant pour consulter et valider les rôles proposés :
${variables.link}

⚠️ Ce lien expirera le ${variables.expiration}

Cordialement,
${variables.requester}`;

  return { subject, body };
}

/**
 * Formate la date d'expiration en français
 */
export function formatExpirationDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Formate la liste des rôles métier pour l'email
 */
export function formatBusinessRolesList(businessRoles: string[]): string {
  return businessRoles.map(role => `• ${role}`).join('\n');
}

/**
 * Remplace les variables dans un template
 */
export function replaceTemplateVariables(
  template: string,
  variables: EmailTemplateVariables
): string {
  return template
    .replace(/{LINK}/g, variables.link)
    .replace(/{BUSINESS_ROLE_COUNT}/g, String(variables.businessRoleCount))
    .replace(/{BUSINESS_ROLES_LIST}/g, variables.businessRolesList)
    .replace(/{ROLE_COUNT}/g, String(variables.roleCount))
    .replace(/{EXPIRATION}/g, variables.expiration)
    .replace(/{REQUESTER}/g, variables.requester);
}

/**
 * Envoie un email de validation via Resend
 */
export async function sendValidationEmail(
  params: SendValidationEmailParams
): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('Configuration email manquante (EMAIL_API_KEY ou RESEND_API_KEY)');
  }
  
  const emailFrom = process.env.EMAIL_FROM || 'noreply@sora.com';
  const emailFromName = process.env.EMAIL_FROM_NAME || 'Sora - Analyse de Rôles';
  
  // Validation des destinataires
  if (!params.recipients || params.recipients.length === 0) {
    throw new Error('Au moins un destinataire est requis');
  }
  
  // Validation des emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = params.recipients.filter(email => !emailRegex.test(email));
  if (invalidEmails.length > 0) {
    throw new Error(`Emails invalides: ${invalidEmails.join(', ')}`);
  }
  
  const emailData = {
    from: `${emailFromName} <${emailFrom}>`,
    to: params.recipients,
    subject: params.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin-top: 0;">Validation de Rôles Métier</h2>
        </div>
        
        <div style="line-height: 1.6; color: #333;">
          ${params.body.replace(/\n/g, '<br>')}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 0.9em; color: #666; margin: 0;">
            Cet email a été envoyé automatiquement depuis Sora. Merci de ne pas répondre directement à cet email.
          </p>
        </div>
      </div>
    `,
  };
  
  try {
    // Envoyer via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[emailValidationService] Erreur Resend:', errorData);
      throw new Error(`Erreur Resend: ${errorData.message || 'Erreur inconnue'}`);
    }
    
    await response.json();
  } catch (error) {
    console.error('[emailValidationService] Erreur envoi email:', error);
    throw new Error(`Erreur lors de l'envoi de l'email: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

/**
 * Compte le nombre total de rôles simples dans la sélection multi-rôles
 */
export function countTotalSimpleRoles(selectedRoles: Record<string, string[]>): number {
  return Object.values(selectedRoles).reduce((total, roles) => total + roles.length, 0);
}

