// ============================================================
//  ENEMIGOS.JS — Creacion, posicion, hitbox y dibujo de targets
//  Depende de: configuracion.js, estado.js
// ============================================================

function getTargetDrawSize(type) {
  const cfg = TARGET_TYPES[type];
  const img = images[cfg.img];
  const w = cfg.drawW * FLEET_SIZE_SCALE * (ENEMY_SIZE_SCALE[type] ?? 1) * drawScaleFactor;
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
  const usedPositions = [];
  targets = [];

  typeSet.forEach((type, index) => {
    const size = getTargetDrawSize(type);
    const { x, y } = getSpawnPosition(usedPositions, type);
    usedPositions.push({ x, y });

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

// Elige una posicion {x, y} respetando las distancias minimas en ambos ejes
// Regla: para cada enemigo existente, la nueva posicion debe tener
//   dX >= SPAWN_X_MIN_GAP  O  dY >= SPAWN_Y_MIN_GAP
// (evita solapamiento visual sin prohibir posiciones a diferente altura)
function getSpawnPosition(usedPositions, type) {
  const minX = ENEMY_SPAWN_AREA.xMin + 2;
  const maxX = ENEMY_SPAWN_AREA.xMax - 2;
  for (let i = 0; i < 48; i++) {
    const x = Math.round(randomInRange(minX, maxX));
    const y = getSpawnYForType(type);
    const valid = usedPositions.every(p =>
      Math.abs(p.x - x) >= SPAWN_X_MIN_GAP || Math.abs(p.y - y) >= SPAWN_Y_MIN_GAP
    );
    if (valid) return { x, y };
  }
  // Fallback: solo exige separacion en X
  for (let i = 0; i < 24; i++) {
    const x = Math.round(randomInRange(minX, maxX));
    const y = getSpawnYForType(type);
    if (usedPositions.every(p => Math.abs(p.x - x) >= SPAWN_X_MIN_GAP)) return { x, y };
  }
  return { x: Math.round(randomInRange(minX, maxX)), y: getSpawnYForType(type) };
}

// Asigna Y segun la zona del tipo de enemigo
function getSpawnYForType(type) {
  if (type === 'barco') return 0;
  if (type === 'avion') return Math.round(randomInRange(3, Math.max(3, ENEMY_SPAWN_AREA.yMax)));
  return Math.round(randomInRange(Math.min(ENEMY_SPAWN_AREA.yMin, -1), -1));
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
          <div class="target-zone">(${t.cxWorld}, ${t.cyWorld}) . ${TARGET_TYPES[t.type].zone}</div>
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

// Devuelve la hitbox de destruccion: misma posicion pero escalada por HITBOX_KILL_SCALE
function getKillHitboxPixels(target, x = target.px, y = target.py + (target.bobOffset || 0)) {
  const full = getHitboxPixels(target, x, y);
  const s = HITBOX_KILL_SCALE;
  const shrinkW = full.w * (1 - s) / 2;
  const shrinkH = full.h * (1 - s) / 2;
  return {
    x: full.x + shrinkW,
    y: full.y + shrinkH,
    w: full.w * s,
    h: full.h * s,
  };
}

//PUNTO CENTRAL AZUL EN LOS OBJETIVOS
function drawTargetGuides(t, x, y) {
  const hb = getHitboxPixels(t, x, y);
  ctx.save();
  ctx.fillStyle = t.alive ? 'rgba(255,86,114,.12)' : 'rgba(255,255,255,.05)';
  ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = t.alive ? 'rgba(255,86,114,.92)' : 'rgba(255,255,255,.22)';
  ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);

  if (t.alive && HITBOX_DOT_RADIUS > 0) {
    const dotX = hb.x + hb.w / 2;
    const dotY = hb.y + hb.h / 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(dotX, dotY, HITBOX_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(252, 255, 56)';
    ctx.shadowColor = '#38b4ff';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (gridVisible && t.alive) {
    const cx = x + t.w / 2;
    const cy = y + t.h / 2;
    ctx.strokeStyle = 'rgba(56,245,255,.20)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, seaY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(originX, cy); ctx.lineTo(cx, cy); ctx.stroke();
  }

  ctx.setLineDash([]);
  const isSplit = document.body.classList.contains('split-mode');
  if (!isSplit || SPLIT_MODE_SHOW_LABELS) {
    const cx = x + t.w / 2;
    const labelScale = TARGET_LABEL_SCALE * (isSplit ? SPLIT_MODE_LABEL_SCALE : 1) * (ENEMY_LABEL_SCALE[t.type] ?? 1);
    const labelFont = 17 * labelScale;
    const labelW = 185 * labelScale;
    const labelH = 30 * labelScale;
    const labelTop = 34 * labelScale;
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(cx - labelW / 2, y - labelTop, labelW, labelH);
    ctx.strokeStyle = 'rgba(56,245,255,.46)';
    ctx.strokeRect(cx - labelW / 2, y - labelTop, labelW, labelH);
    ctx.fillStyle = t.alive ? '#38f5ff' : 'rgba(255,255,255,.45)';
    ctx.font = `${labelFont}px Segoe UI`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${t.code} (${t.cxWorld}, ${t.cyWorld})`, cx, y - labelTop + labelH / 2);
  }
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
