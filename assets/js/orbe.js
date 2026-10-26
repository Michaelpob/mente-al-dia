/**
 * «Orbe de equilibrio»: la escena 3D de Mente al Día.
 * Una esfera satinada que respira despacio, rodeada por dos anillos en órbita.
 * Se dibuja con un único shader de WebGL (sin librerías): pesa unos pocos KB y funciona en
 * celulares de gama baja. Si el equipo no tiene WebGL, si la persona pidió reducir el movimiento
 * o si el modo de ahorro de datos está activo, se queda la imagen estática (póster).
 */
import { movimientoReducido, punteroFino } from './comun.js';

const VERTICES = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENTOS = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec2 vUv;
uniform float uS;      // media extensión de la vista (unidades del mundo)
uniform float uPw;     // tamaño de un píxel en unidades del mundo
uniform float uLinea;  // medio grosor de los anillos, en píxeles del lienzo
uniform float uT;      // tiempo (s)
uniform float uR;      // radio de la esfera (respiración)
uniform float uCalma;  // 0..1: brillo extra en la pantalla de cierre
uniform vec3 uL;       // dirección de la luz principal
uniform vec3 uN1;      // normal del anillo 1
uniform vec3 uN2;      // normal del anillo 2

const vec3 ARENA = vec3(0.851, 0.812, 0.749);
const vec3 ARENA_CLARO = vec3(0.914, 0.875, 0.812);
const vec3 SALVIA = vec3(0.306, 0.431, 0.365);
const vec3 PIZARRA = vec3(0.184, 0.282, 0.345);

vec4 sobre(vec4 arriba, vec4 abajo) { return arriba + abajo * (1.0 - arriba.a); }

// Anillo: círculo de radio R en el plano que pasa por el origen con normal N.
// Devuelve la cobertura y la profundidad (z) del punto del anillo bajo este píxel.
float anillo(vec2 p, vec3 N, float R, out float z) {
  float nz = N.z;
  if (abs(nz) < 0.12) nz = sign(nz + 1e-4) * 0.12;
  z = -(N.x * p.x + N.y * p.y) / nz;
  float s = length(vec3(p, z)) - R;               // distancia con signo (sin el pliegue de abs)
  float px = abs(s) / max(fwidth(s), 1e-5);       // distancia en píxeles de pantalla
  return 1.0 - smoothstep(uLinea - 0.75, uLinea + 0.75, px);
}

void main() {
  vec2 p = vUv * uS;
  float Rs = uR;
  float dist = length(p);

  // Sombra de contacto, suave y debajo de la esfera.
  vec2 q = vec2(p.x / (0.95 * Rs), (p.y + 1.23 * Rs) / (0.13 * Rs));
  float sombraA = exp(-dot(q, q)) * 0.22;
  vec4 color = vec4(vec3(0.16, 0.2, 0.23) * sombraA, sombraA);

  // Esfera
  float esferaA = 1.0 - smoothstep(Rs - uPw * 1.5, Rs, dist);
  float zs = sqrt(max(Rs * Rs - dist * dist, 0.0));
  vec4 esfera = vec4(0.0);
  if (esferaA > 0.0) {
    vec2 u = p / Rs;
    vec3 n = vec3(u, sqrt(max(0.0, 1.0 - dot(u, u))));
    vec3 ondula = 0.06 * vec3(
      sin(3.1 * u.y + 1.3 + uT * 0.6) * cos(2.3 * u.x - uT * 0.4),
      sin(2.7 * u.x + 0.4 - uT * 0.5) * cos(3.3 * u.y + uT * 0.3),
      0.0);
    n = normalize(n + ondula);
    vec3 L = normalize(uL);
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float lam = max(dot(n, L), 0.0);
    float brillo = pow(max(dot(n, H), 0.0), 22.0);
    float fresnel = pow(1.0 - max(n.z, 0.0), 3.0);
    float contorno = pow(max(dot(n, normalize(vec3(0.75, -0.35, 0.3))), 0.0), 2.0);
    float rebote = pow(max(-n.y, 0.0), 1.5);
    vec3 c = ARENA * (0.60 + 0.46 * lam) + ARENA_CLARO * 0.10 * rebote + SALVIA * 0.18 * contorno
           + vec3(0.16 * brillo + 0.12 * fresnel) + uCalma * 0.06;
    esfera = vec4(clamp(c, 0.0, 1.0) * esferaA, esferaA);
  }

  // Anillos: la parte que queda detrás de la esfera se pinta debajo de ella.
  float z1; float a1 = anillo(p, uN1, 1.42 * Rs, z1) * 0.72;
  float z2; float a2 = anillo(p, uN2, 1.62 * Rs, z2) * 0.58;
  bool detras1 = dist < Rs && z1 < zs;
  bool detras2 = dist < Rs && z2 < zs;
  vec4 anillo1 = vec4(PIZARRA * a1, a1);
  vec4 anillo2 = vec4(SALVIA * a2, a2);

  if (detras2) color = sobre(anillo2, color);
  if (detras1) color = sobre(anillo1, color);
  color = sobre(esfera, color);
  if (!detras2) color = sobre(anillo2, color);
  if (!detras1) color = sobre(anillo1, color);
  gl_FragColor = color;
}`;

function compilar(gl, tipo, fuente) {
  const shader = gl.createShader(tipo);
  gl.shaderSource(shader, fuente);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'No se pudo compilar el shader');
  }
  return shader;
}

/** Normal de un anillo inclinado: rotación sobre X y luego sobre Z (en grados). */
function normalAnillo(inclinacionX, giroZ) {
  const rx = (inclinacionX * Math.PI) / 180;
  const rz = (giroZ * Math.PI) / 180;
  const y = -Math.sin(rx);
  const z = Math.cos(rx);
  return [-Math.sin(rz) * y, Math.cos(rz) * y, z];
}

const ahorroDeDatos = () => Boolean(navigator.connection && navigator.connection.saveData);

/**
 * Monta el orbe dentro de un contenedor `.orbe` que ya tiene su póster (<img class="orbe__poster">).
 * @param {HTMLElement} contenedor
 * @param {{interactivo?: boolean, calma?: boolean}} opciones
 * @returns {{detener: () => void}}
 */
export function montarOrbe(contenedor, { interactivo = true, calma = false } = {}) {
  const sinEfecto = { detener() {} };
  if (!contenedor || movimientoReducido() || ahorroDeDatos()) return sinEfecto;

  const lienzo = document.createElement('canvas');
  lienzo.setAttribute('aria-hidden', 'true');
  const gl = lienzo.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return sinEfecto;

  let programa;
  try {
    programa = gl.createProgram();
    gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICES));
    gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTOS));
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return sinEfecto;
  } catch {
    return sinEfecto;
  }

  contenedor.append(lienzo);
  gl.useProgram(programa);
  const bufer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(
    ['uS', 'uPw', 'uLinea', 'uT', 'uR', 'uCalma', 'uL', 'uN1', 'uN2'].map((n) => [n, gl.getUniformLocation(programa, n)]),
  );

  const EXTENSION = 2.2;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const ajustarTamano = () => {
    const caja = contenedor.getBoundingClientRect();
    const lado = Math.max(1, Math.round(caja.width * dpr));
    if (lienzo.width !== lado) {
      lienzo.width = lado;
      lienzo.height = lado;
      gl.viewport(0, 0, lado, lado);
    }
  };
  const observadorTamano = new ResizeObserver(ajustarTamano);
  observadorTamano.observe(contenedor);
  ajustarTamano();

  // Puntero: la esfera y los anillos lo siguen con inercia (máx. ~8°).
  const objetivo = { x: 0, y: 0 };
  const actual = { x: 0, y: 0 };
  const alMover = (evento) => {
    const caja = contenedor.getBoundingClientRect();
    objetivo.x = Math.max(-1, Math.min(1, (evento.clientX - (caja.left + caja.width / 2)) / (caja.width * 0.9)));
    objetivo.y = Math.max(-1, Math.min(1, (evento.clientY - (caja.top + caja.height / 2)) / (caja.height * 0.9)));
  };
  if (interactivo && punteroFino()) window.addEventListener('pointermove', alMover, { passive: true });

  let visible = true;
  let cuadro = 0;
  let inicio = performance.now();
  let pintado = false;

  const dibujar = (ahora) => {
    cuadro = 0;
    const t = (ahora - inicio) / 1000;
    actual.x += (objetivo.x - actual.x) * 0.05;
    actual.y += (objetivo.y - actual.y) * 0.05;
    const ritmo = calma ? 4 : 6;
    const respiracion = 1 + 0.015 * (1 - Math.cos((2 * Math.PI * t) / ritmo));
    gl.uniform1f(u.uS, EXTENSION);
    gl.uniform1f(u.uPw, (2 * EXTENSION) / lienzo.width);
    gl.uniform1f(u.uLinea, Math.max(0.9, 1.05 * dpr));
    gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uR, respiracion);
    gl.uniform1f(u.uCalma, calma ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0);
    gl.uniform3f(u.uL, -0.55 + 0.3 * actual.x, 0.62 - 0.2 * actual.y, 0.56);
    gl.uniform3fv(u.uN1, normalAnillo(74 + 8 * actual.y, -18 + 10 * actual.x + 4 * Math.sin(t * 0.18)));
    gl.uniform3fv(u.uN2, normalAnillo(68 - 6 * actual.y, 24 + 8 * actual.x - 5 * Math.sin(t * 0.13)));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!pintado) {
      pintado = true;
      contenedor.classList.add('orbe--listo');
    }
    if (visible && !document.hidden) cuadro = requestAnimationFrame(dibujar);
  };
  const reanudar = () => {
    if (!cuadro && visible && !document.hidden) cuadro = requestAnimationFrame(dibujar);
  };

  const observadorVista = new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting;
    reanudar();
  });
  observadorVista.observe(contenedor);
  document.addEventListener('visibilitychange', reanudar);

  const detener = () => {
    cancelAnimationFrame(cuadro);
    cuadro = 0;
    visible = false;
    observadorTamano.disconnect();
    observadorVista.disconnect();
    window.removeEventListener('pointermove', alMover);
    contenedor.classList.remove('orbe--listo');
    lienzo.remove();
  };

  // Si la persona activa «reducir movimiento», vuelve el póster estático.
  document.addEventListener('preferencias-cambiadas', () => {
    if (movimientoReducido()) detener();
  });
  lienzo.addEventListener('webglcontextlost', detener);
  window.addEventListener('resize', () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    ajustarTamano();
  });

  inicio = performance.now();
  reanudar();
  return { detener };
}
