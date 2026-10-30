// Falla rápido si falta una variable de entorno crítica.
const REQUERIDAS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];

module.exports = function validateEnv() {
  const faltan = REQUERIDAS.filter((k) => !process.env[k]);
  if (faltan.length) {
    console.error(`✖ Faltan variables de entorno: ${faltan.join(', ')}`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('✖ JWT_SECRET debe tener al menos 32 caracteres en producción');
    process.exit(1);
  }
};