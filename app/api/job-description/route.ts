/**
 * Route API pour générer une fiche de poste via webhook N8N
 * Utilise un proxy pour éviter les problèmes CORS
 */

import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook-test/generate-job-description';

export async function POST(request: NextRequest) {
  try {
    // Récupérer le body de la requête
    const body = await request.json();

    // Vérifier que le body contient les champs requis
    if (!body.profileName || !body.roles) {
      return NextResponse.json(
        { error: 'Champs manquants: profileName et roles sont requis' },
        { status: 400 }
      );
    }

    // Logger pour debug (optionnel)
    console.log('📤 Envoi au webhook N8N:', {
      profileName: body.profileName,
      rolesCount: body.roles.length
    });

    // Appeler le webhook N8N
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    // Vérifier que la réponse est OK
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erreur inconnue');
      console.error('❌ Erreur du webhook:', response.status, errorText);
      return NextResponse.json(
        { error: `Erreur du webhook: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Lire la réponse du webhook
    const responseData = await response.text().catch(() => '{}');
    
    console.log('✅ Réponse du webhook:', responseData);

    // Retourner la réponse
    return NextResponse.json(
      { success: true, message: 'Fiche de poste générée avec succès', data: responseData },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Erreur lors de la génération de la fiche de poste:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de la fiche de poste',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

