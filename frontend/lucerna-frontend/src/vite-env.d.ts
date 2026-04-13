/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django API origin, e.g. http://localhost:8000 or http://host.docker.internal:8000 */
  readonly VITE_LUCERNA_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*?raw" {
  const content: string;
  export default content;
}
