/**
 * API Route: POST /api/job-description/generate
 * Proxy pour le webhook N8N de génération de fiche de poste
 * Permet d'ajouter des logs serveur et de contourner les problèmes CORS
 */

import { NextRequest, NextResponse } from 'next/server';

interface JobDescriptionPayload {
  profileName: string;
  roles: Array<{
    roleId: string;
    roleName: string;
    type: 'AFFICHAGE' | 'GESTION';
    transactions: Array<{
      code: string;
      description: string;
    }>;
  }>;
}

interface JobDescriptionWebhookResponse {
  jobDescription: string;
  wordCount: number;
  success: boolean;
  sourceModel: string;
  provider: string;
  createdAt: number;
}

export async function POST(request: NextRequest) {
  const WEBHOOK_URL = 'https://n8n.nasmsi.cc/webhook/generate-job-description';
  
  console.log('🚀 [SERVER] Début de l\'appel au webhook N8N');
  console.log('📍 [SERVER] URL du webhook:', WEBHOOK_URL);
  console.log('🌐 [SERVER] Origin de la requête:', request.headers.get('origin'));
  console.log('🔑 [SERVER] User-Agent:', request.headers.get('user-agent'));
  
  // ⚠️ IMPORTANT: Désactiver la vérification SSL en développement pour les certificats auto-signés
  // En production, utilisez un certificat valide et supprimez cette ligne
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ [SERVER] Mode développement: Désactivation de la vérification SSL');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  } else {
    console.log('🔒 [SERVER] Vérification SSL ACTIVÉE (production)');
  }

  try {
    // Parser le body de la requête
    console.log('📥 [SERVER] Parsing du body de la requête...');
    const payload: JobDescriptionPayload = await request.json();
    
    console.log('📦 [SERVER] Payload reçu:', {
      profileName: payload.profileName,
      rolesCount: payload.roles?.length || 0,
      roles: payload.roles?.map(r => ({
        roleId: r.roleId,
        type: r.type,
        transactionCount: r.transactions?.length || 0
      })) || []
    });
    console.log('📄 [SERVER] Payload complet (JSON):', JSON.stringify(payload, null, 2));

    // Validation basique
    if (!payload.profileName || !payload.roles || payload.roles.length === 0) {
      console.error('❌ [SERVER] Payload invalide - données manquantes');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payload invalide: profileName et roles sont requis' 
        },
        { status: 400 }
      );
    }

    // Faire l'appel au webhook N8N
    console.log('⏳ [SERVER] Envoi de la requête au webhook N8N...');
    const startTime = Date.now();
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sora-Server/1.0',
      },
      body: JSON.stringify(payload),
      // Ajouter un timeout de 60 secondes
      signal: AbortSignal.timeout(60000),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ [SERVER] Requête terminée en ${duration}ms`);
    console.log('📊 [SERVER] Status de la réponse:', response.status, response.statusText);
    console.log('📋 [SERVER] Headers de la réponse:', Object.fromEntries(response.headers.entries()));

    // Lire le corps de la réponse
    const responseText = await response.text();
    console.log('📝 [SERVER] Corps de la réponse (text):', responseText);

    if (!response.ok) {
      console.error('❌ [SERVER] Réponse HTTP non-OK:', response.status, response.statusText);
      console.error('📝 [SERVER] Corps de l\'erreur:', responseText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Erreur du webhook N8N: ${response.status} ${response.statusText}`,
          details: responseText
        },
        { status: response.status }
      );
    }

    // Parser la réponse JSON
    try {
      console.log('🔄 [SERVER] Parsing de la réponse JSON...');
      const jsonResponse: JobDescriptionWebhookResponse = JSON.parse(responseText);
      
      console.log('✅ [SERVER] Réponse JSON parsée avec succès:', {
        success: jsonResponse.success,
        wordCount: jsonResponse.wordCount,
        sourceModel: jsonResponse.sourceModel,
        provider: jsonResponse.provider,
        createdAt: jsonResponse.createdAt,
        descriptionLength: jsonResponse.jobDescription?.length || 0
      });

      // Retourner la réponse au client
      console.log('📤 [SERVER] Envoi de la réponse au client');
      return NextResponse.json(jsonResponse);
      
    } catch (parseError) {
      console.error('❌ [SERVER] Erreur lors du parsing JSON:', parseError);
      console.error('📝 [SERVER] Texte qui a causé l\'erreur:', responseText);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors du parsing de la réponse du webhook',
          details: parseError instanceof Error ? parseError.message : 'Erreur inconnue'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [SERVER] Erreur lors de l\'appel au webhook:', error);
    console.error('🔍 [SERVER] Type d\'erreur:', error?.constructor?.name);
    console.error('📝 [SERVER] Message d\'erreur:', error instanceof Error ? error.message : 'Erreur inconnue');
    console.error('📚 [SERVER] Stack trace:', error instanceof Error ? error.stack : 'N/A');

    // Vérifier si c'est une erreur de timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏰ [SERVER] Timeout de 60 secondes dépassé');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Timeout: Le webhook N8N n\'a pas répondu dans les temps (60s)',
        },
        { status: 504 }
      );
    }

    // Vérifier si c'est une erreur réseau
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 [SERVER] Erreur réseau détectée - Le serveur N8N est probablement inaccessible');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Le serveur N8N est inaccessible. Vérifiez que le service est démarré.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur inconnue',
      },
      { status: 500 }
    );
  }
}

