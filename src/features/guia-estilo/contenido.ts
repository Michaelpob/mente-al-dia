/**
 * Textos de demostración de la guía de estilo (herramienta interna, no se publica en producción).
 * Los ejemplos de lugares usan marcadores: la lista real la entrega la Alcaldía.
 */
export const guia = {
  titulo: 'Guía de estilo',
  intro:
    'Sistema visual «Piedra y Pizarra»: sobrio e institucional como una entidad pública; cálido y sereno como un espacio de cuidado. Esta página es interna y sirve para aprobar la identidad visual.',
  nota: 'Página interna: no se indexa y no aparece en la versión de producción.',
  indice: 'Secciones de la guía',

  secciones: {
    paleta: 'Paleta de color',
    tipografia: 'Tipografía',
    formas: 'Formas, sombras y movimiento',
    botones: 'Botones',
    tarjetas: 'Tarjetas',
    niveles: 'Insignias de nivel',
    formularios: 'Campos de formulario',
    progreso: 'Pasos y progreso',
    contenido: 'Acordeón y pestañas',
    superposiciones: 'Diálogo, panel lateral, tooltip y toast',
    estados: 'Carga, estado vacío y callouts',
    marca: 'Logotipos',
  },

  paleta: {
    grupos: [
      {
        nombre: 'Neutros',
        tokens: [
          { token: 'piedra-50', uso: 'Fondo general' },
          { token: 'piedra-100', uso: 'Secciones alternas' },
          { token: 'piedra-200', uso: 'Bordes suaves y divisores' },
          { token: 'piedra-300', uso: 'Divisores marcados (decorativo)' },
          { token: 'blanco', uso: 'Superficies y tarjetas' },
          { token: 'grafito-900', uso: 'Texto principal' },
          { token: 'grafito-600', uso: 'Texto secundario' },
          { token: 'grafito-500', uso: 'Texto de apoyo y placeholders' },
          { token: 'borde-campo', uso: 'Borde de campos de formulario (3:1)' },
        ],
      },
      {
        nombre: 'Marca',
        tokens: [
          { token: 'pizarra-800', uso: 'Hover y estados activos' },
          { token: 'pizarra-700', uso: 'Color principal: botones, enlaces y títulos' },
          { token: 'pizarra-100', uso: 'Fondos informativos' },
          { token: 'salvia-600', uso: 'Acento de calma' },
          { token: 'salvia-100', uso: 'Fondos serenos' },
          { token: 'arena-400', uso: 'Acento cálido decorativo (no usar para texto)' },
          { token: 'arena-100', uso: 'Fondos cálidos (apoyo inmediato)' },
        ],
      },
    ],
    niveles: 'Niveles de resultado (texto sobre fondo)',
    muestraTexto: 'Texto de ejemplo',
  },

  tipografia: {
    familias: [
      { nombre: 'Manrope', uso: 'Títulos (600–800)', clase: 'font-titulo' },
      { nombre: 'Public Sans', uso: 'Texto e interfaz (400–600)', clase: 'font-cuerpo' },
    ],
    lecturaFacil:
      'Atkinson Hyperlegible: se activa con «Fuente de lectura fácil» en Accesibilidad.',
    escala: [
      { nombre: 'Display', clase: 'text-display', ejemplo: 'Cuidar tu mente también es cuidarte' },
      { nombre: 'H1', clase: 'text-h1', ejemplo: 'Tus resultados' },
      { nombre: 'H2', clase: 'text-h2', ejemplo: 'Las 20 áreas del bienestar' },
      { nombre: 'H3', clase: 'text-h3', ejemplo: 'Sueño y descanso' },
      {
        nombre: 'Cuerpo grande',
        clase: 'text-cuerpo-grande',
        ejemplo: 'Responde a tu ritmo. Puedes pausar y continuar cuando quieras.',
      },
      {
        nombre: 'Cuerpo (17 px)',
        clase: 'text-cuerpo',
        ejemplo:
          'Este resultado es orientativo y no constituye un diagnóstico psicológico ni médico. Cada pequeño paso cuenta.',
      },
      { nombre: 'Pequeño', clase: 'text-pequeno', ejemplo: 'Guardado automático activado.' },
      {
        nombre: 'Etiqueta',
        clase: 'text-etiqueta uppercase',
        ejemplo: 'Orientación, no diagnóstico',
      },
    ],
  },

  formas: {
    radios: 'Radios',
    sombras: 'Sombras',
    movimiento: 'Tiempos de animación',
    tiempos: [
      { nombre: 'Micro', valor: '150 ms', uso: 'Hover, foco y presión' },
      { nombre: 'Base', valor: '250 ms', uso: 'Cambios de estado y transiciones' },
      { nombre: 'Sección', valor: '450 ms', uso: 'Entrada de secciones' },
      { nombre: 'Escena', valor: '700 ms', uso: 'Escenas 3D y cierres' },
    ],
    curva: 'Curva estándar: cubic-bezier(0.2, 0.8, 0.2, 1). Entradas: fundido + 16 px, cada 60 ms.',
    verEntrada: 'Repetir la entrada',
  },

  botones: {
    variantes: 'Variantes',
    tamanos: 'Tamaños',
    estados: 'Estados',
    primario: 'Comenzar mi cuestionario',
    secundario: '¿Cómo funciona?',
    fantasma: 'Pausar y salir',
    apoyo: 'Líneas de ayuda',
    enlace: 'Ver la política completa',
    pequeno: 'Pequeño',
    mediano: 'Mediano',
    grande: 'Grande',
    cargando: 'Guardando…',
    deshabilitado: 'Deshabilitado',
    conIcono: 'Siguiente',
    nota: 'Altura mínima de 44 px. Pasa el puntero, enfoca con Tab o presiona para ver los estados.',
  },

  tarjetas: {
    base: { titulo: 'Tarjeta base', texto: 'Borde suave sobre superficie blanca.' },
    elevada: { titulo: 'Tarjeta elevada', texto: 'Sombra en capas, sin borde.' },
    interactiva: {
      titulo: 'Tarjeta interactiva',
      texto: 'Se eleva levemente al pasar el puntero o al enfocar su contenido.',
      accion: 'Ver más',
    },
    tilt: {
      titulo: 'Tarjeta con inclinación 3D',
      texto: 'Sigue el puntero con máximo 6°. Solo con mouse y sin «reducir movimiento».',
    },
  },

  formulario: {
    titulo: 'Formulario de ejemplo (React Hook Form + Zod)',
    nombre: 'Nombre completo',
    nombreAyuda: 'Como aparece en tu documento.',
    nombreError: 'Escribe tu nombre completo (entre 3 y 100 caracteres).',
    correo: 'Correo electrónico',
    correoError: 'Revisa el correo: debe tener la forma nombre@dominio.com.',
    telefono: 'Teléfono',
    telefonoAyuda: '10 dígitos, sin espacios.',
    telefonoError: 'Revisa el número: debe tener 10 dígitos.',
    lugar: 'Lugar de residencia',
    lugarPlaceholder: 'Elige tu comuna, barrio o vereda',
    lugarBuscar: 'Buscar lugar…',
    lugarError: 'Elige tu lugar de residencia.',
    lugares: [
      { value: 'lugar-1', label: '[LUGAR DE RESIDENCIA 1]' },
      { value: 'lugar-2', label: '[LUGAR DE RESIDENCIA 2]' },
      { value: 'lugar-3', label: '[LUGAR DE RESIDENCIA 3]' },
      { value: 'otro-municipio', label: 'Otro municipio' },
    ],
    deshabilitado: 'Campo deshabilitado',
    deshabilitadoValor: 'No editable',
    quien: '¿Quién va a responder?',
    quienOpciones: {
      nino: {
        titulo: 'Una niña o un niño',
        descripcion: '6 a 11 años, junto a un adulto de confianza.',
      },
      adolescente: {
        titulo: 'Un adolescente',
        descripcion: '12 a 17 años. Este módulo estará disponible pronto.',
        badge: 'Próximamente',
      },
      adulto: { titulo: 'Una persona adulta', descripcion: '18 años o más.' },
    },
    quienError: 'Elige quién va a responder.',
    autorizacion: 'Acepto las condiciones de este formulario de ejemplo.',
    autorizacionDescripcion: 'Las casillas de autorización nunca vienen marcadas.',
    autorizacionError: 'Para continuar debes aceptar.',
    enviar: 'Validar formulario',
    exito: 'El formulario de ejemplo es válido.',
  },

  progreso: {
    pasosEtiqueta: 'Pasos del registro',
    pasos: ['¿Quién responde?', 'Antes de empezar', 'Datos', 'Autorización', 'Tu acceso'],
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    barraEtiqueta: 'Progreso del cuestionario',
    barraTexto: (n: number) => `Pregunta ${n} de 20`,
    menos: 'Una pregunta menos',
    mas: 'Una pregunta más',
  },

  acordeon: [
    {
      pregunta: '¿Es un diagnóstico?',
      respuesta:
        'No. Mente al Día es una herramienta de orientación: te ayuda a conocer cómo están tus áreas de bienestar y a encontrar apoyo.',
    },
    {
      pregunta: '¿Puedo pausar y continuar después?',
      respuesta: 'Sí. Tus respuestas se guardan automáticamente y puedes continuar cuando quieras.',
    },
  ],
  pestanas: [
    {
      valor: 'emociones',
      titulo: 'Emociones y mente',
      texto: 'Contenido de ejemplo de la primera pestaña.',
    },
    {
      valor: 'cuerpo',
      titulo: 'Cuerpo y energía',
      texto: 'Contenido de ejemplo de la segunda pestaña.',
    },
    {
      valor: 'vinculos',
      titulo: 'Vínculos y apoyo',
      texto: 'Contenido de ejemplo de la tercera pestaña.',
    },
  ],
  pestanasEtiqueta: 'Dimensiones de ejemplo',

  superposiciones: {
    abrirDialogo: 'Abrir diálogo',
    dialogoTitulo: '¿Quieres pausar el cuestionario?',
    dialogoTexto:
      'Tu avance quedará guardado. Puedes continuar cuando quieras ingresando con tu correo.',
    dialogoCancelar: 'Seguir respondiendo',
    dialogoConfirmar: 'Pausar y salir',
    abrirPanel: 'Abrir panel lateral',
    panelTitulo: 'Panel lateral',
    panelTexto: 'Se usa para el menú móvil, las líneas de ayuda y la accesibilidad.',
    tooltipBoton: 'Pasa el puntero o enfoca',
    tooltipTexto: 'Ayuda breve; nunca guarda información esencial.',
    toastBoton: 'Mostrar aviso',
    toastTitulo: 'Guardado',
    toastTexto: 'Tu respuesta quedó guardada.',
  },

  estados: {
    cargando: 'Esqueleto de carga',
    vacioTitulo: 'Todavía no hay resultados',
    vacioTexto: 'Cuando termines un cuestionario, aquí verás tu orientación.',
    vacioAccion: 'Comenzar mi cuestionario',
    infoTitulo: 'Callout informativo',
    infoTexto:
      'Este resultado es orientativo y no constituye un diagnóstico psicológico ni médico.',
    apoyoTitulo: 'Callout de apoyo',
    apoyoTexto: 'Pedir ayuda es una forma de cuidarte. Las líneas de ayuda están disponibles.',
  },

  marca: {
    completo: 'Logotipo completo',
    isotipo: 'Isotipo',
    alcaldia: 'Logo de la Alcaldía (marcador hasta recibir el oficial)',
  },
} as const;
