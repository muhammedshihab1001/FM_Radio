/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // Typed as string (not optional) only because protected useAdmin.ts passes them
  // straight to string params; these must move server-side (STANDARDS_REPORT: SEC-1).
  readonly VITE_ADMIN_USER: string;
  readonly VITE_ADMIN_PASS: string;
  readonly VITE_ADMIN_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
