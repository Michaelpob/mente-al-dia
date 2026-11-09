import { camposAcudiente, camposRegistroAdulto, camposRegistroNino } from '@/content/v1/registro';

/**
 * Textos del registro (Fase 5) y del cuestionario (Fase 6), en «tú».
 * BORRADOR (F5-01): los mismos de la demostración, pendientes de validación del equipo profesional.
 * Las etiquetas de los campos vienen del documento base (src/content/v1/registro.ts).
 */

const [nombreAdulto, correo, telefono, lugarResidencia] = camposRegistroAdulto;
const [nombreNino, edad, grado, sexoConOpciones] = camposRegistroNino;
const [nombreAcudiente, parentesco, correoAcudiente, telefonoAcudiente, lugarAcudiente] =
  camposAcudiente;

export const participar = {
  pasos: ['Quién responde', 'Tus datos', 'Autorización', 'Preguntas', 'Revisión'],
  pasosEtiqueta: 'Avance del registro y el cuestionario',

  /** Sin el enlace de una institución (D-86). */
  /** Sin el enlace de una institución, se elige de la lista (D-88). */
  elegirSede: {
    titulo: '¿Con qué institución vas a responder?',
    texto:
      'Elige la institución que te invitó a responder. Tus respuestas quedan en esa institución.',
    leyenda: 'Institución',
    falta: 'Elige tu institución para continuar.',
    continuar: 'Continuar',
    volver: 'Volver',
    cargando: 'Cargando las instituciones…',
    confirmando: 'Confirmando el enlace de tu institución…',
    error: 'No pudimos cargar las instituciones. Revisa la conexión.',
    reintentar: 'Intentar de nuevo',
    ninguna: 'Por ahora ninguna institución está recibiendo respuestas.',
    inicio: 'Ir al inicio',
    lineas: 'Si necesitas apoyo ahora, puedes llamar a estas líneas.',
    otraInstitucion: '¿No es tu institución?',
    cambiar: 'Cambiar de institución',
  },

  grupo: {
    titulo: '¿Quién va a responder?',
    texto: 'Cada cuestionario tiene preguntas pensadas para su edad.',
    leyenda: 'Quién va a responder',
    nino: { titulo: 'Una niña o un niño', detalle: 'De 6 a 11 años, con un adulto de confianza.' },
    adolescente: {
      titulo: 'Un adolescente',
      detalle: 'De 12 a 17 años, con la autorización de un adulto responsable.',
    },
    adulto: { titulo: 'Una persona adulta', detalle: 'De 18 años en adelante.' },
    ayudaAhora: '¿Necesitas apoyo ahora?',
    verLineas: 'Ver líneas de ayuda',
    falta: 'Elige quién va a responder para continuar.',
  },

  datos: {
    adulto: {
      titulo: 'Tus datos',
      texto:
        'Los usamos solo para que un profesional pueda contactarte si lo necesitas. Se guardan aparte de tus respuestas.',
    },
    nino: {
      titulo: 'Datos de la niña o el niño',
      texto: 'Este cuestionario se responde junto a un adulto de confianza.',
    },
    adolescente: {
      titulo: 'Tus datos',
      texto:
        'Como eres menor de edad, también te pedimos los datos de un adulto responsable. Tus respuestas se guardan aparte de estos datos.',
    },
    acudiente: {
      titulo: 'Datos del adulto responsable',
      texto:
        'Es quien acompaña a la niña o el niño. Si hace falta, el contacto será con esta persona.',
    },
    acudienteAdolescente: {
      titulo: 'Datos de tu adulto responsable',
      texto:
        'Tu madre, tu padre o el adulto que te cuida. Si hace falta, un profesional se comunicará con esta persona.',
    },
    campos: {
      nombreAdulto,
      correo,
      telefono,
      lugarResidencia,
      lugarAyuda: 'Barrio, comuna o vereda donde vive.',
      nombreNino,
      edad,
      edadElegir: 'Elige la edad',
      grado,
      gradoElegir: 'Elige el grado',
      /** La etiqueta del documento base trae las opciones entre paréntesis. */
      sexo: sexoConOpciones.replace(/\s*\(.*\)\s*$/, ''),
      sexoAyuda: 'Puedes dejarla sin responder.',
      /** Adolescentes: responden por sí mismos, en «tú» (documento base, sección 10). */
      nombreAdolescente: 'Tu nombre completo',
      edadAdolescente: 'Tu edad',
      gradoAdolescente: 'Grado que cursas',
      sexoAdolescente: '¿Con qué sexo te identificas?',
      /** El del niño y el del adulto se llamarían igual («Nombre»): este se precisa. */
      nombreAcudiente: `${nombreAcudiente} del adulto responsable`,
      parentesco,
      parentescoAyuda: 'Por ejemplo: madre, padre, abuela o cuidador.',
      correoAcudiente,
      telefonoAcudiente,
      lugarAcudiente,
    },
    /** Pendiente 8: el documento base solo trae «Hombre / Mujer». */
    opcionesSexo: ['Hombre', 'Mujer'],
    sexoSinResponder: 'Prefiero no responder',
    /** Pendiente 7: rangos de edad por validar. */
    grados: [
      'Transición',
      'Primero',
      'Segundo',
      'Tercero',
      'Cuarto',
      'Quinto',
      'Sexto',
      'No está estudiando',
    ],
    /** Pendiente 7: de 12 a 17 años; el equipo profesional valida la lista. */
    gradosAdolescente: [
      'Quinto',
      'Sexto',
      'Séptimo',
      'Octavo',
      'Noveno',
      'Décimo',
      'Undécimo',
      'Ya terminé el colegio',
      'No estoy estudiando',
    ],
    obligatorios: 'Los campos con * son obligatorios.',
    revisa: 'Revisa los campos marcados para continuar.',
  },

  errores: {
    obligatorio: 'Este dato es obligatorio.',
    nombre: 'Escribe el nombre completo.',
    correo: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    telefono: 'Escribe un teléfono de 7 a 20 dígitos.',
    edad: 'Elige la edad.',
    largo: (maximo: number) => `Usa como máximo ${maximo} caracteres.`,
  },

  autorizacion: {
    titulo: 'Autorización',
    texto:
      'Para guardar tus respuestas necesitamos tu autorización. Lee la política de tratamiento de datos antes de aceptar.',
    politica: 'Leer la política de tratamiento de datos',
    terminos: 'Leer los términos y condiciones',
    otraPestana: '(se abre en otra pestaña)',
    tratamientoDatos:
      'Autorizo el tratamiento de mis datos personales conforme a la política de tratamiento de datos.',
    datosSensibles:
      'Entiendo que mis respuestas sobre bienestar emocional son datos sensibles, que no estoy obligado(a) a responderlas y que puedo elegir «Prefiero no responder».',
    datosSensiblesNino:
      'Entiendo que las respuestas sobre bienestar emocional son datos sensibles y que la niña o el niño no está obligado(a) a responderlas.',
    autorizacionAcudiente:
      'Como adulto responsable, autorizo que la niña o el niño responda, y le pregunté si quiere hacerlo.',
    /** Pendiente de validación jurídica: cómo autoriza el adulto cuando el adolescente responde solo. */
    autorizacionAcudienteAdolescente:
      'Mi madre, mi padre o el adulto responsable que registré sabe que respondo este cuestionario y autoriza el tratamiento de mis datos.',
    falta: 'Para continuar necesitamos esta autorización.',
    continuar: 'Aceptar y continuar',
  },

  comunes: {
    continuar: 'Continuar',
    volver: 'Volver',
  },

  antes: {
    titulo: 'Antes de empezar',
    acompanante: {
      titulo: 'Este cuestionario se responde junto a un adulto de confianza',
      texto: 'Puede ser mamá, papá, un cuidador o una cuidadora.',
    },
    queEsperar: [
      '20 preguntas, una por pantalla.',
      'Unos 10 minutos.',
      'Puedes pausar y continuar en esta pestaña.',
      'No hay respuestas correctas o incorrectas.',
      'Es una orientación, no un diagnóstico.',
      'Tus respuestas son confidenciales.',
    ],
    comoResponder: 'Cómo responder',
    conAvance:
      'Al elegir una respuesta pasarás automáticamente a la siguiente pregunta. Puedes desactivarlo en Accesibilidad.',
    sinAvance: 'Elige una respuesta y usa «Siguiente» para avanzar.',
    empezar: 'Empezar el cuestionario',
    editarDatos: 'Revisar mis datos',
  },

  pregunta: {
    progreso: 'Avance del cuestionario',
    progresoTexto: (respondidas: number, total: number) =>
      `${respondidas} de ${total} preguntas respondidas`,
    numero: (n: number, total: number) => `Pregunta ${n} de ${total}`,
    todasRespondidas: 'Ya respondiste todas',
    tiempo: (minutos: number) =>
      `Te ${minutos === 1 ? 'queda' : 'quedan'} unos ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`,
    escuchar: 'Escuchar pregunta',
    opcionesVoz: 'Opciones',
    guardada: 'Respuesta guardada en esta pestaña',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    revisar: 'Revisar mis respuestas',
    volverRevision: 'Volver a la revisión',
    atajos: (n: number) => `Atajos: teclas 1 a ${n} para elegir, Enter para continuar.`,
    hitos: {
      5: 'Vas por buen camino. Sigue avanzando.',
      10: 'Vas por la mitad. Cada pequeño paso cuenta.',
      15: 'Ya casi terminas. Cuidarte también es importante.',
    } as Record<number, string>,
    pausar: 'Pausar y salir',
    pausarTitulo: '¿Pausar y salir?',
    pausarTexto:
      'Tu avance queda guardado en esta pestaña del navegador. Si vuelves antes de cerrarla, sigues donde ibas. Si la cierras, el avance se borra para proteger tus datos.',
    salir: 'Salir',
    seguir: 'Seguir respondiendo',
  },

  revision: {
    titulo: 'Revisa tus respuestas',
    texto: 'Puedes cambiar cualquier respuesta antes de enviar.',
    tuRespuesta: 'Tu respuesta:',
    sinResponder: 'Sin responder',
    cambiar: 'Cambiar',
    cambiarDe: (n: number) => `Cambiar la respuesta de la pregunta ${n}`,
    aviso: 'Al enviar no podrás modificar tus respuestas.',
    enviar: 'Enviar mis respuestas',
    enviando: 'Enviando tus respuestas…',
    volver: 'Volver a las preguntas',
  },

  envio: {
    noConectado:
      'La plataforma todavía no está conectada a la base de datos, así que por ahora no se pueden enviar respuestas.',
    errores: {
      sin_conexion:
        'No pudimos enviar tus respuestas porque falló la conexión. Siguen guardadas en esta pestaña: inténtalo de nuevo.',
      institucion_invalida:
        'El enlace de tu institución ya no está activo, así que no pudimos guardar tus respuestas. Pide a tu institución el enlace de nuevo.',
      datos_invalidos:
        'Algunos datos no son válidos. Revisa tus datos y tus respuestas e inténtalo de nuevo.',
      servidor:
        'No pudimos guardar tus respuestas en este momento. Siguen guardadas en esta pestaña: inténtalo de nuevo en unos minutos.',
    },
    reintentar: 'Intentar de nuevo',
    vistaPrevia:
      'Esta vista previa no está conectada a la base de datos, así que tus respuestas no se pueden enviar. Puedes ver tu resultado calculado en este navegador: no se guarda ni se envía a nadie.',
    verEjemplo: 'Ver mi resultado (sin guardar)',
  },

  /** Resultados (Fase 7). BORRADOR, los mismos de la demostración. */
  resultados: {
    titulo: 'Tus resultados',
    modulo: {
      adulto: 'Cuestionario de personas adultas',
      adolescente: 'Cuestionario de adolescentes',
      nino: 'Cuestionario de niñas y niños',
    },
    orientacionNoDiagnostico: 'Orientación, no diagnóstico',
    titulosGenerales: {
      favorable: 'Tu resultado es favorable',
      por_fortalecer: 'Hay aspectos por fortalecer',
      desafios: 'Algunas áreas necesitan más cuidado',
      insuficiente: 'Necesitamos más respuestas',
    },
    apoyoTitulo: 'Si lo necesitas, hay apoyo ahora mismo',
    llamar123: 'Llamar al 123',
    areasTitulo: 'Tus 20 áreas',
    resumen: {
      fortaleza: (n: number) => `${n} ${n === 1 ? 'fortaleza' : 'fortalezas'}`,
      porFortalecer: (n: number) => `${n} por fortalecer`,
      cuidarPrimero: (n: number) => `${n} para cuidar primero`,
      sinDato: (n: number) => `${n} sin dato`,
    },
    grupos: {
      requiere_atencion: 'Para cuidar primero',
      por_fortalecer: 'Por fortalecer',
      adecuado: 'Tus fortalezas',
      sin_dato: 'Sin dato',
    },
    centroRueda: { titulo: 'Tus áreas', detalle: 'Elige una para ver su mensaje' },
    leyenda: 'Leyenda de niveles',
    lineasTexto: 'Si necesitas hablar con alguien, puedes comunicarte con estas líneas.',
    imprimir: 'Descargar o imprimir',
    ejemplo:
      'Resultado de ejemplo: se calculó en este navegador con el mismo motor de la plataforma y no se guardó ni se envió.',
    aviso:
      'Este resultado es orientativo y no constituye un diagnóstico psicológico ni médico. Si estás en peligro inmediato, llama al 123.',
  },

  enviado: {
    titulo: 'Gracias por responder',
    codigo: 'Código de tu cuestionario',
    codigoAyuda: 'Guárdalo: si hablas con un profesional de Mente al Día, menciona este código.',
    orientacion: 'Tu orientación',
    acompanante: 'Para el adulto que acompaña',
    apoyo: 'Si necesitas apoyo ahora',
    lineas: 'Ver líneas de ayuda',
    inicio: 'Volver al inicio',
    otra: 'Responder otro cuestionario',
    sinEnvio: {
      titulo: 'Aún no hay un cuestionario enviado',
      texto: 'Cuando respondas y envíes el cuestionario, aquí verás tu orientación.',
      empezar: 'Empezar mi cuestionario',
    },
  },
} as const;
