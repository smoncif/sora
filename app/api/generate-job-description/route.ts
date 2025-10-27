/**
 * API Route pour générer les fiches de poste via webhook N8N
 * 
 * Cette route agit comme un proxy pour éviter les problèmes CORS
 * Frontend → /api/generate-job-description → N8N Webhook
 */

import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook-test/generate-job-description';

// Utiliser Node.js runtime au lieu d'Edge pour éviter les limites de Edge Runtime
// Edge Runtime n'a pas accès à tous les modules Node.js et a des limites de fetch
export const config = {
  runtime: 'nodejs',
};

export async function POST(request: NextRequest) {
  try {
    console.log('📥 API Route appelée pour générer fiche de poste');
    
    // Récupérer le body de la requête
    const body = await request.json();
    
    console.log('📝 Payload reçu:', JSON.stringify(body, null, 2));
    
    // Vérifier que le body contient les données nécessaires
    if (!body || !body.profileName || !body.roles) {
      console.error('❌ Données manquantes dans le payload');
      return NextResponse.json(
        { error: 'Données manquantes: profileName et roles sont requis' },
        { status: 400 }
      );
    }

    console.log('📤 Envoi au webhook N8N:', WEBHOOK_URL);
    
    // Appeler le webhook N8N
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Réponse du webhook:', response.status, response.statusText);

    // Vérifier si la réponse est OK
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erreur inconnue');
      console.error('❌ Erreur du webhook N8N:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Erreur lors de l\'appel au webhook',
          details: errorText,
          status: response.status,
          webhookUrl: WEBHOOK_URL
        },
        { status: 500 }
      );
    }

    // Lire la réponse du webhook
    const data = await response.json().catch(() => ({ message: 'Succès' }));
    
    console.log('✅ Webhook N8N appelé avec succès:', data);
    
    // Retourner la réponse au client
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('❌ Erreur lors du traitement:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de la fiche de poste',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'fetch_error'
      },
      { status: 500 }
    );
  }
}

// Handler OPTIONS pour CORS preflight (si nécessaire)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

