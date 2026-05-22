# Batalla Contra la IA — Guia de configuracion

Juego educativo para el aula donde dos equipos compiten lanzando cohetes con funciones matematicas (lineal, cuadratica, exponencial) para abatir objetivos en el canvas.

---

## Archivos del proyecto

| Archivo | Descripcion |
|---|---|
| `configuracion.js` | Todas las constantes editables del juego |
| `estado.js` | Variables globales de partida y utilidades matematicas |
| `sonidos.js` | Sistema de audio (rutas de archivos y funciones de reproduccion) |
| `formulas.js` | Parseo y validacion de funciones matematicas escritas por el alumno |
| `enemigos.js` | Creacion, posicion, hitbox y dibujo de los objetivos enemigos |
| `dibujo.js` | Carga de imagenes y todas las funciones de dibujo en el canvas |
| `cohete.js` | Fisica del cohete: lanzamiento, trayectoria, impacto, camara lenta |
| `paneles.js` | Gestion de paneles UI, popups, checklist y modo dev |
| `partida.js` | Flujo del juego: turnos, fin de partida, popup ganador, reinicio |
| `principal.js` | Punto de entrada: canvas, referencias DOM, bucle de animacion |

> Los archivos se cargan en el orden de la tabla. `principal.js` siempre va al final porque usa funciones de todos los demas.

---

## Donde editar cada configuracion

### Creditos iniciales de cada equipo
**`configuracion.js` — linea 16**
```js
const CREDITOS_INICIALES = 10000;
```

### Costo y recompensa de cada tecnologia
**`configuracion.js` — lineas 42–79** (objeto `TECNOLOGIAS`)

| Campo | Descripcion |
|---|---|
| `costo` | Creditos que se descuentan al lanzar |
| `recompensa` | Creditos que se ganan al impactar un objetivo |

Ejemplo: cambiar la recompensa de la tecnologia exponencial de 7000 a 9000:
```js
exponencial: {
  ...
  recompensa: 9000,   // <-- editar aqui
  ...
}
```

### Ejemplos de funciones que aparecen en el juego
**`configuracion.js` — campo `examples`** dentro de cada tecnologia (lineas ~48, ~60, ~72)

### Velocidad del cohete
**`configuracion.js` — linea 37**
```js
const ROCKET_SPEED = 30;
```

### Area donde aparecen los enemigos
**`configuracion.js` — lineas 28–33** (objeto `ENEMY_SPAWN_AREA`)
```js
const ENEMY_SPAWN_AREA = {
  xMin: 10,   // columna minima de aparicion
  yMin: -20,  // fila minima (bajo el agua)
  xMax: 185,  // columna maxima
  yMax: 30,   // fila maxima (en el cielo)
};
```

### Cantidad de enemigos por ronda
**`configuracion.js` — lineas 35–36**
```js
const MIN_ENEMIES_PER_TYPE = 2;       // minimo por tipo (avion, barco, submarino)
const RANDOM_EXTRA_ENEMIES_MAX = 1;   // extras aleatorios adicionales
```

### Intensidad del zoom y camara lenta
**`configuracion.js` — lineas 84–88**
```js
const SLOW_MO_TRIGGER_DIST = 70;  // distancia en px para activar camara lenta
const SLOW_MO_FACTOR = 0.10;      // factor de velocidad durante camara lenta (0.1 = 10%)
const ZOOM_MAX = 3.2;             // zoom maximo al impactar
```

### Rutas de imagenes (assets)
**`configuracion.js` — lineas 12–20** (objeto `ASSETS`)

### Rutas de sonidos
**`sonidos.js` — lineas 12–21** (objeto `SOUND_SRCS`)

### Nombres de los equipos y colores
**`estado.js` — lineas 13–34** (objeto `state.teams`)
```js
morado: {
  name: 'EQUIPO MORADO',   // nombre que aparece en pantalla
  color: '#ff4df0',        // color de la UI y el cohete
  ...
}
```

### Regla de deteccion de tipo de funcion
**`formulas.js` — funcion `detectFormulaType` (linea ~34)**
- `base^x` es **exponencial** (ej: `0.98^x`, `2^x`)
- `x^numero` **NO** es exponencial (ej: `x^2` es cuadratica)

### Duracion de la previsualizacion de trayectoria
**`estado.js` — linea ~65**
```js
duration: 2500,  // milisegundos antes de que el cohete se lance
```

### Tiempo de zoom tras impacto
**`cohete.js` — funcion `checkImpact`** — buscar `holdUntil`:
```js
camera.holdUntil = performance.now() + 950;  // ms de zoom fijo tras el impacto
```

### Retardo entre impacto y cambio de turno
**`partida.js` — funcion `scheduleTurnAdvance` (linea ~11)**
```js
}, 720);  // milisegundos de espera antes de pasar el turno
```

---

## Estructura de carga en index.html

```html
<script src="configuracion.js"></script>  <!-- 1. constantes -->
<script src="estado.js"></script>          <!-- 2. estado global -->
<script src="sonidos.js"></script>         <!-- 3. audio -->
<script src="formulas.js"></script>        <!-- 4. matematicas -->
<script src="enemigos.js"></script>        <!-- 5. objetivos -->
<script src="dibujo.js"></script>          <!-- 6. canvas -->
<script src="cohete.js"></script>          <!-- 7. fisica -->
<script src="paneles.js"></script>         <!-- 8. UI -->
<script src="partida.js"></script>         <!-- 9. flujo -->
<script src="principal.js"></script>       <!-- 10. inicio -->
```

> **Importante:** No cambiar el orden. Cada archivo usa variables y funciones definidas en los anteriores.
