// ============================================================
//  SONIDOS.JS — Sistema de audio del juego
//  Depende de: (ninguno)
// ============================================================

// Rutas de los archivos de sonido
const SOUND_SRCS = {
  ambiente:           'sonidos/ambiente.mp3',
  boton:              'sonidos/boton.mp3',
  coin:               'sonidos/coin.mp3',
  explosionAvion:     'sonidos/explosionaeroplane.mp3',
  explosionBarco:     'sonidos/explosionboat.mp3',
  explosionSubmarino: 'sonidos/explosionsubmarine.mp3',
  missilfly:          'sonidos/missilfly.mp3',
  sequence:           'sonidos/sequence.mp3',
  win:                'sonidos/Win.mp3',
};

let sounds = {};

function loadSounds() {
  Object.entries(SOUND_SRCS).forEach(([key, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    sounds[key] = audio;
  });
  sounds.ambiente.loop = true;
  sounds.ambiente.volume = 0.30;
}

function playSound(key, { volume = 1, loop = false } = {}) {
  const a = sounds[key];
  if (!a) return;
  a.loop = loop;
  a.volume = volume;
  a.currentTime = 0;
  a.play().catch(() => {});
}

function stopSound(key) {
  const a = sounds[key];
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

function startAmbientSound() {
  const tryPlay = () => sounds.ambiente?.play().catch(() => {});
  tryPlay();
  // Reintenta al primer gesto del usuario si el navegador bloquea autoplay
  document.addEventListener('click',     tryPlay, { once: true });
  document.addEventListener('keydown',   tryPlay, { once: true });
  document.addEventListener('mousemove', tryPlay, { once: true });
  document.addEventListener('touchstart', tryPlay, { once: true });
}
