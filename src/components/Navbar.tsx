'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/lotteries', label: 'Lotteries' },
  { href: '/feed', label: 'Feed' },
  { href: '/main-ws', label: 'WebSocket' },
  { href: '/prize-pool', label: 'Prize Pool' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#111',
      borderBottom: '1px solid #1f1f1f',
      padding: '0 1.5rem',
      display: 'flex', alignItems: 'center', gap: '0.25rem',
      height: 48,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginRight: '1.5rem', letterSpacing: '0.02em' }}>
        SkinSlott
      </span>

      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontFamily: 'monospace',
              color: active ? '#fff' : '#666',
              background: active ? '#1f1f1f' : 'transparent',
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
