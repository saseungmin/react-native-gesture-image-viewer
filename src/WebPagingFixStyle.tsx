import { Platform } from 'react-native';
import { isFlashListLike, isFlatListLike } from './utils';

type WebPagingFixStyleProps = {
  Component: React.ComponentType<any>;
};

function WebPagingFixStyle({ Component }: WebPagingFixStyleProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  if (isFlatListLike(Component)) {
    return <style>{`[data-flat-list-paging-enabled-fix] > div > div > div {height: 100%;}`}</style>;
  }

  if (isFlashListLike(Component)) {
    return <style>{`[data-flash-list-paging-enabled-fix] > div {height: 100%;}`}</style>;
  }

  return null;
}

export default WebPagingFixStyle;
