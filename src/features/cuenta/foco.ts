/** Lleva el foco al primer campo con error del formulario, para corregirlo enseguida. */
export function enfocarPrimerError(formulario: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    formulario?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
