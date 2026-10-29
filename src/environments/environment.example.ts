// Copy to environment.ts for local dev, or let scripts/write-env.mjs generate it
// from SUPABASE_URL / SUPABASE_ANON_KEY / SKIP_AUTH (used on Vercel).
// The anon key is public by design; never put server secrets here.
export const environment = {
  production: false,
  skipAuth: false, // set to true to bypass the auth guard locally
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY',
};
