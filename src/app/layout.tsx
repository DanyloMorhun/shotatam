export const metadata = { title: 'SkinSlott Auth Test' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '800px' }}>
        {children}
      </body>
    </html>
  );
}
