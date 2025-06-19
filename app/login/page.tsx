/**
 * Page de connexion
 * 
 * Route : /login
 */

import { LoginPage } from '@components/auth';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion | Sora',
  description: 'Connectez-vous à votre compte Sora pour accéder au dashboard',
};

export default function Login() {
  return <LoginPage />;
} 