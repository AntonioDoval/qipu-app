'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { C } from '@/lib/tokens';

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<'options' | 'email'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid email profile https://www.googleapis.com/auth/drive.file',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage('Revisá tu email para confirmar la cuenta.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // On success middleware redirects to /library
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: C.paper,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Lora', Georgia, serif",
    }}>
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>

        {/* Logo / title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 48,
            fontWeight: 600,
            color: C.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: 8,
          }}>
            Qipu
          </h1>
          <p style={{ color: C.stone, fontSize: 14 }}>
            Espacio de trabajo para investigación
          </p>
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          background: C.cream,
          border: `1px solid ${C.sand}`,
          borderRadius: 12,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>

          {mode === 'options' && (
            <>
              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: C.accent,
                  color: C.paper,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Lora', Georgia, serif",
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 120ms',
                }}
              >
                <GoogleIcon />
                Continuar con Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: C.sand }} />
                <span style={{ fontSize: 12, color: C.stone }}>o</span>
                <div style={{ flex: 1, height: 1, background: C.sand }} />
              </div>

              {/* Email option */}
              <button
                onClick={() => setMode('email')}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: 'transparent',
                  color: C.ink,
                  border: `1px solid ${C.sand}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Lora', Georgia, serif",
                  cursor: 'pointer',
                  transition: 'border-color 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.stone)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.sand)}
              >
                Continuar con email
              </button>
            </>
          )}

          {mode === 'email' && (
            <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={() => { setMode('options'); setError(null); }}
                style={{ background: 'none', border: 'none', color: C.stone, fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0, marginBottom: 4 }}
              >
                ← Volver
              </button>

              <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 500, color: C.ink, marginBottom: 4 }}>
                {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
              </h2>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />

              <button type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
                {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>

              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                style={{ background: 'none', border: 'none', color: C.stone, fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                {isSignUp ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Creá una'}
              </button>
            </form>
          )}

          {error && (
            <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>
          )}
          {message && (
            <p style={{ fontSize: 13, color: C.accent, margin: 0 }}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: C.paper,
  border: `1px solid ${C.sand}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'Lora', Georgia, serif",
  color: C.ink,
  outline: 'none',
};

const primaryBtnStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '11px 16px',
  background: C.accent,
  color: C.paper,
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'Lora', Georgia, serif",
  fontWeight: 500,
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1,
});

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" fillOpacity=".9"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" fillOpacity=".9"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" fillOpacity=".9"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" fillOpacity=".9"/>
    </svg>
  );
}
