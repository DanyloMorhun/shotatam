import Navbar from '@/components/Navbar';

export const metadata = { title: 'SkinSlott Auth Test' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'monospace', margin: 0, background: '#0a0a0a', color: '#e5e7eb' }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
