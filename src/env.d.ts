/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Fester „Heute“-Tag für die Demo (YYYY-MM-DD); leer = echtes Datum */
  readonly VITE_DEMO_DATE?: string
  /** Adresse des Backends, z. B. /api; leer = Demo mit Schein-Server im Browser */
  readonly VITE_API_URL?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
