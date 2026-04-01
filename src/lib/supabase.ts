/**
 * Supabase client and authentication bootstrap helpers.
 *
 * Architectural role:
 * - Creates a single shared Supabase client instance for the whole frontend.
 * - Ensures the app always has an authenticated (anonymous) user before data queries run.
 *
 * Why this matters:
 * - Row Level Security policies in Postgres use `auth.uid()`.
 * - Without a user session, every protected query would fail.
 */
import { createClient } from '@supabase/supabase-js';

// Vite exposes env vars on `import.meta.env`.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast on missing configuration so errors are obvious during setup.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

/**
 * Shared browser client.
 * - `persistSession: true` keeps user logged in across page refreshes.
 * - `autoRefreshToken: true` refreshes JWT tokens when needed.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Ensure an authenticated user exists.
 *
 * Flow:
 * 1) Try to read an existing session.
 * 2) If not present, create an anonymous session.
 * 3) Return the authenticated `user` object for downstream logic.
 */
export async function ensureGuestSession() {
  const { data: sessionData } = await supabase.auth.getSession();

  // Fast path: already signed in.
  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  // Slow path: create a new anonymous user.
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  // Defensive guard: API should return user, but we validate explicitly.
  if (!data.user) {
    throw new Error('Anonymous sign-in did not return a user.');
  }

  return data.user;
}
