export function createSelection() {
  let ids = [];
  let cropId = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn({ ids, cropId }));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  return {
    get ids() { return ids; },
    get cropId() { return cropId; },
    has: (id) => ids.includes(id),

    set(nextIds) {
      const next = [...new Set(nextIds)];
      if (same(next, ids) && (cropId === null || next.includes(cropId))) return;
      ids = next;
      if (!ids.includes(cropId)) cropId = null;
      emit();
    },

    toggle(id) {
      this.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    },

    clear() {
      this.set([]);
    },

    setCrop(id) {
      if (cropId === id) return;
      cropId = id;
      if (id && !ids.includes(id)) ids = [id];
      emit();
    },

    prune(doc) {
      const next = ids.filter((id) => doc.elements[id]);
      const nextCrop = cropId && doc.elements[cropId] ? cropId : null;
      if (same(next, ids) && nextCrop === cropId) return;
      ids = next;
      cropId = nextCrop;
      emit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
