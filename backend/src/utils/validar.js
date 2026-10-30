const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esIdValido = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// '' / undefined / null → null; si no, el texto sin espacios sobrantes
const textoOpcional = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

// '' / undefined / null → null; si no, Number (puede dar NaN: el llamador lo valida)
const numeroOpcional = (v) => {
  if (v === undefined || v === null || v === '') return null;
  return Number(v);
};

// Contraseña: mismos requisitos que el formulario de registro del frontend
// (mínimo 8, una mayúscula y un número). Máximo 72 bytes: bcrypt ignora lo que pase de ahí.
// Devuelve el mensaje de error, o null si es válida.
const validarPassword = (password) => {
  const p = String(password ?? '');
  if (p.length < 8 || !/[A-ZÁÉÍÓÚÑ]/.test(p) || !/\d/.test(p)) {
    return 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número';
  }
  if (Buffer.byteLength(p, 'utf8') > 72) {
    return 'La contraseña es demasiado larga (máximo 72 bytes)';
  }
  return null;
};

// Teléfono: dígitos, +, espacios, paréntesis y guiones (columna usuarios.telefono = VARCHAR(25))
const telefonoRegex = /^[0-9+\s()-]{7,25}$/;

module.exports = { emailRegex, esIdValido, textoOpcional, numeroOpcional, validarPassword, telefonoRegex };
