// Uruchamiane przez: npm run icon  (electron scripts/make-icon.cjs)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const draw = `
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#4f8cff'); g.addColorStop(1, '#7b3fe4');
  x.fillStyle = g; x.beginPath(); x.roundRect(16, 16, 480, 480, 96); x.fill();
  x.fillStyle = '#ffffff'; x.beginPath(); x.roundRect(96, 112, 320, 288, 28); x.fill();
  x.fillStyle = '#c7d6ff'; x.beginPath(); x.roundRect(120, 136, 120, 168, 18); x.fill();
  x.fillStyle = '#4f8cff'; x.fillRect(264, 144, 120, 22);
  x.fillStyle = '#9aa1b2'; for (let i = 0; i < 4; i++) x.fillRect(264, 186 + i * 28, 104 - i * 12, 12);
  x.fillStyle = '#111111'; for (const [a, b] of [[300, 320], [340, 320], [300, 352], [356, 356]]) x.fillRect(a, b, 24, 24);
  c.toDataURL('image/png');
`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('data:text/html,<html></html>');
  const dataUrl = await win.webContents.executeJavaScript(draw);
  const out = path.join(__dirname, '..', 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('Zapisano', out);
  app.quit();
});
