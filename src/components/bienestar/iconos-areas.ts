import {
  BatteryCharging,
  CalendarCheck,
  Compass,
  Focus,
  Footprints,
  HandHeart,
  Heart,
  HeartHandshake,
  LifeBuoy,
  Moon,
  Mountain,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Users,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { DimensionId } from '@/types/dominio';

/**
 * Íconos de las 20 áreas (nombre de Lucide en src/content/v1/areas.ts).
 * Se importan uno por uno para no cargar toda la librería; si cambia un ícono en el contenido,
 * agrégalo aquí (lo verifica rueda.test.ts).
 */
export const iconosAreas: Record<string, LucideIcon> = {
  BatteryCharging,
  CalendarCheck,
  Compass,
  Focus,
  Footprints,
  HandHeart,
  Heart,
  HeartHandshake,
  LifeBuoy,
  Moon,
  Mountain,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Users,
  Waves,
  Wind,
};

/** Tono decorativo de cada dimensión (tokens --dimension-*). */
export const tonoDimension: Record<DimensionId, string> = {
  emociones_mente: 'var(--dimension-emociones)',
  cuerpo_energia: 'var(--dimension-cuerpo)',
  vinculos_apoyo: 'var(--dimension-vinculos)',
  afrontamiento: 'var(--dimension-afrontamiento)',
  proyecto_vida_entorno: 'var(--dimension-proyecto)',
};
