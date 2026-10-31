import { promises as fs } from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
let counter = 0;

export async function atomicWrite(filePath, data, { backup = false, retries = 3 } = {}) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  counter = (counter + 1) % 100000;
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${counter}.tmp`);
  const handle = await fs.open(tmp, 'w');
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (backup) {
    try {
      await fs.copyFile(filePath, `${filePath}.bak`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        await fs.rm(tmp, { force: true });
        throw err;
      }
    }
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, filePath);
      return;
    } catch (err) {
      if (attempt >= retries || !RETRY_CODES.has(err.code)) {
        await fs.rm(tmp, { force: true });
        throw err;
      }
      await sleep(80 * (attempt + 1));
    }
  }
}

export async function readTextSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}
