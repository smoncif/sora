/**
 * API Route: POST /api/email/send-validation
 * Envoie un email de validation avec le lien
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendValidationEmail } from 'lib/services/email/emailValidationService';
import { createClient } from 'lib/utils/supabase/server';
import { z } from 'zod';

/**
 * Schema de validation Zod pour l'envoi d'email
 */
const SendEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'Au moins un destinataire est requis'),
  subject: z.string().min(1, 'Le sujet est requis'),
  body: z.string().min(1, 'Le corps du message est requis'),
  link: z.string().url('Le lien doit être une URL valide'),
});

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    // Parser et valider le body
    const body = await request.json();
    const validationResult = SendEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Données invalides',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { recipients, subject, body: emailBody, link } = validationResult.data;
    
    // Envoyer l'email
    await sendValidationEmail({
      recipients,
      subject,
      body: emailBody,
      link,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
    });
  } catch (error) {
    console.error('[API] Erreur envoi email de validation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

