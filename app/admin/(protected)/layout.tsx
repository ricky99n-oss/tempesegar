import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin-shell';
import { AppError } from '@/lib/errors';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Tempe Segar', robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireAdmin();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect('/admin/login');
    throw e;
  }
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
