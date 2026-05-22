// ============================================================
//  CONFIGURACION.JS — Todas las constantes editables del juego
//  Aqui se definen reglas, costos, tipos de enemigos y assets.
// ============================================================

const ASSETS = {
  fondo: 'assets/fondo.png',
  submarino: 'assets/submarino.png',
  barco: 'assets/barco.png',
  avion: 'assets/avion.png',
  coheteVerde: 'assets/cohete.png',
  coheteMorado: 'assets/cohete2.png',
  explosion: 'assets/explosion_spritesheet.png',
};

// Creditos con los que empieza cada equipo
const CREDITOS_INICIALES = 10000;

// Limites del mundo en coordenadas de juego
const worldXMin = 0;
const worldXMax = 200;
const worldYTop = 100;
const worldYBottom = -100;

// Escala visual de los enemigos y sus etiquetas
const FLEET_SIZE_SCALE = 1.25;
const TARGET_LABEL_SCALE = 1.25;

// Area donde aparecen los enemigos (coordenadas de juego)
const ENEMY_SPAWN_AREA = {
  xMin: 10,
  yMin: -20,
  xMax: 185,
  yMax: 30,
};

// Cantidad de enemigos por ronda
const MIN_ENEMIES_PER_TYPE = 2;
const RANDOM_EXTRA_ENEMIES_MAX = 1;
const SPAWN_X_MIN_GAP = 12;

// Velocidad del cohete (unidades de mundo por segundo)
const ROCKET_SPEED = 30;

// Tecnologias disponibles: costo en creditos, recompensa por impacto, ejemplos de funciones
const TECNOLOGIAS = {
  lineal: {
    key: 'lineal',
    tag: 'L',
    label: 'Lineal',
    formula: 'ax + b',
    costo: 4000,
    recompensa: 5000,
    color: '#38f5ff',
    desc: 'Trayectoria recta. Util para barcos y algunas rutas directas.',
    examples: ['0.3*x+10', '-0.4*x+38', '0.1*x+18', '-0.25*x+32', '0.5*x+2', '-0.6*x+46', '0.2*x+14', '-0.15*x+28']
  },
  cuadratica: {
    key: 'cuadratica',
    tag: 'Q',
    label: 'Cuadrática',
    formula: 'ax*x + bx + c',
    costo: 2500,
    recompensa: 10000,
    color: '#ffb13d',
    desc: 'Arco parabolico. Ideal para objetivos altos o trayectorias hundidas.',
    examples: ['-0.002*x*x+0.1*x+22', '0.004*x*x-1.1*x+60', '-0.0015*x*x+0.05*x+18', '0.003*x*x-0.8*x+40', '-0.005*x*x+0.9*x-5', '0.0025*x*x-0.4*x+12', '-0.004*x*x+1.2*x-20', '0.001*x*x-0.2*x+25']
  },
  exponencial: {
    key: 'exponencial',
    tag: 'E',
    label: 'Exponencial',
    formula: 'a^x + c',
    costo: 1000,
    recompensa: 15000,
    color: '#ff4df0',
    desc: 'Aceleracion o caida rapida. Requiere mas precision.',
    examples: ['50*0.98^x-28', '22*1.01^x-40', '80*0.97^x-35', '15*1.02^x-10', '60*0.99^x-30', '8*1.03^x+5', '100*0.96^x-50', '40*1.015^x-18']
  }
};

// Tipos de objetivo: imagen, etiqueta, zona, ancho en pantalla, hitbox relativo
const TARGET_TYPES = {
  avion: {
    img: 'avion',
    label: 'Objetivo aereo',
    zone: 'cielo',
    drawW: 110,
    hitbox: { x: 0.14, y: 0.22, w: 0.74, h: 0.42 },
  },
  barco: {
    img: 'barco',
    label: 'Objetivo naval',
    zone: 'superficie',
    drawW: 120,
    hitbox: { x: 0.12, y: 0.30, w: 0.76, h: 0.36 },
  },
  submarino: {
    img: 'submarino',
    label: 'Objetivo submarino',
    zone: 'profundidad',
    drawW: 118,
    hitbox: { x: 0.10, y: 0.26, w: 0.80, h: 0.34 },
  },
};

// Parametros de camara lenta y zoom al impacto
const SLOW_MO_TRIGGER_DIST = 70;
const SLOW_MO_FACTOR = 0.10;
const ZOOM_MAX = 3.2;
const ZOOM_IN_SPEED = 7;
const ZOOM_OUT_SPEED = 2.5;
