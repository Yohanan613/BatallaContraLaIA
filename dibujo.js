// ============================================================
//  DIBUJO.JS — Carga de imagenes y dibujo en el canvas
//  Depende de: configuracion.js, estado.js
// ============================================================

// Carga todas las imagenes definidas en ASSETS
async function loadAssets() {
  const entries = Object.entries(ASSETS);
  await Promise.all(entries.map(([key, src]) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = () => { console.warn('No se pudo cargar', src); images[key] = null; resolve(); };
    img.src = src;
  })));
}

function drawBackground() {
  const img = images.fondo;
  if (!img) {
    ctx.fillStyle = '#02040b';
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const imgRatio = img.width / img.height;
  const screenRatio = W / H;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > screenRatio) {
    sw = img.height * screenRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / screenRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 8, 24, 0.14)';
  ctx.fillRect(0, seaY, W, H - seaY);
}

function drawGrid() {
  if (!gridVisible) return;
  ctx.save();
  ctx.font = '10px Courier New';
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';

  for (let x = worldXMin; x <= worldXMax; x++) {
    const p = worldToScreen(x, 0);
    const major = x % 5 === 0;
    ctx.strokeStyle = major ? 'rgba(56,245,255,.26)' : 'rgba(56,245,255,.10)';
    ctx.beginPath();
    ctx.moveTo(p.x, 48);
    ctx.lineTo(p.x, H - 36);
    ctx.stroke();
    if (major || x === 0) {
      ctx.fillStyle = 'rgba(224,246,255,.62)';
      ctx.textAlign = 'center';
      ctx.fillText(String(x), p.x, seaY + 15);
    }
  }

  for (let y = worldYBottom; y <= worldYTop; y++) {
    const p = worldToScreen(0, y);
    const major = y === 0 || y % 2 === 0;
    ctx.strokeStyle = y === 0 ? 'rgba(255,126,70,.98)' : major ? 'rgba(56,245,255,.20)' : 'rgba(56,245,255,.09)';
    ctx.lineWidth = y === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(originX, p.y);
    ctx.lineTo(W - 40, p.y);
    ctx.stroke();
    if (major) {
      ctx.textAlign = 'right';
      ctx.fillStyle = y === 0 ? 'rgba(255,214,110,.95)' : 'rgba(224,246,255,.56)';
      ctx.fillText(String(y), originX - 9, p.y);
    }
  }

  const o = worldToScreen(0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(o.x - 3, o.y - 3, 6, 6);
  ctx.fillStyle = 'rgba(255,214,110,.95)';
  ctx.textAlign = 'left';
  ctx.fillText('(0,0) mar', o.x + 10, o.y - 15);
  ctx.restore();
}

// Convierte color hex a rgba con alpha dado
function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRocket(now) {
  if (!rocket) return;
  const img = images[rocket.sprite];
  const tech = TECNOLOGIAS[rocket.techId];
  ctx.save();
  for (let i = 1; i < rocket.trail.length; i++) {
    const a = rocket.trail[i - 1];
    const b = rocket.trail[i];
    const alpha = i / rocket.trail.length;
    ctx.strokeStyle = hexToRgba(tech.color, alpha * 0.95);
    ctx.lineWidth = 1 + alpha * 2.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const angle = Math.atan2(rocket.py - rocket.lastPy, rocket.px - rocket.lastPx);
  const pulse = 1 + Math.sin(now / 150) * 0.012;
  const w = 58 * pulse;
  const ratio = img ? img.height / img.width : 0.4;
  const h = w * ratio;
  ctx.translate(rocket.px, rocket.py);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  if (img) ctx.drawImage(img, -w * 0.48, -h * 0.5, w, h);
  else {
    ctx.fillStyle = currentTeam().color;
    ctx.fillRect(-20, -6, 40, 12);
  }
  ctx.restore();
}

function createExplosion(x, y, scaleMul = 1) {
  explosions.push({ x, y, startedAt: performance.now(), scaleMul });
}

function drawExplosions(now) {
  const sheet = images.explosion;
  const frameSize = 64;
  const cols = 4;
  explosions = explosions.filter(ex => now - ex.startedAt < 700);
  explosions.forEach(ex => {
    const elapsed = now - ex.startedAt;
    const frameCount = 16;
    const index = Math.min(frameCount - 1, Math.floor((elapsed / 700) * frameCount));
    const sx = (index % cols) * frameSize;
    const sy = Math.floor(index / cols) * frameSize;
    const size = 72 * ex.scaleMul;
    if (sheet) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, sx, sy, frameSize, frameSize, ex.x - size / 2, ex.y - size / 2, size, size);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(255,190,70,.7)';
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, size / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

// Dibuja el indicador de base de lanzamiento en el origen
function drawOriginLauncher() {
  const o = worldToScreen(0, 0);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.58)';
  ctx.fillRect(o.x - 46, o.y - 11, 36, 22);
  ctx.fillStyle = currentTeam().color;
  ctx.beginPath();
  ctx.moveTo(o.x - 7, o.y);
  ctx.lineTo(o.x - 34, o.y - 9);
  ctx.lineTo(o.x - 34, o.y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 14px Courier New';
  const label = 'BASE';
  const metrics = ctx.measureText(label);
  const labelW = metrics.width + 10;
  const labelH = 18;
  ctx.fillStyle = 'rgba(0,0,0,.48)';
  ctx.fillRect(o.x + 5, o.y - labelH / 2, labelW, labelH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, o.x + 10, o.y);
  ctx.restore();
}

// Efecto de oscurecimiento y texto "CAMARA LENTA" durante el zoom
function drawSlowMoOverlay() {
  if (camera.phase === 'idle' || camera.zoom < 1.05) return;
  const t = Math.min(1, (camera.zoom - 1) / (ZOOM_MAX - 1));

  const grad = ctx.createRadialGradient(
    camera.pivotX, camera.pivotY, Math.min(W, H) * 0.05,
    camera.pivotX, camera.pivotY, Math.max(W, H) * 0.9
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${t * 0.48})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (camera.phase === 'zooming' || camera.phase === 'holding') {
    const alpha = Math.min(1, t * 2);
    if (alpha > 0.05) {
      ctx.save();
      ctx.font = 'bold 20px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.7})`;
      ctx.fillStyle = `rgba(255,220,50,${alpha * 0.92})`;
      ctx.strokeText('⬤ CAMARA LENTA', W / 2, 58);
      ctx.fillText('⬤ CAMARA LENTA', W / 2, 58);
      ctx.restore();
    }
  }
}

// Interpola el zoom de la camara hacia su objetivo
function updateCamera(rawDt) {
  if (camera.phase === 'idle') return;
  const lerpSpeed = camera.phase === 'zooming-out' ? ZOOM_OUT_SPEED : ZOOM_IN_SPEED;
  camera.zoom += (camera.targetZoom - camera.zoom) * lerpSpeed * rawDt;
  if (camera.phase === 'holding' && performance.now() >= camera.holdUntil) {
    camera.phase = 'zooming-out';
    camera.targetZoom = 1;
  }
  if (camera.phase === 'zooming-out' && camera.zoom <= 1.02) {
    camera.zoom = 1;
    camera.phase = 'idle';
  }
}
