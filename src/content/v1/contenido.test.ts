import { describe, expect, it } from 'vitest';
import { areas, dimensiones } from './areas';
import { cuestionarios, instruccionesNinoOriginal } from './cuestionarios';
import fuente from './fuente/mente-al-dia-contenido.json';
import {
  definicionesNiveles,
  frasesGuia,
  mensajesAdulto,
  mensajesAtencionEspecial,
  mensajesGenerales,
  mensajesNinoPorNivel,
} from './mensajes';
import { camposAcudiente, camposRegistroAdulto, camposRegistroNino } from './registro';
import { reglasProvisionales } from './reglas';

/** Integridad del contenido: cada texto es idéntico, carácter por carácter, al JSON fuente. */

const NIVELES = ['adecuado', 'por_fortalecer', 'requiere_atencion'] as const;

describe('Áreas y dimensiones', () => {
  it('hay 20 áreas numeradas del 1 al 20, con ids únicos', () => {
    expect(areas).toHaveLength(20);
    expect(areas.map((a) => a.numero)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(new Set(areas.map((a) => a.id)).size).toBe(20);
  });

  it('cada área coincide con el Anexo A', () => {
    fuente.areas.forEach((original, i) => {
      const area = areas[i]!;
      expect(area.id).toBe(original.id);
      expect(area.nombre).toBe(original.nombre);
      expect(area.dimension).toBe(original.dimension);
      expect(area.icono).toBe(original.icono_sugerido);
      expect(area.descripcionCorta).toBe(original.descripcion_corta);
      expect(area.sensible).toBe(original.sensible);
    });
  });

  it('las 5 dimensiones cubren las 20 áreas exactamente una vez', () => {
    expect(dimensiones).toHaveLength(5);
    const todas = dimensiones.flatMap((d) => d.areas);
    expect(new Set(todas).size).toBe(20);
    for (const d of dimensiones) {
      for (const areaId of d.areas) {
        expect(areas.find((a) => a.id === areaId)?.dimension).toBe(d.id);
      }
    }
  });
});

describe('Cuestionarios', () => {
  for (const modulo of ['adulto', 'nino'] as const) {
    it(`${modulo}: 20 preguntas en el orden original, una por área y con texto literal`, () => {
      const c = cuestionarios[modulo];
      expect(c.activo).toBe(true);
      expect(c.preguntas).toHaveLength(20);
      c.preguntas.forEach((p, i) => {
        const original = fuente.areas[i]!;
        expect(p.numero).toBe(original.numero);
        expect(p.areaId).toBe(original.id);
        expect(p.texto).toBe(original.pregunta[modulo]);
        expect(p.texto.trim()).not.toBe('');
      });
      expect(c.opciones).toEqual(fuente.opciones_respuesta[modulo]);
      expect(c.instrucciones.texto).toBe(fuente.instrucciones[modulo].texto);
    });
  }

  it('el módulo infantil no ofrece «prefiero no responder»', () => {
    expect(cuestionarios.nino.opciones.map((o) => o.valor)).toEqual(['si', 'a_veces', 'no']);
  });

  it('adolescentes queda desactivado y sin preguntas inventadas', () => {
    expect(cuestionarios.adolescente.activo).toBe(false);
    expect(cuestionarios.adolescente.preguntas).toHaveLength(0);
  });

  it('conserva la instrucción original del documento base', () => {
    expect(instruccionesNinoOriginal).toBe(fuente.instrucciones.nino.original);
  });
});

describe('Mensajes', () => {
  it('3 mensajes literales por área (Anexo D.1), ninguno vacío', () => {
    for (const original of fuente.areas) {
      const id = original.id as keyof typeof mensajesAdulto;
      for (const nivel of NIVELES) {
        expect(mensajesAdulto[id][nivel]).toBe(original.mensajes_adulto[nivel]);
        expect(mensajesAdulto[id][nivel].trim()).not.toBe('');
      }
    }
  });

  it('mensajes del módulo infantil, generales, atención especial y frases guía', () => {
    for (const nivel of NIVELES) {
      expect(mensajesNinoPorNivel[nivel]).toBe(fuente.mensajes_nino_por_nivel[nivel]);
    }
    for (const clave of ['favorable', 'por_fortalecer', 'desafios'] as const) {
      expect(mensajesGenerales.adulto[clave]).toBe(fuente.mensajes_generales.adulto[clave]);
      expect(mensajesGenerales.nino[clave]).toBe(fuente.mensajes_generales.nino[clave]);
    }
    expect(mensajesGenerales.adultoAcompanante).toBe(
      fuente.mensajes_generales.adulto_acompanante.texto,
    );
    expect(mensajesGenerales.insuficiente).toBe(fuente.mensajes_generales.insuficiente.texto);
    expect(mensajesGenerales.parcial).toBe(fuente.mensajes_generales.parcial.texto);
    expect(mensajesGenerales.sinDatoArea).toBe(fuente.mensajes_generales.sin_dato_area.texto);
    expect(mensajesAtencionEspecial.adulto).toBe(fuente.atencion_especial.mensaje.texto);
    expect(mensajesAtencionEspecial.nino).toBe(fuente.atencion_especial.mensaje_nino.texto);
    expect([...frasesGuia]).toEqual(fuente.frases_guia.lista);
    for (const nivel of ['adecuado', 'por_fortalecer', 'requiere_atencion', 'sin_dato'] as const) {
      expect(definicionesNiveles[nivel]).toEqual({
        etiqueta: fuente.niveles[nivel].etiqueta,
        definicion: fuente.niveles[nivel].definicion,
      });
    }
  });

  it('campos de registro', () => {
    expect([...camposRegistroAdulto]).toEqual(fuente.registro_adulto_campos.campos);
    expect([...camposRegistroNino]).toEqual(fuente.registro_nino_campos.campos);
    expect([...camposAcudiente]).toEqual(fuente.registro_nino_campos.acudiente.campos);
  });
});

describe('Reglas provisionales', () => {
  it('coinciden con el Anexo G', () => {
    const r = fuente.reglas_provisionales;
    expect(reglasProvisionales).toMatchObject({
      version: r.version,
      puntos: r.puntos,
      umbralFavorable: r.umbral_favorable,
      umbralDesafios: r.umbral_desafios,
      minRespondidas: r.min_respondidas,
      minRespondidasCompleto: r.min_respondidas_completo,
      ajusteAtencionNoFavorable: r.ajuste_atencion_no_favorable,
      ajusteAtencionDesafios: r.ajuste_atencion_desafios,
      prioridadPorDesafios: r.prioridad_por_desafios,
    });
    expect(reglasProvisionales.areasSensibles).toEqual(
      r.areas_sensibles.map((n) => fuente.areas[n - 1]!.id),
    );
  });
});
