import { useState, useEffect, useRef } from "react";

export function usePullToRefresh(onRefresh, { threshold = 80 } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentPull = useRef(0);
  const pulling = useRef(false);
  const refreshing = useRef(false);
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    function handleTouchStart(e) {
      if (window.scrollY <= 0 && !refreshing.current) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    }

    function handleTouchMove(e) {
      if (!pulling.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        e.preventDefault();
        currentPull.current = Math.min(diff * 0.5, threshold * 1.5);
        setPullDistance(currentPull.current);
      }
    }

    function handleTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (currentPull.current >= threshold) {
        refreshing.current = true;
        setIsRefreshing(true);
        currentPull.current = 0;
        setPullDistance(0);
        Promise.resolve(callbackRef.current?.()).finally(() => {
          refreshing.current = false;
          setIsRefreshing(false);
        });
      } else {
        currentPull.current = 0;
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [threshold]);

  return { pullDistance, isRefreshing };
}