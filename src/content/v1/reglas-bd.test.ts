import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reglasProvisionales } from './reglas';

const carpeta = join(__dirname, '../../../supabase/migrations');

describe('reglas iniciales de la base de datos', () => {
  it('la migración carga las mismas reglas 0.1-provisional que src/content/v1/reglas.ts', () => {
    const sql = readdirSync(carpeta)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(carpeta, f), 'utf8'))
      .join('\n');
    const json = sql.match(/\$json\$([\s\S]*?)\$json\$/)?.[1];
    expect(json).toBeDefined();
    expect(JSON.parse(json!)).toEqual(reglasProvisionales);
  });
});
