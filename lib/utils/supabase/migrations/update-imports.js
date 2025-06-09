/**
 * Script d'aide à la migration des imports Supabase
 * 
 * Ce fichier contient les informations pour migrer les anciens imports vers les nouveaux.
 * Ce n'est pas un script exécutable, mais plutôt un guide pour les modifications à faire.
 * 
 * Utilisez grep ou la fonction rechercher/remplacer de votre IDE pour mettre à jour le code.
 */

/**
 * Fichiers à mettre à jour:
 * 
 * 1. Imports du client côté navigateur
 *    AVANT: import { supabase } from '@/lib/supabase/client';
 *    APRÈS: import { createClient } from '@/utils/supabase/client';
 *           const supabase = createClient();
 * 
 *    Fichiers concernés:
 *    - app/contexts/AuthContext.tsx
 *    - app/dashboard/roles/history/page.tsx
 *    - app/dashboard/roles/analysis/page.tsx
 *    - app/dashboard/roles/analysis/new/page.tsx
 *    - app/dashboard/page.tsx
 *    - app/pages/login.tsx
 *    - app/app/login/page.tsx
 * 
 * 2. Imports du client côté serveur
 *    AVANT: import supabase from '@/app/utils/supabase';
 *    APRÈS: import { createClient } from '@/utils/supabase/server';
 *           const supabase = await createClient();
 * 
 *    Fichiers concernés:
 *    - app/api/templates/route.ts
 * 
 * 3. Imports locaux du client d'API
 *    AVANT: import supabase from './supabase';
 *    APRÈS: import { createClient } from '@/utils/supabase/client';
 *           const supabase = createClient();
 * 
 *    Fichiers concernés:
 *    - app/utils/uploadService.ts
 *    - app/utils/roleStorageService.ts
 */

// Après mise à jour des imports, vous pouvez supprimer les fichiers:
// - app/lib/auth/server-client.ts
// - app/utils/supabase.ts
// - app/lib/supabase/client.ts (vérifier si ce fichier est utilisé ailleurs d'abord)

/**
 * Exemple de transformation d'un composant client:
 * 
 * AVANT:
 * ```tsx
 * import { supabase } from '@/lib/supabase/client';
 * 
 * export function Component() {
 *   // Utilisation directe de supabase
 *   const { data } = await supabase.from('table').select('*');
 * }
 * ```
 * 
 * APRÈS:
 * ```tsx
 * import { createClient } from '@/utils/supabase/client';
 * 
 * export function Component() {
 *   const supabase = createClient();
 *   const { data } = await supabase.from('table').select('*');
 * }
 * ```
 * 
 * Exemple de transformation d'un composant serveur:
 * 
 * AVANT:
 * ```tsx
 * import supabase from '@/app/utils/supabase';
 * 
 * export async function ServerComponent() {
 *   const { data } = await supabase.from('table').select('*');
 * }
 * ```
 * 
 * APRÈS:
 * ```tsx
 * import { createClient } from '@/utils/supabase/server';
 * 
 * export async function ServerComponent() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select('*');
 * }
 * ```
 */ 