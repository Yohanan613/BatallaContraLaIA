// ============================================================
//  COHETE.JS — Fisica, lanzamiento y previsualizacion del cohete
//  Depende de: configuracion.js, estado.js, formulas.js,
//              sonidos.js, dibujo.js, enemigos.js, paneles.js
// ============================================================

// Inicia el ataque: valida tecnologia, funcion y creditos, luego previsualizacion
function launchRocket() {
  if (rocket || attackLocked || trajectoryPreview.active) return;
  const team = currentTeam();
  const resolvedTechKey = state.selectedTech || 'lineal';
  const tech = TECNOLOGIAS[resolvedTechKey];
  const fn = parseFunction(state.currentFnText);
  if (!tech && !state.devMode) {
    setStatus('Primero selecciona una tecnología.', 'bad');
    return;
  }
  if (!fn) {
    setStatus('La función no es válida. Debe usar x y generar valores numéricos.', 'bad');
    return;
  }
  const typeValidation = state.devMode ? { ok: true } : validateFormulaForTech(state.currentFnText, resolvedTechKey);
  if (!typeValidation.ok) {
    setStatus(typeValidation.message, 'bad');
    return;
  }
  if (!state.devMode && team.credits < tech.costo) {
    setStatus(`${team.short} no tiene créditos suficientes para ${tech.label}.`, 'bad');
    return;
  }

  if (!state.devMode) team.credits -= tech.costo;
  team.shots += 1;
  if (!state.devMode) showSpendEffect(tech.costo, tech.color);
  updateUI();

  attackLocked = true;
  setChecklist('chkLaunch', true);
  state.panelStep = 'idle';
  closeLaunchHelp();
  renderAttackPanel();
  updateUI();

  trajectoryPreview.isCustomFormula = !state.devMode && !isFormulaInExamples(state.currentFnText, resolvedTechKey);
  startTrajectoryPreview(fn, resolvedTechKey, state.turn);
}

// Calcula todos los puntos de la trayectoria en pixeles
function computeTrajectoryPoints(fn) {
  const pts = [];
  const step = 0.25;
  for (let x = 0; x <= worldXMax + 10; x += step) {
    const y = safeEval(fn, x);
    if (!Number.isFinite(y)) break;
    const p = worldToScreen(x, y);
    if (p.x > W + 160 || p.y < -160 || p.y > H + 160) break;
    pts.push(p);
  }
  return pts;
}

// Muestra la animacion de previsualizacion antes de lanzar el cohete real
function startTrajectoryPreview(fn, techId, teamId) {
  if (trajectoryPreview.timer) clearTimeout(trajectoryPreview.timer);
  trajectoryPreview.active = true;
  trajectoryPreview.fn = fn;
  trajectoryPreview.techId = techId;
  trajectoryPreview.teamId = teamId;
  trajectoryPreview.startedAt = performance.now();
  trajectoryPreview.points = computeTrajectoryPoints(fn);
  setStatus('Calculando trayectoria... El cohete se lanzará en 2.5 segundos.');
  playSound('sequence', { volume: 1.0 });
  trajectoryPreview.timer = setTimeout(() => {
    trajectoryPreview.active = false;
    trajectoryPreview.timer = null;
    actuallyLaunchRocket();
  }, trajectoryPreview.duration);
}

// Crea el objeto cohete y lo pone en movimiento
function actuallyLaunchRocket() {
  const { fn, techId, teamId } = trajectoryPreview;
  const team = state.teams[teamId];
  const tech = TECNOLOGIAS[techId];
  stopSound('sequence');
  playSound('missilfly', { volume: 0.20, loop: false });
  const p = worldToScreen(0, 0);
  rocket = {
    teamId,
    sprite: team.sprite,
    techId,
    fn,
    t: 0,
    lastT: 0,
    px: p.x,
    py: p.y,
    lastPx: p.x,
    lastPy: p.y,
    trail: [{ x: p.x, y: p.y }],
    isCustomFormula: trajectoryPreview.isCustomFormula || false,
  };
  if (state.devMode) {
    setStatus(`${team.name} lanzó un cohete en Modo Dev.`, 'ok');
  } else {
    setStatus(`${team.name} lanzó un cohete con tecnología ${tech.label}.`, 'ok');
  }
}

// Dibuja la linea de trayectoria animada durante la previsualizacion
function drawTrajectoryPreview(now) {
  if (!trajectoryPreview.active || trajectoryPreview.points.length < 2) return;

  const elapsed = now - trajectoryPreview.startedAt;
  const progress = Math.min(1, elapsed / trajectoryPreview.duration);
  const visibleCount = Math.max(2, Math.floor(progress * trajectoryPreview.points.length));
  const pts = trajectoryPreview.points.slice(0, visibleCount);

  const tech = TECNOLOGIAS[trajectoryPreview.techId];
  const color = tech ? tech.color : '#ffffff';

  ctx.save();

  ctx.setLineDash([11, 7]);
  ctx.lineDashOffset = -(now / 28) % 18;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = hexToRgba(color, 0.80);
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  const last = pts[pts.length - 1];
  const pulse = 0.5 + 0.5 * Math.sin(now / 70);
  const r = 4.5 + pulse * 3.5;
  ctx.beginPath();
  ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fill();

  const origin = worldToScreen(0, 0);
  const remaining = 1 - progress;
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, 24, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
  ctx.strokeStyle = hexToRgba(color, 0.90);
  ctx.lineWidth = 3.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();

  ctx.restore();
}

// Detecta si el cohete cruzo matematicamente el punto exacto del objetivo
function checkImpact() {
  if (!rocket) return false;
  let nearestMissDist = Infinity;

  for (const t of targets) {
    if (!t.alive) continue;
    // Solo cuando el cohete cruza la coordenada X del objetivo en este paso
    if (rocket.lastT > t.cxWorld || rocket.t < t.cxWorld) continue;
    const fy = safeEval(rocket.fn, t.cxWorld);
    if (!Number.isFinite(fy)) continue;
    const mathDist = Math.abs(fy - t.cyWorld);

    if (mathDist <= HITBOX_EXACT_EPSILON) {
      t.alive = false;
      const team = state.teams[rocket.teamId];
      const tech = TECNOLOGIAS[rocket.techId];
      if (!state.devMode) team.credits += tech.recompensa;
      team.hits += 1;
      const impactP = worldToScreen(t.cxWorld, t.cyWorld);
      createExplosion(impactP.x, impactP.y, 1.2);
      stopSound('missilfly');
      const explosionKey = t.type === 'avion' ? 'explosionAvion'
        : t.type === 'barco' ? 'explosionBarco'
        : 'explosionSubmarino';
      playSound(explosionKey, { volume: 0.90 });
      camera.pivotX = impactP.x;
      camera.pivotY = impactP.y;
      camera.targetZoom = ZOOM_MAX;
      camera.phase = 'holding';
      camera.holdUntil = performance.now() + 950;
      camera.slowMoFactor = 1;
      missEffect = null;
      rocketInHitbox = false;
      _hitboxVisitedIds.clear();
      const wasCustomFormula = rocket.isCustomFormula;
      updateTargetPanel();
      updateUI();
      rocket = null;
      if (state.devMode) {
        setStatus(`Impacto confirmado sobre ${t.code} en Modo Dev.`, 'ok');
      } else {
        setStatus(`Impacto confirmado sobre ${t.code}. +${fmt(tech.recompensa)} créditos para ${team.short}.`, 'ok');
        if (wasCustomFormula) {
          const bonus = 5000;
          team.credits += bonus;
          if (typeof showBonusMessage === 'function') showBonusMessage(bonus);
        }
      }
      if (allTargetsDefeated()) {
        endGame();
      } else {
        scheduleTurnAdvance();
        attackLocked = true;
      }
      return true;
    }

    // Solo cuenta la distancia si el cohete entro en el hitbox visual de este objetivo
    if (mathDist < nearestMissDist && _hitboxVisitedIds.has(t.id)) {
      nearestMissDist = mathDist;
    }
  }

  // Muestra la distancia solo si el cohete paso por el hitbox visual del objetivo
  if (nearestMissDist < Infinity && typeof showMissMessage === 'function') {
    showMissMessage(nearestMissDist);
  }

  return false;
}

function isRocketOutside() {
  if (!rocket) return false;
  const margin = 110;
  return rocket.px < -margin || rocket.px > W + margin || rocket.py < -margin || rocket.py > H + margin;
}

function destroyRocketOutOfBounds() {
  if (camera.phase !== 'idle') {
    camera.phase = 'zooming-out';
    camera.targetZoom = 1;
    camera.slowMoFactor = 1;
  }
  if (_hitboxVisitedIds.size === 0 && typeof showOutOfRangeMessage === 'function') {
    showOutOfRangeMessage();
  }
  missEffect = null;
  stopSound('missilfly');
  rocket = null;
  _hitboxVisitedIds.clear();
  scheduleTurnAdvance();
  attackLocked = true;
  setStatus('Cohete fuera del área de lanzamiento.', 'bad');
}

// Activa camara lenta cuando el cohete se acerca a un objetivo
function checkProximityForSlowMo() {
  if (!rocket) return;
  if (camera.phase === 'holding') return;

  let nearAny = false;
  for (const t of targets) {
    if (!t.alive) continue;
    const hb = getHitboxPixels(t);
    const vertMargin = hb.h * 1.2;
    const inVertRange = rocket.py >= hb.y - vertMargin && rocket.py <= hb.y + hb.h + vertMargin;
    const nearLeft = Math.abs(rocket.px - hb.x) < SLOW_MO_TRIGGER_DIST;
    const nearRight = Math.abs(rocket.px - (hb.x + hb.w)) < SLOW_MO_TRIGGER_DIST;
    if (inVertRange && (nearLeft || nearRight)) {
      nearAny = true;
      break;
    }
  }

  if (nearAny) {
    camera.phase = 'zooming';
    camera.pivotX = rocket.px;
    camera.pivotY = rocket.py;
    camera.targetZoom = ZOOM_MAX;
    camera.slowMoFactor = SLOW_MO_FACTOR;
  } else if (camera.phase === 'zooming') {
    camera.phase = 'zooming-out';
    camera.targetZoom = 1;
    camera.slowMoFactor = 1;
  }
}

// IDs de objetivos cuyo hitbox visual fue penetrado por el cohete en este vuelo
const _hitboxVisitedIds = new Set();

// Detecta cuando el cohete sale de la hitbox visual sin haber matado → activa sssh
function checkRocketHitboxContact() {
  if (!rocket) { rocketInHitbox = false; _hitboxVisitedIds.clear(); return; }

  let inAny = false;
  for (const t of targets) {
    if (!t.alive) continue;
    const hb = getHitboxPixels(t);
    if (rocket.px >= hb.x && rocket.px <= hb.x + hb.w &&
        rocket.py >= hb.y && rocket.py <= hb.y + hb.h) {
      inAny = true;
      _hitboxVisitedIds.add(t.id);
      break;
    }
  }

  if (!inAny && rocketInHitbox) {
    const now = performance.now();
    if (now >= missEffectCooldownUntil) {
      missEffect = { startedAt: now };
      missEffectCooldownUntil = now + 1000;
    }
  }

  rocketInHitbox = inAny;
}

// Avanza la posicion del cohete un paso de simulacion
function updateRocket(dt) {
  if (!rocket) return;
  rocket.lastT = rocket.t;
  rocket.t += dt * ROCKET_SPEED;
  const y = safeEval(rocket.fn, rocket.t);
  if (!Number.isFinite(y)) {
    destroyRocketOutOfBounds();
    return;
  }
  rocket.lastPx = rocket.px;
  rocket.lastPy = rocket.py;
  const p = worldToScreen(rocket.t, y);
  rocket.px = p.x;
  rocket.py = p.y;
  rocket.trail.push({ x: p.x, y: p.y });
  if (rocket.trail.length > 80) rocket.trail.shift();

  if (checkImpact()) return;
  if (isRocketOutside()) destroyRocketOutOfBounds();
}
