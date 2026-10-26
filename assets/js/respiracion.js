/**
 * Respiración guiada: inhala 4 s, sostén 2 s, exhala 6 s, durante un minuto aproximadamente.
 * Con «reducir movimiento» el círculo no cambia de tamaño: solo se guía con texto y cuenta regresiva.
 */
import { icono } from './iconos.js';
import { movimientoReducido } from './comun.js';

const FASES = [
  { nombre: 'Inhala', segundos: 4, escala: 1.6 },
  { nombre: 'Sostén', segundos: 2, escala: 1.6 },
  { nombre: 'Exhala', segundos: 6, escala: 1 },
];
const CICLOS = 5;

export function respiracionHtml({ titulo = 'Tómate un minuto', nivelTitulo = 'h2' } = {}) {
  return `<div class="respiracion" data-respiracion>
      <div>
        <${nivelTitulo}>${titulo}</${nivelTitulo}>
        <p class="texto-grande texto-secundario" style="margin-top:0.75rem">Una pausa de respiración lenta puede ayudarte a bajar la tensión. Sigue el círculo: inhala en 4 segundos, sostén 2 y exhala en 6.</p>
        <div class="grupo-botones" style="margin-top:1.5rem">
          <button class="boton boton--primario" type="button" data-respiracion-boton>${icono('play')}<span>Empezar</span></button>
        </div>
        <p class="texto-pequeno texto-secundario" data-respiracion-estado aria-live="polite" style="margin-top:0.75rem">Son ${CICLOS} respiraciones, cerca de un minuto.</p>
      </div>
      <div class="respiracion__escena" aria-hidden="true">
        <span class="respiracion__aro"></span>
        <span class="respiracion__circulo" data-respiracion-circulo></span>
        <span class="respiracion__fase" data-respiracion-fase></span>
      </div>
    </div>`;
}

export function activarRespiracion(raiz) {
  const caja = raiz.querySelector('[data-respiracion]');
  if (!caja) return;
  const boton = caja.querySelector('[data-respiracion-boton]');
  const estado = caja.querySelector('[data-respiracion-estado]');
  const circulo = caja.querySelector('[data-respiracion-circulo]');
  const faseTexto = caja.querySelector('[data-respiracion-fase]');
  let temporizador = 0;
  let activo = false;

  const detener = (mensaje) => {
    activo = false;
    window.clearTimeout(temporizador);
    circulo.style.setProperty('--duracion-respiracion', '1.2s');
    circulo.style.setProperty('--escala-respiracion', '1');
    faseTexto.textContent = '';
    boton.innerHTML = `${icono('play')}<span>Empezar</span>`;
    estado.textContent = mensaje;
  };

  const correr = (ciclo, indiceFase, restante) => {
    if (!activo) return;
    const fase = FASES[indiceFase];
    if (restante === fase.segundos) {
      circulo.style.setProperty('--duracion-respiracion', `${fase.segundos}s`);
      circulo.style.setProperty('--escala-respiracion', movimientoReducido() ? '1' : String(fase.escala));
      estado.textContent = `${fase.nombre}. Respiración ${ciclo + 1} de ${CICLOS}.`;
    }
    faseTexto.textContent = `${fase.nombre} ${restante}`;
    temporizador = window.setTimeout(() => {
      if (restante > 1) return correr(ciclo, indiceFase, restante - 1);
      const siguienteFase = (indiceFase + 1) % FASES.length;
      const siguienteCiclo = siguienteFase === 0 ? ciclo + 1 : ciclo;
      if (siguienteCiclo >= CICLOS) return detener('Bien hecho. Cuidarte también es importante.');
      correr(siguienteCiclo, siguienteFase, FASES[siguienteFase].segundos);
    }, 1000);
  };

  boton.addEventListener('click', () => {
    if (activo) return detener('Pausaste la respiración. Puedes empezar de nuevo cuando quieras.');
    activo = true;
    boton.innerHTML = `${icono('pause')}<span>Pausar</span>`;
    correr(0, 0, FASES[0].segundos);
  });
}
