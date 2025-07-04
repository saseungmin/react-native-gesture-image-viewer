export type GestureViewerManagerState = {
  currentIndex: number;
  dataLength: number;
};

class GestureViewerManager {
  private currentIndex = 0;
  private dataLength = 0;
  private width = 0;
  private listRef: any | null = null;
  private enableSwipeGesture = true;
  private listeners = new Set<(state: GestureViewerManagerState) => void>();

  // private updateState(newState: Partial<any>) {
  //   Object.assign(this, newState);
  //   this.notifyListeners();
  // }

  private notifyListeners() {
    const state = this.getState();

    this.listeners.forEach((listener) => listener(state));
  }

  subscribe(listener: (state: GestureViewerManagerState) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return {
      currentIndex: this.currentIndex,
      dataLength: this.dataLength,
    };
  }

  setWidth(width: number) {
    this.width = width;
  }

  setListRef(ref: any) {
    this.listRef = ref;
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
    if (index < 0 || index >= this.dataLength || !this.enableSwipeGesture || !this.listRef) {
      return;
    }

    this.currentIndex = index;

    if (this.listRef.scrollToIndex) {
      this.listRef.scrollToIndex({ index, animated: true });
    } else if (this.listRef.scrollTo) {
      this.listRef.scrollTo({ x: index * this.width, animated: true });
    }

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
    this.listRef = null;
    this.enableSwipeGesture = true;
    this.currentIndex = 0;
    this.dataLength = 0;
  }
}

export default GestureViewerManager;
