export function createBinder(store) {
  const syncs = new Set();

  store.subscribe((doc) => {
    for (const sync of [...syncs]) sync(doc);
  });

  function watch(fn) {
    const sync = (doc) => {
      try {
        fn(doc);
      } catch (err) {
        console.warn('Błąd odświeżania kontrolki:', err);
      }
    };
    syncs.add(sync);
    sync(store.doc);
    return () => syncs.delete(sync);
  }

  function bind(control, { get, set, key = null, history = true }) {
    control.onChange((value) => store.update((doc) => set(doc, value), { key, history }));
    control.onCommit?.(() => store.breakCoalescing());
    return watch((doc) => control.set(get(doc), doc));
  }

  function scope() {
    const owned = [];
    return {
      bind: (control, opts) => {
        owned.push(bind(control, opts));
      },
      watch: (fn) => {
        owned.push(watch(fn));
      },
      dispose() {
        owned.forEach((off) => off());
        owned.length = 0;
      },
    };
  }

  return { bind, watch, scope };
}
