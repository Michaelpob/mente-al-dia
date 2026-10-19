/** Cola de avisos breves (toast). Se usa con toast({ title }) desde cualquier parte. */
export type ToastTone = 'info' | 'exito' | 'apoyo';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

type ToastInput = Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone };

let items: readonly ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function toast(input: ToastInput): void {
  items = [...items, { tone: 'info', ...input, id: nextId++ }];
  emit();
}

export function dismissToast(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): readonly ToastItem[] {
  return items;
}
