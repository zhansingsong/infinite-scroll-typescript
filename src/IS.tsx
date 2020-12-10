import React, {useEffect, useMemo, useRef} from 'react';

type InfiniteScrollProps = {
  /**
   * Name of the element that the component should render as.
   * Defaults to 'div'.
   */
  element?: string;
  /**
   * Whether there are more items to be loaded. Event listeners are removed if false.
   * Defaults to false.
   */
  hasMore?: boolean;
  /**
   * Whether the component should load the first set of items.
   * Defaults to true.
   */
  initialLoad?: boolean;
  /**
   * Whether new items should be loaded when user scrolls to the top of the scrollable area.
   * Default to false.
   */
  isReverse?: boolean;
  /**
   * A callback for when more items are requested by the user.
   * Page param is next page index.
   */
  loadMore(page: number): void;
  /**
   * The number of the first page to load, with the default of 0, the first page is 1.
   * Defaults to 0.
   */
  pageStart?: number;
  /**
   * The distance in pixels before the end of the items that will trigger a call to loadMore.
   * Defaults to 250.
   */
  threshold?: number;
  /**
   * Proxy to the useCapture option of the added event listeners.
   * Defaults to false.
   */
  useCapture?: boolean;
  /**
   * Add scroll listeners to the window, or else, the component's parentNode.
   * Defaults to true.
   */
  useWindow?: boolean;
  /**
   * Loader component for indicating "loading more".
   */
  loader?: React.ReactElement;
  /**
   * Override method to return a different scroll listener if it's not the immediate parent of InfiniteScroll.
   */
  getScrollParent?(): HTMLElement | null;
} & React.HTMLProps<InfiniteScrollProps>;

const InfiniteScrollExtend = (props: InfiniteScrollProps) => {
  const {
    element = 'div',
    hasMore = false,
    initialLoad = true,
    pageStart = 0,
    ref = null,
    threshold = 250,
    useWindow = true,
    isReverse = false,
    useCapture = false,
    loader = null,
    children,
    loadMore = null,
    getScrollParent = null,
    ...restProps
  } = props;

  let isLoadMore: boolean = false;
  let beforeScrollHeight: number = 0;
  let beforeScrollTop: number = 0;
  let pageLoaded: number = 0;

  const scrollComponentRef = useRef<HTMLElement>(null!);
  
  // event listener passive: https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
  // By marking a touch or wheel listener as passive, the developer is promising the handler won't call preventDefault to disable scrolling. 
  type EventListenerOptionsType = AddEventListenerOptions | boolean;
  // 是否支持 passive: https://github.com/WICG/EventListenerOptions/blob/gh-pages/EventListenerOptions.polyfill.js
  function isPassiveSupported(): boolean {
    let supported = false;

    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() {
          supported = true;
        },
      });
      (document as any).addEventListener('test', null, opts);
      (document as any).removeEventListener('test', null, opts);
    } catch (e) {}
    return supported;
  }
  // 处理事件绑定选项
  const eventListenerOptions = (): EventListenerOptionsType => {
    let options: EventListenerOptionsType = useCapture;

    if (isPassiveSupported()) {
      options = {
        capture: useCapture,
        passive: true,
      };
    }
    return options;
  };
  // 只执行一次
  let listenerOptions = useMemo(eventListenerOptions, []);
  useEffect(() => {
    // 更新
    listenerOptions = eventListenerOptions();
  }, []);


  function calculateTopPosition(el: HTMLElement | null): number {
    if (!el) {
      return 0;
    }
    return el.offsetTop + calculateTopPosition(el.offsetParent as HTMLElement);
  }

  function calculateOffset(el: HTMLElement, scrollTop: number): number {
    if (!el) {
      return 0;
    }

    return calculateTopPosition(el) + (el.offsetHeight - scrollTop - window.innerHeight);
  }

  function getParentElement(el: HTMLElement): HTMLElement {
    const scrollParent = getScrollParent && getScrollParent();
    if (scrollParent != null) {
      return scrollParent;
    }
    return el && (el.parentNode as HTMLElement);
  }


  const mousewheelListener: EventListener = (e: Event) => {
    // Prevents Chrome hangups
    // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
    // tells the browser that the wheel listeners will not call preventDefault() and the browser can safely perform scrolling and zooming without blocking on the listeners.
    if ((e as WheelEvent).deltaY === 1 && !isPassiveSupported()) {
      e.preventDefault();
    }
  };
  
  const scrollListener = () => {
    const el = scrollComponentRef.current;
    const scrollEl = window;
    const parentNode = getParentElement(el);

    let offset;
    if (useWindow) {
      const doc = document.documentElement || document.body.parentNode || document.body;
      const scrollTop = scrollEl.pageYOffset !== undefined ? scrollEl.pageYOffset : doc.scrollTop;
      if (isReverse) {
        offset = scrollTop;
      } else {
        offset = calculateOffset(el, scrollTop);
      }
    } else if (isReverse && parentNode) {
      offset = parentNode.scrollTop;
    } else {
      offset = el.scrollHeight - parentNode.scrollTop - parentNode.clientHeight;
    }

    // Here we make sure the element is visible as well as checking the offset
    if (offset < Number(threshold) && el && el.offsetParent !== null) {
      detachScrollListener();
      beforeScrollHeight = parentNode.scrollHeight;
      beforeScrollTop = parentNode.scrollTop;
      // Call loadMore after detachScrollListener to allow for non-async loadMore functions
      if (typeof loadMore === 'function') {
        loadMore((pageLoaded += 1));
        isLoadMore = true;
      }
    }
  };
  const attachScrollListener = () => {
    const parentElement = getParentElement(scrollComponentRef.current);

    if (!hasMore || !parentElement) {
      return;
    }
    let scrollEl: (Node & ParentNode) | typeof window = window;
    if (useWindow === false && parentElement) {
      scrollEl = parentElement;
    }

    scrollEl.addEventListener('mousewheel', mousewheelListener, listenerOptions);
    scrollEl.addEventListener('scroll', scrollListener, listenerOptions);
    scrollEl.addEventListener('resize', scrollListener, listenerOptions);

    if (initialLoad) {
      scrollListener();
    }
  };
  const detachMousewheelListener = () => {
    let scrollEl: (Node & ParentNode) | typeof window = window;
    if (useWindow === false && scrollComponentRef.current.parentNode) {
      scrollEl = scrollComponentRef.current.parentNode;
    }

    scrollEl.removeEventListener('mousewheel', mousewheelListener, listenerOptions);
  };

  const detachScrollListener = () => {
    let scrollEl: (Node & ParentNode) | typeof window = window;
    const parentElement = getParentElement(scrollComponentRef.current);
    if (useWindow === false && parentElement) {
      scrollEl = parentElement;
    }

    scrollEl.removeEventListener('scroll', scrollListener, listenerOptions);
    scrollEl.removeEventListener('resize', scrollListener, listenerOptions);
  };

  useEffect(() => {
    pageLoaded = pageStart === -1 ? 0 : pageStart;
    attachScrollListener();
    return () => {
      detachScrollListener();
      detachMousewheelListener();
    };
  }, [pageStart]);

  useEffect(() => {
    // if (isReverse && isLoadMore) {
    //   const parentElement = getParentElement(scrollComponentRef.current);
    //   parentElement.scrollTop = parentElement.scrollHeight - beforeScrollHeight + beforeScrollTop;
    //   isLoadMore = false;
    // }
    attachScrollListener();
    return () => {
      detachScrollListener();
      detachMousewheelListener();
    };
  });

  const childrenArray = [children];
  if (hasMore) {
    if (loader) {
      isReverse ? childrenArray.unshift(loader) : childrenArray.push(loader);
    }
  }
  return React.createElement(element, {...restProps, ref: scrollComponentRef}, childrenArray);
};

export default InfiniteScrollExtend;
