// ============================================================
//  PARTIDA.JS — Flujo de la partida: turnos, fin y reinicio
//  Depende de: configuracion.js, estado.js, paneles.js,
//              sonidos.js, enemigos.js
// ============================================================

// Programa el cambio de turno con un pequeño retraso tras el impacto
function scheduleTurnAdvance() {
  clearTimeout(turnAdvanceTimer);
  turnAdvanceTimer = setTimeout(() => {
    turnAdvanceTimer = null;
    advanceTurn();
  }, 720);
}

// Cambia al equipo siguiente y reinicia el estado del turno
function advanceTurn() {
  if (state.phase === 'ended') return;

  if (allTargetsDefeated()) {
    endGame();
    return;
  }

  if (checkCreditsBankruptcy()) return;

  if (state.turn === 'morado') {
    state.turn = 'verde';
  } else {
    state.turn = 'morado';
    state.round += 1;
  }

  attackLocked = false;
  state.panelStep = 'idle';
  state.selectedTech = null;
  state.currentFnText = '';
  previewFn = null;
  previewTech = null;
  resetChecklistForTurn();
  setChecklist('chkTurn', true);
  renderAttackPanel();
  updateUI();
  const team = currentTeam();
  showTurnToast(`Turno: ${team.short}`, team.color);
  setStatus(`Es el turno de ${team.name}. Pulsa Iniciar ataque.`);
}

// Verifica si algun equipo tiene menos de 1000 creditos y termina la partida
function checkCreditsBankruptcy() {
  if (state.devMode) return false;
  const teams = Object.values(state.teams);
  const broke = teams.filter(t => t.credits < 1000);
  if (broke.length === 0) return false;

  state.phase = 'ended';
  attackLocked = true;

  let winner = null;
  if (broke.length === 1) {
    winner = teams.find(t => t.credits >= 1000);
  }

  const reason = broke.map(t => t.name).join(' y ') +
    (broke.length === 1 ? ' se quedó sin créditos suficientes.' : ' ambos se quedaron sin créditos suficientes.');

  els.attackPanel.dataset.step = 'ended';
  els.attackStepLabel.textContent = 'Batalla finalizada';
  els.attackContent.innerHTML = `
    <div class="panel-note">${winner
      ? `${reason}<br>Ganador: <b style="color:${winner.color}">${winner.name}</b>`
      : `${reason}<br><b>Empate por bancarrota.</b>`}</div>
    <div class="panel-actions"><button class="primary" id="playAgainBtn">Jugar de nuevo</button></div>
  `;
  document.getElementById('playAgainBtn')?.addEventListener('click', resetGame);
  playSound('win', { volume: 1.0 });
  setStatus(winner
    ? `${reason} Ganador: ${winner.name}.`
    : `${reason} Empate por bancarrota.`, 'ok');
  updateUI();
  showWinPopup(winner, state.teams.morado, state.teams.verde);
  return true;
}

// Termina la partida, determina ganador y muestra el popup
function endGame() {
  state.phase = 'ended';
  attackLocked = true;
  const p = state.teams.morado;
  const g = state.teams.verde;
  const winner = p.hits !== g.hits ? (p.hits > g.hits ? p : g) : null;
  els.attackPanel.dataset.step = 'ended';
  els.attackStepLabel.textContent = 'Batalla finalizada';
  els.attackContent.innerHTML = `
    <div class="panel-note">${winner ? `Ganador: <b style="color:${winner.color}">${winner.name}</b>` : '<b>Empate por bajas.</b>'}</div>
    <div class="panel-actions"><button class="primary" id="playAgainBtn">Jugar de nuevo</button></div>
  `;
  document.getElementById('playAgainBtn')?.addEventListener('click', resetGame);
  playSound('win', { volume: 1.0 });
  setStatus(winner ? `Todas las unidades fueron abatidas. Ganador: ${winner.name}.` : 'Todas las unidades fueron abatidas. Empate por bajas.', 'ok');
  updateUI();
  showWinPopup(winner, p, g);
}

// Muestra el popup de fin de partida con corona y resumen opcional
function showWinPopup(winner, p, g) {
  const popup = document.getElementById('winPopup');
  const labelEl = document.getElementById('winPopupLabel');
  const crownImg = document.getElementById('winCrown');
  const winnerEl = document.getElementById('winPopupWinner');
  const summaryEl = document.getElementById('winSummary');
  const summaryBtn = document.getElementById('winSummaryBtn');
  const playAgainBtn = document.getElementById('winPlayAgainBtn');
  if (!popup) return;

  if (winner) {
    if (labelEl) labelEl.textContent = 'GANADOR';
    winnerEl.textContent = winner.name;
    winnerEl.style.color = winner.color;
    if (crownImg) {
      crownImg.src = winner.id === 'morado' ? 'assets/coronaM.png' : 'assets/coronaV.png';
      crownImg.style.display = 'block';
    }
  } else {
    if (labelEl) labelEl.textContent = 'EMPATE';
    winnerEl.textContent = 'Igualdad de bajas';
    winnerEl.style.color = '#eef8ff';
    if (crownImg) crownImg.style.display = 'none';
  }

  summaryEl.classList.add('hidden');
  summaryBtn.textContent = 'Resumen de partida';

  const newSummaryBtn = summaryBtn.cloneNode(true);
  summaryBtn.parentNode.replaceChild(newSummaryBtn, summaryBtn);
  newSummaryBtn.addEventListener('click', () => {
    const visible = !summaryEl.classList.contains('hidden');
    if (!visible) {
      summaryEl.innerHTML =
        '<div><b style="color:#ff4df0">Equipo Morado</b> - Impactos: <b>' + p.hits + '</b>  Disparos: <b>' + p.shots + '</b>  Creditos: <b>' + fmt(p.credits) + '</b></div>' +
        '<div style="margin-top:8px"><b style="color:#7cff23">Equipo Verde</b> - Impactos: <b>' + g.hits + '</b>  Disparos: <b>' + g.shots + '</b>  Creditos: <b>' + fmt(g.credits) + '</b></div>';
    }
    summaryEl.classList.toggle('hidden', visible);
    newSummaryBtn.textContent = visible ? 'Resumen de partida' : 'Ocultar resumen';
  });

  const newPlayBtn = playAgainBtn.cloneNode(true);
  playAgainBtn.parentNode.replaceChild(newPlayBtn, playAgainBtn);
  newPlayBtn.addEventListener('click', () => {
    popup.classList.add('hidden');
    resetGame();
  });

  popup.classList.remove('hidden');
}

// Reinicia completamente el juego a su estado inicial
function resetGame() {
  clearTimeout(turnAdvanceTimer);
  turnAdvanceTimer = null;
  state.round = 1;
  state.turn = 'morado';
  state.phase = 'playing';
  state.panelStep = 'idle';
  state.selectedTech = null;
  state.currentFnText = '';
  Object.values(state.teams).forEach(team => {
    team.credits = CREDITOS_INICIALES;
    team.hits = 0;
    team.shots = 0;
  });
  rocket = null;
  previewFn = null;
  previewTech = null;
  explosions = [];
  attackLocked = false;
  camera.phase = 'idle';
  camera.zoom = 1;
  camera.targetZoom = 1;
  camera.slowMoFactor = 1;
  if (trajectoryPreview.timer) clearTimeout(trajectoryPreview.timer);
  trajectoryPreview.active = false;
  trajectoryPreview.timer = null;
  trajectoryPreview.points = [];
  stopSound('missilfly');
  stopSound('sequence');
  stopSound('win');
  closeLaunchHelp();
  const winPopupEl = document.getElementById('winPopup');
  if (winPopupEl) winPopupEl.classList.add('hidden');
  attackPanelCollapsed = true;
  resetChecklistForTurn();
  setChecklist('chkTurn', true);
  createRoundTargets();
  renderAttackPanel();
  updateUI();
  showTurnToast('Turno: Morado', state.teams.morado.color);
  setStatus('Presiona "Iniciar ataque" para comenzar el turno.');
}
