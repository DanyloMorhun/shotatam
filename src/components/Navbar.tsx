'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { io } from 'socket.io-client';

import { API_URL } from '@/config';

const MONOBANK_URL = 'https://send.monobank.ua/jar/4uG3qMDAFK';

const SMALL = 75;
const LARGE = 220;
// border scales proportionally: 4px at 75px → ~12px at 220px
const SMALL_BORDER = 4;
const LARGE_BORDER = Math.round(LARGE * SMALL_BORDER / SMALL);

function NavQrCode() {
  const smallRef = useRef<HTMLCanvasElement>(null);
  const largeRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(smallRef.current!, MONOBANK_URL, { width: SMALL, margin: 0 });
      QRCode.toCanvas(largeRef.current!, MONOBANK_URL, { width: LARGE, margin: 0 });
    }).catch(() => { });
  }, []);

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a href={MONOBANK_URL} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
        <canvas
          ref={smallRef}
          width={SMALL} height={SMALL}
          style={{ display: 'block', borderRadius: 4, border: `${SMALL_BORDER}px solid #fff` }}
        />
      </a>

      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 8,
        zIndex: 200,
        visibility: hovered ? 'visible' : 'hidden',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        <a href={MONOBANK_URL} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
          <canvas
            ref={largeRef}
            width={LARGE} height={LARGE}
            style={{ display: 'block', borderRadius: LARGE_BORDER, border: `${LARGE_BORDER}px solid #fff` }}
          />
        </a>
      </div>
    </div>
  );
}

const LINKS = [
  { href: '/', label: 'Profile' },
  { href: '/lotteries', label: 'Lotteries' },
  { href: '/feed', label: 'Feed' },
  { href: '/main-ws', label: 'MainWS' },
  { href: '/prize-pool', label: 'Prize Pool' },
];

const AUTH_LINKS = [
  { href: '/history', label: 'History' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/daily-free', label: 'Daily Free' },
  { href: '/promo', label: 'Promo' },
  { href: '/transactions', label: 'Transactions' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [online, setOnline] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const base = new URL(API_URL).origin;
    const s = io(`${base}/system`, { transports: ['websocket'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('system:online', (d: { online: number }) => setOnline(d.online));
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(res => { if (res.ok) setIsLoggedIn(true); })
      .catch(() => { });
  }, []);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#111',
      borderBottom: '1px solid #1f1f1f',
      padding: '4px 1.5rem',
      display: 'flex', alignItems: 'center', gap: '0.25rem',
      minHeight: 83,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginRight: '1.5rem', letterSpacing: '0.02em' }}>
        SkinSlott
      </span>

      {[...LINKS, ...(isLoggedIn ? AUTH_LINKS : [])].map(({ href, label }) => {
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

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
        <NavQrCode />
        <span style={{ color: connected ? '#4ade80' : '#555' }}>
          {connected ? '●' : '○'} /system
        </span>
        <span style={{ color: '#888' }}>
          {online !== null ? `${online} online` : '—'}
        </span>
      </div>
    </nav>
  );
}
