const fs = require('fs');
const multer = require('multer');
const Archivo = require('../model/archivo');
const { ErrorDeNegocio } = require('../utils/manejarError');

const DIR = process.env.UPLOADS_DIR || '/app/uploads';
try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { console.error('No se pudo crear UPLOADS_DIR:', e.message); }

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, DIR),
    // Nombre interno aleatorio: el nombre real solo se guarda en la BD
    filename: (_req, file, cb) => cb(null, Archivo.generarNombreAlmacenado(file.originalname)),
  }),
  limits: { fileSize: Archivo.MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!Archivo.MIME_PERMITIDOS.includes(file.mimetype)) return cb(new ErrorDeNegocio('Solo se permiten archivos PDF', 400));
    cb(null, true);
  },
});

// Campo del formulario: "archivo"
module.exports = (req, res, next) => {
  upload.single('archivo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ mensaje: 'El archivo supera el tamaño máximo (10 MB)' });
    if (err instanceof ErrorDeNegocio) return res.status(err.status).json({ mensaje: err.message });
    return next(err);
  });
};