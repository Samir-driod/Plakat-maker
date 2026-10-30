import { downscaleSize, isImageFile, isProjectFile } from '../core/image.js';
import { IMAGE_MAX_SIDE } from '../core/constants.js';
import { addElement } from '../core/elementOps.js';
import { findByRole } from '../core/document.js';
import { toast } from '../ui/dialogs.js';
import { isTypingTarget } from '../ui/dom.js';

const MAX_FILE_BYTES = 60 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('Błąd odczytu pliku.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Plik nie jest poprawnym obrazem.'));
    img.src = src;
  });
}

export async function readImageFile(file) {
  if (!file.type.startsWith('image/') && !isImageFile(file.name)) throw new Error('To nie jest obraz.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Obraz jest za duży (ponad 60 MB).');
  const dataUrl = await readAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const { w, h, scaled } = downscaleSize(img.naturalWidth, img.naturalHeight, IMAGE_MAX_SIDE);
  if (!scaled) return { dataUrl, w, h, name: file.name };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext('2d');
  c2d.imageSmoothingQuality = 'high';
  c2d.drawImage(img, 0, 0, w, h);
  const keepAlpha = /png|webp|gif/i.test(file.type);
  return { dataUrl: canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.92), w, h, name: file.name };
}

export function pickFiles(accept, multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => resolve([...input.files]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');

export function installImages(app) {
  const { store, selection, editor } = app;

  async function importImage(file) {
    try {
      return await readImageFile(file);
    } catch (err) {
      toast(`Nie można wczytać obrazu: ${err.message}`, { type: 'error' });
      return null;
    }
  }

  function imageTarget(preferredId) {
    const doc = store.doc;
    const isImageEl = (el) => el && (el.type === 'photo' || el.type === 'image');
    if (isImageEl(doc.elements[preferredId])) return preferredId;
    const selected = selection.ids.map((id) => doc.elements[id]).find(isImageEl);
    return selected?.id ?? findByRole(doc, 'photo')?.id ?? null;
  }

  function addImageElementWith(assetId, at = null) {
    let id;
    store.update((doc) => {
      id = addElement(doc, 'image', { overrides: { assetId }, at });
    });
    selection.set([id]);
  }

  async function importImageFile(file, targetId = null) {
    const image = await importImage(file);
    if (!image) return;
    const assetId = store.addAsset(image);
    const id = imageTarget(targetId);
    if (!id) {
      addImageElementWith(assetId);
      return;
    }
    store.update((doc) => {
      const el = doc.elements[id];
      if (!el) return false;
      el.assetId = assetId;
      if (el.type === 'photo') el.crop = { zoom: 1, x: 0.5, y: 0.5 };
    });
    selection.set([id]);
  }

  async function pickOne() {
    const [file] = await pickFiles('image/*');
    return file ? importImage(file) : null;
  }

  app.actions.importImageFile = importImageFile;

  app.actions.pickPhoto = async (targetId = null) => {
    const [file] = await pickFiles('image/*');
    if (file) await importImageFile(file, targetId);
  };

  app.actions.addImageElement = async () => {
    const image = await pickOne();
    if (image) addImageElementWith(store.addAsset(image));
  };

  app.actions.pickBackgroundImage = async () => {
    const image = await pickOne();
    if (!image) return;
    const assetId = store.addAsset(image);
    store.update((doc) => {
      doc.background.imageId = assetId;
      doc.background.type = 'image';
    });
  };

  app.actions.pickQrLogo = async (qrId) => {
    const image = await pickOne();
    if (!image) return;
    const assetId = store.addAsset(image);
    store.update((doc) => {
      if (!doc.elements[qrId]) return false;
      doc.elements[qrId].logoAssetId = assetId;
    });
  };

  app.actions.removeImage = (id) => {
    store.update((doc) => {
      const el = doc.elements[id];
      if (!el) return false;
      if (el.type === 'qr') el.logoAssetId = null;
      else el.assetId = null;
    });
  };

  const workspace = document.getElementById('workspace');
  const overlay = document.getElementById('drop-overlay');
  let depth = 0;

  workspace.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    overlay.hidden = false;
  });
  workspace.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  workspace.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.hidden = true;
  });
  workspace.addEventListener('drop', async (e) => {
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const files = [...(e.dataTransfer?.files ?? [])];
    const project = files.find((f) => isProjectFile(f.name));
    if (project) {
      if (app.actions.openProjectFile) await app.actions.openProjectFile(project);
      return;
    }
    const images = files.filter((f) => f.type.startsWith('image/') || isImageFile(f.name));
    if (!images.length) {
      toast('Upuść plik obrazu (PNG, JPG, WEBP…) albo projekt .plakat.', { type: 'error' });
      return;
    }
    if (e.altKey || images.length > 1) {
      const at = editor.toDesign(e.clientX, e.clientY);
      for (const file of images) {
        const image = await importImage(file);
        if (image) addImageElementWith(store.addAsset(image), at);
      }
      return;
    }
    await importImageFile(images[0], editor.elementAt(e.clientX, e.clientY));
  });

  // Upuszczenie pliku poza obszarem roboczym nie może przeładować okna.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => e.preventDefault());

  document.addEventListener('paste', async (e) => {
    if (isTypingTarget(e.target)) return;
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    const blob = item.getAsFile();
    if (blob) await importImageFile(new File([blob], 'schowek.png', { type: blob.type }));
  });
}
