// Orígenes permitidos separados por coma en CORS_ORIGINS
// ej: CORS_ORIGINS=http://localhost:8080,https://test.solucia.com.co
const permitidos = (process.env.CORS_ORIGINS || 'http://localhost:8080')
  .split(',').map((o) => o.trim()).filter(Boolean);

module.exports = {
  origin(origin, cb) {
    // sin origin = peticiones del mismo dominio (nginx) o herramientas como curl/Postman
    if (!origin || permitidos.includes(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};