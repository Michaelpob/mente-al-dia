/**
 * Textos de las cuentas públicas (D-77): crear una cuenta, ingresar, recuperar la contraseña y
 * «Mi cuenta». El ingreso es el mismo para el equipo del panel (D-78).
 */
export const cuenta = {
  encabezado: {
    ingresar: 'Ingresar',
    miCuenta: 'Mi cuenta',
    /** Nombre accesible del botón con el nombre de la persona. */
    etiqueta: (nombre: string) => `Mi cuenta: ${nombre}`,
  },

  ingresar: {
    titulo: 'Ingresar',
    descripcion: 'Entra con tu correo y tu contraseña para continuar donde quedaste.',
    correo: 'Correo electrónico',
    contrasena: 'Contraseña',
    boton: 'Ingresar',
    ingresando: 'Ingresando…',
    olvide: '¿Olvidaste tu contraseña?',
    sinCuenta: '¿Todavía no tienes una cuenta?',
    crear: 'Crear una cuenta',
    equipo:
      'Si eres del equipo de Mente al Día, ingresa aquí con tu correo: después te pediremos el código de verificación.',
  },

  recuperar: {
    titulo: 'Recuperar la contraseña',
    texto:
      'Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.',
    boton: 'Enviar el enlace',
    enviando: 'Enviando…',
    enviado:
      'Si ese correo tiene una cuenta, te llegará un enlace en unos minutos. Revisa también la carpeta de correo no deseado.',
    volver: 'Volver a ingresar',
  },

  crear: {
    titulo: 'Crear una cuenta',
    descripcion:
      'Con una cuenta guardas tu progreso y continúas desde cualquier celular, tableta o computador.',
    nombre: 'Nombre completo',
    usuario: 'Nombre de usuario',
    usuarioAyuda:
      'Entre 3 y 30 caracteres: letras minúsculas, números, punto o guion bajo. Empieza con una letra.',
    correo: 'Correo electrónico',
    contrasena: 'Contraseña',
    contrasenaAyuda: 'Al menos 12 caracteres, con mayúsculas, minúsculas y números.',
    confirmar: 'Repite la contraseña',
    mayorDeEdad: 'Tengo 18 años o más.',
    mayorDeEdadAyuda:
      'Si respondes con una niña o un niño, la cuenta es del adulto que lo acompaña.',
    autorizo: 'Autorizo el tratamiento de mis datos personales según la',
    politica: 'política de tratamiento de datos',
    boton: 'Crear mi cuenta',
    creando: 'Creando tu cuenta…',
    confirmaCorreo:
      'Tu cuenta quedó creada. Te enviamos un correo para confirmarla: abre el enlace y después ingresa.',
    bienvenida: 'Tu cuenta quedó creada. Desde ahora tu progreso se guarda en ella.',
    yaTengo: '¿Ya tienes una cuenta?',
    ingresar: 'Ingresar',
  },

  nuevaContrasena: {
    titulo: 'Crea una contraseña nueva',
    texto:
      'Usa al menos 12 caracteres, con mayúsculas, minúsculas y números. No la compartas con nadie.',
    contrasena: 'Contraseña nueva',
    confirmar: 'Repite la contraseña',
    boton: 'Guardar la contraseña',
    guardando: 'Guardando…',
    enlaceVencido:
      'El enlace ya no es válido o venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».',
    pedirOtro: 'Pedir un enlace nuevo',
  },

  miCuenta: {
    titulo: 'Mi cuenta',
    saludo: (nombre: string) => `Hola, ${nombre}`,
    texto: 'Aquí están tus datos y tu progreso. Lo que guardas en tu cuenta solo lo ves tú.',
    datos: 'Tus datos',
    nombre: 'Nombre completo',
    usuario: 'Usuario',
    correo: 'Correo',
    creada: 'Cuenta creada',
    progreso: 'Tu progreso',
    enCurso: 'Cuestionario en curso',
    respondidas: (respondidas: number, total: number) =>
      `${respondidas} de ${total} preguntas respondidas`,
    sinRegistro: 'Falta completar tus datos antes de las preguntas.',
    continuar: 'Continuar donde quedé',
    sinProgreso: 'No tienes un cuestionario en curso.',
    comenzar: 'Comenzar un cuestionario',
    terminados: 'Cuestionarios terminados',
    sinTerminados: 'Cuando termines un cuestionario, su resultado quedará aquí.',
    verResultado: 'Ver el resultado',
    salir: 'Cerrar sesión',
    cargando: 'Cargando tu cuenta…',
    error: 'No pudimos cargar tu cuenta. Revisa tu conexión e inténtalo de nuevo.',
    reintentar: 'Intentar de nuevo',
    esEquipo: 'Esta es una cuenta del equipo de Mente al Día.',
    irPanel: 'Ir al panel de administración',
  },

  errores: {
    revisar: 'Revisa los campos marcados.',
    nombre: 'Escribe tu nombre completo (al menos 3 caracteres).',
    usuario:
      'El usuario debe tener entre 3 y 30 caracteres (letras minúsculas, números, punto o guion bajo) y empezar con una letra.',
    usuarioTomado: 'Ese usuario ya existe. Prueba con otro.',
    correo: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    contrasena:
      'La contraseña debe tener al menos 12 caracteres, con mayúsculas, minúsculas y números.',
    confirmar: 'Las contraseñas no coinciden.',
    mayorDeEdad: 'Para crear una cuenta debes tener 18 años o más.',
    autorizo: 'Para crear una cuenta debes autorizar el tratamiento de tus datos.',
    obligatorio: 'Este campo es obligatorio.',
    correoTomado: 'Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.',
    credenciales: 'El correo o la contraseña no son correctos.',
    registroCerrado:
      'Todavía no se pueden crear cuentas nuevas en la plataforma. Inténtalo de nuevo más tarde.',
    muchosIntentos: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
    contrasenaDebil: 'Esa contraseña es fácil de adivinar. Elige otra.',
    conexion: 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
    general: 'Algo salió mal. Inténtalo de nuevo en unos minutos.',
  },
};
