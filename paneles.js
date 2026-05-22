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
  els.teamPurpleCard.classList.toggle('active', state.turn === 'morado');
  els.teamGreenCard.classList.toggle('active', state.turn === 'verde');
  els.startAttackBtn.disabled = state.phase === 'ended';
  els.startAttackBtn.textContent = attackPanelCollapsed ? 'Expandir' : 'Colapsar';
  els.attackPanel.classList.toggle('collapsed', attackPanelCollapsed);
  els.devModeBtn.textContent = `Dev: ${state.devMode ? 'ON' : 'OFF'}`;
  els.devModeBtn.classList.toggle('active', state.devMode);
  els.toggleGridBtn.textContent = `Cuadricula: ${gridVisible ? 'ON' : 'OFF'}`;
}

// Renderiza el contenido del panel de ataque segun el paso actual
function renderAttackPanel() {
  const team = currentTeam();
  els.attackPanel.dataset.step = state.panelStep;
  if (state.panelStep === 'idle') {
    els.attackStepLabel.textContent = 'Panel listo';
    els.attackContent.innerHTML = `
      <div class="credit-line">Creditos de ${team.short}: <b>${formatCredits(team.credits)}</b> cr.</div>
      <div class="panel-actions">
        <button class="primary" id="panelStartBtn" ${rocket || attackLocked || state.phase === 'ended' ? 'disabled' : ''}>Iniciar ataque</button>
      </div>
    `;
    document.getElementById('panelStartBtn')?.addEventListener('click', openTechPanel);
    return;
  }

  if (state.panelStep === 'tech' || state.panelStep === 'formula') {
    els.attackStepLabel.textContent = 'Ataque abierto';
    els.attackContent.innerHTML = `
      <div class="credit-line">Configura el ataque en la ventana emergente.</div>
    `;
    renderAttackPopup();
    return;
  }
}

// Renderiza el popup flotante de seleccion de tecnologia o formula
function renderAttackPopup() {
  if (!els.launchPopupBody) return;
  const team = currentTeam();

  if (state.panelStep === 'tech') {
    els.launchPopupTitle.textContent = 'Seleccionar tecnología';
    const techHtml = Object.values(TECNOLOGIAS).map(t => {
      const disabled = !state.devMode && team.credits < t.costo;
      return `
        <button class="tech-btn ${state.selectedTech === t.key ? 'active' : ''}" data-tech="${t.key}" ${disabled ? 'disabled' : ''}>
          <span class="main">
            <span class="label" style="color:${t.color}">[${t.tag}] ${t.label}</span>
            <span class="formula">${t.formula}</span>
            <span class="desc">${t.desc}</span>
          </span>
          <span class="cost">${fmt(t.costo)} cr</span>
        </button>
      `;
    }).join('');

    els.launchPopupBody.innerHTML = `
      <div class="credit-line">Creditos de ${team.short}: <b>${formatCredits(team.credits)}</b> cr.</div>
      <div class="tech-list">${techHtml}</div>
      <div class="panel-actions">
        <button class="ghost" id="cancelTechBtn">Cancelar</button>
      </div>
    `;
    els.launchPopupBody.querySelectorAll('[data-tech]').forEach(btn => {
      btn.addEventListener('click', () => selectTech(btn.dataset.tech));
    });
    document.getElementById('cancelTechBtn')?.addEventListener('click', cancelAttackPanel);
    return;
  }

  if (state.panelStep === 'formula') {
    const tech = TECNOLOGIAS[state.selectedTech];
    const examples = tech.examples.map(ex => `<span class="example-chip" data-example="${ex}">${ex}</span>`).join('');
    els.launchPopupTitle.textContent = state.devMode ? 'Funcion libre (Modo Dev)' : `Funcion ${tech.label}`;
    els.launchPopupBody.innerHTML = `
      <div class="credit-line">${state.devMode ? 'Modo DEV activo: cualquier funcion es valida, tecnologia ignorada y creditos infinitos.' : `Tecnologia: <b style="color:${tech.color}">${tech.label}</b> · Costo: <b>${fmt(tech.costo)}</b> cr.`}</div>
      <div class="formula-block">
        <label>Escribe y = f(x)</label>
        <input id="formulaInput" autocomplete="off" placeholder="Ej: -0.4*x+3 | 0.05*x*x-2 | pow(1.15,x)-1" value="${escapeHtml(state.currentFnText)}" />
      </div>
      <div class="examples">${examples}</div>
      <div id="formulaFeedback" class="small-feedback">Escribe una funcion valida para lanzar.</div>
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
    els.launchPopupBody.querySelectorAll('[data-example]').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.example;
        updateFormulaFromInput(input.value);
        input.focus();
      });
    });
    updateFormulaFromInput(input.value, true);
  }
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
      if (feedback) feedback.textContent = typeValidation?.message || 'Funcion invalida. Debe incluir x y dar valores numericos.';
    } else {
      setChecklist('chkFn', false);
      if (feedback) feedback.textContent = 'Escribe una funcion valida para lanzar.';
    }
    if (launchBtn) launchBtn.disabled = true;
  }
  if (!renderOnly) {
    const ok = Boolean(fn && typeValidation?.ok);
    setStatus(ok ? (state.devMode ? 'Modo Dev: funcion lista para lanzar.' : 'Funcion lista para lanzar.') : (typeValidation?.message || 'Funcion invalida. Debe incluir x y dar valores numericos.'), ok ? '' : 'bad');
  }
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

function toggleAttackPanel() {
  attackPanelCollapsed = !attackPanelCollapsed;
  updateUI();
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
      '<div class="check" id="chkTech"><span>02</span> Tecnologia elegida</div>' +
      '<div class="check" id="chkFn"><span>03</span> Funcion valida</div>' +
      '<div class="check" id="chkLaunch"><span>04</span> Cohete lanzado</div>';
    resetChecklistForTurn();
    setChecklist('chkTurn', true);
  }
}

function toggleDevMode() {
  state.devMode = !state.devMode;
  if (state.devMode) {
    setStatus('Modo Dev activado: dinero infinito y validacion de funcion sin restriccion por tecnologia.', 'ok');
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
  showLaunchHelp();
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
    ? `Turno de ${currentTeam().name}. Modo Dev activo: escribe cualquier funcion.`
    : `Turno de ${currentTeam().name}. Elige una tecnologia de disparo.`);
  renderAttackPanel();
}

function selectTech(key) {
  state.selectedTech = key;
  setChecklist('chkTech', true);
  state.panelStep = 'formula';
  playSound('coin', { volume: 0.70 });
  setStatus(`Tecnologia ${TECNOLOGIAS[key].label} seleccionada. Escribe la funcion.`);
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
