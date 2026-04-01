/**
 * Vite ambient type declarations.
 *
 * This gives TypeScript knowledge of Vite-specific globals such as `import.meta.env`.
 * Without it, env access in files like `src/lib/supabase.ts` would raise type errors.
 */
/// <reference types="vite/client" />
