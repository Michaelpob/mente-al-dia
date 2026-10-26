import { FRAGMENTOS, VERTICES } from './shaders';

export interface OpcionesEscena {
  /** La esfera y los anillos siguen al puntero (solo con puntero fino). */
  interactivo: boolean;
  /** Se llama con el primer cuadro dibujado, para ocultar el póster. */
  alPintar: () => void;
  /** Se llama si el navegador pierde el contexto de WebGL: vuelve el póster. */
  alPerderContexto: () => void;
}

/** Media extensión de la vista, en unidades del mundo (la esfera mide 1). */
const EXTENSION = 2.2;
/** Tope de densidad de píxeles: más allá no se nota y gasta batería. */
const DPR_MAXIMO = 1.75;
/** Segundos de cada respiración de la esfera. */
const RITMO = 6;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string): WebGLShader {
  const shader = gl.createShader(tipo);
  if (!shader) throw new Error('No se pudo crear el shader');
  gl.shaderSource(shader, fuente);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'No se pudo compilar el shader');
  }
  return shader;
}

/** Normal de un anillo inclinado: rotación sobre X y luego sobre Z (en grados). */
function normalAnillo(inclinacionX: number, giroZ: number): [number, number, number] {
  const rx = (inclinacionX * Math.PI) / 180;
  const rz = (giroZ * Math.PI) / 180;
  const y = -Math.sin(rx);
  return [-Math.sin(rz) * y, Math.cos(rz) * y, Math.cos(rx)];
}

const UNIFORMES = ['uS', 'uPw', 'uLinea', 'uT', 'uR', 'uCalma', 'uL', 'uN1', 'uN2'] as const;

/**
 * Dibuja el orbe en un <canvas> dentro de `contenedor` (cuadrado).
 * Devuelve la función para detenerlo, o null si el equipo no tiene WebGL con derivadas:
 * en ese caso se queda el póster estático.
 * Solo dibuja mientras el orbe está en pantalla y la pestaña está visible.
 */
export function montarEscena(
  contenedor: HTMLElement,
  { interactivo, alPintar, alPerderContexto }: OpcionesEscena,
): (() => void) | null {
  const lienzo = document.createElement('canvas');
  lienzo.setAttribute('aria-hidden', 'true');
  const gl = lienzo.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl?.getExtension('OES_standard_derivatives')) return null;

  const programa = gl.createProgram();
  try {
    gl.attachShader(programa, compilar(gl, gl.VERTEX_SHADER, VERTICES));
    gl.attachShader(programa, compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTOS));
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }

  contenedor.append(lienzo);
  gl.useProgram(programa);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(programa, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(
    UNIFORMES.map((nombre) => [nombre, gl.getUniformLocation(programa, nombre)]),
  ) as Record<(typeof UNIFORMES)[number], WebGLUniformLocation | null>;

  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO);
  const ajustarTamano = () => {
    const lado = Math.max(1, Math.round(contenedor.getBoundingClientRect().width * dpr));
    if (lienzo.width === lado) return;
    lienzo.width = lado;
    lienzo.height = lado;
    gl.viewport(0, 0, lado, lado);
  };
  const alCambiarVentana = () => {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO);
    ajustarTamano();
  };
  const observadorTamano = new ResizeObserver(ajustarTamano);
  observadorTamano.observe(contenedor);
  ajustarTamano();

  // Puntero: la luz y los anillos lo siguen con inercia (máximo unos 8°).
  const objetivo = { x: 0, y: 0 };
  const actual = { x: 0, y: 0 };
  const alMover = (evento: PointerEvent) => {
    const caja = contenedor.getBoundingClientRect();
    const limitar = (n: number) => Math.max(-1, Math.min(1, n));
    objetivo.x = limitar((evento.clientX - (caja.left + caja.width / 2)) / (caja.width * 0.9));
    objetivo.y = limitar((evento.clientY - (caja.top + caja.height / 2)) / (caja.height * 0.9));
  };
  if (interactivo) window.addEventListener('pointermove', alMover, { passive: true });

  let visible = true;
  let cuadro = 0;
  let pintado = false;
  const inicio = performance.now();

  const dibujar = (ahora: number) => {
    cuadro = 0;
    const t = (ahora - inicio) / 1000;
    actual.x += (objetivo.x - actual.x) * 0.05;
    actual.y += (objetivo.y - actual.y) * 0.05;
    gl.uniform1f(u.uS, EXTENSION);
    gl.uniform1f(u.uPw, (2 * EXTENSION) / lienzo.width);
    gl.uniform1f(u.uLinea, Math.max(0.9, 1.05 * dpr));
    gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uR, 1 + 0.015 * (1 - Math.cos((2 * Math.PI * t) / RITMO)));
    gl.uniform1f(u.uCalma, 0);
    gl.uniform3f(u.uL, -0.55 + 0.3 * actual.x, 0.62 - 0.2 * actual.y, 0.56);
    gl.uniform3fv(
      u.uN1,
      normalAnillo(74 + 8 * actual.y, -18 + 10 * actual.x + 4 * Math.sin(t * 0.18)),
    );
    gl.uniform3fv(
      u.uN2,
      normalAnillo(68 - 6 * actual.y, 24 + 8 * actual.x - 5 * Math.sin(t * 0.13)),
    );
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!pintado) {
      pintado = true;
      alPintar();
    }
    if (visible && !document.hidden) cuadro = requestAnimationFrame(dibujar);
  };
  const reanudar = () => {
    if (!cuadro && visible && !document.hidden) cuadro = requestAnimationFrame(dibujar);
  };

  const observadorVista = new IntersectionObserver(([entrada]) => {
    visible = entrada?.isIntersecting ?? false;
    reanudar();
  });
  observadorVista.observe(contenedor);
  document.addEventListener('visibilitychange', reanudar);
  window.addEventListener('resize', alCambiarVentana);

  const detener = () => {
    cancelAnimationFrame(cuadro);
    cuadro = 0;
    visible = false;
    observadorTamano.disconnect();
    observadorVista.disconnect();
    document.removeEventListener('visibilitychange', reanudar);
    window.removeEventListener('resize', alCambiarVentana);
    window.removeEventListener('pointermove', alMover);
    lienzo.removeEventListener('webglcontextlost', alPerder);
    lienzo.remove();
  };
  const alPerder = () => {
    detener();
    alPerderContexto();
  };
  lienzo.addEventListener('webglcontextlost', alPerder);

  reanudar();
  return detener;
}
