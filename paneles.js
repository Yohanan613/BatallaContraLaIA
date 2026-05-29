// ============================================================
//  PANELES.JS — Gestion de paneles, popups y estado de UI
//  Depende de: configuracion.js, estado.js, formulas.js, sonidos.js
// ============================================================

function showTurnToast(text, color) {
  els.turnToast.textContent = text;
  els.turnToast.style.color = color;
  els.turnToast.style.borderColor = color;
  els.turnToast.classList.remove('hidden');
  state.turnToastHideAt = performance.now() + 1700;
}

function maybeHideTurnToast(now) {
  if (state.turnToastHideAt && now >= state.turnToastHideAt) {
    els.turnToast.classList.add('hidden');
    state.turnToastHideAt = 0;
  }
}

function resetChecklistForTurn() {
  ['chkTurn', 'chkTech', 'chkFn', 'chkLaunch'].forEach(id => setChecklist(id, false));
}

// Usa getElementById para evitar referencias obsoletas cuando el panel se reconstruye
function setChecklist(id, ok) {
  document.getElementById(id)?.classList.toggle('ok', Boolean(ok));
}

function setStatus(text, type = 'normal') {
  els.statusText.textContent = text;
  els.statusText.style.color = type === 'ok' ? '#7cff23' : type === 'bad' ? '#ff6e8c' : '#dbe9ff';
  els.statusText.style.borderColor = type === 'ok' ? '#7cff23' : type === 'bad' ? '#ff6e8c' : '#38f5ff';
}

function showSpendEffect(amount, color) {
  const fx = document.createElement('div');
  fx.className = 'spend-effect';
  fx.textContent = `-${fmt(amount)} cr`;
  fx.style.color = color;
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 1150);
}

// Actualiza todos los indicadores del topbar y botones de estado
function updateUI() {
  els.roundLabel.textContent = state.round;
  els.purpleCredits.textContent = formatCredits(state.teams.morado.credits);
  els.greenCredits.textContent = formatCredits(state.teams.verde.credits);
  els.purpleHits.textContent = state.teams.morado.hits;
  els.greenHits.textContent = state.teams.verde.hits;
  els.currentTeamName.textContent = currentTeam().name;
  els.currentTeamName.style.color = currentTeam().color;
  const squadEl = document.getElementById('currentSquadName');
  if (squadEl) {
    const sname = (typeof currentSquadName === 'function') ? currentSquadName(state.turn) : '';
    squadEl.textContent = sname;
    squadEl.style.display = sname ? 'block' : 'none';
  }
  els.teamPurpleCard.classList.toggle('active', state.turn === 'morado');
  els.teamGreenCard.classList.toggle('active', state.turn === 'verde');
  els.attackPanel.classList.remove('collapsed');
  els.devModeBtn.textContent = `Dev: ${state.devMode ? 'ON' : 'OFF'}`;
  els.devModeBtn.classList.toggle('active', state.devMode);
  els.toggleGridBtn.textContent = `Cuadrícula: ${gridVisible ? 'ON' : 'OFF'}`;
}

// Renderiza el contenido del panel de ataque segun el paso actual
function renderAttackPanel() {
  const team = currentTeam();
  els.attackPanel.dataset.step = state.panelStep;
  const inAttack = state.panelStep === 'tech' || state.panelStep === 'formula';
  document.body.classList.toggle('split-mode', inAttack);
  drawScaleFactor = inAttack ? SPLIT_MODE_ENEMY_SCALE : 1.0;
  recalcTargetPixels();
  resize();

  if (state.panelStep === 'idle') {
    els.attackStepLabel.textContent = 'Panel listo';
    els.attackContent.innerHTML = `
      <div class="credit-line">Créditos de ${team.short}: <b>${formatCredits(team.credits)}</b> cr.</div>
      <div class="panel-actions">
        <button class="primary" id="panelStartBtn" ${rocket || attackLocked || state.phase === 'ended' ? 'disabled' : ''}>Iniciar ataque</button>
      </div>
    `;
    document.getElementById('panelStartBtn')?.addEventListener('click', openTechPanel);
    return;
  }

  if (inAttack) {
    renderAttackPopup();
    return;
  }
}

// Renderiza el contenido de seleccion de tecnologia o formula directamente en attackContent
function renderAttackPopup() {
  const team = currentTeam();

  if (state.panelStep === 'tech') {
    els.attackStepLabel.textContent = 'Seleccionar tecnología';
    const techHtml = Object.values(TECNOLOGIAS).map(t => {
      const disabled = !state.devMode && team.credits < t.costo;
      let formulaHtml = t.formula;
      if (typeof katex !== 'undefined') {
        try { formulaHtml = katex.renderToString(t.latexFormula || t.formula, { throwOnError: false, displayMode: false }); } catch (_) {}
      }
      return `
        <button class="tech-btn ${state.selectedTech === t.key ? 'active' : ''}" data-tech="${t.key}" ${disabled ? 'disabled' : ''}>
          <span class="main">
            <span class="label" style="color:${t.color}">[${t.tag}] ${t.label}</span>
            <span class="formula">${formulaHtml}</span>
            <span class="desc">${t.desc}</span>
          </span>
          <span class="cost">${fmt(t.costo)} cr</span>
        </button>
      `;
    }).join('');

    els.attackContent.innerHTML = `
      <div class="credit-line">Créditos de ${team.short}: <b>${formatCredits(team.credits)}</b> cr.</div>
      <div class="tech-list">${techHtml}</div>
      <div class="panel-actions">
        <button class="ghost" id="cancelTechBtn">Cancelar</button>
      </div>
    `;
    els.attackContent.querySelectorAll('[data-tech]').forEach(btn => {
      btn.addEventListener('click', () => selectTech(btn.dataset.tech));
    });
    document.getElementById('cancelTechBtn')?.addEventListener('click', cancelAttackPanel);
    return;
  }

  if (state.panelStep === 'formula') {
    const tech = TECNOLOGIAS[state.selectedTech];
    const examples = tech.examples.map(ex => {
      let inner = ex;
      if (typeof katex !== 'undefined') {
        try {
          inner = katex.renderToString(formulaToLatex(ex), { throwOnError: false, displayMode: false });
        } catch (_) {}
      }
      return `<span class="example-chip" data-example="${ex}">${inner}</span>`;
    }).join('');
    els.attackStepLabel.textContent = state.devMode ? 'Función libre (Modo Dev)' : `Función ${tech.label}`;
    els.attackContent.innerHTML = `
      <div class="credit-line">${state.devMode ? 'Modo DEV activo: cualquier función es válida, tecnología ignorada y créditos infinitos.' : `Tecnología: <b style="color:${tech.color}">${tech.label}</b> · Costo: <b>${fmt(tech.costo)}</b> cr.`}</div>
      <div class="formula-block">
        <label>Escribe y = f(x)</label>
        <input id="formulaInput" autocomplete="off" placeholder="Escribe tu fórmula" value="${escapeHtml(state.currentFnText)}" />
      </div>
      <div id="latexPreview" class="latex-preview"><span class="latex-placeholder">La fórmula aparecerá aquí en formato matemático</span></div>
      <div class="examples">${examples}</div>
      <div id="formulaFeedback" class="small-feedback">Escribe una función válida para lanzar.</div>
      <div class="panel-actions">
        <button class="ghost" id="backTechBtn">Volver</button>
        <button class="primary" id="launchBtn" disabled>Lanzar cohete</button>
      </div>
    `;
    const input = document.getElementById('formulaInput');
    const launchBtn = document.getElementById('launchBtn');
    input.focus();
    input.addEventListener('input', () => updateFormulaFromInput(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !launchBtn.disabled) launchRocket();
    });
    document.getElementById('backTechBtn')?.addEventListener('click', openTechPanel);
    document.getElementById('launchBtn')?.addEventListener('click', launchRocket);
    els.attackContent.querySelectorAll('[data-example]').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.example;
        updateFormulaFromInput(input.value);
        input.focus();
      });
    });
    updateFormulaFromInput(input.value, true);
  }
}

function showBonusMessage(amount) {
  const el = document.createElement('div');
  el.className = 'bonus-message';
  el.textContent = `✦ BONUS +${fmt(amount)} cr por fórmula nueva`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showOutOfRangeMessage() {
  const el = document.createElement('div');
  el.className = 'out-of-range-message';
  el.textContent = 'MISIL fuera de rango';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showMissMessage(worldDist) {
  const el = document.createElement('div');
  el.className = 'miss-message';
  let distStr;
  if (worldDist < 1e-6) {
    distStr = worldDist.toExponential(2);
  } else if (worldDist < 0.01) {
    distStr = worldDist.toFixed(5);
  } else if (worldDist < 1) {
    distStr = worldDist.toFixed(3);
  } else {
    distStr = worldDist.toFixed(2);
  }
  el.textContent = `Estuviste a ${distStr} de impactar`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Valida la funcion en tiempo real y habilita/deshabilita el boton de lanzar
function updateFormulaFromInput(text, renderOnly = false) {
  state.currentFnText = text;
  const feedback = document.getElementById('formulaFeedback');
  const launchBtn = document.getElementById('launchBtn');
  const fn = parseFunction(text);
  const typeValidation = fn ? (state.devMode ? { ok: true, message: 'Modo Dev: funcion valida.' } : validateFormulaForTech(text, state.selectedTech)) : null;
  if (fn && typeValidation.ok) {
    previewFn = fn;
    previewTech = state.selectedTech;
    setChecklist('chkFn', true);
    if (feedback) feedback.textContent = typeValidation.message;
    if (launchBtn) launchBtn.disabled = false;
  } else {
    previewFn = null;
    previewTech = null;
    if (text.trim()) {
      setChecklist('chkFn', false);
      if (feedback) feedback.textContent = typeValidation?.message || 'Función inválida. Debe incluir x y dar valores numéricos.';
    } else {
      setChecklist('chkFn', false);
      if (feedback) feedback.textContent = 'Escribe una función válida para lanzar.';
    }
    if (launchBtn) launchBtn.disabled = true;
  }
  renderLatex(text);
  if (!renderOnly) {
    const ok = Boolean(fn && typeValidation?.ok);
    setStatus(ok ? (state.devMode ? 'Modo Dev: función lista para lanzar.' : 'Función lista para lanzar.') : (typeValidation?.message || 'Función inválida. Debe incluir x y dar valores numéricos.'), ok ? '' : 'bad');
  }
}

// Convierte texto de formula a LaTeX legible
function formulaToLatex(raw) {
  if (!raw || !raw.trim()) return '';
  let s = raw.trim().replace(/\s+/g, '').replace(/,/g, '.');

  // Funciones matematicas
  s = s.replace(/Math\.sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/Math\.sin\(([^)]+)\)/g, '\\sin($1)');
  s = s.replace(/Math\.cos\(([^)]+)\)/g, '\\cos($1)');
  s = s.replace(/Math\.tan\(([^)]+)\)/g, '\\tan($1)');
  s = s.replace(/Math\.log\(([^)]+)\)/g, '\\ln($1)');
  s = s.replace(/Math\.abs\(([^)]+)\)/g, '\\left|$1\\right|');
  s = s.replace(/Math\.PI/gi, '\\pi');
  s = s.replace(/Math\.pow\(([^,)]+),([^)]+)\)/g, '{$1}^{$2}');

  // x*x, x**2, x^2 → x^{2}
  s = s.replace(/x\*\*(\d+)/g, 'x^{$1}');
  s = s.replace(/x\^(\d+)/g, 'x^{$1}');
  s = s.replace(/x\*x/g, 'x^{2}');

  // base numerica^x  (exponencial)
  s = s.replace(/([\d.]+)\^x/g, '{$1}^{x}');
  s = s.replace(/([\d.]+)\*\*x/g, '{$1}^{x}');

  // coeficiente*x
  s = s.replace(/([\d.]+)\*x/g, '$1x');

  // multiplicaciones restantes
  s = s.replace(/\*/g, ' \\cdot ');

  // espaciado alrededor de + y -
  s = s.replace(/\+/g, ' + ');
  s = s.replace(/([x\d)}])-/g, '$1 - ');

  return 'y = ' + s.replace(/\s+/g, ' ').trim();
}

// Renderiza la formula en el div #latexPreview usando KaTeX
function renderLatex(text) {
  const el = document.getElementById('latexPreview');
  if (!el) return;
  if (!text || !text.trim()) {
    el.innerHTML = '<span class="latex-placeholder">La fórmula aparecerá aquí en formato matemático</span>';
    return;
  }
  const latex = formulaToLatex(text);
  if (typeof katex !== 'undefined') {
    try {
      katex.render(latex, el, { throwOnError: false, displayMode: true });
      return;
    } catch (_) { /* fallback */ }
  }
  el.textContent = latex;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showLaunchHelp() {
  els.launchHelpPopup?.classList.remove('hidden');
}

function closeLaunchHelp() {
  els.launchHelpPopup?.classList.add('hidden');
}


// Muestra el popup de ganador con cualquier equipo (para modo dev)
function previewWin(teamId) {
  const p = state.teams.morado;
  const g = state.teams.verde;
  const winner = teamId === 'morado' ? p : teamId === 'verde' ? g : null;
  playSound('win', { volume: 1.0 });
  showWinPopup(winner, p, g);
}

// Cambia el panel de secuencia de disparo por botones de dev (o lo restaura)
function updateCheckPanelForDevMode() {
  const h3 = els.checkPanel?.querySelector('h3');
  const content = document.getElementById('checkContent');
  if (!content) return;
  if (state.devMode) {
    if (h3) h3.textContent = 'MODO DEV';
    content.innerHTML =
      '<div class="dev-win-btns">' +
      '<button class="dev-win-btn morado" data-team="morado">Ver Win Morado</button>' +
      '<button class="dev-win-btn verde" data-team="verde">Ver Win Verde</button>' +
      '<button class="dev-win-btn empate" data-team="empate">Ver Empate</button>' +
      '</div>';
    content.querySelectorAll('[data-team]').forEach(btn => {
      btn.addEventListener('click', () => previewWin(btn.dataset.team));
    });
    els.checkPanel.classList.remove('compact');
    if (els.toggleCheckBtn) { els.toggleCheckBtn.textContent = '-'; els.toggleCheckBtn.setAttribute('aria-expanded', 'true'); }
  } else {
    if (h3) h3.textContent = 'Secuencia de disparo';
    content.innerHTML =
      '<div class="check" id="chkTurn"><span>01</span> Turno habilitado</div>' +
      '<div class="check" id="chkTech"><span>02</span> Tecnología elegida</div>' +
      '<div class="check" id="chkFn"><span>03</span> Función válida</div>' +
      '<div class="check" id="chkLaunch"><span>04</span> Cohete lanzado</div>';
    resetChecklistForTurn();
    setChecklist('chkTurn', true);
  }
}

function toggleDevMode() {
  state.devMode = !state.devMode;
  if (state.devMode) {
    setStatus('Modo Dev activado: dinero infinito y validación de función sin restricción por tecnología.', 'ok');
  } else {
    setStatus('Modo Dev desactivado: reglas normales restauradas.');
  }
  updateCheckPanelForDevMode();
  renderAttackPanel();
  updateUI();
}

function toggleRadarCompact() {
  const compact = !els.radarPanel.classList.contains('compact');
  els.radarPanel.classList.toggle('compact', compact);
  els.toggleRadarBtn.textContent = compact ? '+' : '-';
  els.toggleRadarBtn.setAttribute('aria-expanded', String(!compact));
}

function toggleCheckPanel() {
  const compact = !els.checkPanel.classList.contains('compact');
  els.checkPanel.classList.toggle('compact', compact);
  els.toggleCheckBtn.textContent = compact ? '+' : '-';
  els.toggleCheckBtn.setAttribute('aria-expanded', String(!compact));
}

// Abre el panel de ataque en el paso correcto segun modo
function openTechPanel() {
  if (rocket || attackLocked || state.phase === 'ended') return;
  attackPanelCollapsed = false;
  state.panelStep = state.devMode ? 'formula' : 'tech';
  state.selectedTech = state.devMode ? 'lineal' : null;
  state.currentFnText = '';
  previewFn = null;
  previewTech = null;
  setChecklist('chkTurn', true);
  setChecklist('chkTech', state.devMode);
  setChecklist('chkFn', false);
  setChecklist('chkLaunch', false);
  setStatus(state.devMode
    ? `Turno de ${currentTeam().name}. Modo Dev activo: escribe cualquier función.`
    : `Turno de ${currentTeam().name}. Elige una tecnología de disparo.`);
  renderAttackPanel();
}

function selectTech(key) {
  state.selectedTech = key;
  setChecklist('chkTech', true);
  state.panelStep = 'formula';
  playSound('coin', { volume: 0.70 });
  setStatus(`Escribe la función para ${TECNOLOGIAS[key].label}.`);
  renderAttackPanel();
}

function cancelAttackPanel() {
  state.panelStep = 'idle';
  state.selectedTech = null;
  state.currentFnText = '';
  previewFn = null;
  previewTech = null;
  resetChecklistForTurn();
  setChecklist('chkTurn', true);
  setStatus('Ataque cancelado. Puedes iniciar nuevamente cuando quieras.');
  closeLaunchHelp();
  renderAttackPanel();
}
