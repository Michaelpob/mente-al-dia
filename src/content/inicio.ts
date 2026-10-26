import { CICLOS_RESPIRACION } from '@/content/respiracion';

/**
 * Contenido de la página de inicio (Fase 3).
 * ESTADO: BORRADOR. Son los textos de la demostración pública; los valida el equipo profesional
 * (tono) y la oficina jurídica (privacidad). Ver F3-01 en docs/PENDIENTES_VALIDACION.md.
 */
export const inicio = {
  hero: {
    titulo: 'Cuidar tu mente también es cuidarte',
    intro:
      'Responde un cuestionario breve, conoce cómo están las distintas áreas de tu bienestar y recibe orientaciones para cuidarte. Es gratuito y confidencial.',
    comenzar: 'Comenzar mi cuestionario',
    comoFunciona: 'Cómo funciona',
    confianzaEtiqueta: 'Lo que debes saber',
    confianza: ['Gratuito', 'Confidencial', 'Unos 10 minutos', 'Orientación, no diagnóstico'],
  },

  queEs: {
    titulo: 'Un espacio para conocerte y cuidarte',
    texto:
      'Mente al Día es una herramienta de la Alcaldía para promover el bienestar emocional. Respondes 20 preguntas sobre cómo te has sentido en las últimas semanas y recibes una orientación por áreas, con ideas de autocuidado y rutas de apoyo.',
    esTitulo: 'Lo que es',
    es: [
      'Una herramienta de orientación para conocer cómo estás.',
      'Una forma de detectar a tiempo qué áreas conviene cuidar.',
      'Recomendaciones de autocuidado escritas con respeto.',
      'Un puente hacia las rutas de apoyo del municipio.',
    ],
    noEsTitulo: 'Lo que no es',
    noEs: [
      'Un diagnóstico psicológico o médico.',
      'Un reemplazo de la atención profesional.',
      'Un servicio de emergencias. Si estás en peligro, llama al 123.',
    ],
  },

  comoFunciona: {
    titulo: 'Cómo funciona',
    texto: 'Cuatro pasos, a tu ritmo y desde cualquier celular o computador.',
    pasos: [
      {
        titulo: 'Regístrate',
        texto: 'Con tus datos básicos y tu autorización. Tus respuestas son confidenciales.',
      },
      {
        titulo: 'Elige quién responde',
        texto:
          'Hay un cuestionario para adultos y otro para niñas y niños, que responden con un adulto de confianza.',
      },
      {
        titulo: 'Responde a tu ritmo',
        texto: 'Una pregunta a la vez. Puedes pausar y continuar después.',
      },
      {
        titulo: 'Recibe tu orientación',
        texto: 'Verás tus fortalezas, lo que conviene fortalecer y las áreas para cuidar primero.',
      },
    ],
  },

  areas: {
    titulo: 'Las 20 áreas del bienestar',
    texto:
      'Cada pregunta mira un área de tu vida. Las agrupamos en cinco dimensiones para que el resultado sea fácil de leer.',
    dimensionesEtiqueta: 'Dimensiones',
    todas: 'Todas',
    centroTitulo: '20 áreas',
    centroDetalle: 'en 5 dimensiones',
    ruedaEtiqueta: 'Rueda de bienestar con las 20 áreas. Elige un área para ver su dimensión.',
  },

  publicos: {
    titulo: '¿Para quién es?',
    texto:
      'Cada grupo tiene su propio cuestionario, con preguntas y mensajes pensados para su edad.',
    empezar: 'Empezar',
    empezarComo: (grupo: string) => `Empezar el cuestionario de ${grupo.toLowerCase()}`,
    proximamente: 'Próximamente',
    verLineas: 'Ver líneas de ayuda',
    grupos: {
      nino: {
        titulo: 'Niñas y niños',
        texto:
          'De 6 a 11 años, siempre con un adulto de confianza. Preguntas sencillas que se responden con Sí, A veces o No.',
      },
      adolescente: {
        titulo: 'Adolescentes',
        texto:
          'De 12 a 17 años. Su cuestionario está en preparación con el equipo profesional de la Alcaldía.',
      },
      adulto: {
        titulo: 'Personas adultas',
        texto:
          'De 18 años en adelante. 20 preguntas, con la opción de no responder alguna si así lo prefieres.',
      },
    },
  },

  privacidad: {
    titulo: 'Tu información está protegida',
    texto:
      'La plataforma se construye con protección de datos desde el diseño, conforme a la Ley 1581 de 2012.',
    garantias: [
      {
        titulo: 'Tú autorizas',
        texto: 'Antes de empezar te pedimos tu autorización. Ninguna casilla viene marcada.',
      },
      {
        titulo: 'Solo profesionales autorizados',
        texto: 'Nadie más ve tus respuestas, y cada consulta queda registrada.',
      },
      { titulo: 'Información cifrada', texto: 'Tus datos viajan y se guardan cifrados.' },
      {
        titulo: 'Tus derechos',
        texto: 'Puedes consultar, actualizar o pedir que se eliminen tus datos.',
      },
    ],
    verPolitica: 'Leer la política de tratamiento de datos',
  },

  respiracion: {
    etiqueta: 'Respiración guiada',
    titulo: 'Tómate un minuto',
    texto:
      'Una pausa de respiración lenta puede ayudarte a bajar la tensión. Sigue el círculo: inhala en 4 segundos, sostén 2 y exhala en 6.',
    empezar: 'Empezar',
    pausar: 'Pausar',
    inicial: `Son ${CICLOS_RESPIRACION} respiraciones, cerca de un minuto.`,
    fase: (fase: string, ciclo: number) =>
      `${fase}. Respiración ${ciclo} de ${CICLOS_RESPIRACION}.`,
    terminada: 'Bien hecho. Cuidarte también es importante.',
    pausada: 'Pausaste la respiración. Puedes empezar de nuevo cuando quieras.',
  },

  preguntas: {
    titulo: 'Preguntas frecuentes',
    lista: [
      {
        pregunta: '¿Es un diagnóstico?',
        respuesta:
          'No. Es una herramienta de orientación que te ayuda a identificar qué áreas de tu bienestar conviene cuidar. Si algo te preocupa, un profesional de la salud puede acompañarte.',
      },
      {
        pregunta: '¿Quién puede ver mis respuestas?',
        respuesta:
          'Solo profesionales autorizados de la Alcaldía, para orientar y hacer seguimiento cuando sea necesario. Cada acceso queda registrado.',
      },
      {
        pregunta: '¿Cuánto tiempo tarda?',
        respuesta: 'Unos 10 minutos. Son 20 preguntas, una por pantalla.',
      },
      {
        pregunta: '¿Puedo pausar y continuar después?',
        respuesta:
          'Sí. Tus respuestas se guardan a medida que avanzas y puedes continuar ingresando con tu correo.',
      },
      {
        pregunta: '¿Puedo no responder alguna pregunta?',
        respuesta:
          'En el cuestionario de adultos puedes elegir «Prefiero no responder» en cualquier pregunta.',
      },
      {
        pregunta: '¿Qué pasa si mis resultados muestran áreas para cuidar?',
        respuesta:
          'Verás mensajes con ideas para empezar y las líneas de apoyo disponibles. Un resultado así no te define: es una oportunidad para cuidarte. Si hay señales que requieren atención, un profesional de la Alcaldía podrá revisarlo.',
      },
      {
        pregunta: '¿Cómo pido que eliminen mis datos?',
        respuesta:
          'Desde «Mi cuenta» puedes solicitarlo, o escribiendo al correo de contacto de la Alcaldía.',
      },
    ],
  },

  lineas: {
    titulo: 'Líneas de ayuda',
    texto:
      'Si necesitas apoyo ahora, puedes comunicarte con estas líneas. Si tú o alguien cercano está en peligro inmediato, llama al 123.',
  },

  cierre: {
    titulo: 'Dar el primer paso también es cuidarte',
  },
} as const;
