import { Metadata } from 'next';
import ConfirmResetPasswordPage from '@/components/auth/ConfirmResetPasswordPage';

export const metadata: Metadata = {
  title: 'SORA | Nouveau mot de passe',
  description: 'Définissez un nouveau mot de passe pour votre compte SORA',
};

export default function ConfirmResetPassword() {
  return <ConfirmResetPasswordPage />;
} 
