import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType, NavigationType } from 'react-router-dom';

// In-memory registry of scroll positions keyed by history entry key
const scrollPositions = new Map<string, { x: number; y: number }>();

// Read saved position with fallback to sessionStorage
function getSavedPosition(key: string): { x: number; y: number } | null {
  if (scrollPositions.has(key)) {
    return scrollPositions.get(key)!;
  }
  try {
    const raw = sessionStorage.getItem(`sf_scroll_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.y === 'number') {
        scrollPositions.set(key, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

// Persist scroll position
function persistPosition(key: string, pos: { x: number; y: number }) {
  if (!key) return;
  scrollPositions.set(key, pos);
  try {
    sessionStorage.setItem(`sf_scroll_${key}`, JSON.stringify(pos));
  } catch {}
}

let activeRestorationCancel: (() => void) | null = null;

/**
 * Resilient multi-frame scroll restoration runner that smoothly restores
 * target scroll position even when content renders or expands over subsequent frames.
 * Immediately cancels on user interaction (scroll/wheel/touch/keyboard) to never fight the user.
 */
function performScrollRestoration(targetX: number, targetY: number) {
  if (activeRestorationCancel) {
    activeRestorationCancel();
    activeRestorationCancel = null;
  }

  let cancelled = false;
  let rafId: number | null = null;
  const startTime = performance.now();
  const MAX_DURATION_MS = 1200; // Stop checking after 1.2s max

  const cleanup = () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('wheel', handleInteraction, true);
    window.removeEventListener('touchstart', handleInteraction, true);
    window.removeEventListener('pointerdown', handleInteraction, true);
    window.removeEventListener('keydown', handleInteraction, true);
    activeRestorationCancel = null;
  };

  const handleInteraction = () => {
    // User interacted manually - stop restoration immediately
    cleanup();
  };

  const listenerOpts: AddEventListenerOptions = { passive: true, capture: true };
  window.addEventListener('wheel', handleInteraction, listenerOpts);
  window.addEventListener('touchstart', handleInteraction, listenerOpts);
  window.addEventListener('pointerdown', handleInteraction, listenerOpts);
  window.addEventListener('keydown', handleInteraction, listenerOpts);

  activeRestorationCancel = cleanup;

  // Immediate synchronous restoration attempt
  window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });

  let consecutiveStableFrames = 0;

  const step = () => {
    if (cancelled) return;

    // Apply scroll to target
    window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const isAtTarget = Math.abs(window.scrollY - targetY) <= 2;

    // Once target is reached and the document has sufficient height, wait a few frames to confirm stability
    if (isAtTarget && maxScroll >= targetY) {
      consecutiveStableFrames++;
      if (consecutiveStableFrames >= 6) {
        cleanup();
        return;
      }
    } else {
      consecutiveStableFrames = 0;
    }

    if (performance.now() - startTime >= MAX_DURATION_MS) {
      cleanup();
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);
}

/**
 * Route-aware ScrollRestoration and ScrollToTop manager:
 * - Distinguishes between fresh navigations (PUSH/REPLACE) and browser Back/Forward (POP).
 * - On fresh navigation without hash, instantly scrolls to top (0, 0).
 * - On browser Back/Forward (POP), restores the exact saved scroll position for that history entry.
 * - Handles asynchronous DOM rendering and image layout shifts gracefully.
 */
export const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const currentKeyRef = useRef(location.key);

  // Set manual scroll restoration on mount so browser does not clash with SPA restoration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch {}
    }
  }, []);

  // Continuous scroll tracker for current history key
  useEffect(() => {
    currentKeyRef.current = location.key;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentKeyRef.current) {
            persistPosition(currentKeyRef.current, {
              x: window.scrollX,
              y: window.scrollY,
            });
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      // Save scroll position immediately when unmounting or before route changes
      if (currentKeyRef.current) {
        persistPosition(currentKeyRef.current, {
          x: window.scrollX,
          y: window.scrollY,
        });
      }
      window.removeEventListener('scroll', onScroll);
    };
  }, [location.key]);

  // Route change handler: restore on POP, reset to top (or hash) on PUSH/REPLACE
  useEffect(() => {
    if (navType === NavigationType.Pop) {
      const savedPos = getSavedPosition(location.key);
      if (savedPos && (savedPos.y > 0 || savedPos.x > 0)) {
        performScrollRestoration(savedPos.x, savedPos.y);
      } else {
        // Direct initial load or page without prior scroll starts at top
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    } else {
      // PUSH or REPLACE: Fresh navigation
      if (activeRestorationCancel) {
        activeRestorationCancel();
        activeRestorationCancel = null;
      }

      if (location.hash) {
        // Allow time for target hash element to exist in DOM
        const el = document.querySelector(location.hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }

      // Fresh navigation strictly starts at the top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
    }
  }, [location.pathname, location.search, location.hash, location.key, navType]);

  return null;
};
