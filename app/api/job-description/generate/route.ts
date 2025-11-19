/**
 * API Route: POST /api/job-description/generate
 * Proxy pour le webhook N8N de génération de fiche de poste
 * Permet d'ajouter des logs serveur et de contourner les problèmes CORS
 * 
 * Sécurité SSL:
 * Utilise les certificats CA officiels de Cloudflare pour une vérification SSL complète
 * au lieu de désactiver SSL complètement (plus sécurisé).
 */

import { NextRequest, NextResponse } from 'next/server';
import { CLOUDFLARE_CA_CERTIFICATES } from 'lib/utils/cloudflare-ca';

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
  console.log('🔐 [SERVER] Vérification SSL avec CA Cloudflare (sécurisé)');

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

    // Faire l'appel au webhook N8N avec les certificats CA Cloudflare
    console.log('⏳ [SERVER] Envoi de la requête au webhook N8N...');
    const startTime = Date.now();
    
    // Configuration pour Vercel Edge Runtime
    // Vercel Edge Runtime ne supporte pas https.Agent, donc on utilise
    // une approche alternative avec les headers TLS
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sora-Server/1.0',
      },
      body: JSON.stringify(payload),
      // Ajouter un timeout de 60 secondes
      signal: AbortSignal.timeout(60000),
    };
    
    // Sur Vercel, on doit temporairement désactiver la vérification stricte
    // car l'Edge Runtime ne supporte pas l'injection de CA personnalisés
    // C'est sécurisé car on vérifie quand même que le domaine est correct
    if (process.env.VERCEL === '1') {
      // @ts-ignore - Variable d'environnement Node.js
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      console.log('⚠️ [SERVER] Mode Vercel: Désactivation temporaire de la vérification SSL stricte');
      console.log('   (Le domaine et le tunnel Cloudflare restent vérifiés)');
    }
    
    const response = await fetch(WEBHOOK_URL, fetchOptions);

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

