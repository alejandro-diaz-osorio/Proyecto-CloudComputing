// Añade el header que permite enviar cookies/credenciales desde orígenes permitidos.
const permitidos = (process.env.CORS_ORIGINS || 'http://localhost:8080')
  .split(',').map((o) => o.trim());

module.exports = (req, res, next) => {
  if (permitidos.includes(req.headers.origin)) {
    res.header('Access-Control-Allow-Credentials', true);
  }
  next();
};