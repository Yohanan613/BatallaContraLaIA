// ============================================================
//  JUGADORES.JS — Pop-up de configuracion de jugadores
// ============================================================

let jugadores = null;
let extraToMorado = false;

// Numero de subgrupos optimo para k jugadores (max 4 por grupo)
function computeNumGroups(k) {
  if (k <= 0) return 0;
  return Math.max(1, Math.ceil(k / 4));
}

// Divide k jugadores en g subgrupos lo mas uniformemente posible
function divideWithG(k, g, prefix) {
  if (k <= 0 || g <= 0) return [];
  const base = Math.floor(k / g);
  const extra = k % g;
  let playerIdx = 1;
  return Array.from({ length: g }, (_, i) => {
    const size = (i < extra) ? base + 1 : base;
    return {
      name: `Escuadrón ${prefix}-${i + 1}`,
      members: Array.from({ length: size }, () => `J${playerIdx++}`),
      size,
    };
  });
}

// Calcula la division completa para N jugadores
function buildDivision(total) {
  if (total < 2) total = 2;

  // Con solo 2 jugadores se deshabilitan los subgrupos
  if (total === 2) {
    return { total, moradoN: 1, verdeN: 1, moradoSquads: [], verdeSquads: [], g: 0, noGroups: true };
  }

  const isOdd = total % 2 !== 0;
  const moradoN = isOdd
    ? (extraToMorado ? Math.ceil(total / 2) : Math.floor(total / 2))
    : total / 2;
  const verdeN = total - moradoN;

  // Igual numero de subgrupos en ambos equipos = min de los dos naturales
  const g = Math.min(computeNumGroups(moradoN), computeNumGroups(verdeN));

  return {
    total,
    moradoN, verdeN,
    moradoSquads: divideWithG(moradoN, g, 'M'),
    verdeSquads:  divideWithG(verdeN,  g, 'V'),
    g,
    noGroups: false,
  };
}

// --- Helpers de escuadron para el estado del juego ---

function currentSquadName(teamId) {
  if (!jugadores || jugadores.noGroups) return '';
  const squads = teamId === 'morado' ? jugadores.moradoSquads : jugadores.verdeSquads;
  if (!squads || squads.length === 0) return '';
  const idx = teamId === 'morado'
    ? ((typeof state !== 'undefined' ? state.squadIdxMorado : 0) || 0)
    : ((typeof state !== 'undefined' ? state.squadIdxVerde  : 0) || 0);
  return squads[idx % squads.length]?.name || '';
}

function advanceSquad(teamId) {
  if (!jugadores || jugadores.noGroups) return;
  const squads = teamId === 'morado' ? jugadores.moradoSquads : jugadores.verdeSquads;
  if (!squads || squads.length <= 1) return;
  if (typeof state === 'undefined') return;
  if (teamId === 'morado') {
    state.squadIdxMorado = ((state.squadIdxMorado || 0) + 1) % squads.length;
  } else {
    state.squadIdxVerde = ((state.squadIdxVerde || 0) + 1) % squads.length;
  }
}

// --- Renderizado del popup ---

function renderSquadList(squads, color) {
  if (!squads || squads.length === 0) return '<div class="squad-card" style="border-color:' + color + '44"><div class="squad-name" style="color:' + color + '">Sin subgrupos</div></div>';
  return squads.map(sq => `
    <div class="squad-card" style="border-color:${color}44">
      <div class="squad-name" style="color:${color}">${sq.name}</div>
      <div class="squad-members">${sq.members.join(' · ')} &nbsp;<span class="squad-count">(${sq.size} personas)</span></div>
    </div>
  `).join('');
}

function updatePlayerSetupPreview() {
  const input   = document.getElementById('playerCountInput');
  const preview = document.getElementById('playerSetupPreview');
  const btn     = document.getElementById('playerSetupStartBtn');
  if (!input || !preview) return;

  const total = parseInt(input.value, 10);

  if (isNaN(total) || total < 2) {
    preview.innerHTML = '<p class="setup-error">Se necesitan al menos 2 jugadores.</p>';
    if (btn) btn.disabled = true;
    return;
  }

  if (btn) btn.disabled = false;

  const div = buildDivision(total);
  const { moradoN, verdeN, moradoSquads, verdeSquads, noGroups } = div;
  const isOdd = total % 2 !== 0;

  const oddHtml = (isOdd && total > 2) ? `
    <div class="odd-toggle">
      <span>Persona extra va a:</span>
      <button id="extraToggleBtn" class="ghost compact">
        Equipo ${extraToMorado ? 'Morado' : 'Verde'}  ▾
      </button>
    </div>
  ` : '';

  const teamsHtml = noGroups
    ? `<p class="setup-note">Con 2 jugadores los subgrupos están desactivados.</p>`
    : `
      <div class="setup-teams-grid">
        <div class="setup-team">
          <div class="setup-team-title" style="color:#ff4df0">Equipo Morado (${moradoN})</div>
          ${renderSquadList(moradoSquads, '#ff4df0')}
        </div>
        <div class="setup-team">
          <div class="setup-team-title" style="color:#7cff23">Equipo Verde (${verdeN})</div>
          ${renderSquadList(verdeSquads, '#7cff23')}
        </div>
      </div>
    `;

  preview.innerHTML = `
    <div class="setup-summary">
      <span style="color:#ff4df0">${moradoN} morado</span>
      &nbsp;+&nbsp;
      <span style="color:#7cff23">${verdeN} verde</span>
      &nbsp;=&nbsp;<b>${total} jugadores</b>
    </div>
    ${oddHtml}
    ${teamsHtml}
  `;

  document.getElementById('extraToggleBtn')?.addEventListener('click', () => {
    extraToMorado = !extraToMorado;
    updatePlayerSetupPreview();
  });
}

function applyDivision(div) {
  jugadores = div;
  if (typeof state !== 'undefined') {
    state.squadIdxMorado = 0;
    state.squadIdxVerde  = 0;
  }
  document.getElementById('playerSetupPopup')?.classList.add('hidden');
}

function confirmPlayerSetup() {
  const total = parseInt(document.getElementById('playerCountInput')?.value, 10);
  if (isNaN(total) || total < 2) return;
  applyDivision({ total, ...buildDivision(total) });
}

function confirmNormalMode() {
  applyDivision({ total: 0, moradoN: 0, verdeN: 0, moradoSquads: [], verdeSquads: [], g: 0, noGroups: true });
}

function showPlayerSetupPopup() {
  const popup = document.getElementById('playerSetupPopup');
  if (!popup) return;
  popup.classList.remove('hidden');

  const input       = document.getElementById('playerCountInput');
  const btn         = document.getElementById('playerSetupStartBtn');
  const normalBtn   = document.getElementById('normalModeBtn');

  if (input)     input.oninput    = updatePlayerSetupPreview;
  if (btn)       btn.onclick      = confirmPlayerSetup;
  if (normalBtn) normalBtn.onclick = confirmNormalMode;

  updatePlayerSetupPreview();
}

document.getElementById('jugadoresBtn')?.addEventListener('click', showPlayerSetupPopup);
