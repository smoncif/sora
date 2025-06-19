/**
 * Page d'inscription
 * 
 * Route : /register
 */

import { RegisterPage } from '@components/auth';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription | Sora',
  description: 'Créez votre compte Sora pour accéder au dashboard',
};

export default function Register() {
  return <RegisterPage />;
} 