import { useMemo } from 'react';
import { Platform } from 'react-native';
import { isFlashListLike, isFlatListLike } from './utils';

type WebPagingFixStyleProps = {
  Component: React.ComponentType<any>;
};

function WebPagingFixStyle({ Component }: WebPagingFixStyleProps) {
  const styleElement = useMemo(() => {
    if (Platform.OS !== 'web' || !Component) {
      return null;
    }

    if (isFlatListLike(Component)) {
      return <style>{`[data-flat-list-paging-enabled-fix] > div > div > div {height: 100%;}`}</style>;
    }

    if (isFlashListLike(Component)) {
      return <style>{`[data-flash-list-paging-enabled-fix] > div {height: 100%;}`}</style>;
    }

    return null;
  }, [Component]);

  return styleElement;
}

export default WebPagingFixStyle;
