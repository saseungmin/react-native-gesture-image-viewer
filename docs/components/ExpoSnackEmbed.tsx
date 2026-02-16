import { useEffect, useRef } from 'react';

type Props = {
  snackId: string;
  platform?: 'web' | 'ios' | 'android';
  preview?: boolean;
  height?: number | `${number}px`;
};

export function ExpoSnackEmbed({
  snackId,
  platform = 'web',
  preview = true,
  height = '505px',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAndInitialize = async () => {
      try {
        if (!document.querySelector('script[src="https://snack.expo.dev/embed.js"]')) {
          const script = document.createElement('script');
          script.src = 'https://snack.expo.dev/embed.js';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve, reject) => {
            script.addEventListener('load', resolve);
            script.addEventListener('error', reject);
          });
        }
      } catch (error) {
        console.error('Failed to load Expo Snack embed:', error);
      }

      setTimeout(() => {
        if (window.ExpoSnack && containerRef.current) {
          const existingEmbed = containerRef.current.querySelector('iframe');

          if (existingEmbed) {
            existingEmbed.remove();
          }

          if (window.ExpoSnack?.initialize) {
            window.ExpoSnack?.initialize?.();
          }
        }
      }, 100);
    };

    loadAndInitialize();
  }, [snackId]);

  return (
    <div
      ref={containerRef}
      data-snack-id={snackId}
      data-snack-platform={platform}
      data-snack-preview={preview}
      data-snack-theme="dark"
      style={{
        overflow: 'hidden',
        border: '1px solid #282c34',
        borderRadius: '8px',
        height,
        width: '100%',
      }}
    />
  );
}
