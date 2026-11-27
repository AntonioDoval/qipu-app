// Server only. Exchanges the stored Google refresh token for a short-lived access token.

export class GoogleRevokedError extends Error {
  constructor() {
    super('Google access was revoked or expired.');
    this.name = 'GoogleRevokedError';
  }
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured on the server.');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (body.error === 'invalid_grant') throw new GoogleRevokedError();
  if (!res.ok || !body.access_token) throw new Error(`Google token request failed (${res.status} ${body.error ?? ''})`);
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 3600 };
}
