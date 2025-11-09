/**
 * API Route: POST /api/validation/submit
 * Soumet les résultats de validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitValidationResults } from 'lib/services/validation/validationLinkService';
import { z } from 'zod';

/**
 * Schema de validation Zod pour les résultats
 */
const ValidationResultSchema = z.object({
  roleId: z.string(),
  roleName: z.string(),
  businessRole: z.string(),
  isApproved: z.boolean().nullable(),
  comment: z.string().optional().default(''),  // Commentaire optionnel (v1.1)
  transactionValidations: z
    .array(
      z.object({
        transactionCode: z.string(),
        isApproved: z.boolean().nullable(),
        comment: z.string().optional(),
      })
    )
    .optional(),
});

const SubmitValidationSchema = z.object({
  token: z.string().uuid(),
  process: z.string().optional(), // 🆕 Processus métier (optionnel, "Non assigné" par défaut)
  validatorEmail: z.string().email().optional(),
  validatorName: z.string().optional(),
  results: z.array(ValidationResultSchema).min(1, 'Au moins une validation est requise'),
});

export async function POST(request: NextRequest) {
  try {
    // Parser et valider le body
    const body = await request.json();
    const validationResult = SubmitValidationSchema.safeParse(body);
    
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
    
    const { token, process, validatorEmail, validatorName, results } = validationResult.data;
    
    // Vérifier qu'au moins une validation a été faite
    const hasAnyValidation = results.some(r => r.isApproved !== null);
    if (!hasAnyValidation) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Au moins un rôle doit être validé (approuvé, refusé ou en attente)' 
        },
        { status: 400 }
      );
    }
    
    // Soumettre les résultats
    await submitValidationResults({
      token,
      process: process || 'Non assigné', // 🆕 Processus
      results,
      validatorInfo: {
        email: validatorEmail,
        name: validatorName,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Validation soumise avec succès',
    });
  } catch (error) {
    console.error('[API] Erreur soumission validation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

