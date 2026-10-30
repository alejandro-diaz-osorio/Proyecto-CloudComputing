// Helpers DOM compartidos por LoginForm y RegisterForm (sin framework).
// Convención de marcado: cada mensaje de error es <p data-error-for="campo" id="...-error" hidden>.

/** Muestra u oculta el error de un campo, sincronizando clases y atributos ARIA. */
export function setFieldError(form, campo, mensaje) {
  const input = form.elements.namedItem(campo);
  if (!input || !('setAttribute' in input)) return;

  const err = form.querySelector(`[data-error-for="${campo}"]`);
  const caja = input.closest('.auth-input');
  const field = input.closest('.auth-field');

  if (err) {
    err.textContent = mensaje || '';
    err.hidden = !mensaje;
  }
  field?.classList.toggle('has-error', Boolean(mensaje));
  caja?.classList.toggle('is-invalid', Boolean(mensaje));

  if (mensaje) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');

  // aria-describedby = [id del error si existe] + ids base (p. ej. la pista de contraseña)
  const base = (input.dataset.baseDescribedby ??= input.getAttribute('aria-describedby') ?? '');
  const ids = [mensaje && err ? err.id : null, base].filter(Boolean).join(' ');
  if (ids) input.setAttribute('aria-describedby', ids);
  else input.removeAttribute('aria-describedby');
}

/** Aplica un objeto {campo: mensaje} sobre todos los campos indicados (limpia los que no traen error). */
export function mostrarErrores(form, campos, errores = {}) {
  campos.forEach((c) => setFieldError(form, c, errores[c]));
}

/** Alerta general del formulario. */
export function mostrarAlerta(el, mensaje) {
  if (!el) return;
  el.textContent = mensaje || '';
  el.hidden = !mensaje;
}

/** Estado "enviando" del botón submit (spinner + texto + icono). */
export function setEnviando(boton, enviando) {
  boton.disabled = enviando;
  boton.setAttribute('aria-busy', String(enviando));
  const spinner = boton.querySelector('.auth-spinner');
  const icono = boton.querySelector('[data-icon]');
  const etiqueta = boton.querySelector('[data-label]');
  if (spinner) spinner.hidden = !enviando;
  if (icono) icono.hidden = enviando;
  if (etiqueta) etiqueta.textContent = enviando ? boton.dataset.labelBusy : boton.dataset.labelIdle;
}

/** Enfoca el primer campo con error (el orden de las claves sigue el orden del formulario). */
export function enfocarPrimerError(form, errores) {
  const primero = Object.keys(errores)[0];
  if (!primero) return false;
  form.elements.namedItem(primero)?.focus();
  return true;
}
