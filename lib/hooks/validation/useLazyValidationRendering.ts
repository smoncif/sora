'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

export interface UseLazyValidationRenderingParams<T> {
  items: T[];
  initialBatchSize?: number;
  scrollBatchSize?: number;
  threshold?: number;
}

export interface UseLazyValidationRenderingReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  observerRef: React.RefObject<HTMLDivElement>;
  remainingCount: number;
  isLazyActive: boolean;
  loadNext: () => void;
}

export function useLazyValidationRendering<T>({
  items,
  initialBatchSize = 5,
  scrollBatchSize = 3,
  threshold = 10,
}: UseLazyValidationRenderingParams<T>): UseLazyValidationRenderingReturn<T> {
  const isLazyActive = items.length > threshold;
  const initialCount = isLazyActive ? initialBatchSize : items.length;

  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(isLazyActive ? initialBatchSize : items.length);
  }, [items, initialBatchSize, isLazyActive]);

  useEffect(() => {
    if (!isLazyActive || visibleCount >= items.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        setVisibleCount((prev) =>
          Math.min(prev + scrollBatchSize, items.length)
        );
      },
      {
        threshold: 0,
        rootMargin: '200px',
      }
    );

    const target = observerRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, [items.length, isLazyActive, scrollBatchSize, visibleCount]);

  const loadNext = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + scrollBatchSize, items.length));
  }, [items.length, scrollBatchSize]);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  return {
    visibleItems,
    hasMore: visibleCount < items.length,
    observerRef,
    remainingCount: items.length - visibleCount,
    isLazyActive,
    loadNext,
  };
}

