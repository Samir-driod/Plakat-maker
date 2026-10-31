const img = document.getElementById('poster');
const hint = document.getElementById('hint');

window.api?.onPresentImage((dataUrl) => {
  img.src = dataUrl;
});
setTimeout(() => {
  hint.style.opacity = '0';
}, 2500);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.close();
});
window.addEventListener('dblclick', () => window.close());
