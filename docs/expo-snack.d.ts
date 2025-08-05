declare global {
  interface Window {
    ExpoSnack?: {
      initialize?: () => void;
      embed?: (element: HTMLElement) => void;
      reload?: () => void;
    };
  }
}

export {};
