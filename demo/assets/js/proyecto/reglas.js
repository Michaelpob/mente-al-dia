// GENERADO por scripts/sincronizar-demo.mjs desde src/content/v1/reglas.ts. No editar a mano.
/**
 * Reglas de resultados 0.1-provisional.
 * PROVISIONAL — pendiente de validación por el equipo profesional.
 * En la Fase 4 pasan a la tabla de configuración, con versión y nota de validación.
 */
export const reglasProvisionales = {
    version: '0.1-provisional',
    puntos: { si: 2, a_veces: 1, no: 0 },
    umbralFavorable: 80,
    umbralDesafios: 50,
    minRespondidas: 10,
    minRespondidasCompleto: 14,
    ajusteAtencionNoFavorable: 3,
    ajusteAtencionDesafios: 6,
    areasSensibles: [
        'valoracion_respeto',
        'regulacion_emocional',
        'seguridad_entorno',
        'afrontamiento_consumo_sustancias',
    ],
    prioridadPorDesafios: true,
};
