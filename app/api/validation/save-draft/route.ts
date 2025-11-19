/**
 * API Route: POST /api/validation/save-draft
 * Sauvegarde un brouillon de validation pour un processus
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveValidationDraft } from 'lib/services/validation/validationLinkService';
import { z } from 'zod';

const DraftValidationSchema = z.object({
  token: z.string().uuid(),
  process: z.string().optional(),
  validatorEmail: z.string().email().optional().or(z.literal('')),
  validatorName: z.string().optional().or(z.literal('')),
  results: z.array(
    z.object({
      roleId: z.string(),
      roleName: z.string(),
      businessRole: z.string(),
      isApproved: z.boolean().nullable(),
      comment: z.string().optional().default(''),
      transactionValidations: z
        .array(
          z.object({
            transactionCode: z.string(),
            isApproved: z.boolean().nullable(),
            comment: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = DraftValidationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { token, process, validatorEmail, validatorName, results } = validationResult.data;

    const draft = await saveValidationDraft({
      token,
      process,
      results,
      validatorInfo: {
        email: validatorEmail || undefined,
        name: validatorName || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error('[API] Erreur sauvegarde brouillon:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}






