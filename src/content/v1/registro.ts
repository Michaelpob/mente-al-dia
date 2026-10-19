// GENERADO por scripts/generar-contenido.mjs desde fuente/mente-al-dia-contenido.json.
// No editar a mano: cambia el JSON fuente (con validación del equipo profesional) y vuelve a generar.

/** Campos del registro de adultos. DOCUMENTO BASE. */
export const camposRegistroAdulto = [
  'Nombre completo',
  'Correo electrónico',
  'Número de teléfono',
  'Lugar de residencia',
] as const;

/** Encabezado del cuestionario infantil. DOCUMENTO BASE. */
export const camposRegistroNino = [
  'Nombre',
  'Edad',
  'Grado',
  '¿Con qué sexo se identifica? (Hombre / Mujer)',
] as const;

/** Datos del adulto responsable. PROPUESTA. */
export const camposAcudiente = [
  'Nombre',
  'Parentesco',
  'Correo electrónico',
  'Teléfono',
  'Lugar de residencia',
] as const;
