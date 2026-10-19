import { sitio } from '@/config/sitio';
import type { Nivel } from '@/types/dominio';

/**
 * Textos de la interfaz (es-CO, tratamiento de «tú»).
 * Aquí viven TODOS los textos de botones, menús y avisos: ningún componente escribe textos sueltos.
 * El contenido del instrumento (preguntas y mensajes) llega en la Fase 2, en src/content/v1/.
 */

export interface PaginaInfo {
  titulo: string;
  descripcion: string;
  /** Fase del proyecto en la que se construye la página completa. */
  fase: number;
  /** false = la página lleva noindex. */
  indexable: boolean;
}

const paginas = {
  inicio: {
    titulo: 'Mente al Día',
    descripcion: `Plataforma de orientación y bienestar emocional de la Alcaldía de ${sitio.municipio}.`,
    fase: 3,
    indexable: true,
  },
  registro: {
    titulo: 'Registro',
    descripcion: 'Aquí podrás elegir quién responde, registrarte y dar tu autorización.',
    fase: 5,
    indexable: false,
  },
  ingresar: {
    titulo: 'Ingresar',
    descripcion:
      'Aquí podrás ingresar con tu correo para continuar tu cuestionario o ver tus resultados.',
    fase: 5,
    indexable: false,
  },
  cuestionario: {
    titulo: 'Cuestionario',
    descripcion: 'Aquí responderás las preguntas una por una, a tu ritmo.',
    fase: 6,
    indexable: false,
  },
  resultados: {
    titulo: 'Tus resultados',
    descripcion: 'Aquí verás tu orientación por áreas de bienestar.',
    fase: 7,
    indexable: false,
  },
  privacidad: {
    titulo: 'Política de tratamiento de datos',
    descripcion: 'Aquí estará la política de tratamiento de datos personales de la Alcaldía.',
    fase: 5,
    indexable: true,
  },
  terminos: {
    titulo: 'Términos y condiciones',
    descripcion: 'Aquí estarán los términos y condiciones de uso de Mente al Día.',
    fase: 5,
    indexable: true,
  },
  accesibilidad: {
    titulo: 'Declaración de accesibilidad',
    descripcion:
      'Aquí estará la declaración de accesibilidad, con el nivel alcanzado y un canal para reportar barreras.',
    fase: 10,
    indexable: true,
  },
  panel: {
    titulo: 'Panel profesional',
    descripcion: 'Espacio privado para profesionales autorizados de la Alcaldía.',
    fase: 8,
    indexable: false,
  },
} satisfies Record<string, PaginaInfo>;

export type PaginaId = keyof typeof paginas;

export const textos = {
  sitio: {
    nombre: 'Mente al Día',
    alcaldia: `Alcaldía de ${sitio.municipio}`,
    avisoOrientacion:
      'Mente al Día es una herramienta de orientación. No reemplaza la atención profesional ni los servicios de emergencia.',
    tituloPagina: (titulo: string) =>
      titulo === 'Mente al Día' ? titulo : `${titulo} · Mente al Día`,
  },

  comunes: {
    cerrar: 'Cerrar',
    cargando: 'Cargando…',
    enConstruccion: 'En construcción',
    seConstruyeEnFase: (fase: number) =>
      `Esta sección se construye en la Fase ${fase} del proyecto.`,
    volverInicio: 'Volver al inicio',
  },

  saltarAlContenido: 'Saltar al contenido',

  nav: {
    etiqueta: 'Menú principal',
    inicio: 'Inicio',
    comoFunciona: 'Cómo funciona',
    areas: 'Áreas',
    preguntas: 'Preguntas frecuentes',
    ingresar: 'Ingresar',
    abrirMenu: 'Abrir menú',
    tituloMenu: 'Menú',
  },

  encabezado: {
    irAlInicio: 'Mente al Día, ir al inicio',
    lineasAyuda: 'Líneas de ayuda',
    lineasAyudaCorto: 'Ayuda',
    accesibilidad: 'Accesibilidad',
  },

  logoAlcaldia: {
    marcador: '[LOGO ALCALDÍA]',
    alternativo: `Logo de la Alcaldía de ${sitio.municipio}`,
  },

  lineasAyuda: {
    titulo: 'Líneas de ayuda',
    descripcion: 'Si necesitas apoyo, puedes comunicarte con estas líneas.',
    emergencia: 'Si estás en peligro inmediato, llama al 123.',
    llamar: 'Llamar',
    llamarA: (numero: string, nombre: string) => `Llamar al ${numero}, ${nombre}`,
    atiende: 'Atiende',
    horario: 'Horario',
    cobertura: 'Cobertura',
    verTodas: 'Ver todas las líneas de ayuda',
    paginaIntro:
      'Si necesitas apoyo, puedes comunicarte con estas líneas. Si tú o alguien cercano está en peligro inmediato, llama al 123.',
  },

  accesibilidad: {
    titulo: 'Accesibilidad',
    descripcion: 'Ajusta el sitio a tu manera. Recordaremos tu elección en este navegador.',
    tamanoTexto: 'Tamaño del texto',
    reducirTexto: 'Reducir tamaño del texto',
    textoNormal: 'Tamaño normal del texto',
    aumentarTexto: 'Aumentar tamaño del texto',
    tamanoActual: (porcentaje: number) => `Tamaño actual: ${porcentaje} %`,
    altoContraste: 'Alto contraste',
    altoContrasteDescripcion: 'Aumenta la diferencia entre el texto y el fondo.',
    reducirMovimiento: 'Reducir movimiento',
    reducirMovimientoDescripcion: 'Quita animaciones y desplazamientos.',
    movimientoDelSistema: 'Tu dispositivo ya pide reducir el movimiento, así que lo respetamos.',
    lecturaFacil: 'Fuente de lectura fácil',
    lecturaFacilDescripcion: 'Usa una letra diseñada para personas con baja visión.',
    avanceAutomatico: 'Avance automático de preguntas',
    avanceAutomaticoDescripcion: 'Pasa a la siguiente pregunta al elegir una respuesta.',
    restablecer: 'Restablecer preferencias',
  },

  pie: {
    contacto: 'Contacto',
    correo: 'Correo',
    telefono: 'Teléfono',
    informacion: 'Información',
    politica: 'Política de tratamiento de datos',
    terminos: 'Términos y condiciones',
    accesibilidad: 'Declaración de accesibilidad',
    mapa: 'Mapa del sitio',
    derechos: (anio: number) => `© ${anio} Alcaldía de ${sitio.municipio}`,
  },

  govco: {
    barraSuperior: 'Espacio reservado para la barra superior GOV.CO',
    pie: 'Espacio reservado para el pie GOV.CO',
  },

  niveles: {
    adecuado: 'Adecuado',
    por_fortalecer: 'Por fortalecer',
    requiere_atencion: 'Requiere atención',
    sin_dato: 'Sin dato',
  } satisfies Record<Nivel, string>,

  stepper: {
    completado: '(completado)',
    actual: '(paso actual)',
    pendiente: '(pendiente)',
  },

  combobox: {
    sinResultados: 'No encontramos coincidencias.',
  },

  toast: {
    region: 'Notificaciones ({hotkey})',
  },

  paginas,

  mapaSitio: {
    titulo: 'Mapa del sitio',
    descripcion: 'Todas las páginas públicas de Mente al Día.',
  },

  noEncontrada: {
    titulo: 'No encontramos esta página',
    texto:
      'Puede que el enlace haya cambiado o que la dirección tenga un error. Desde aquí puedes volver al inicio o consultar las líneas de ayuda.',
    irInicio: 'Ir al inicio',
    verLineas: 'Ver líneas de ayuda',
  },

  errorRuta: {
    titulo: 'Algo no salió como esperábamos',
    texto:
      'No pudimos cargar esta página. Revisa tu conexión e inténtalo de nuevo. Si necesitas apoyo ahora, las líneas de ayuda siguen disponibles.',
    reintentar: 'Intentar de nuevo',
  },
} as const;
