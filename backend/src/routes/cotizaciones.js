const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const verifyRoles = require('../middleware/verifyRoles');

router.get('/solicitud/:solicitudId', cotizacionController.getCotizacionesBySolicitud);                  // ambos roles
router.post('/solicitud/:solicitudId', verifyRoles('admin'), cotizacionController.createCotizacion);

router.get('/:id', cotizacionController.getCotizacionById);                                               // ambos roles
router.patch('/:id', verifyRoles('admin'), cotizacionController.updateCotizacion);
router.post('/:id/enviar', verifyRoles('admin'), cotizacionController.enviarCotizacion);
router.post('/:id/confirmar', verifyRoles('cliente'), cotizacionController.confirmarCotizacion);
router.delete('/:id', verifyRoles('admin'), cotizacionController.deleteCotizacion);

module.exports = router;