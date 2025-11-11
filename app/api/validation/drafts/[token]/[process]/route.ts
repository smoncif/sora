/**
 * API Route: GET /api/validation/drafts/[token]/[process]
 * Récupère le brouillon d'un processus donné
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidationDraft } from 'lib/services/validation/validationLinkService';

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ token: string; process: string }>;
  }
) {
  try {
    const { token, process } = await params;
    const draft = await getValidationDraft(token, decodeURIComponent(process));

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}


