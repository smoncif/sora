import { Metadata } from 'next';
import RequestResetPasswordPage from '@/components/auth/RequestResetPasswordPage';

export const metadata: Metadata = {
  title: 'SORA | Réinitialisation de mot de passe',
  description: 'Demandez la réinitialisation de votre mot de passe SORA',
};

export default function RequestResetPassword() {
  return <RequestResetPasswordPage />;
} 
