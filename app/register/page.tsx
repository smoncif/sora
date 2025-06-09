import { Metadata } from 'next';
import RegisterPage from '@/components/auth/RegisterPage';

export const metadata: Metadata = {
  title: 'SORA | Inscription',
  description: 'Créez un compte sur la plateforme SORA',
};

export default function Register() {
  return <RegisterPage />;
} 
