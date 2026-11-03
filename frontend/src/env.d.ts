/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Fixed "today" date for the demo (YYYY-MM-DD); empty = real date */
  readonly VITE_DEMO_DATE?: string
  /** Address of the backend, e.g. /api; empty = demo with a mock server in the browser */
  readonly VITE_API_URL?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
