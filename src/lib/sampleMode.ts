// Sample mode: the app runs on the in-memory sample library, without signing in.
// Only possible in local development (`npm run preview:sample`). In a production build
// NODE_ENV is "production", so this is always false on Netlify, whatever the variables say.
export const SAMPLE_MODE =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_QIPU_SAMPLE === '1';
