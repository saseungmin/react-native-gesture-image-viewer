import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: 'React Native Gesture Image Viewer',
  icon: '/logo.png',
  logo: '/logo.png',
  logoText: 'React Native Gesture Image Viewer',
  ssg: {
    experimentalWorker: true,
  },
  markdown: {
    showLineNumbers: true,
    defaultWrapCode: false,
    shiki: {
      transformers: [transformerNotationDiff(), transformerNotationHighlight()],
    },
  },
  themeConfig: {
    lastUpdated: true,
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/saseungmin/react-native-gesture-image-viewer',
      },
      {
        icon: 'npm',
        mode: 'link',
        content: 'https://www.npmjs.com/package/react-native-gesture-image-viewer',
      },
    ],
    locales: [
      {
        lang: 'en',
        label: 'English',
        editLink: {
          docRepoBaseUrl: 'https://github.com/saseungmin/react-native-gesture-image-viewer/tree/main/docs/docs',
          text: '📝 Edit this page on GitHub',
        },
      },
      {
        lang: 'ko',
        label: '한국어',
        editLink: {
          docRepoBaseUrl: 'https://github.com/saseungmin/react-native-gesture-image-viewer/tree/main/docs/docs',
          text: '📝 GitHub에서 이 페이지 편집하기',
        },
      },
    ],
  },
});
