// GENERADO por scripts/sincronizar-demo.mjs desde src/content/lineas-ayuda.ts. No editar a mano.
export const lineasAyudaMeta = {
    version: '1.0',
    fuente: 'ejemplo',
    nota: 'Valores de ejemplo para Colombia; confirmar con la Secretaría de Salud antes del lanzamiento.',
};
export const lineasAyuda = [
    {
        id: 'emergencias',
        numero: '123',
        nombre: 'Línea de emergencias',
        atiende: 'Cualquier situación de peligro inmediato',
        horario: '24 horas',
        cobertura: 'Nacional',
        estado: 'verificada',
        activa: true,
    },
    {
        id: 'icbf',
        numero: '141',
        nombre: 'Línea ICBF',
        atiende: 'Protección de niñas, niños y adolescentes',
        horario: '24 horas, gratuita',
        cobertura: 'Nacional',
        estado: 'verificada',
        activa: true,
    },
    {
        id: 'linea-155',
        numero: '155',
        nombre: 'Línea 155',
        atiende: 'Orientación a mujeres víctimas de violencia',
        horario: '24 horas',
        cobertura: 'Nacional',
        estado: 'verificada',
        activa: true,
    },
    {
        id: 'salud-mental-local',
        numero: '[LÍNEA DE SALUD MENTAL LOCAL]',
        nombre: 'Línea de salud mental del municipio o departamento',
        atiende: 'Escucha y orientación en salud mental',
        horario: '[COMPLETAR]',
        cobertura: '[MUNICIPIO]',
        estado: 'completar',
        activa: true,
    },
    {
        id: 'linea-106',
        numero: '106',
        nombre: 'Línea 106 «El poder de ser escuchado»',
        atiende: 'Escucha y orientación (incluye niñas, niños y adolescentes)',
        horario: '[VERIFICAR]',
        cobertura: 'Solo Bogotá: activar únicamente si aplica',
        estado: 'opcional',
        activa: false,
    },
    {
        id: 'servicio-salud',
        numero: '[DIRECCIÓN Y TELÉFONO]',
        nombre: 'Servicio de salud más cercano / Secretaría de Salud',
        atiende: 'Atención presencial y rutas de atención',
        horario: '[COMPLETAR]',
        cobertura: '[MUNICIPIO]',
        estado: 'completar',
        activa: true,
    },
];
export const lineasActivas = lineasAyuda.filter((linea) => linea.activa);
/** Solo los números reales se pueden marcar con un enlace tel:. */
export function esMarcable(numero) {
    return /^\d{3,10}$/.test(numero);
}
