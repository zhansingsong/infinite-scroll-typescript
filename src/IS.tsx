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

  type beforeSizeType = {
    scrollHeight: number;
    scrollTop: number;
  };

  const scrollComponentRef = useRef<HTMLElement>(null!);
  const isLoadMoreRef = useRef<boolean>(false);
  const pageLoadedRef = useRef<number>(0);
  const beforeSizeRef = useRef<beforeSizeType>({scrollHeight: 0, scrollTop: 0});
  const scrollContainerRef = useRef<Element | typeof window>(window);

  // event listener passive: https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
  // By marking a touch or wheel listener as passive, the developer is promising the handler won't call preventDefault to disable scrolling.
  type EventListenerOptionsType = AddEventListenerOptions | boolean;
  const listenerOptionsRef = useRef<EventListenerOptionsType>(false);
  // 是否支持 passive: https://github.com/WICG/EventListenerOptions/blob/gh-pages/EventListenerOptions.polyfill.js
  function isPassiveSupported(): boolean {
    let supported = false;

    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() {
          supported = true;
          return supported;
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
  listenerOptionsRef.current = useMemo(eventListenerOptions, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // 更新
    listenerOptionsRef.current = eventListenerOptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function calculateTopPosition(el: HTMLElement | null): number {
    if (el === null) {
      return 0;
    }
    return el.offsetTop + calculateTopPosition(el.offsetParent as HTMLElement);
  }

  function calculateOffset(el: HTMLElement, scrollTop: number): number {
    if (el === null) {
      return 0;
    }
    let res = calculateTopPosition(el) + (el.offsetHeight - scrollTop - window.innerHeight);
    return res;
  }

  function getParentElement(el: Element): Element {
    const scrollParent = getScrollParent && getScrollParent();
    if (scrollParent !== null) {
      return scrollParent;
    }
    return el && (el.parentNode as Element);
  }

  const mousewheelListener: EventListener = (e: Event) => {
    // Prevents Chrome hangups
    // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
    if ((e as WheelEvent).deltaY === 1 && !isPassiveSupported()) {
      e.preventDefault();
    }
  };

  const scrollListener = () => {
    // 做兼容处理
    const el = scrollComponentRef.current;
    const win = scrollContainerRef.current as Window;
    const parentNode = scrollContainerRef.current as Element;

    let offset;
    if (useWindow) {
      const doc = document.documentElement || document.body.parentNode || document.body;
      const scrollTop = win.pageYOffset !== undefined ? win.pageYOffset : doc.scrollTop;
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
    if (offset <= Number(threshold) && el && el.offsetParent !== null) {
      // detachScrollListener();
      if (isReverse) {
        beforeSizeRef.current.scrollHeight = el.scrollHeight;
        beforeSizeRef.current.scrollTop = offset;
      }
      // Call loadMore after detachScrollListener to allow for non-async loadMore functions
      if (typeof loadMore === 'function') {
        loadMore((pageLoadedRef.current += 1));
        isLoadMoreRef.current = true;
      }
    }
  };
  const attachScrollListener = () => {
    // if (!hasMore) {
    //   return;
    // }
    console.log('attachScrollListener');
    scrollContainerRef.current.addEventListener('mousewheel', mousewheelListener, listenerOptionsRef.current);
    scrollContainerRef.current.addEventListener('scroll', scrollListener, listenerOptionsRef.current);
    scrollContainerRef.current.addEventListener('resize', scrollListener, listenerOptionsRef.current);
  };
  const detachScrollListener = () => {
    scrollContainerRef.current.removeEventListener('mousewheel', mousewheelListener, listenerOptionsRef.current);
    scrollContainerRef.current.removeEventListener('scroll', scrollListener, listenerOptionsRef.current);
    scrollContainerRef.current.removeEventListener('resize', scrollListener, listenerOptionsRef.current);
  };

  useEffect(() => {
    pageLoadedRef.current = pageStart === -1 ? 0 : pageStart;
    const parentElement = getParentElement(scrollComponentRef.current);
    if (useWindow === false && parentElement) {
      scrollContainerRef.current = parentElement;
    }
    attachScrollListener();
    if (initialLoad) {
      scrollListener();
    }
    console.log('first useEffect', pageLoadedRef.current);
    return () => {
      detachScrollListener();
    };
  }, [pageStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isReverse && isLoadMoreRef.current) {
      if (typeof scrollContainerRef.current.scrollTo === 'function') {
        scrollContainerRef.current.scrollTo(
          0,
          scrollComponentRef.current.scrollHeight - beforeSizeRef.current.scrollHeight + beforeSizeRef.current.scrollTop
        );
      } else {
        (scrollContainerRef.current as Element).scrollTop =
          scrollComponentRef.current.scrollHeight -
          beforeSizeRef.current.scrollHeight +
          beforeSizeRef.current.scrollTop;
      }
      isLoadMoreRef.current = false;
    }
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
