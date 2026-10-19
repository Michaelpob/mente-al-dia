import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';
import { Field } from './field';
import { fieldControlClasses } from './field-styles';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  label: string;
  options: readonly ComboboxOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

/** Quita tildes y mayúsculas para que «bogota» encuentre «Bogotá». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Lista desplegable con búsqueda (por ejemplo, el lugar de residencia). */
export function Combobox({
  label,
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText = textos.combobox.sinResultados,
  hint,
  error,
  required,
  disabled,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const listId = `lista-${useId()}`;
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {({ controlId, labelId, describedBy, invalid }) => (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              id={controlId}
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-haspopup="listbox"
              aria-labelledby={`${labelId} ${controlId}`}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              aria-required={required || undefined}
              disabled={disabled}
              className={cn(
                fieldControlClasses,
                'flex items-center justify-between gap-3 text-left',
              )}
            >
              <span className={cn('truncate', !selected && 'text-grafito-500')}>
                {selected?.label ?? placeholder}
              </span>
              <ChevronsUpDown aria-hidden className="size-5 shrink-0 text-grafito-600" />
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              sideOffset={6}
              className="z-50 w-(--radix-popover-trigger-width) min-w-64 rounded-md border border-piedra-200 bg-blanco p-1 shadow-3 data-[state=open]:animate-dialogo-entrar"
            >
              <Command
                label={label}
                filter={(itemValue, search) =>
                  normalizar(itemValue).includes(normalizar(search)) ? 1 : 0
                }
              >
                <div className="flex items-center gap-2 border-b border-piedra-200 px-3 pb-1">
                  <Search aria-hidden className="size-4 shrink-0 text-grafito-600" />
                  <Command.Input
                    placeholder={searchPlaceholder}
                    className="min-h-11 w-full rounded-sm bg-transparent text-cuerpo text-grafito-900"
                  />
                </div>
                <Command.List id={listId} className="max-h-64 overflow-y-auto py-1">
                  <Command.Empty className="px-3 py-3 text-pequeno text-grafito-600">
                    {emptyText}
                  </Command.Empty>
                  {options.map((option) => (
                    <Command.Item
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-grafito-900 data-[selected=true]:bg-pizarra-100 data-[selected=true]:text-pizarra-800"
                    >
                      <Check
                        aria-hidden
                        className={cn(
                          'size-4 shrink-0',
                          option.value === value ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {option.label}
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </Field>
  );
}
