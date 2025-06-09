import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();

/**
 * Interface pour les options de téléchargement
 */
export interface UploadOptions {
  bucketName?: string;
  folderPath?: string;
  fileNamePrefix?: string;
  contentType?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Interface pour le résultat du téléchargement
 */
export interface UploadResult {
  path: string;
  fileName: string;
  size: number;
  contentType: string;
  url: string;
}

/**
 * Télécharge un fichier vers Supabase Storage
 * @param file Le fichier à télécharger
 * @param options Options de téléchargement
 * @returns Résultat du téléchargement contenant les métadonnées et l'URL
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Valeurs par défaut pour les options
  const {
    bucketName = 'excel-files',
    folderPath = '',
    fileNamePrefix = '',
    contentType = file.type,
    onProgress
  } = options;

  // Génération d'un nom de fichier unique pour éviter les collisions
  const fileExtension = file.name.split('.').pop();
  const uniqueId = uuidv4();
  const fileName = `${fileNamePrefix ? fileNamePrefix + '-' : ''}${uniqueId}.${fileExtension}`;
  
  // Construction du chemin complet
  const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

  try {
    // Vérification de l'existence du bucket, création si nécessaire
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: false  // Défini à false pour sécuriser l'accès
      });
      
      if (createBucketError) {
        throw new Error(`Erreur lors de la création du bucket: ${createBucketError.message}`);
      }
    }

    // Téléchargement du fichier
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, file, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Erreur lors du téléchargement: ${error.message}`);
    }

    // Génération d'une URL signée pour accéder au fichier
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fullPath, 60 * 60); // URL valide pendant 1 heure

    if (urlError) {
      throw new Error(`Erreur lors de la génération de l'URL: ${urlError.message}`);
    }

    return {
      path: data?.path || fullPath,
      fileName,
      size: file.size,
      contentType: file.type,
      url: urlData?.signedUrl || ''
    };
  } catch (error) {

    throw error;
  }
}

/**
 * Supprime un fichier de Supabase Storage
 * @param path Chemin du fichier à supprimer
 * @param bucketName Nom du bucket contenant le fichier
 * @returns true si la suppression a réussi
 */
export async function deleteFile(path: string, bucketName = 'excel-files'): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }

    return true;
  } catch (error) {

    throw error;
  }
}

/**
 * Récupère une URL signée pour un fichier stocké
 * @param path Chemin du fichier
 * @param bucketName Nom du bucket contenant le fichier
 * @param expiresIn Durée de validité de l'URL en secondes (défaut: 3600s / 1h)
 * @returns URL signée du fichier
 */
export async function getFileUrl(
  path: string, 
  bucketName = 'excel-files',
  expiresIn = 60 * 60
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Erreur lors de la génération de l'URL: ${error.message}`);
    }

    return data?.signedUrl || '';
  } catch (error) {

    throw error;
  }
} 