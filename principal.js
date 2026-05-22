// ============================================================
//  PRINCIPAL.JS — Punto de entrada: canvas, elementos DOM,
//                 bucle de animacion e inicializacion
//  Depende de: todos los demas modulos (cargado al final)
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Referencias a todos los elementos del DOM usados por el juego
const els = {
  roundLabel: document.getElementById('roundLabel'),
  purpleCredits: document.getElementById('purpleCredits'),
  greenCredits: document.getElementById('greenCredits'),
  purpleHits: document.getElementById('purpleHits'),
  greenHits: document.getElementById('greenHits'),
  teamPurpleCard: document.getElementById('teamPurpleCard'),
  teamGreenCard: document.getElementById('teamGreenCard'),
  currentTeamName: document.getElementById('currentTeamName'),
  radarPanel: document.getElementById('radarPanel'),
  toggleRadarBtn: document.getElementById('toggleRadarBtn'),
  targetList: document.getElementById('targetList'),
  statusText: document.getElementById('statusText'),
  startAttackBtn: document.getElementById('startAttackBtn'),
  attackPanel: document.getElementById('attackPanel'),
  launchHelpPopup: document.getElementById('launchHelpPopup'),
  launchPopupTitle: document.getElementById('launchPopupTitle'),
  launchPopupBody: document.getElementById('launchPopupBody'),
  closeLaunchHelpBtn: document.getElementById('closeLaunchHelpBtn'),
  resetBtn: document.getElementById('resetBtn'),
  toggleGridBtn: document.getElementById('toggleGridBtn'),
  devModeBtn: document.getElementById('devModeBtn'),
  attackContent: document.getElementById('attackContent'),
  attackStepLabel: document.getElementById('attackStepLabel'),
  turnToast: document.getElementById('turnToast'),
  chkTurn: document.getElementById('chkTurn'),
  chkTech: document.getElementById('chkTech'),
  chkFn: document.getElementById('chkFn'),
  chkLaunch: document.getElementById('chkLaunch'),
  checkPanel: document.getElementById('checkPanel'),
  toggleCheckBtn: document.getElementById('toggleCheckBtn'),
};

// Bucle principal: actualiza fisica y dibuja cada fotograma
function drawFrame(now) {
  if (!lastTime) lastTime = now;
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const dt = rawDt * camera.slowMoFactor;
  updateRocket(dt);
  checkProximityForSlowMo();
  updateCamera(rawDt);
  maybeHideTurnToast(now);

  ctx.clearRect(0, 0, W, H);

  ctx.save();
  if (camera.zoom > 1.001) {
    ctx.translate(camera.pivotX, camera.pivotY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.pivotX, -camera.pivotY);
  }
  drawBackground();
  drawGrid();
  drawOriginLauncher();
  drawTargets(now);
  drawTrajectoryPreview(now);
  drawRocket(now);
  drawExplosions(now);
  ctx.restore();

  drawSlowMoOverlay();

  requestAnimationFrame(drawFrame);
}

// Listeners de botones globales
els.startAttackBtn.addEventListener('click', toggleAttackPanel);
els.closeLaunchHelpBtn?.addEventListener('click', cancelAttackPanel);
els.toggleRadarBtn?.addEventListener('click', toggleRadarCompact);
els.toggleCheckBtn?.addEventListener('click', toggleCheckPanel);
els.devModeBtn?.addEventListener('click', toggleDevMode);
els.resetBtn.addEventListener('click', resetGame);
els.toggleGridBtn.addEventListener('click', () => {
  gridVisible = !gridVisible;
  updateUI();
});

// Inicializa el juego: carga assets, crea enemigos y arranca el loop
async function init() {
  resize();
  loadSounds();
  await loadAssets();
  startAmbientSound();
  createRoundTargets();
  resetChecklistForTurn();
  setChecklist('chkTurn', true);
  renderAttackPanel();
  updateUI();
  showTurnToast('Turno: Morado', state.teams.morado.color);
  setStatus('Presiona "Iniciar ataque" para comenzar el turno.');
  requestAnimationFrame(drawFrame);
}

init();
