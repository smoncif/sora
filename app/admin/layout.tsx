'use client';

import { AdminLayout } from '@/components/layout';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
} 
