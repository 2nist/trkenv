// Theme API has been archived/disabled. Keep declarations so imports do not error.
declare module '/theme/theme-api.mjs' {
  /** Archived: no-op in this build */
  export function trkSetTheme(name: string): Promise<void> | void;
  /** Archived: no-op in this build */
  export function trkLoadCurrent(): Promise<void> | void;
}

declare global {
  interface Window {
    trkSetTheme?: (name: string) => void | Promise<void>;
    trkLoadCurrent?: () => void | Promise<void>;
  }
}

export {};

// also declare a wildcard for any /theme/* imports to prevent TypeScript errors
declare module '/theme/*' {
  const _default: any;
  export default _default;
}
