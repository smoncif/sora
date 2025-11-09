/**
 * Page de validation publique
 * Route: /validation/[token]
 * Accessible sans authentification
 */

import { notFound } from 'next/navigation';
import { RoleValidationContent } from 'lib/components/validation/RoleValidationContent/RoleValidationContent';

interface RoleValidationPageProps {
  params: {
    token: string;
  };
}

/**
 * Server Component qui récupère les données et les passe au Client Component
 */
export default async function RoleValidationPage({ params }: RoleValidationPageProps) {
  // Next.js 15: params doit être awaité
  const { token } = await params;

  try {
    // Récupérer les données depuis l'API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/validation/${token}`, {
      cache: 'no-store', // Toujours récupérer les données fraîches
    });

    if (!response.ok) {
      notFound();
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      notFound();
    }

    // Passer les données au Client Component
    return <RoleValidationContent data={result.data} token={token} />;
  } catch (error) {
    console.error('Erreur chargement validation:', error);
    notFound();
  }
}

/**
 * Métadonnées de la page
 */
export async function generateMetadata({ params }: RoleValidationPageProps) {
  // Next.js 15: params doit être awaité
  await params;
  
  return {
    title: 'Validation de Rôles Métier - Sora',
    description: 'Validez les rôles métier proposés',
    robots: 'noindex, nofollow', // Pas d'indexation pour les pages de validation
  };
}

