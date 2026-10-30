let counter = 0;

export function newId(prefix = 'el') {
  counter = (counter + 1) % 1679616;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${time}${counter.toString(36)}${rand}`;
}
