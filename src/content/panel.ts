/**
 * Textos del panel de administración (Fase 8): estructura, tablero, registros, ficha y prioritarios.
 * El ingreso y la contraseña están en textos.accesoPanel.
 */
export const panel = {
  aviso: 'Resultados orientativos. No constituyen diagnóstico.',
  confidencial: 'Documento confidencial — uso institucional',

  menu: {
    etiqueta: 'Secciones del panel',
    abrir: 'Menú',
    contraer: 'Contraer el menú',
    expandir: 'Expandir el menú',
    administracion: 'Administración',
    fase9: 'Fase 9',
    tablero: 'Tablero',
    registros: 'Registros',
    prioritarios: 'Prioritarios',
    seguimiento: 'Seguimiento',
    reportes: 'Reportes',
    configuracion: 'Configuración',
    usuarios: 'Usuarios',
    auditoria: 'Auditoría',
    pendientes: (n: number) => `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`,
  },

  busqueda: {
    etiqueta: 'Buscar una persona',
    placeholder: 'Nombre, correo o teléfono',
    boton: 'Buscar',
  },

  sesion: {
    cerrar: 'Cerrar sesión',
    roles: {
      superadministrador: 'Superadministrador',
      profesional: 'Profesional',
      consulta: 'Consulta',
    },
  },

  inactividad: {
    titulo: '¿Sigues ahí?',
    texto: (s: number) =>
      `Por seguridad, la sesión se cerrará en ${s} ${s === 1 ? 'segundo' : 'segundos'} si no hay actividad.`,
    seguir: 'Seguir en el panel',
    salir: 'Cerrar sesión ahora',
    cerrada: 'Cerramos tu sesión por inactividad. Ingresa de nuevo para continuar.',
  },

  enConstruccion: {
    etiqueta: 'En construcción',
    texto: (fase: number) => `Esta sección se construye en la Fase ${fase} del proyecto.`,
    volver: 'Ir al tablero',
  },

  modulos: {
    adulto: 'Personas adultas',
    nino: 'Niñas y niños',
    adolescente: 'Adolescentes',
  },
  resultados: {
    favorable: 'Favorable',
    por_fortalecer: 'Por fortalecer',
    desafios: 'Con desafíos',
    insuficiente: 'Respuestas insuficientes',
  },
  niveles: {
    adecuado: 'Adecuado',
    por_fortalecer: 'Por fortalecer',
    requiere_atencion: 'Requiere atención',
    sin_dato: 'Sin dato',
  },
  estados: {
    pendiente: 'Pendiente',
    en_contacto: 'En contacto',
    orientado: 'Orientado',
    remitido: 'Remitido',
    cerrado: 'Cerrado',
  },
  sinSeguimiento: 'Sin seguimiento',
  sinAsignar: 'Sin asignar',
  sinDato: '—',
  autorizaciones: {
    tratamiento_datos: 'Tratamiento de datos personales',
    datos_sensibles: 'Datos sensibles',
    autorizacion_acudiente: 'Autorización del adulto responsable',
  },

  filtros: {
    titulo: 'Filtros',
    periodo: 'Periodo',
    periodos: {
      7: 'Últimos 7 días',
      30: 'Últimos 30 días',
      90: 'Últimos 90 días',
      365: 'Últimos 12 meses',
      personalizado: 'Fechas a elegir',
    },
    desde: 'Desde',
    hasta: 'Hasta',
    modulo: 'Módulo',
    lugar: 'Lugar de residencia',
    resultado: 'Resultado general',
    area: 'Área',
    nivel: 'Nivel del área',
    prioridad: 'Prioridad',
    prioridades: { todas: 'Todas', si: 'Con prioridad', no: 'Sin prioridad' },
    estado: 'Estado de seguimiento',
    todos: 'Todos',
    todas: 'Todas',
    aplicar: 'Aplicar',
    limpiar: 'Quitar filtros',
  },

  errores: {
    cargar: 'No pudimos cargar los datos. Revisa la conexión e intenta de nuevo.',
    reintentar: 'Reintentar',
    sinPermiso: 'Tu sesión ya no tiene permiso para ver esto. Ingresa de nuevo.',
  },

  graficas: {
    verTabla: 'Ver como tabla',
    verGrafica: 'Ver gráfica',
    sinDatos: 'No hay aplicaciones en este periodo.',
  },

  tablero: {
    titulo: 'Tablero',
    descripcion: 'Resumen de las aplicaciones del periodo, con los mismos filtros para todo.',
    indicadores: {
      aplicaciones: 'Aplicaciones',
      personas: 'Personas registradas',
      prioritarios: 'Prioritarios pendientes',
      resultado: 'Resultado general',
    },
    variacion: (pct: number) =>
      pct === 0
        ? 'Igual que en el periodo anterior'
        : `${pct > 0 ? '+' : '−'}${Math.abs(pct)} % frente al periodo anterior`,
    sinAnterior: 'Sin aplicaciones en el periodo anterior',
    personasNota: 'Personas distintas en el periodo',
    prioritariosNota: 'Todos los que esperan gestión, de cualquier fecha',
    verPrioritarios: 'Ver prioritarios',
    semanas: {
      titulo: 'Aplicaciones por semana',
      descripcion: 'Semanas de lunes a domingo, en hora de Colombia.',
      columnas: { semana: 'Semana del', aplicaciones: 'Aplicaciones' },
    },
    modulos: {
      titulo: 'Resultado general por módulo',
      descripcion: 'Proporción de cada resultado dentro de cada módulo.',
      columnas: { modulo: 'Módulo', total: 'Total' },
    },
    mapaCalor: {
      titulo: 'Áreas por nivel',
      descripcion:
        'Porcentaje de personas del periodo en cada nivel. Elige una celda para ver esos registros.',
      area: 'Área',
      celda: (area: string, nivel: string, pct: string) =>
        `${area}, ${nivel}: ${pct}. Ver estos registros`,
    },
    lugares: {
      titulo: 'Lugares con más aplicaciones',
      descripcion: 'Los diez lugares de residencia con más aplicaciones en el periodo.',
      columnas: { lugar: 'Lugar', aplicaciones: 'Aplicaciones' },
    },
  },

  registros: {
    titulo: 'Registros',
    descripcion: 'Todas las aplicaciones, con búsqueda y filtros. El contacto aparece enmascarado.',
    total: (n: string) => `${n} ${n === '1' ? 'aplicación' : 'aplicaciones'}`,
    columnasBoton: 'Columnas',
    columnasTitulo: 'Columnas visibles',
    columnas: {
      fecha: 'Fecha',
      nombre: 'Nombre',
      modulo: 'Módulo',
      lugar: 'Lugar',
      resultado: 'Resultado general',
      atencion: 'Áreas en «Requiere atención»',
      prioridad: 'Prioridad',
      estado: 'Estado',
      asignado: 'Profesional',
      correo: 'Correo',
      telefono: 'Teléfono',
    },
    ordenarPor: (columna: string) => `Ordenar por ${columna}`,
    conPrioridad: 'Con prioridad',
    rango: (desde: string, hasta: string, total: string) =>
      `Mostrando ${desde}–${hasta} de ${total}`,
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    porPagina: 'Por página',
    pagina: (n: number, de: number) => `Página ${n} de ${de}`,
    vacioTitulo: 'No hay registros con estos filtros',
    vacioTexto: 'Prueba con otro periodo o quita algunos filtros.',
    vacioSinDatos: 'Todavía no hay aplicaciones guardadas.',
  },

  ficha: {
    volver: 'Volver a los registros',
    codigo: 'Código',
    modulo: 'Módulo',
    edad: 'Edad',
    anos: (n: number) => `${n} ${n === 1 ? 'año' : 'años'}`,
    grado: 'Grado',
    lugar: 'Lugar de residencia',
    fecha: 'Fecha de registro',
    contacto: 'Contacto',
    mostrarContacto: 'Mostrar datos de contacto',
    cargandoContacto: 'Consultando…',
    contactoAuditoria: 'Esta consulta quedó registrada en la auditoría.',
    acudiente: 'Adulto responsable',
    parentesco: 'Parentesco',
    nombre: 'Nombre',
    correo: 'Correo',
    telefono: 'Teléfono',
    imprimir: 'Imprimir ficha',
    imprimiendo: 'Preparando…',
    errorImprimir:
      'No pudimos registrar la impresión en la auditoría, así que no se imprimió. Intenta de nuevo.',
    pestanas: {
      resultados: 'Resultados',
      historial: 'Historial',
      seguimiento: 'Seguimiento',
      autorizaciones: 'Autorizaciones',
    },
    resultadoGeneral: 'Resultado general',
    indice: 'Índice',
    indiceNota: 'Solo visible en esta ficha.',
    deCien: (n: number) => `${n} de 100`,
    respondidas: (n: number, de: number) => `${n} de ${de} preguntas respondidas`,
    motivos: 'Motivos de prioridad',
    sinMotivos: 'Sin prioridad.',
    parcial: 'Resultado parcial: faltaron respuestas para un resultado completo.',
    rutaEspecial: 'Se mostró la ruta de atención especial a la persona.',
    tablaAreas: 'Respuestas por área',
    columnas: {
      numero: 'N.º',
      area: 'Área',
      pregunta: 'Pregunta',
      respuesta: 'Respuesta',
      nivel: 'Nivel',
    },
    sinRespuesta: 'Sin respuesta',
    versiones: (reglas: string, instrumento: string) =>
      `Reglas ${reglas} · Instrumento ${instrumento}`,
    historialUnico: 'Es la única aplicación de esta persona.',
    historialTexto:
      'Aplicaciones de la misma persona (mismo nombre y correo), de la más antigua a la más reciente.',
    estaAplicacion: 'Esta aplicación',
    comparacion: 'Niveles por área en cada aplicación',
    estado: 'Estado',
    asignado: 'Profesional asignado',
    actualizado: 'Última actualización',
    seguimientoFase9:
      'Cambiar el estado, asignar a un profesional y escribir notas llega con la Fase 9.',
    autorizacionesTexto:
      'Lo que la persona autorizó al registrarse, con la versión del texto que aceptó.',
    columnasAutorizacion: { tipo: 'Autorización', version: 'Versión del texto', fecha: 'Aceptada' },
    noExiste: 'Esta aplicación no existe o ya no está disponible.',
  },

  prioritarios: {
    titulo: 'Prioritarios',
    descripcion: 'Casos con prioridad que esperan gestión, del más antiguo al más reciente.',
    columnas: {
      fecha: 'Fecha',
      nombre: 'Nombre',
      modulo: 'Módulo',
      lugar: 'Lugar',
      motivos: 'Motivos de prioridad',
      dias: 'Sin gestión',
      asignado: 'Profesional',
    },
    dias: (n: number) => (n === 0 ? 'Hoy' : `${n} ${n === 1 ? 'día' : 'días'}`),
    verFicha: 'Ver ficha',
    vacioTitulo: 'No hay casos prioritarios pendientes',
    vacioTexto: 'Cuando una aplicación tenga prioridad, aparecerá aquí hasta que se gestione.',
  },
} as const;
