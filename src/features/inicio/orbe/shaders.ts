/**
 * Shaders del «Orbe de equilibrio»: una esfera de vidrio oscuro que respira, con el borde
 * iluminado en lavanda (la mente) y dos anillos de luz a su alrededor: turquesa (la calma) y
 * coral (la calidez). Debajo, el reflejo del amanecer (tema «Noche serena», D-75).
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

// Colores de tokens.css (--luz-*): núcleo de noche y las luces de la mente, la calma, la calidez
// y el amanecer.
const vec3 NOCHE = vec3(0.078, 0.067, 0.259);
const vec3 LAVANDA = vec3(0.545, 0.486, 0.965);
const vec3 TURQUESA = vec3(0.247, 0.847, 0.831);
const vec3 CORAL = vec3(1.0, 0.604, 0.522);
const vec3 AMANECER = vec3(1.0, 0.753, 0.471);
const vec3 LUZ = vec3(0.933, 0.945, 1.0);

vec4 sobre(vec4 arriba, vec4 abajo) { return arriba + abajo * (1.0 - arriba.a); }

// Anillo: círculo de radio R en el plano que pasa por el origen con normal N.
// Devuelve la distancia en píxeles de pantalla hasta el anillo y la profundidad (z) del punto.
float anillo(vec2 p, vec3 N, float R, out float z) {
  float nz = N.z;
  if (abs(nz) < 0.12) nz = sign(nz + 1e-4) * 0.12;
  z = -(N.x * p.x + N.y * p.y) / nz;
  float s = length(vec3(p, z)) - R;               // distancia con signo (sin el pliegue de abs)
  return abs(s) / max(fwidth(s), 1e-5);
}

// Tubo de luz a «px» píxeles: el centro casi blanco, el color alrededor y un halo que se
// desvanece (alfa premultiplicado). «fuerza» atenúa el tubo completo.
vec4 tubo(float px, float fuerza, vec3 tono) {
  float nucleo = (1.0 - smoothstep(uLinea - 0.75, uLinea + 0.75, px)) * fuerza;
  float halo = exp(-pow(px / (uLinea * 6.0), 2.0)) * fuerza;
  float a = clamp(nucleo + 0.35 * halo, 0.0, 1.0);
  vec3 c = mix(tono, LUZ, 0.45 * nucleo) * nucleo + tono * 0.35 * halo;
  return vec4(min(c, vec3(a)), a);
}

void main() {
  vec2 p = vUv * uS;
  float Rs = uR;
  float dist = length(p);

  // En la noche no hay sombra: debajo de la esfera queda el reflejo del amanecer.
  vec2 q = vec2(p.x / (1.05 * Rs), (p.y + 1.23 * Rs) / (0.16 * Rs));
  float reflejoA = exp(-dot(q, q)) * 0.42;
  vec4 color = vec4(mix(LAVANDA, AMANECER, 0.35) * reflejoA, reflejoA);

  // Halo alrededor de la esfera.
  float fuera = max(dist - Rs, 0.0) / (0.34 * Rs);
  float haloA = exp(-fuera * fuera) * step(Rs, dist) * 0.36;
  color = sobre(vec4(mix(LAVANDA, TURQUESA, 0.3) * haloA, haloA), color);

  // Esfera: vidrio oscuro con el borde iluminado; abajo, la luz cálida del amanecer.
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
    float brillo = pow(max(dot(n, H), 0.0), 26.0);
    float fresnel = pow(1.0 - max(n.z, 0.0), 2.4);
    float contorno = pow(max(dot(n, normalize(vec3(0.75, -0.35, 0.3))), 0.0), 2.0);
    float rebote = pow(max(-n.y, 0.0), 1.5);
    vec3 c = NOCHE * (0.7 + 0.9 * lam) + LAVANDA * 0.85 * fresnel + TURQUESA * 0.42 * contorno
           + CORAL * 0.3 * rebote + LUZ * 0.6 * brillo + uCalma * 0.06;
    esfera = vec4(clamp(c, 0.0, 1.0) * esferaA, esferaA);
  }

  // Anillos de luz: la parte que queda detrás de la esfera se pinta debajo de ella.
  float z1; float d1 = anillo(p, uN1, 1.42 * Rs, z1);
  float z2; float d2 = anillo(p, uN2, 1.62 * Rs, z2);
  bool detras1 = dist < Rs && z1 < zs;
  bool detras2 = dist < Rs && z2 < zs;
  vec4 anillo1 = tubo(d1, 0.95, TURQUESA);
  vec4 anillo2 = tubo(d2, 0.85, CORAL);

  if (detras2) color = sobre(anillo2, color);
  if (detras1) color = sobre(anillo1, color);
  color = sobre(esfera, color);
  if (!detras2) color = sobre(anillo2, color);
  if (!detras1) color = sobre(anillo1, color);
  gl_FragColor = color;
}`;
