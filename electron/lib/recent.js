const same = (a, b) => a.toLowerCase() === b.toLowerCase();

export function addRecent(list, filePath, max = 10) {
  return [filePath, ...list.filter((p) => !same(p, filePath))].slice(0, max);
}

export function removeRecent(list, filePath) {
  return list.filter((p) => !same(p, filePath));
}
