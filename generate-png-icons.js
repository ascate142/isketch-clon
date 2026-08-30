#!/usr/bin/env node
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const iconsDir = path.join(projectRoot, 'public', 'icons');

const densities = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 }
];

densities.forEach(d => {
  const dir = path.join(resDir, d.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
const drawableDir = path.join(resDir, 'drawable');
if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function drawIcon(canvas, size) {
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

function drawTvBanner(canvas, width, height) {
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

console.log('Generando iconos iSketch...');
densities.forEach(d => {
  const canvas = createCanvas(d.size, d.size);
  drawIcon(canvas, d.size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(resDir, d.name, 'ic_launcher.png'), buffer);
  fs.writeFileSync(path.join(resDir, d.name, 'ic_launcher_round.png'), buffer);
  console.log('  OK ' + d.name + '/ic_launcher.png (' + d.size + 'x' + d.size + ')');
});

const tvCanvas = createCanvas(320, 180);
drawTvBanner(tvCanvas, 320, 180);
fs.writeFileSync(path.join(drawableDir, 'tv_banner.png'), tvCanvas.toBuffer('image/png'));
console.log('  OK drawable/tv_banner.png (320x180)');

[192, 512].forEach(size => {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  fs.writeFileSync(path.join(iconsDir, 'icon-' + size + '.png'), canvas.toBuffer('image/png'));
  console.log('  OK public/icons/icon-' + size + '.png');
});

[72, 96, 128, 144, 152, 192].forEach(size => {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  fs.writeFileSync(path.join(iconsDir, 'icon-' + size + 'x' + size + '.png'), canvas.toBuffer('image/png'));
  console.log('  OK public/icons/icon-' + size + 'x' + size + '.png');
});

console.log('Todos los iconos generados.');
