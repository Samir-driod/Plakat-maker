import { describe, it, expect } from 'vitest';
import { downscaleSize, coverRect, containRect, panCrop, buildCssFilter, isImageFile, isProjectFile } from '../../src/core/image.js';

describe('downscaleSize', () => {
  it('nie zmienia małych', () => {
    expect(downscaleSize(800, 600, 3000)).toEqual({ w: 800, h: 600, scaled: false });
  });
  it('zmniejsza dłuższy bok do limitu', () => {
    expect(downscaleSize(6000, 4000, 3000)).toEqual({ w: 3000, h: 2000, scaled: true });
    expect(downscaleSize(1000, 5000, 3000)).toEqual({ w: 600, h: 3000, scaled: true });
  });
});

describe('coverRect / containRect', () => {
  it('cover wypełnia ramkę i centruje domyślnie', () => {
    expect(coverRect(400, 200, 100, 100)).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });
  it('cover z ogniskiem po lewej i zoomem', () => {
    expect(coverRect(400, 200, 100, 100, { zoom: 2, x: 0, y: 0.5 })).toEqual({ x: 0, y: -50, width: 400, height: 200 });
  });
  it('contain mieści całość', () => {
    expect(containRect(400, 200, 100, 100)).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });
});

describe('panCrop', () => {
  it('przesuwa ognisko proporcjonalnie do nadmiaru i przycina', () => {
    const crop = { zoom: 1, x: 0.5, y: 0.5 };
    expect(panCrop(crop, 25, 0, 400, 200, 100, 100)).toEqual({ zoom: 1, x: 0.25, y: 0.5 });
    expect(panCrop(crop, -500, 0, 400, 200, 100, 100).x).toBe(1);
  });
  it('oś bez nadmiaru nie zmienia się', () => {
    expect(panCrop({ zoom: 1, x: 0.5, y: 0.5 }, 0, 40, 400, 200, 100, 100).y).toBe(0.5);
  });
});

describe('buildCssFilter', () => {
  it('domyślne wartości → none', () => {
    expect(buildCssFilter({ grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0 }, 1000)).toBe('none');
  });
  it('składa tylko zmienione filtry, rozmycie względem obrazu', () => {
    expect(buildCssFilter({ grayscale: 100, sepia: 0, brightness: 120, contrast: 100, saturation: 50, blur: 10 }, 2000))
      .toBe('grayscale(1) brightness(1.2) saturate(0.5) blur(20px)');
  });
});

describe('rozpoznawanie plików', () => {
  it('obrazy i projekty', () => {
    expect(isImageFile('Zdjęcie.JPG')).toBe(true);
    expect(isImageFile('a.webp')).toBe(true);
    expect(isImageFile('a.pdf')).toBe(false);
    expect(isProjectFile('C:\\x\\Mój.plakat')).toBe(true);
    expect(isProjectFile('a.json')).toBe(false);
  });
});
