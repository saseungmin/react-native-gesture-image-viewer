# React Native Gesture Image Viewer

> [English](./README.md) | 한국어

<div align="center">
  <img src="./assets/logo.png" width="300px" alt="React Native Gesture Image Viewer logo" />
</div>

## 개요

React Native에서 이미지 갤러리나 콘텐츠 뷰어를 구현할 때, 복잡한 제스처 처리와 애니메이션 구현으로 어려움을 겪으신 적이 있으신가요?

기존 라이브러리들은 커스터마이징이 어렵거나 성능 문제가 있었습니다. `react-native-gesture-image-viewer`는 React Native Reanimated와 Gesture Handler를 기반으로 한 고성능 **범용 제스처 뷰어** 라이브러리로, 이미지뿐만 아니라 비디오, 커스텀 컴포넌트 등 모든 콘텐츠에 완전한 커스터마이징과 직관적인 제스처 지원을 제공합니다.

<p align="center">
  <img src="./assets/example.gif" width="600" alt="Gesture and zoom demo" />
</p>

### 주요 특징

- 🤌 **완전한 제스처 지원** - 핀치 줌, 더블 탭 줌, 스와이프 네비게이션, 줌 상태에서의 팬, 세로 드래그로 닫기 지원
- 🏎️ **고성능 애니메이션** - React Native Reanimated 기반의 60fps 이상의 부드럽고 반응성 높은 애니메이션
- 🎨 **완전한 커스터마이징** - 컴포넌트, 스타일, 제스처 동작까지 완벽하게 제어 가능
- 🎛️ **외부 제어 API** - 버튼 등 다른 UI 컴포넌트에서 프로그래밍 방식으로 제어 가능
- 🧩 **다중 인스턴스 관리** - 고유 ID 기반으로 여러 뷰어를 독립적으로 관리
- 🧬 **유연한 통합** - Modal, [React Native Modal](https://www.npmjs.com/package/react-native-modal), ScrollView, FlatList, [FlashList](https://www.npmjs.com/package/@shopify/flash-list), [Expo Image](https://www.npmjs.com/package/expo-image), [FastImage](https://github.com/DylanVann/react-native-fast-image) 등 원하는 컴포넌트 사용
- 🧠 **완벽한 TypeScript 지원** - 타입 추론과 안정성을 갖춘 뛰어난 개발 경험 제공
- 🌐 **크로스 플랫폼 지원** - iOS, Android, Web에서 동작하며 Expo Go 및 New Architecture 지원
- 🪄 **간편한 API** - 복잡한 설정 없이도 직관적이고 쉽게 구현 가능

## 빠른 시작

### 📚 문서

전체 문서는 <https://react-native-gesture-image-viewer.pages.dev>에서 확인할 수 있습니다.

### 예제 및 데모

- [📁 예제 프로젝트](/example/) - 실제 구현 코드와 다양한 사용 사례
- [🤖 Expo Snack](https://snack.expo.dev/@harang/react-native-gesture-image-viewer-v2) - Expo Snack에서 바로 체험

### 기본 사용법

`react-native-gesture-image-viewer`는 완전한 커스터마이징을 위해 제스처 동작에만 집중한 라이브러리입니다.

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, Image, Modal, View, Text, Button, Pressable } from 'react-native';
import {
  GestureViewer,
  GestureTrigger,
  useGestureViewerController,
  useGestureViewerEvent,
  useGestureViewerState,
} from 'react-native-gesture-image-viewer';

function App() {
  const images = [...];
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { goToIndex, goToPrevious, goToNext } = useGestureViewerController();

  const { currentIndex, totalCount } = useGestureViewerState();

  const openModal = (index: number) => {
    setSelectedIndex(index);
    setVisible(true);
  };

  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  useGestureViewerEvent('zoomChange', (data) => {
    console.log(`Zoom changed from ${data.previousScale} to ${data.scale}`);
  });

  return (
    <View>
      {images.map((uri, index) => (
        <GestureTrigger key={uri} onPress={() => openModal(index)}>
          <Pressable>
            <Image source={{ uri }} />
          </Pressable>
        </GestureTrigger>
      ))}
      <Modal transparent visible={visible}>
        <GestureViewer
          data={images}
          initialIndex={selectedIndex}
          renderItem={renderImage}
          ListComponent={ScrollView}
          onDismiss={() => setVisible(false)}
        />
        <View>
          <Button title="Prev" onPress={goToPrevious} />
          <Button title="Jump to index 2" onPress={() => goToIndex(2)} />
          <Button title="Next" onPress={goToNext} />
          <Text>{`${currentIndex + 1} / ${totalCount}`}</Text>
        </View>
      </Modal>
    </View>
  );
}
```

## 기여하기

프로젝트 기여 방법과 개발 환경 설정에 대한 자세한 내용은 [기여 가이드](CONTRIBUTING.md)를 참고해 주세요.

## 라이선스

[MIT](./LICENSE)
