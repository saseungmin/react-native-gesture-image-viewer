# React Native Gesture Image Viewer

> [English](./README.md) | 한국어

## 개요

React Native에서 이미지 갤러리나 콘텐츠 뷰어를 구현할 때, 복잡한 제스처 처리와 애니메이션 구현으로 어려움을 겪으신 적이 있으신가요?

기존 라이브러리들은 커스터마이징이 어렵거나 성능 문제가 있었습니다. `react-native-gesture-image-viewer`는 React Native Reanimated와 Gesture Handler를 기반으로 한 고성능 **범용 제스처 뷰어** 라이브러리로, 이미지뿐만 아니라 비디오, 커스텀 컴포넌트 등 모든 콘텐츠에 완전한 커스터마이징과 직관적인 제스처 지원을 제공합니다.

### 주요 특징

- ✅ **완전한 제스처 지원** - 핀치 줌, 더블탭 줌, 스와이프 네비게이션, 수직 드래그 종료
- ✅ **고성능 애니메이션** - React Native Reanimated 기반 60fps 부드러운 애니메이션
- ✅ **완전한 커스터마이징** - 컴포넌트, 스타일, 동작 모든 것을 사용자 정의 가능
- ✅ **외부 제어 API** - 버튼이나 다른 컴포넌트에서 프로그래밍 방식으로 제어
- ✅ **다중 인스턴스 관리** - ID 기반으로 여러 뷰어를 독립적으로 관리
- ✅ **유연한 통합** - FlatList, FlashList, Expo Image, FastImage 등 원하는 컴포넌트 사용
- ✅ **TypeScript 완전 지원** - 타입 안정성과 개발자 경험 향상
- ✅ **크로스 플랫폼** - iOS, Android, Web 모든 플랫폼 지원
- ✅ **사용하기 쉬운 API** - 직관적이고 간단한 구현, 복잡한 설정 불필요
- ✅ **다양한 환경 지원** - Expo Go, New Architecture 지원

## 빠른 시작

### 예제 및 데모
- [📁 예제 프로젝트](/example/) - 실제 구현 코드와 다양한 사용 사례
- [🤖 Expo Go](https://snack.expo.dev/@harang/react-native-gesture-image-viewer) - Snack Expo에서 바로 체험

### 사전 준비

> [!IMPORTANT]
> `react-native-gesture-image-viewer`는 고성능 뷰어 라이브러리로 [`react-native-reanimated`](https://www.npmjs.com/package/react-native-reanimated)와 [`react-native-gesture-handler`](https://www.npmjs.com/package/react-native-gesture-handler)를 기반으로 합니다.    
> 따라서 사용하기 전에 React Native Reanimated와 Gesture Handler를 필수적으로 설치해야 합니다. 자세한 가이드는 해당 라이브러리 공식 문서를 참고해주세요.

```bash
npm install react-native-reanimated
npm install react-native-gesture-handler
```

#### 필수 요구사항

|라이브러리|최소 버전|
|:--|:--:|
|`react`|`>=18.0.0`|
|`react-native`|`>=0.75.0`|
|`react-native-gesture-handler`|`>=2.24.0`|
|`react-native-reanimated`|`>=3.0.0`|

#### [React Native Reanimated 설정](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/)

`babel.config.js`에 다음과 같이 plugin을 추가해주세요.

```js
// babel.config.js
module.exports = {
  presets: [
    ... // don't add it here :)
  ],
  plugins: [
    ...
    // for web
    '@babel/plugin-proposal-export-namespace-from',
    // react-native-reanimated/plugin has to be listed last.
    'react-native-reanimated/plugin',
  ],
};
```

`metro.config.js`에 기본 구성 함수를 `wrapWithReanimatedMetroConfig`로 래핑해주세요.

```js
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const config = {
  // Your existing Metro configuration options
};

module.exports = wrapWithReanimatedMetroConfig(config);
```

#### [react-native-gesture-handler 설정](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation)

- `react-native-gesture-handler`는 기본적으로 추가할 설정은 없지만, 공식 문서를 참고하여 환경에 맞게 설치해주세요.
- [안드로이드 환경의 모달에서 제스처를 사용](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation#android)하려면 모달의 콘텐츠를 `GestureHandlerRootView`로 래핑해야 정상적으로 동작하지만, 라이브러리 내부에 이미 `GestureHandlerRootView`가 래핑되어 있어 모달 사용 시 추가로 래핑할 필요가 없습니다.

### 설치

```bash
# npm
npm install react-native-gesture-image-viewer

# pnpm
pnpm add react-native-gesture-image-viewer

# yarn
yarn add react-native-gesture-image-viewer

# bun
bun add react-native-gesture-image-viewer
```

## 사용법

### 기본 사용법

`react-native-gesture-image-viewer`는 완전한 커스터마이징을 위해 제스처 동작에만 집중한 라이브러리입니다.   
따라서 다음과 같이 원하는 `Modal`을 사용하여 뷰어를 만들 수 있습니다.   

```tsx
import { Image, Modal } from 'react-native';
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  const images = [...];
  const [visible, setVisible] = useState(false);

  // 성능 최적화를 위해 useCallback으로 감싸주세요.
  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  return (
    <Modal visible={visible} onRequestClose={() => setVisible(false)}>
      <GestureImageViewer
        data={images}
        renderImage={renderImage}
        onDismiss={() => setVisible(false)}
      />
    </Modal>
  );
}
```

### 제스처 기능

`react-native-gesture-image-viewer`는 뷰어에 필요한 다양한 제스처를 지원합니다. 모든 제스처는 기본적으로 활성화되어 있습니다.

```tsx
function App() {
  return (
    <GestureImageViewer
      data={images}
      renderImage={renderImage}
      enableDismissGesture
      enableSwipeGesture
      enableZoomGesture
      enableDoubleTapGesture
      enableZoomPanGesture
    />
  )
}
```

|속성|설명|기본값|
|:--:|:-----|:--:|
|`enableDismissGesture`|아래로 슬라이드 제스처 시 `onDismiss` 함수를 호출합니다. 보통 아래로 슬라이드 시 모달을 닫을 때 유용하게 활용할 수 있습니다.|`true`|
|`enableSwipeGesture`|좌우 슬라이드 제스처를 제어할 수 있습니다. `false`일 경우 좌우 제스처는 비활성화됩니다.|`true`|
|`enableZoomGesture`|두 손가락을 활용한 제스처를 제어할 수 있습니다. `false` 시 두 손가락을 활용한 줌 제스처는 비활성화됩니다.|`true`|
|`enableDoubleTapGesture`|더블 터치 시 줌 제스처를 제어할 수 있습니다. `false` 시 더블 터치 줌 제스처는 비활성화됩니다.|`true`|
|`enableZoomPanGesture`|줌이 활성화되었을 때만 동작하며, 줌 활성화 시 아이템 위치를 이동할 수 있습니다. `false` 시 줌 활성화 시 제스처 이동이 비활성화됩니다.|`true`|

### 커스텀 컴포넌트

`react-native-gesture-image-viewer`는 강력한 기능으로 완벽한 컴포넌트 커스터마이징이 가능합니다. 이미지뿐만 아니라 원하는 컴포넌트로 제스처를 지원하는 아이템을 만들 수 있습니다.   

#### 리스트 컴포넌트

`ListComponent` props를 통해 `FlatList`, `FlashList`, `ScrollView`(⚠️ 지원 예정) 등 원하는 리스트를 지원합니다.   
또한, `listProps`를 통해 기본적으로 지원하는 각각의 리스트 컴포넌트의 props를 커스텀할 수 있습니다.

```tsx
function App() {
  return (
    <GestureImageViewer
      data={images}
      ListComponent={FlatList}
      listProps={{
        // ....
      }}
    />
  );
}
```

#### 콘텐츠 컴포넌트

`renderImage` props를 통해 `expo-image`, `FastImage` 등 다양한 종류의 콘텐츠 컴포넌트를 주입하여 제스처를 사용할 수 있습니다.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';
import { Image } from 'expo-image';

function App() {
  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />;
  }, []);

  return (
    <GestureImageViewer
      data={images}
      renderImage={renderImage}
    />
  );
}
```

### 외부 제어 API

`react-native-gesture-image-viewer`는 강력한 기능으로 버튼이나 다른 컴포넌트에서 프로그래밍 방식으로 제어할 수 있는 hook을 지원합니다.

```tsx
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

function App() {
  const { goToIndex, goToPrevious, goToNext, currentIndex, totalCount } = useImageViewerController();

  return (
    <View>
      <GestureImageViewer
        data={images}
        renderImage={renderImage}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          gap: 10,
          flexDirection: 'column',
        }}
      >
        <Feather.Button name="chevron-left" onPress={goToPrevious} />
        <Button title="Jump to index 2" onPress={() => goToIndex(2)} />
        <Feather.Button name="chevron-right" onPress={goToNext} />
        <Text>{`${currentIndex + 1} / ${totalCount}`}</Text>
      </View>
    </View>
  );
}
```

### 스타일 커스터마이징

`GestureImageViewer`의 스타일을 커스터마이징할 수 있습니다.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  return (
    <GestureImageViewer
      animateBackdrop={false}
      width={400}
      itemSpacing={20}
      containerStyle={{ /* ... */ }}
      backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.90)' }}
      renderContainer={(children) => <View style={{ flex: 1 }}>{children}</View>}
    />
  );
}
```

|속성|설명|기본값|
|:--:|:-----|:--:|
|`animateBackdrop`|기본적으로 아래로 슬라이드 제스처 시 배경의 `opacity` 값이 1부터 0까지 서서히 감소합니다. `false` 시 이러한 애니메이션을 비활성화합니다.|`true`|
|`width`|콘텐츠 아이템의 너비 값입니다. 기본값은 window 너비입니다.|`Dimensions width`|
|`itemSpacing`|콘텐츠 아이템 사이의 값을 지정할 수 있습니다.|`0`|
|`containerStyle`|리스트 컴포넌트를 감싸고 있는 컨테이너 스타일을 커스텀하게 수정할 수 있습니다.|`flex: 1`|
|`backdropStyle`|뷰어 배경의 스타일을 커스터마이징할 수 있습니다.|`backgroundColor: black; StyleSheet.absoluteFill;`|
|`renderContainer`|`<GestureImageViewer />`를 감싸는 래퍼 컴포넌트를 커스텀하여 적용할 수 있습니다.||

### 다중 인스턴스 관리

여러 개의 `GestureImageViewer` 인스턴스를 효율적으로 관리하고 싶은 경우 `id` 값을 적용하면 여러 개의 `GestureImageViewer`를 사용할 수 있습니다.   
`GestureImageViewer`는 컴포넌트가 언마운트되면 메모리에서 자동으로 인스턴스가 제거되어 메모리 관리를 수동으로 할 필요가 없습니다.   

> `id` 기본값은 `default`입니다.

```tsx
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

const firstViewerId = 'firstViewerId';
const secondViewerId = 'secondViewerId';

function App() {
  const { currentIndex: firstCurrentIndex, totalCount: firstTotalCount } = useImageViewerController(firstViewerId);
  const { currentIndex: secondCurrentIndex, totalCount: secondTotalCount } = useImageViewerController(secondViewerId);

  return (
    <View>
      <GestureImageViewer
        id={firstViewerId}
        data={images}
        renderImage={renderImage}
      />
      <GestureImageViewer
        id={secondViewerId}
        data={images}
        renderImage={renderImage}
      />
    </View>
  );
}
```

### 기타 Props

#### `onIndexChange`
`index` 값이 변경될 때 `onIndexChange` 콜백함수가 호출됩니다.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <GestureImageViewer
      onIndexChange={setCurrentIndex}
    />
  );
}
```

#### `initialIndex` (기본값: `0`)
초기 인덱스값을 설정할 수 있습니다.

#### `dismissThreshold` (기본값: `80`)
`dismissThreshold`는 수직 제스처 시 임계값을 적용하여 `onDismiss` 호출 시점을 제어할 수 있습니다.

#### `resistance` (기본값: `2`)
`resistance`는 수직 제스처 시 저항값을 적용하여 수직으로 이동하는 범위를 제어할 수 있습니다.

#### `maxZoomScale` (기본값: `2`)
최대 가능한 줌의 배수를 제어할 수 있습니다.

## 성능 최적화 팁

- `renderImage` 함수는 `useCallback`으로 감싸서 불필요한 리렌더링을 방지하세요.
- 대용량 이미지의 경우 `FastImage`나 `expo-image` 사용을 권장합니다.
- 많은 수의 이미지를 다룰 때는 `FlashList` 사용을 권장합니다.
- 디바이스에서 테스트하세요. (시뮬레이터에서는 성능이 제한될 수 있습니다.)

## 기여하기

프로젝트 기여 방법과 개발 환경 설정에 대한 자세한 내용은 [기여 가이드](CONTRIBUTING.md)를 참고해 주세요.

## 라이선스

[MIT](./LICENSE)
