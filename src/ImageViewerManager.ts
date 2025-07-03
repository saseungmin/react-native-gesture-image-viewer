export type ImageViewerManagerState = {
  currentIndex: number;
  dataLength: number;
};

class ImageViewerManager {
  private currentIndex = 0;
  private dataLength = 0;
  private flatListRef: any = null;
  private enableSwipeGesture = true;
  private listeners = new Set<(state: ImageViewerManagerState) => void>();

  // private updateState(newState: Partial<any>) {
  //   Object.assign(this, newState);
  //   this.notifyListeners();
  // }

  private notifyListeners() {
    const state = this.getState();

    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: (state: ImageViewerManagerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  unsubscribe(listener: (state: ImageViewerManagerState) => void) {
    this.listeners.delete(listener);
  }

  getState() {
    return {
      currentIndex: this.currentIndex,
      dataLength: this.dataLength,
    };
  }

  setFlatListRef(ref: any) {
    this.flatListRef = ref;
  }

  setDataLength(length: number) {
    this.dataLength = length;
  }

  setEnableSwipeGesture(enabled: boolean) {
    this.enableSwipeGesture = enabled;
  }

  setCurrentIndex(index: number) {
    if (index !== this.currentIndex) {
      this.currentIndex = index;
    }
  }

  notifyStateChange() {
    this.notifyListeners();
  }

  goToIndex = (index: number) => {
    if (index < 0 || index >= this.dataLength || !this.enableSwipeGesture || !this.flatListRef) {
      return;
    }

    this.currentIndex = index;
    this.flatListRef.scrollToIndex({ index, animated: true });
    this.notifyListeners();
  };

  goToPrevious = () => {
    if (this.currentIndex > 0) {
      this.goToIndex(this.currentIndex - 1);
    }
  };

  goToNext = () => {
    if (this.currentIndex < this.dataLength - 1) {
      this.goToIndex(this.currentIndex + 1);
    }
  };

  cleanUp() {
    this.listeners.clear();
    this.flatListRef = null;
    this.enableSwipeGesture = true;
    this.currentIndex = 0;
    this.dataLength = 0;
  }
}

export default ImageViewerManager;
