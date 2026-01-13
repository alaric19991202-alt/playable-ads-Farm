export {};

declare global {
  interface Window {
    clickTag?: string;
    mraid?: { open: (url: string) => void };
  }
}
