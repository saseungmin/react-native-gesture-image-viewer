import { useEffect, useState } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 767px), (hover: none) and (pointer: coarse)';
const VIDEO_URL =
  'https://github.com/saseungmin/react-native-gesture-image-viewer/releases/download/demo-video/demo-video.mov';
const WEBP_URL =
  'https://cdn.jsdelivr.net/gh/saseungmin/react-native-gesture-image-viewer@021e9025d21fb275c47addca0f7d96cca363bb1b/assets/example.webp';

const mediaStyle = {
  display: 'block',
  width: '100%',
  maxWidth: 672,
  maxHeight: 480,
  objectFit: 'contain',
  margin: '0 auto',
} as const;

const placeholderStyle = {
  width: '100%',
  maxWidth: 672,
  aspectRatio: '960 / 686',
  margin: '0 auto',
} as const;

export function ResponsiveDemo() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const updateMedia = () => setIsMobile(mediaQuery.matches);

    updateMedia();
    mediaQuery.addEventListener('change', updateMedia);

    return () => mediaQuery.removeEventListener('change', updateMedia);
  }, []);

  if (isMobile === null) {
    return <div aria-hidden style={placeholderStyle} />;
  }

  if (isMobile || videoFailed) {
    return <img src={WEBP_URL} alt="Gesture image viewer demo" style={mediaStyle} />;
  }

  return (
    <video
      src={VIDEO_URL}
      controls
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      onError={() => setVideoFailed(true)}
      style={mediaStyle}
    />
  );
}
