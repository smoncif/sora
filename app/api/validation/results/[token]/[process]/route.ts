/**
 * API Route: GET /api/validation/results/[token]/[process]
 * Récupère les résultats de validation pour un processus spécifique
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidationResultsByProcess } from 'lib/services/validation/validationLinkService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; process: string }> }
) {
  try {
    const { token, process } = await params;
    console.log('🔍 [API /results] Requête reçue');
    console.log(`  Token: ${token}`);
    console.log(`  Processus: ${process}`);
    
    // Récupérer les résultats pour ce processus
    console.log('📡 [API /results] Appel du service getValidationResultsByProcess...');
    const results = await getValidationResultsByProcess(token, process);
    
    if (!results) {
      console.log('ℹ️ [API /results] Aucun résultat trouvé pour ce processus');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aucun résultat trouvé pour ce processus' 
        },
        { status: 404 }
      );
    }
    
    console.log('✅ [API /results] Résultats récupérés:', {
      rolesCount: results.length,
      roles: results.map(r => ({
        roleId: r.roleId,
        businessRole: r.businessRole,
        isApproved: r.isApproved,
        hasComment: !!r.comment,
        transactionValidationsCount: r.transactionValidations?.length || 0,
      })),
    });
    
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('❌ [API /results] Exception:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

