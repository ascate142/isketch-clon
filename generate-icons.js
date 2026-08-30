const fs = require('fs');
const path = require('path');
const http = require('http');

// Generador de iconos PNG puros sin dependencias externas
const projectRoot = __dirname;
const iconsDir = path.join(projectRoot, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crear SVG y convertir a PNG básico o usar canvas
const generateSvgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2c4760"/>
      <stop offset="100%" stop-color="#142433"/>
    </linearGradient>
    <linearGradient id="orangeG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff9900"/>
      <stop offset="100%" stop-color="#cc5500"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="3" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)" stroke="#527a9e" stroke-width="${size * 0.03}"/>
  <g filter="url(#shadow)" transform="translate(${size * 0.15}, ${size * 0.2})">
    <!-- i naranja -->
    <text x="0" y="${size * 0.55}" font-family="Arial Black, Impact, sans-serif" font-size="${size * 0.6}" font-weight="900" fill="url(#orangeG)">i</text>
    <!-- Sketch blanco -->
    <text x="${size * 0.22}" y="${size * 0.55}" font-family="Arial Black, Impact, sans-serif" font-size="${size * 0.42}" font-weight="900" fill="#ffffff">Sketch</text>
  </g>
  <text x="${size * 0.5}" y="${size * 0.85}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="${size * 0.08}" font-style="italic" font-weight="bold" fill="#ffd080">the online sketching game</text>
</svg>
`;

const generateSvgBanner = (width, height) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgTV" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#375b80"/>
      <stop offset="100%" stop-color="#14283b"/>
    </linearGradient>
    <linearGradient id="orangeTV" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffaa00"/>
      <stop offset="100%" stop-color="#d86600"/>
    </linearGradient>
    <filter id="shadowTV">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.7"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bgTV)" stroke="#4a7aa8" stroke-width="4"/>
  <g filter="url(#shadowTV)" transform="translate(${width * 0.12}, ${height * 0.35})">
    <text x="0" y="55" font-family="Arial Black, Impact, sans-serif" font-size="75" font-weight="900" fill="url(#orangeTV)">i</text>
    <text x="36" y="55" font-family="Arial Black, Impact, sans-serif" font-size="56" font-weight="900" fill="#ffffff">Sketch</text>
  </g>
  <text x="${width * 0.5}" y="${height * 0.86}" text-anchor="middle" font-family="Verdana, sans-serif" font-size="13" font-style="italic" font-weight="bold" fill="#ffd080">the online sketching game • Android TV</text>
</svg>
`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), generateSvgIcon(512));
fs.writeFileSync(path.join(iconsDir, 'tv-banner.svg'), generateSvgBanner(320, 180));

// ============================================================
//  Generación de PNGs para Android y PWA
// ============================================================
try {
  const { createCanvas } = require('canvas');

  function drawIconCanvas(canvas, size) {
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#2c4760');
    grad.addColorStop(1, '#142433');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#527a9e';
    ctx.lineWidth = Math.max(1, size * 0.03);
    const radius = size * 0.22;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.stroke();
    const orangeGrad = ctx.createLinearGradient(0, size * 0.2, 0, size * 0.7);
    orangeGrad.addColorStop(0, '#ff9900');
    orangeGrad.addColorStop(1, '#cc5500');
    ctx.fillStyle = orangeGrad;
    ctx.font = 'bold ' + Math.floor(size * 0.55) + 'px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', size * 0.28, size * 0.52);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.floor(size * 0.38) + 'px Arial Black, Impact, sans-serif';
    ctx.fillText('Sketch', size * 0.65, size * 0.52);
    ctx.fillStyle = '#ffd080';
    ctx.font = 'italic bold ' + Math.max(8, Math.floor(size * 0.07)) + 'px Verdana, sans-serif';
    ctx.fillText('the online sketching game', size / 2, size * 0.88);
  }

  function drawBannerCanvas(canvas, width, height) {
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#375b80');
    grad.addColorStop(1, '#14283b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#4a7aa8';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    const orangeGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    orangeGrad.addColorStop(0, '#ffaa00');
    orangeGrad.addColorStop(1, '#d86600');
    ctx.fillStyle = orangeGrad;
    ctx.font = 'bold 72px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', width * 0.15, height * 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial Black, Impact, sans-serif';
    ctx.fillText('Sketch', width * 0.35, height * 0.4);
    ctx.fillStyle = '#ffd080';
    ctx.font = 'italic bold 14px Verdana, sans-serif';
    ctx.fillText('the online sketching game - Android TV', width / 2, height * 0.86);
  }

  // Iconos Android (mipmap)
  const densities = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 }
  ];
  const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  densities.forEach(d => {
    const dir = path.join(resDir, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const canvas = createCanvas(d.size, d.size);
    drawIconCanvas(canvas, d.size);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), canvas.toBuffer('image/png'));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), canvas.toBuffer('image/png'));
  });

  // Banner de TV
  const tvCanvas = createCanvas(320, 180);
  drawBannerCanvas(tvCanvas, 320, 180);
  const drawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
  fs.writeFileSync(path.join(drawableDir, 'tv_banner.png'), tvCanvas.toBuffer('image/png'));

  // Iconos PWA PNG
  [192, 512].forEach(size => {
    const canvas = createCanvas(size, size);
    drawIconCanvas(canvas, size);
    fs.writeFileSync(path.join(iconsDir, 'icon-' + size + '.png'), canvas.toBuffer('image/png'));
  });

  console.log('✅ SVGs, PNGs de Android y PWA generados en public/icons/');
  console.log('✅ Iconos Android generados en android/app/src/main/res/mipmap-*/');
} catch(e) {
  console.log('⚠️  canvas no disponible, PNGs no generados (solo SVGs)');
}

