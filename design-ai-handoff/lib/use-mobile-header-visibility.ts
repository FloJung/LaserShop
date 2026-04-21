"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 767;
const TOP_SAFE_ZONE = 144;
const DOWN_THRESHOLD = 28;
const UP_THRESHOLD = 220;
const MIN_SCROLL_DELTA = 3;

export function useMobileHeaderVisibility() {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<"up" | "down" | null>(null);
  const accumulatedUpScrollRef = useRef(0);
  const accumulatedDownScrollRef = useRef(0);
  const tickingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const isHeaderVisibleRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    const syncHeaderVisibility = (nextVisible: boolean) => {
      if (isHeaderVisibleRef.current === nextVisible) {
        return;
      }

      isHeaderVisibleRef.current = nextVisible;
      setIsHeaderVisible(nextVisible);
    };

    const resetAccumulators = () => {
      scrollDirectionRef.current = null;
      accumulatedUpScrollRef.current = 0;
      accumulatedDownScrollRef.current = 0;
    };

    const resetTracking = () => {
      resetAccumulators();
      lastScrollYRef.current = window.scrollY;
    };

    const processScroll = () => {
      tickingRef.current = false;

      if (!mediaQuery.matches) {
        return;
      }

      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      if (currentScrollY < TOP_SAFE_ZONE) {
        resetAccumulators();
        syncHeaderVisibility(true);
        return;
      }

      if (Math.abs(delta) < MIN_SCROLL_DELTA) {
        return;
      }

      if (delta > 0) {
        if (scrollDirectionRef.current !== "down") {
          scrollDirectionRef.current = "down";
          accumulatedDownScrollRef.current = 0;
          accumulatedUpScrollRef.current = 0;
        }

        accumulatedDownScrollRef.current += delta;

        if (isHeaderVisibleRef.current && accumulatedDownScrollRef.current >= DOWN_THRESHOLD) {
          syncHeaderVisibility(false);
          accumulatedDownScrollRef.current = 0;
        }

        return;
      }

      if (scrollDirectionRef.current !== "up") {
        scrollDirectionRef.current = "up";
        accumulatedUpScrollRef.current = 0;
        accumulatedDownScrollRef.current = 0;
      }

      accumulatedUpScrollRef.current += Math.abs(delta);

      if (!isHeaderVisibleRef.current && accumulatedUpScrollRef.current >= UP_THRESHOLD) {
        syncHeaderVisibility(true);
        accumulatedUpScrollRef.current = 0;
      }
    };

    const handleScroll = () => {
      if (!mediaQuery.matches || tickingRef.current) {
        return;
      }

      tickingRef.current = true;
      animationFrameRef.current = window.requestAnimationFrame(processScroll);
    };

    const handleViewportChange = () => {
      syncHeaderVisibility(true);
      resetTracking();
    };

    handleViewportChange();

    window.addEventListener("scroll", handleScroll, { passive: true });
    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mediaQuery.removeEventListener("change", handleViewportChange);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { isHeaderVisible };
}
