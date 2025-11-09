/**
 * API Route: POST /api/validation/create
 * Crée un nouveau lien de validation pour multi-rôles métier
 */

import { NextRequest, NextResponse } from 'next/server';
import { createValidationLink } from 'lib/services/validation/validationLinkService';
import { createClient } from 'lib/utils/supabase/server';
import { z } from 'zod';

/**
 * Schema de validation Zod pour les paramètres
 */
const CreateValidationLinkSchema = z.object({
  businessRoles: z.array(z.string()).min(1, 'Au moins un rôle métier est requis'),
  selectedRoles: z.record(z.array(z.string())),
  expirationDate: z.string().datetime(),
  enableTechnicalView: z.boolean().default(false),
  payload: z.any(),
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
    const validationResult = CreateValidationLinkSchema.safeParse(body);
    
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
    
    const { businessRoles, selectedRoles, expirationDate, enableTechnicalView, payload } = validationResult.data;
    
    // Créer le lien de validation
    const result = await createValidationLink({
      businessRoles,
      selectedRoles,
      expirationDate: new Date(expirationDate),
      enableTechnicalView,
      payload,
      createdBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] Erreur création lien de validation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

