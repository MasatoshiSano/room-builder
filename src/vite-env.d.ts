/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_MODE?: 'server' | 's3';
  readonly VITE_API_URL?: string;
  readonly VITE_AWS_REGION?: string;
  readonly VITE_AWS_BUCKET?: string;
  readonly VITE_AWS_PREFIX?: string;
  readonly VITE_AWS_ACCESS_KEY_ID?: string;
  readonly VITE_AWS_SECRET_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
