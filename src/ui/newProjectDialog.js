import { h } from './dom.js';
import { segmented, selectField, toggleField } from './controls.js';
import { openModal, confirmDialog, promptDialog, toast } from './dialogs.js';
import { STARTERS, newDocument } from '../core/document.js';
import { getTheme } from '../core/themes.js';
import { computeLayout, LAYOUT_ROLES } from '../core/layouts.js';
import { FORMAT_PRESETS } from '../core/constants.js';
import { parseProject, serializeProject } from '../core/schema.js';
import { renderPoster } from '../canvas/exporter.js';

export function starterPreviewSvg(starter, orientation, format) {
  const p = getTheme(starter.themeId).palette;
  const boxes = computeLayout(starter.layoutId, format, orientation);
  const colors = { photo: '#8a94a8', panel: p.bg2, accent: p.accent, title: p.text, subtitle: p.muted, points: p.muted, qr: '#ffffff', footer: p.muted };
  const order = starter.layoutId === 'card'
    ? ['panel', 'photo', ...LAYOUT_ROLES.filter((r) => r !== 'panel' && r !== 'photo')]
    : LAYOUT_ROLES;
  const rects = order.filter((r) => !boxes[r].hidden).map((r) => {
    const b = boxes[r];
    const height = r === 'title' ? b.h * 0.55 : r === 'points' ? b.h * 0.8 : b.h;
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${height}" rx="${r === 'photo' ? 30 : 10}" fill="${colors[r]}"${r === 'panel' ? ' opacity="0.85"' : ''}/>`;
  });
  return `<svg viewBox="0 0 ${format.w} ${format.h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><rect width="${format.w}" height="${format.h}" fill="${p.bg}"/>${rects.join('')}</svg>`;
}

export function installTemplates(app) {
  const { api, store, settings } = app;

  async function showNewProjectDialog({ welcome = false } = {}) {
    const state = { kind: 'starter', id: STARTERS[0].id, orientation: 'landscape', formatId: '16:9' };
    let userTemplates = [];
    try {
      userTemplates = (await api.listTemplates?.()) ?? [];
    } catch (err) {
      console.warn('Nie udało się wczytać szablonów:', err);
    }

    let starterCards = [];
    let userCards = [];
    let modal = null;

    const formatSelect = selectField({ label: 'Format', options: FORMAT_PRESETS.map((p) => ({ value: p.id, label: p.label })) });
    const orientation = segmented({
      label: 'Orientacja',
      options: [{ value: 'landscape', label: '▭ Pozioma' }, { value: 'portrait', label: '▯ Pionowa' }],
      testId: 'new-orientation',
    });

    function select(kind, id) {
      state.kind = kind;
      state.id = id;
      for (const c of [...starterCards, ...userCards]) c.classList.toggle('active', c.dataset.kind === kind && c.dataset.id === id);
      formatSelect.input.disabled = kind === 'user';
    }

    function card(kind, id, name, preview) {
      return h('div', {
        class: 'card',
        dataset: { kind, id },
        'data-testid': `new-${id}`,
        onClick: () => select(kind, id),
        onDblclick: () => create(),
      }, h('div', { class: 'card-preview', style: { height: '90px' } }, preview), h('div', { class: 'card-name' }, name));
    }

    const starterGrid = h('div', { class: 'card-grid three' });
    function drawStarters() {
      const format = FORMAT_PRESETS.find((p) => p.id === state.formatId)[state.orientation];
      starterCards = STARTERS.map((s) => card('starter', s.id, s.name, h('div', { style: { width: '100%', height: '100%' }, html: starterPreviewSvg(s, state.orientation, format) })));
      starterGrid.replaceChildren(...starterCards);
      select(state.kind, state.id);
    }

    userCards = userTemplates.map((t) => {
      const c = card('user', t.id, t.name, t.thumb
        ? h('img', { src: t.thumb, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })
        : h('span', { class: 'hint' }, 'Brak podglądu'));
      c.append(h('button', {
        type: 'button',
        class: 'btn small danger card-delete',
        title: 'Usuń szablon',
        onClick: async (e) => {
          e.stopPropagation();
          const answer = await confirmDialog({
            title: 'Usunąć szablon?',
            message: `Szablon „${t.name}” zostanie trwale usunięty.`,
            buttons: [{ id: 'cancel', label: 'Anuluj' }, { id: 'delete', label: 'Usuń', kind: 'danger' }],
          });
          if (answer !== 'delete') return;
          await api.deleteTemplate(t.id);
          c.remove();
          userCards = userCards.filter((x) => x !== c);
          if (state.kind === 'user' && state.id === t.id) select('starter', STARTERS[0].id);
        },
      }, '✕'));
      return c;
    });

    orientation.set(state.orientation);
    orientation.onChange((v) => {
      state.orientation = v;
      orientation.set(v);
      drawStarters();
    });
    formatSelect.set(state.formatId);
    formatSelect.onChange((v) => {
      state.formatId = v;
      drawStarters();
    });

    async function create() {
      try {
        let doc;
        let assets = {};
        if (state.kind === 'starter') {
          const s = STARTERS.find((x) => x.id === state.id);
          doc = newDocument({ themeId: s.themeId, layoutId: s.layoutId, formatId: state.formatId, orientation: state.orientation });
        } else {
          ({ doc, assets } = parseProject(await api.readTemplate(state.id)));
          doc.orientation = state.orientation;
        }
        modal.close('created');
        app.actions.createProject(doc, assets);
      } catch (err) {
        toast(`Nie udało się utworzyć projektu: ${err.message}`, { type: 'error' });
      }
    }

    const welcomeToggle = toggleField({ label: 'Pokazuj to okno przy starcie programu' });
    welcomeToggle.set(settings.get('showWelcome'));
    welcomeToggle.onChange((v) => settings.set({ showWelcome: v }));

    modal = openModal({
      title: welcome ? 'Witaj w Plakat Maker! Wybierz szablon na start' : 'Nowy projekt',
      size: 'wide',
      body: h('div', {},
        h('div', { class: 'two-col' }, orientation.el, formatSelect.el),
        h('div', { class: 'field-label' }, 'Szablony startowe (motyw i układ, wszystko zmienisz później)'),
        starterGrid,
        userCards.length ? [h('div', { class: 'field-label', style: { marginTop: '12px' } }, 'Moje szablony'), h('div', { class: 'card-grid three' }, userCards)] : null,
        welcome ? welcomeToggle.el : null),
      actions: [
        { id: null, label: welcome ? 'Pomiń' : 'Anuluj' },
        { label: 'Utwórz', kind: 'primary', testId: 'new-create', onClick: () => create() },
      ],
    });
    drawStarters();
  }

  async function saveAsTemplate() {
    const name = await promptDialog({ title: 'Zapisz jako szablon', label: 'Nazwa szablonu', value: store.doc.meta.name });
    if (!name) return;
    try {
      const f = store.doc.formats[store.doc.orientation];
      const thumb = await renderPoster(app.editor, store, { orientation: store.doc.orientation, scale: 360 / f.w, mime: 'image/jpeg', quality: 0.8 });
      await api.saveTemplate({ name, project: serializeProject(store.doc, store.assets), thumb });
      toast(`Zapisano szablon „${name}”. Znajdziesz go w oknie „Nowy projekt”.`, { type: 'success' });
    } catch (err) {
      toast(`Nie udało się zapisać szablonu: ${err.message}`, { type: 'error' });
    }
  }

  app.actions.showNewProjectDialog = showNewProjectDialog;
  if (api.saveTemplate) app.actions.saveAsTemplate = saveAsTemplate;

  app.startupTasks.push(async () => {
    if (!api.isE2E && settings.get('showWelcome') && !store.dirty && !app.project?.filePath) {
      await showNewProjectDialog({ welcome: true });
    }
  });
}
