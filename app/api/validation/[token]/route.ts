/**
 * API Route: GET /api/validation/[token]
 * Récupère les données d'un lien de validation par son token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidationLinkData } from 'lib/services/validation/validationLinkService';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  }
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 400 }
      );
    }
    
    // Récupérer les données du lien
    const data = await getValidationLinkData(token);
    
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Lien expiré ou invalide' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[API] Erreur récupération lien de validation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

