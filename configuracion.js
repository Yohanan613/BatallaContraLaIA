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
  sssh: 'assets/sssh.png',
};

// Creditos con los que empieza cada equipo
const CREDITOS_INICIALES = 10000;

// Limites del mundo en coordenadas de juego
const worldXMin = 0;
const worldXMax = 50;
const worldYTop = 100;
const worldYBottom = -100;

// Escala visual de los enemigos y sus etiquetas
const FLEET_SIZE_SCALE = 1.8;
const TARGET_LABEL_SCALE = 1;

// Escala individual por tipo de enemigo (imagen, hitbox y label).
// 1.0 = tamaño base definido por FLEET_SIZE_SCALE. Aumentar o bajar para ajustar cada tipo.
const ENEMY_SIZE_SCALE = {
  avion:     0.75,
  barco:     1.0,
  submarino: 1,
};

const ENEMY_LABEL_SCALE = {
  avion:     1.0,
  barco:     1.0,
  submarino: 1.0,
};

// Area donde aparecen los enemigos (coordenadas de juego)
const ENEMY_SPAWN_AREA = {
  xMin: 5,
  yMin: -6,
  xMax: 46,
  yMax: 10,
};

// Cantidad de enemigos por ronda
const MIN_ENEMIES_PER_TYPE = 2;
const RANDOM_EXTRA_ENEMIES_MAX = 1;
const SPAWN_X_MIN_GAP = 7;
const SPAWN_Y_MIN_GAP = 3;

// Velocidad del cohete (unidades de mundo por segundo)
const ROCKET_SPEED = 12;

// Tecnologias disponibles: costo en creditos, recompensa por impacto, ejemplos de funciones
const TECNOLOGIAS = {
  lineal: {
    key: 'lineal',
    tag: 'L',
    label: 'Lineal',
    formula: 'ax + b',
    latexFormula: 'ax + b',
    costo: 4000,
    recompensa: 5000,
    color: '#38f5ff',
    desc: 'Trayectoria recta. Útil para barcos y algunas rutas directas.',
    examples: ['0.4*x-10', '-0.3*x+12', '0.2*x-4', '-0.4*x+16', '0.3*x-7', '-0.2*x+7', '0.5*x-14', '-0.5*x+20', '0.1*x-2', '-0.6*x+22']
  },
  cuadratica: {
    key: 'cuadratica',
    tag: 'Q',
    label: 'Cuadrática',
    formula: 'ax*x + bx + c',
    latexFormula: 'ax^{2} + bx + c',
    costo: 2500,
    recompensa: 10000,
    color: '#ffb13d',
    desc: 'Arco parabólico. Ideal para objetivos altos o trayectorias hundidas.',
    examples: ['-0.02*x*x+x-5', '0.012*x*x-0.6*x+2', '-0.025*x*x+1.1*x-6', '0.01*x*x-0.4*x-1', '-0.018*x*x+0.8*x-2', '0.018*x*x-0.9*x+3', '-0.03*x*x+1.4*x-8', '0.015*x*x-0.7*x+2', '-0.015*x*x+0.6*x+1', '0.025*x*x-1.2*x+9']
  },
  exponencial: {
    key: 'exponencial',
    tag: 'E',
    label: 'Exponencial',
    formula: 'a^x + c',
    latexFormula: 'a^{x} + c',
    costo: 1000,
    recompensa: 15000,
    color: '#ff4df0',
    desc: 'Aceleración o caída rápida. Requiere más precisión.',
    examples: ['20*0.92^x-3', '4*1.08^x-4', '30*0.88^x-8', '10*0.95^x-5', '3*1.10^x-3', '50*0.86^x-12', '8*0.97^x-3', '5*1.06^x-5', '15*0.94^x-7', '2*1.12^x-2']
  }
};

// Tipos de objetivo: imagen, etiqueta, zona, ancho en pantalla, hitbox relativo
const TARGET_TYPES = {
  avion: {
    img: 'avion',
    label: 'Objetivo aéreo',
    zone: 'cielo',
    drawW: 110,
    hitbox: { x: 0.3, y: 0.35, w: 0.54, h: 0.40 },
  },
  barco: {
    img: 'barco',
    label: 'Objetivo naval',
    zone: 'superficie',
    drawW: 120,
    hitbox: { x: 0.10, y: 0.30, w: 0.46, h: 0.39 },
  },
  submarino: {
    img: 'submarino',
    label: 'Objetivo submarino',
    zone: 'profundidad',
    drawW: 118,
    hitbox: { x: 0.1, y: 0.45, w: 0.7, h: 0.39 },
  },
};

// Radio en pixeles del punto azul central de la hitbox (0 = oculto)
const HITBOX_DOT_RADIUS = 6;

// Factor de escala de la hitbox de destruccion (invisible, mas pequeña que la visual)
const HITBOX_KILL_SCALE = 0.000001;

// Opciones para el modo de pantalla dividida (split-mode)
const SPLIT_MODE_ENEMY_SCALE  = 0.6;  // escala de los enemigos (1 = tamaño normal)
const SPLIT_MODE_SHOW_LABELS  = true; // mostrar etiquetas de codigo/coordenadas sobre los enemigos
const SPLIT_MODE_LABEL_SCALE  = 0.8;  // escala de las etiquetas (texto y rectangulo) en modo pantalla dividida

// Efecto "sssh" al fallar tras camara lenta (aparece centrado en pantalla)
const SSSH_SIZE       = 100;  // px — tamaño de la imagen en pantalla
const SSSH_OPACITY    = 0.7; // 0.0 a 1.0 — transparencia de la imagen
const SSSH_DURATION   = 2100; // ms — duración total antes de desvanecerse

// Parametros de camara lenta y zoom al impacto
const SLOW_MO_TRIGGER_DIST = 70;
const SLOW_MO_FACTOR = 0.10;
const ZOOM_MAX = 2.5;
const ZOOM_IN_SPEED = 7;
const ZOOM_OUT_SPEED = 1.5;
