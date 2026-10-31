import { test, expect, _electron as electron } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const titleText = (page) => page.evaluate(() =>
  Object.values(window.__plakat.store.doc.elements).find((e) => e.role === 'title')?.text);

test('tworzy plakat, eksportuje obie orientacje i PDF, zapisuje i wczytuje projekt', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plakat-e2e-'));
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, PLAKAT_E2E_DIR: dir, PLAKAT_USER_DATA: path.join(dir, 'userdata') },
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForSelector('body[data-ready="true"]');

    // Treść
    await page.getByTestId('tab-content').click();
    await page.getByTestId('title-input').fill('Dzień otwarty');
    await page.getByTestId('point-input-0').fill('Bezpłatne warsztaty');
    await page.getByTestId('qr-url').fill('mojaszkola.pl');
    await expect.poll(() => titleText(page)).toBe('Dzień otwarty');

    // Motyw i układ
    await page.getByTestId('tab-style').click();
    await page.getByTestId('theme-las').click();
    await page.getByTestId('tab-layout').click();
    await page.getByTestId('layout-photo-top').click();
    await expect.poll(() => page.evaluate(() => window.__plakat.store.doc.layoutId)).toBe('photo-top');

    // Eksport PNG — obie orientacje
    await page.getByTestId('btn-export').click();
    await page.getByTestId('export-format-png').click();
    await page.getByTestId('export-orientation-both').click();
    await page.getByTestId('export-confirm').click();
    const landscape = path.join(dir, 'Plakat-poziomo.png');
    const portrait = path.join(dir, 'Plakat-pionowo.png');
    await expect.poll(() => fs.existsSync(landscape) && fs.existsSync(portrait), { timeout: 30_000 }).toBe(true);
    expect(pngSize(landscape)).toEqual({ w: 1920, h: 1080 });
    expect(pngSize(portrait)).toEqual({ w: 1080, h: 1920 });

    // Eksport PDF — bieżąca orientacja
    await page.getByTestId('btn-export').click();
    await page.getByTestId('export-format-pdf').click();
    await page.getByTestId('export-orientation-current').click();
    await page.getByTestId('export-confirm').click();
    const pdf = path.join(dir, 'Plakat-poziomo.pdf');
    await expect.poll(() => fs.existsSync(pdf), { timeout: 30_000 }).toBe(true);
    expect(fs.readFileSync(pdf).subarray(0, 4).toString()).toBe('%PDF');

    // Zapis projektu
    await page.keyboard.press('Control+S');
    const project = path.join(dir, 'projekt.plakat');
    await expect.poll(() => fs.existsSync(project)).toBe(true);
    await expect(page.getByTestId('status-dirty')).toHaveText('✓ Zapisano');
    const saved = JSON.parse(fs.readFileSync(project, 'utf8'));
    expect(saved.app).toBe('plakat-maker');
    expect(Object.values(saved.doc.elements).find((e) => e.role === 'title').text).toBe('Dzień otwarty');

    // Zmiana, cofnięcie i ponowne otwarcie
    await page.getByTestId('tab-content').click();
    await page.getByTestId('title-input').fill('Zmieniony tytuł');
    await expect.poll(() => titleText(page)).toBe('Zmieniony tytuł');
    await page.keyboard.press('Control+O');
    await page.getByTestId('confirm-discard').click();
    await expect.poll(() => titleText(page)).toBe('Dzień otwarty');
    expect(await page.evaluate(() => window.__plakat.store.doc.themeId)).toBe('las');

    expect(errors).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
