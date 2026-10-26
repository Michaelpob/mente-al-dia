/**
 * Shaders del «Orbe de equilibrio»: una esfera satinada que respira, rodeada por dos anillos.
 * Un único shader de WebGL 1 sobre un triángulo que cubre el lienzo, sin librerías.
 */
export const VERTICES = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAGMENTOS = `
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
