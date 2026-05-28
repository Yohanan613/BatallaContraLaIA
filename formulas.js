// ============================================================
//  FORMULAS.JS — Parseo y validacion de funciones matematicas
//  Depende de: configuracion.js
// ============================================================

// Convierte texto del usuario en una funcion JS ejecutable.
// Devuelve null si la expresion es invalida o insegura.
function parseFunction(raw) {
  try {
    if (!raw || !/x/i.test(raw)) return null;
    const processed = raw
      .trim()
      .replace(/,/g, '.')
      .replace(/\^/g, '**')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos')
      .replace(/\btan\b/gi, 'Math.tan')
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\blog\b/gi, 'Math.log')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bpow\b/gi, 'Math.pow')
      .replace(/(\d)(x)/gi, '$1*$2')
      .replace(/(x)(\d)/gi, '$1*$2')
      .replace(/\)(x)/gi, ')*$1')
      .replace(/(x)\(/gi, '$1*(');

    const blocked = /window|document|eval|Function|constructor|prototype|localStorage|sessionStorage|fetch|XMLHttpRequest|setTimeout|setInterval/i;
    if (blocked.test(processed)) return null;

    const fn = new Function('x', `"use strict"; const y = (${processed}); return Number.isFinite(y) ? y : NaN;`);
    for (const testX of [0, 1, 2, 4]) {
      const y = fn(testX);
      if (!Number.isFinite(y)) return null;
    }
    return fn;
  } catch {
    return null;
  }
}

// Normaliza el texto de la formula para comparaciones (minusculas, sin espacios)
function normalizeFormulaText(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .replace(/(\d)(x)/g, '$1*$2')
    .replace(/\)(x)/g, ')*x')
    .replace(/(x)\(/g, 'x*(');
}

// Detecta el tipo de funcion: 'lineal', 'cuadratica', 'exponencial', 'otra', o null.
// Regla clave: base^x es exponencial; x^n (x elevado a numero) NO lo es.
function detectFormulaType(raw) {
  const expr = normalizeFormulaText(raw);
  if (!expr || !/x/.test(expr)) return null;

  if (/\^x/.test(expr)) return 'exponencial';

  const quadraticRegex = /x\*x|x\^2\b|x\*\*2\b|pow\(x,2\)/i;
  const exponentialRegex = /pow\([^,]+,x\)/i;
  const unsupportedFunctionRegex = /\b(?:sin|cos|tan|sqrt|log|abs)\(/i;

  if (quadraticRegex.test(expr)) return 'cuadratica';
  if (exponentialRegex.test(expr)) return 'exponencial';
  if (unsupportedFunctionRegex.test(expr) || /pow\(/i.test(expr) || /x\^/.test(expr)) return 'otra';
  return 'lineal';
}

// Comprueba si una formula (normalizada) coincide con alguno de los ejemplos del tech.
function isFormulaInExamples(raw, techKey) {
  const tech = TECNOLOGIAS[techKey];
  if (!tech || !tech.examples) return false;
  const normalized = normalizeFormulaText(raw);
  return tech.examples.some(ex => normalizeFormulaText(ex) === normalized);
}

// Verifica que la funcion escrita corresponda a la tecnologia seleccionada.
function validateFormulaForTech(raw, techKey) {
  const detected = detectFormulaType(raw);
  if (!detected) {
    return { ok: false, message: 'La función debe incluir x.' };
  }
  if (detected !== techKey) {
    const expected = TECNOLOGIAS[techKey]?.label || 'seleccionada';
    const found = detected === 'otra' ? 'otro tipo de funcion' : (TECNOLOGIAS[detected]?.label || detected);
    return { ok: false, message: `Seleccionaste ${expected}, pero la función parece ${found}.` };
  }
  return { ok: true, message: `Función ${TECNOLOGIAS[techKey].label} válida. Revisa la ruta y lanza.` };
}
