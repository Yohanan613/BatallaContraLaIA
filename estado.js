// ============================================================
//  ESTADO.JS — Variables globales del juego y utilidades base
//  Depende de: configuracion.js
// ============================================================

// Estado principal del juego
const state = {
  round: 1,
  turn: 'morado',
  phase: 'playing',
  devMode: false,
  panelStep: 'idle', // idle | tech | formula
  selectedTech: null,
  currentFnText: '',
  turnToastHideAt: 0,
  teams: {
    morado: {
      id: 'morado',
      name: 'EQUIPO MORADO',
      short: 'Morado',
      color: '#ff4df0',
      sprite: 'coheteMorado',
      credits: CREDITOS_INICIALES,
      hits: 0,
      shots: 0,
    },
    verde: {
      id: 'verde',
      name: 'EQUIPO VERDE',
      short: 'Verde',
      color: '#7cff23',
      sprite: 'coheteVerde',
      credits: CREDITOS_INICIALES,
      hits: 0,
      shots: 0,
    }
  }
};

// Variables de pantalla y escena
let W = 0;
let H = 0;
let seaY = 0;
let originX = 0;
let scale = 1;
let gridVisible = true;
let images = {};
let targets = [];
let rocket = null;
let previewFn = null;
let previewTech = null;
let explosions = [];
let lastTime = 0;
let attackLocked = false;
let turnAdvanceTimer = null;
let attackPanelCollapsed = true;

// Estado de la camara (zoom / camara lenta)
let camera = {
  phase: 'idle', // 'idle' | 'zooming' | 'holding' | 'zooming-out'
  zoom: 1,
  targetZoom: 1,
  pivotX: 0,
  pivotY: 0,
  slowMoFactor: 1,
  holdUntil: 0,
};

// Estado de la previsualizacion de trayectoria
let trajectoryPreview = {
  active: false,
  fn: null,
  techId: null,
  teamId: null,
  startedAt: 0,
  duration: 2500,
  points: [],
  timer: null,
};

// Equipo cuyo turno es ahora
function currentTeam() {
  return state.teams[state.turn];
}

// Formatea numero con separadores de miles (locale colombiano)
function fmt(num) {
  return Math.round(num).toLocaleString('es-CO');
}

// Muestra "INF" en modo dev en lugar de creditos reales
function formatCredits(num) {
  if (state.devMode) return 'INF';
  return fmt(num);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Recalcula dimensiones del canvas y escala del mundo al cambiar ventana
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  seaY = Math.round(H * 0.56);
  originX = 92;
  const usableW = Math.max(300, W - originX - 54);
  scale = usableW / (worldXMax - worldXMin);
  if (targets.length) recalcTargetPixels();
}
window.addEventListener('resize', resize);

// Convierte coordenadas del mundo (x, y) a pixeles en pantalla
function worldToScreen(x, y) {
  return {
    x: originX + (x - worldXMin) * scale,
    y: seaY - y * scale,
  };
}

// Evalua la funcion fn en x sin lanzar excepcion
function safeEval(fn, x) {
  try {
    return fn(x);
  } catch {
    return NaN;
  }
}
