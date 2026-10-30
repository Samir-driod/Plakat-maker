import { HISTORY_LIMIT, COALESCE_MS } from './constants.js';

export function createHistory({ limit = HISTORY_LIMIT, coalesceMs = COALESCE_MS, now = () => Date.now() } = {}) {
  let past = [];
  let future = [];
  let lastKey = null;
  let lastTime = 0;

  return {
    record(snapshot, key = null) {
      const t = now();
      if (key && key === lastKey && t - lastTime < coalesceMs) {
        lastTime = t;
        return;
      }
      past.push(snapshot);
      if (past.length > limit) past.shift();
      future = [];
      lastKey = key;
      lastTime = t;
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      lastKey = null;
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      lastKey = null;
      return future.pop();
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past = [];
      future = [];
      lastKey = null;
    },
    breakCoalescing() {
      lastKey = null;
    },
  };
}
