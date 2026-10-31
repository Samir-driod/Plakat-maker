import { promises as fs } from 'node:fs';
import path from 'node:path';

export function formatLogLine(level, source, message, date = new Date()) {
  return `${date.toISOString()} [${level}] ${source}: ${String(message).replace(/\s+$/, '')}\n`;
}

export function createLogger(dir, { maxBytes = 1_000_000 } = {}) {
  const file = path.join(dir, 'error.log');
  let queue = Promise.resolve();

  function write(line) {
    queue = queue
      .then(async () => {
        await fs.mkdir(dir, { recursive: true });
        try {
          const stat = await fs.stat(file);
          if (stat.size + line.length > maxBytes) await fs.rename(file, `${file}.1`);
        } catch {
          /* brak pliku */
        }
        await fs.appendFile(file, line);
      })
      .catch(() => {});
    return queue;
  }

  return {
    file,
    error: (source, message) => write(formatLogLine('ERROR', source, message)),
    info: (source, message) => write(formatLogLine('INFO', source, message)),
  };
}
