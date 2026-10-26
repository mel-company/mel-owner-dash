import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Shared state for the modals in ./index.tsx, kept apart so that file only
// exports components (fast refresh).

/** How long the exit animation in index.css runs before the modal unmounts. */
const MODAL_EXIT_MS = 200;

/**
 * Modals open on top of one another (a confirm over a drawer), so Escape
 * should only close the one on top. Each open modal pushes its id here.
 */
const openModals: number[] = [];
let nextModalId = 0;

/**
 * Plays the exit animation before calling `onClose`.
 *
 * Every page renders its modal as `{open && <SideDrawer … />}`, so the parent
 * unmounts it the moment `onClose` runs and nothing could ever animate out.
 * Closing goes through `requestClose`, which sets `data-closing` (see the
 * modal styles in index.css) and calls the real `onClose` once it has played.
 * `locked` keeps the modal open while it is saving.
 */
export const useModalExit = (onClose: () => void, locked = false) => {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  });

  const requestClose = useCallback((then?: () => void) => {
    if (lockedRef.current || timer.current !== undefined) return;
    setClosing(true);
    timer.current = window.setTimeout(() => {
      (then ?? onCloseRef.current)();
      // Normally the parent has unmounted us by now. If its onClose declined
      // (a refund still running, say), come back instead of staying invisible
      // on top of the page.
      timer.current = undefined;
      setClosing(false);
    }, MODAL_EXIT_MS);
  }, []);

  useEffect(() => {
    const id = nextModalId++;
    openModals.push(id);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openModals[openModals.length - 1] === id) requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      window.clearTimeout(timer.current);
    };
  }, [requestClose]);

  return { closing, requestClose };
};

/**
 * Runs an action and reports whether it is still going, so a button can show
 * a spinner and refuse a second click. An action that returns nothing (or
 * not a promise) finishes immediately.
 */
export const usePending = () => {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(async (action: () => unknown) => {
    if (pendingRef.current) return;
    const result = action();
    if (!(result instanceof Promise)) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await result;
    } catch {
      // The action reports its own errors; this only tracks that it ended.
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  return [pending, run] as const;
};

/** Set by DrawerForm while its submit handler's promise is unsettled. */
export const FormPendingContext = createContext(false);

/** Lets DrawerFooter's cancel button close its SideDrawer with the animation. */
export const ModalCloseContext = createContext<((then?: () => void) => void) | null>(null);

/**
 * Closes the SideDrawer or ModalOverlay this is rendered in, with its exit
 * animation; null outside one. `then` replaces the modal's own onClose.
 */
export const useModalClose = () => useContext(ModalCloseContext);

