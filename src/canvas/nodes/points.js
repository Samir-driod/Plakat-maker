import Konva from 'konva';
import { fitPoints, layoutPoints } from '../../core/textfit.js';
import { fontStyleString } from '../../core/fonts.js';
import { BULLETS } from '../../core/constants.js';
import { splitLead, wrapRuns } from '../../core/richPoints.js';

function bulletChar(el, index, st) {
  if (st.bullet) return st.bullet;
  if (el.bullet === 'number') return `${index + 1}.`;
  if (el.bullet === 'custom') return el.customBullet || '•';
  return BULLETS[el.bullet]?.char ?? '•';
}

export const pointsNode = {
  create(group) {
    group.add(new Konva.Rect({ name: 'hit', fill: 'rgba(0,0,0,0)' }));
    group.add(new Konva.Group({ name: 'items', listening: false }));
  },

  update(group, el, box, ctx) {
    group.findOne('.hit').size({ width: box.w, height: box.h });
    const items = group.findOne('.items');
    items.destroyChildren();
    const entries = el.items
      .map((t, i) => ({ text: t.trim(), i, st: el.itemStyles?.[i] ?? {} }))
      .filter((e) => e.text);
    if (!entries.length) return;

    const fontFamily = ctx.font(el.font);
    const probe = new Konva.Text({ fontFamily });
    const measure = (text, bold, s) => probe.setAttrs({ fontSize: s, fontStyle: fontStyleString({ bold }) }).measureSize(text).width;
    const digits = String(entries.length).length;
    const bulletWidth = (s) => (el.bullet === 'number' ? s * (digits * 0.62 + 0.8) : s * 1.25);
    const runsOf = ({ text, st }) => {
      const bold = st.bold ?? el.bold;
      const { lead, rest } = el.leadHighlight ? splitLead(text) : { lead: '', rest: text };
      // Myślnik zostaje przy poprzednim słowie, żeby linia nie zaczynała się od „- ”.
      const glued = rest.replace(/ ([-–—]) /g, '\u00a0$1 ');
      return [
        ...(lead ? [{ text: lead, style: 'lead', bold: bold || el.leadBold }] : []),
        { text: glued, style: 'body', bold },
      ];
    };
    const layoutItem = (e, s) => {
      const size = s * (e.st.scale ?? 1);
      const runs = runsOf(e);
      const boldOf = Object.fromEntries(runs.map((r) => [r.style, r.bold]));
      const lines = wrapRuns(runs, Math.max(10, box.w - bulletWidth(s)), (t, style) => measure(t, boldOf[style], size));
      return { size, lines, boldOf, height: lines.length * size * el.lineHeight };
    };

    const size = el.autoFit
      ? fitPoints((k, s) => layoutItem(entries[k], s).height, entries.length, { maxSize: el.size, minSize: 8, spacing: el.spacing, boxHeight: box.h })
      : el.size;
    const laid = entries.map((e) => layoutItem(e, size));
    probe.destroy();
    const { ys } = layoutPoints(laid.map((l) => l.height), { gap: size * el.spacing, boxHeight: box.h, distribute: el.distribute });

    const bw = bulletWidth(size);
    entries.forEach((e, k) => {
      const { size: s, lines, boldOf } = laid[k];
      const bulletSize = el.bullet === 'dot' && !e.st.bullet ? s * 0.7 : s;
      items.add(new Konva.Text({
        x: 0,
        y: ys[k] + ((s - bulletSize) * el.lineHeight) / 2,
        width: bw,
        text: bulletChar(el, k, e.st),
        fontFamily,
        fontStyle: 'bold',
        fontSize: bulletSize,
        lineHeight: el.lineHeight,
        fill: ctx.color(e.st.bulletColor ?? el.bulletColor),
      }));
      const fills = {
        lead: ctx.color(e.st.leadColor ?? el.leadColor),
        body: ctx.color(e.st.color ?? el.color),
      };
      lines.forEach((line, li) => line.forEach((frag) => items.add(new Konva.Text({
        x: bw + frag.x,
        y: ys[k] + li * s * el.lineHeight,
        text: frag.text,
        fontFamily,
        fontStyle: fontStyleString({ bold: boldOf[frag.style] }),
        fontSize: s,
        lineHeight: el.lineHeight,
        wrap: 'none',
        fill: fills[frag.style],
      }))));
    });
  },
};
