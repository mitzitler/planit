// Generates src/environments/environment.ts before build/test.
// - If SUPABASE_URL and SUPABASE_ANON_KEY are set (e.g. on Vercel), write from them.
// - Else if environment.ts already exists (local dev), leave it alone.
// - Else copy environment.example.ts so a clean clone still compiles.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';

const target = 'src/environments/environment.ts';
const example = 'src/environments/environment.example.ts';
const { SUPABASE_URL, SUPABASE_ANON_KEY, SKIP_AUTH, VERCEL_ENV } = process.env;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  const env = {
    production: VERCEL_ENV === 'production',
    skipAuth: SKIP_AUTH === 'true',
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
  };
  writeFileSync(target, `export const environment = ${JSON.stringify(env, null, 2)};\n`);
  console.log(`write-env: wrote ${target} from env vars`);
} else if (existsSync(target)) {
  console.log(`write-env: keeping existing ${target}`);
} else {
  copyFileSync(example, target);
  console.log(`write-env: copied ${example} -> ${target} (placeholder values)`);
}
