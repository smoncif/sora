import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from 'lib/utils/supabase/server';
import { hasRole } from 'lib/services/auth/rbacService';
import { UserRole } from 'lib/types/auth';

// Chemin vers le dossier des modèles
const templatesDir = path.join(process.cwd(), 'public', 'templates');

/**
 * GET /api/templates - Récupère la liste des modèles disponibles
 */
export async function GET(request: NextRequest) {
  const templateType = request.nextUrl.searchParams.get('type');
  
  try {
    // Initialiser le client Supabase côté serveur
    const supabase = await createClient();

    // Vérifier l'authentification de l'utilisateur
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    // S'assurer que le dossier des modèles existe
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    
    // Lire tous les fichiers dans le dossier des modèles
    const files = fs.readdirSync(templatesDir);
    
    // Filtrer les fichiers selon le type demandé
    const templates = files
      .filter(file => {
        if (!file.endsWith('.xlsx')) return false;
        if (!templateType) return true;
        
        // Filtrer par type si spécifié
        switch (templateType) {
          case 'role':
            return file.includes('role');
          case 'transaction':
            return file.includes('transaction');
          case 'user':
            return file.includes('user');
          case 'full':
            return file.includes('full');
          default:
            return true;
        }
      })
      .map(file => ({
        name: file,
        url: `/templates/${file}`,
        type: getTemplateType(file),
        size: fs.statSync(path.join(templatesDir, file)).size,
        createdAt: fs.statSync(path.join(templatesDir, file)).birthtime
      }));
    
    return NextResponse.json({ templates });
  } catch (error) {

    return NextResponse.json({ error: 'Erreur lors de la récupération des modèles' }, { status: 500 });
  }
}

/**
 * POST /api/templates - Génère un nouveau modèle sur demande
 */
export async function POST(request: NextRequest) {
  try {
    // Initialiser le client Supabase côté serveur
    const supabase = await createClient();

    // Vérifier l'authentification et les permissions
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    // Récupérer les métadonnées utilisateur pour vérifier le rôle
    const { data: userData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // Vérifier que l'utilisateur a le rôle ADMIN
    const userRole = userData?.role as UserRole || UserRole.USER;
    if (!hasRole([UserRole.ADMIN], userRole)) {
      return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 });
    }
    
    const { type, filename } = await request.json();
    
    if (!type) {
      return NextResponse.json({ error: 'Type de modèle requis' }, { status: 400 });
    }
    
    // Générer le modèle
    try {
      // Nous utilisons le script existant qui est déjà configuré comme un script npm
      const scriptPath = path.join(process.cwd(), 'scripts', 'generateExcelTemplate.js');
      
      // Nous devons exécuter le script Node.js pour générer le modèle
      const { exec } = require('child_process');
      
      // Commande pour exécuter le script avec le bon type de modèle
      const command = `node ${scriptPath} ${type}`;
      
      await new Promise((resolve, reject) => {
        exec(command, (error: any, stdout: any, stderr: any) => {
          if (error) {

            reject(error);
            return;
          }

          if (stderr) resolve(stdout);
        });
      });
      
      // Vérifier que le fichier a été créé
      const templatePath = path.join(templatesDir, getTemplateFilename(type, filename));
      
      if (!fs.existsSync(templatePath)) {
        return NextResponse.json({ error: 'Échec de la génération du modèle' }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        template: {
          name: path.basename(templatePath),
          url: `/templates/${path.basename(templatePath)}`,
          type: type,
          size: fs.statSync(templatePath).size,
          createdAt: fs.statSync(templatePath).birthtime
        }
      });
    } catch (error) {

      return NextResponse.json({ error: 'Erreur lors de la génération du modèle' }, { status: 500 });
    }
  } catch (error) {

    return NextResponse.json({ error: 'Erreur lors du traitement de la requête' }, { status: 500 });
  }
}

/**
 * Détermine le type de modèle basé sur le nom de fichier
 */
function getTemplateType(filename: string): string {
  if (filename.includes('full')) return 'full';
  if (filename.includes('role')) return 'role';
  if (filename.includes('transaction')) return 'transaction';
  if (filename.includes('user')) return 'user';
  return 'unknown';
}

/**
 * Génère un nom de fichier pour le modèle en fonction du type
 */
function getTemplateFilename(type: string, customName?: string): string {
  if (customName) return customName.endsWith('.xlsx') ? customName : `${customName}.xlsx`;
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  
  switch (type) {
    case 'full':
      return `full_import_template_${timestamp}.xlsx`;
    case 'role':
      return `roles_import_template_${timestamp}.xlsx`;
    case 'transaction':
      return `transactions_import_template_${timestamp}.xlsx`;
    case 'user':
      return `users_import_template_${timestamp}.xlsx`;
    default:
      return `template_${timestamp}.xlsx`;
  }
} 



