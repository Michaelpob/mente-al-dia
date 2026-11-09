/**
 * Textos del panel multiinstitucional (D-86): la institución que se está viendo, el enlace de cada
 * institución y las secciones del administrador general: Instituciones, Usuarios y Auditoría.
 */
export const panelInstituciones = {
  alcance: {
    etiqueta: 'Institución',
    todas: 'Todas las instituciones',
    inactiva: (nombre: string) => `${nombre} (inactiva)`,
    viendo: (nombre: string) => `Datos de ${nombre}`,
  },

  /** Tarjeta con el enlace de una institución (tablero e Instituciones). */
  enlace: {
    titulo: 'Enlace para responder',
    texto:
      'Compártelo con las personas de la institución. Lo que respondan con este enlace queda solo en el panel de esta institución.',
    etiqueta: (nombre: string) => `Enlace de ${nombre}`,
    copiar: 'Copiar enlace',
    copiado: 'Enlace copiado.',
    noCopiado: 'No se pudo copiar. Selecciona el enlace y cópialo a mano.',
    inactiva: 'La institución está inactiva: su enlace no recibe cuestionarios.',
  },

  soloGeneral: {
    titulo: 'Esta sección es del administrador general',
    texto: 'Con tu cuenta ves y gestionas la información de tu institución desde el tablero.',
    volver: 'Ir al tablero',
  },

  instituciones: {
    titulo: 'Instituciones',
    descripcion:
      'Cada institución tiene su enlace y su administrador, y solo ve lo suyo. Aquí ves todas juntas.',
    periodo: 'Periodo',
    periodos: {
      todo: 'Todo el tiempo',
      30: 'Últimos 30 días',
      90: 'Últimos 90 días',
      365: 'Últimos 12 meses',
    },
    activa: 'Activa',
    inactiva: 'Inactiva',
    indicadores: {
      cuestionarios: 'Cuestionarios',
      personas: 'Personas',
      prioritarios: 'Prioritarios pendientes',
      visitas: 'Visitas por su enlace',
      administradores: 'Administradores activos',
    },
    ultimo: (fecha: string) => `Último cuestionario: ${fecha}`,
    sinCuestionarios: 'Todavía no hay cuestionarios.',
    verTablero: 'Ver su tablero',
    editar: 'Editar',
    /** Nombre del botón para los lectores de pantalla: empieza con lo que se ve. */
    editarA: (nombre: string) => `Editar ${nombre}`,
    comparacion: {
      titulo: 'Cuestionarios por institución',
      descripcion: 'En el periodo elegido, con la parte de cada institución en el total.',
      personas: 'Personas por institución',
      columnas: {
        institucion: 'Institución',
        cuestionarios: 'Cuestionarios',
        personas: 'Personas',
        prioritarios: 'Prioritarios pendientes',
      },
    },
    totales: (cuestionarios: string, personas: string) =>
      `${cuestionarios} cuestionarios de ${personas} personas en total`,
    vacio: 'Todavía no hay instituciones.',
    formulario: {
      titulo: (nombre: string) => `Editar ${nombre}`,
      descripcion: 'Los cambios quedan en la auditoría.',
      nombre: 'Nombre',
      slug: 'Enlace',
      slugAyuda: 'Lo que va después de «?sede=». Solo minúsculas, números y guiones (3 a 40).',
      slugCambia:
        'Si cambias el enlace, el anterior deja de funcionar: tendrás que compartir el nuevo.',
      activa: 'Institución activa',
      activaAyuda:
        'Inactiva, su enlace no recibe cuestionarios y su administrador no entra al panel. Sus datos se conservan.',
      guardar: 'Guardar cambios',
      guardando: 'Guardando…',
      cancelar: 'Cancelar',
      guardado: (nombre: string) => `Cambios guardados en ${nombre}.`,
      errores: {
        nombre: 'Escribe un nombre de 2 a 120 caracteres.',
        slug: 'Usa solo minúsculas, números y guiones, de 3 a 40 caracteres.',
        repetido: 'Ya hay otra institución con ese enlace.',
        general: 'No se pudieron guardar los cambios. Intenta de nuevo.',
      },
    },
  },

  usuarios: {
    titulo: 'Usuarios',
    descripcion:
      'Las cuentas del panel: el administrador general y el de cada institución. Cada administrador institucional solo ve los datos de su institución.',
    lista: 'Administradores',
    columnas: {
      nombre: 'Nombre',
      rol: 'Rol',
      institucion: 'Institución',
      estado: 'Estado',
      ingreso: 'Último ingreso',
      acciones: 'Acciones',
    },
    roles: {
      superadministrador: 'Administrador general',
      administrador_institucional: 'Administrador institucional',
      profesional: 'Profesional (sin acceso)',
      consulta: 'Consulta (sin acceso)',
    },
    activo: 'Activo',
    inactivo: 'Desactivado',
    tu: 'Tú',
    dobleFactor: 'Verificación en dos pasos activa',
    sinDobleFactor: 'Sin verificación en dos pasos todavía',
    nunca: 'Todavía no ingresa',
    todas: 'Todas',
    activar: 'Activar',
    desactivar: 'Desactivar',
    activarA: (nombre: string) => `Activar a ${nombre}`,
    desactivarA: (nombre: string) => `Desactivar a ${nombre}`,
    cambiarInstitucion: 'Cambiar de institución',
    cambiarInstitucionA: (nombre: string) => `Cambiar de institución a ${nombre}`,
    moverA: (nombre: string) => `Institución de ${nombre}`,
    mover: 'Mover',
    guardado: 'Cambio guardado.',
    errorCambio: 'No se pudo guardar el cambio. Intenta de nuevo.',
    vacio: 'Todavía no hay administradores.',
    invitar: {
      titulo: 'Invitar a un administrador',
      texto:
        'La persona recibe un correo para definir su contraseña y su verificación en dos pasos. El rol y la institución los asigna el servidor.',
      boton: 'Invitar',
      nombre: 'Nombre',
      correo: 'Correo',
      rol: 'Rol',
      institucion: 'Institución',
      elegir: 'Elige una institución',
      enviar: 'Enviar invitación',
      enviando: 'Enviando…',
      cancelar: 'Cancelar',
      enviada: (correo: string) => `Invitación enviada a ${correo}.`,
      errores: {
        nombre: 'Escribe el nombre (2 a 120 caracteres).',
        correo: 'Escribe un correo válido.',
        institucion: 'Elige la institución que va a administrar.',
        conflicto: 'Ese correo ya tiene una cuenta.',
        institucion_invalida: 'La institución no existe o está inactiva.',
        entrada_invalida: 'Revisa los datos de la invitación.',
        sin_permiso:
          'Solo el administrador general, con verificación en dos pasos, invita cuentas.',
        sin_sesion: 'Tu sesión venció. Ingresa de nuevo.',
        error:
          'No se pudo enviar la invitación. Si el correo propio de la plataforma no está activado todavía, los correos no salen.',
      },
    },
  },

  auditoria: {
    titulo: 'Auditoría',
    descripcion:
      'Quién consultó, descargó o cambió qué, y cuándo. Se guarda siempre y nadie la puede editar.',
    accion: 'Acción',
    todas: 'Todas',
    columnas: {
      fecha: 'Fecha y hora',
      actor: 'Quién',
      accion: 'Acción',
      entidad: 'Sobre qué',
      institucion: 'Institución',
      detalle: 'Detalle',
    },
    sistema: 'Sistema',
    sinInstitucion: 'General',
    acciones: {
      crear: 'Creó',
      actualizar: 'Cambió',
      eliminar: 'Eliminó',
      ver_datos_contacto: 'Vio datos de contacto',
      imprimir_ficha: 'Imprimió una ficha',
      exportar_censo: 'Descargó el censo',
      reporte_agregado: 'Generó un reporte agregado',
      reporte_nominal: 'Generó un reporte nominal',
      purgar_datos_vencidos: 'Borró datos vencidos',
    } as Record<string, string>,
    entidades: {
      aplicaciones: 'Cuestionario',
      participantes: 'Participante',
      perfiles: 'Cuenta del panel',
      instituciones: 'Institución',
      configuracion: 'Configuración',
      reglas_resultados: 'Reglas de resultados',
      notas_seguimiento: 'Nota de seguimiento',
      censo: 'Censo',
      cuentas: 'Cuenta pública',
    } as Record<string, string>,
    total: (n: string) => `${n} ${n === '1' ? 'registro' : 'registros'}`,
    vacio: 'No hay registros de auditoría con estos filtros.',
    verDetalle: 'Ver detalle',
  },
} as const;
