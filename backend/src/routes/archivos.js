const express = require('express');
const router = express.Router();
const archivoController = require('../controllers/archivoController');
const upload = require('../middleware/upload');

router.get('/solicitud/:solicitudId', archivoController.getArchivosBySolicitud);
router.post('/solicitud/:solicitudId', upload, archivoController.subirArchivo);   // multipart, campo "archivo"
router.get('/:id/descargar', archivoController.descargarArchivo);
router.delete('/:id', archivoController.deleteArchivo);

module.exports = router;