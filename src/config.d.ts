// Types for config.js, which stays plain JS: its values differ between
// the prod and dev repos' copies (and a local copy may point at dev),
// so it's typed by what it holds, not the exact strings in any one copy.
export const WEB_APP_URL: string;
export const REQUEST_TIMEOUT_MS: number;
export const ENVIRONMENT: string;
