'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, Tags, Star, Settings, LogOut, Store } from 'lucide-react';
import { Brand } from './brand';
export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  const path = usePathname(),
    router = useRouter();
  const nav = [
    ['/admin', 'Ringkasan', LayoutDashboard],
    ['/admin/products', 'Produk', Package],
    ['/admin/categories', 'Kategori', Tags],
    ['/admin/featured', 'Spot unggulan', Star],
    ['/admin/settings', 'Pengaturan', Settings],
  ] as const;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin">
          <Brand small />
        </Link>
        <nav className="admin-nav" aria-label="Menu admin">
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={
                (href === '/admin' ? path === href : path.startsWith(href)) ? 'active' : ''
              }
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Store size={17} />
            Lihat toko
          </a>
          <button
            onClick={async () => {
              const r = await fetch('/api/auth/logout', { method: 'POST' });
              if (r.ok) {
                router.replace('/admin/login');
                router.refresh();
              }
            }}
          >
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <strong>Ruang kelola toko</strong>
          <span>{email}</span>
        </div>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
