import { Metadata } from 'next';
import { LoginPage } from '@/components/auth/LoginPage';

/**
 * Définir les métadonnées de la page
 * @type {Metadata}
 */
export const metadata: Metadata = {
  title: 'Connexion | SORA',
  description: 'Connectez-vous à votre compte SORA',
};

/**
 * Page de connexion
 * Cette page utilise un composant client pour gérer la logique de connexion
 */
export default function LoginPageWrapper() {
  return <LoginPage />;
} 
