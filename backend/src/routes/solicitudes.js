const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const verifyRoles = require('../middleware/verifyRoles');

// Rutas fijas primero, luego las que llevan /:id
router.get('/mias', verifyRoles('cliente'), solicitudController.getMisSolicitudes);
router.get('/contadores', verifyRoles('admin'), solicitudController.getContadores);

router.get('/', verifyRoles('admin'), solicitudController.getAllSolicitudes);
router.post('/', verifyRoles('cliente'), solicitudController.createSolicitud);

router.get('/:id', solicitudController.getSolicitudById);                               // ambos roles
router.patch('/:id', verifyRoles('cliente'), solicitudController.updateSolicitud);
router.post('/:id/enviar', verifyRoles('cliente'), solicitudController.enviarSolicitud);
router.post('/:id/tomar', verifyRoles('admin'), solicitudController.tomarSolicitud);
router.delete('/:id', verifyRoles('cliente'), solicitudController.deleteSolicitud);

module.exports = router;