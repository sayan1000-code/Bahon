import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    '[supabaseAdmin] Missing SUPABASE_URL (or VITE_SUPABASE_URL) environment variable for Supabase Admin client.'
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Server-side admin operations require SUPABASE_SERVICE_ROLE_KEY in .env.'
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
