// ============================================================
//  ENEMIGOS.JS — Creacion, posicion, hitbox y dibujo de targets
//  Depende de: configuracion.js, estado.js
// ============================================================

function getTargetDrawSize(type) {
  const cfg = TARGET_TYPES[type];
  const img = images[cfg.img];
  const w = cfg.drawW * FLEET_SIZE_SCALE;
  const ratio = img ? img.height / img.width : 0.45;
  return { w, h: w * ratio };
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

// Genera los enemigos de la ronda actual con posiciones aleatorias
function createRoundTargets() {
  const baseTypes = Object.keys(TARGET_TYPES).flatMap(type => Array(MIN_ENEMIES_PER_TYPE).fill(type));
  const extraCount = Math.floor(randomInRange(0, RANDOM_EXTRA_ENEMIES_MAX + 1));
  const extraTypes = Array.from({ length: extraCount }, () => pickRandomTargetType());
  const typeSet = shuffleArray([...baseTypes, ...extraTypes]);
  const counters = { avion: 1, barco: 1, submarino: 1 };
  const usedX = [];
  targets = [];

  typeSet.forEach((type, index) => {
    const size = getTargetDrawSize(type);
    const x = getSpawnX(usedX);
    usedX.push(x);
    const y = getSpawnYForType(type);

    const prefix = type === 'avion' ? 'A' : type === 'barco' ? 'M' : 'S';
    targets.push({
      id: `${type}-${Date.now()}-${index}-${Math.random()}`,
      type,
      code: `${prefix}${counters[type]++}`,
      cxWorld: x,
      cyWorld: y,
      w: size.w,
      h: size.h,
      alive: true,
      bobPhase: Math.random() * Math.PI * 2,
      bobOffset: 0,
      px: 0,
      py: 0,
    });
  });
  recalcTargetPixels();
  updateTargetPanel();
}

function pickRandomTargetType() {
  const keys = Object.keys(TARGET_TYPES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function shuffleArray(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

// Elige una X de spawn que no choque con otras unidades
function getSpawnX(usedX) {
  const minX = ENEMY_SPAWN_AREA.xMin + 2;
  const maxX = ENEMY_SPAWN_AREA.xMax - 2;
  for (let i = 0; i < 24; i++) {
    const candidate = randomInRange(minX, maxX);
    const hasCollision = usedX.some(x => Math.abs(x - candidate) < SPAWN_X_MIN_GAP);
    if (!hasCollision) return candidate;
  }
  return randomInRange(minX, maxX);
}

// Asigna Y segun la zona del tipo de enemigo
function getSpawnYForType(type) {
  if (type === 'barco') return 0;
  if (type === 'avion') return randomInRange(1, Math.max(1, ENEMY_SPAWN_AREA.yMax));
  return randomInRange(Math.min(ENEMY_SPAWN_AREA.yMin, -1), -1);
}

function allTargetsDefeated() {
  return targets.length > 0 && targets.every(t => !t.alive);
}

// Recalcula posicion en pixeles de todos los targets (llamar tras resize)
function recalcTargetPixels() {
  targets.forEach(t => {
    const size = getTargetDrawSize(t.type);
    t.w = size.w;
    t.h = size.h;
    const p = worldToScreen(t.cxWorld, t.cyWorld);
    t.px = p.x - t.w / 2;
    t.py = p.y - t.h / 2;
  });
}

// Actualiza el panel lateral de radar con la lista de objetivos
function updateTargetPanel() {
  els.targetList.innerHTML = targets.map(t => {
    const status = t.alive ? 'ACTIVO' : 'ABATIDO';
    return `
      <div class="target-row ${t.alive ? '' : 'target-dead'}">
        <div class="target-code">${t.code}</div>
        <div>
          <div>${TARGET_TYPES[t.type].label}</div>
          <div class="target-zone">(${t.cxWorld.toFixed(1)}, ${t.cyWorld.toFixed(1)}) . ${TARGET_TYPES[t.type].zone}</div>
        </div>
        <div>${status}</div>
      </div>
    `;
  }).join('');
}

// Devuelve el rectangulo de hitbox en pixeles para un target
function getHitboxPixels(target, x = target.px, y = target.py + (target.bobOffset || 0)) {
  const hb = TARGET_TYPES[target.type].hitbox;
  return {
    x: x + target.w * hb.x,
    y: y + target.h * hb.y,
    w: target.w * hb.w,
    h: target.h * hb.h,
  };
}

function drawTargetGuides(t, x, y) {
  const hb = getHitboxPixels(t, x, y);
  ctx.save();
  ctx.fillStyle = t.alive ? 'rgba(255,86,114,.12)' : 'rgba(255,255,255,.05)';
  ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = t.alive ? 'rgba(255,86,114,.92)' : 'rgba(255,255,255,.22)';
  ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);

  if (gridVisible && t.alive) {
    const cx = x + t.w / 2;
    const cy = y + t.h / 2;
    ctx.strokeStyle = 'rgba(56,245,255,.20)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, seaY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(originX, cy); ctx.lineTo(cx, cy); ctx.stroke();
  }

  ctx.setLineDash([]);
  const cx = x + t.w / 2;
  const labelFont = 10 * TARGET_LABEL_SCALE;
  const labelW = 116;
  const labelH = 20;
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.fillRect(cx - labelW / 2, y - 22, labelW, labelH);
  ctx.strokeStyle = 'rgba(56,245,255,.46)';
  ctx.strokeRect(cx - labelW / 2, y - 22, labelW, labelH);
  ctx.fillStyle = t.alive ? '#38f5ff' : 'rgba(255,255,255,.45)';
  ctx.font = `${labelFont}px Courier New`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${t.code} (${t.cxWorld.toFixed(1)}, ${t.cyWorld.toFixed(1)})`, cx, y - 12);
  ctx.restore();
}

function drawTargets(now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  targets.forEach(t => {
    if (!t.alive) return;
    const img = images[TARGET_TYPES[t.type].img];
    t.bobOffset = Math.sin(now / 620 + t.bobPhase) * 3.4;
    const x = t.px;
    const y = t.py + t.bobOffset;
    if (img) ctx.drawImage(img, x, y, t.w, t.h);
    else {
      ctx.fillStyle = '#3ff';
      ctx.fillRect(x, y, t.w, t.h);
    }
    drawTargetGuides(t, x, y);
  });
  ctx.restore();
}
