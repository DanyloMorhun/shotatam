const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function HomePage() {
  return (
    <main>
      <h1>SkinSlott Auth Test</h1>
      <p>Clicking the button will redirect to Steam OpenID via the backend.</p>
      <a href={`${API_URL}/api/auth/steam?age=1&terms=1&privacy=1`}>
        <button>Login with Steam</button>
      </a>
    </main>
  );
}
