import { redirect } from 'next/navigation';

export default function Home() {
  // Cette page ne devrait jamais être affichée car le middleware
  // redirige automatiquement vers /login ou /dashboard
  redirect('/login');
} 