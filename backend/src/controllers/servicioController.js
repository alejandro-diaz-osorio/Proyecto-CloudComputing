const Servicio = require('../model/servicio');
const { esIdValido } = require('../utils/validar');
const { manejarError } = require('../utils/manejarError');

// Catálogo completo (incluye inactivos) para la administración
const getAllServicios = async (req, res) => {
  try {
    res.status(200).json(await Servicio.findAll());
  } catch (error) {
    manejarError(res, error, 'Error al obtener servicios');
  }
};

const createServicio = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    if (nombre.trim().length > 80) return res.status(400).json({ mensaje: 'El nombre no puede superar 80 caracteres' });
    if (await Servicio.existeNombre(nombre)) return res.status(409).json({ mensaje: 'Ya existe un servicio con ese nombre' });

    const id = await Servicio.create({ nombre });
    res.status(201).json({ mensaje: 'Servicio creado exitosamente', id });
  } catch (error) {
    manejarError(res, error, 'Error al crear servicio');
  }
};

const updateServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    if (activo !== undefined && typeof activo !== 'boolean') return res.status(400).json({ mensaje: 'El campo activo debe ser true o false' });

    const existente = await Servicio.findById(id);
    if (!existente) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    if (await Servicio.existeNombre(nombre, id)) return res.status(409).json({ mensaje: 'Ya existe otro servicio con ese nombre' });

    await Servicio.update(id, { nombre, activo: activo === undefined ? existente.activo : (activo ? 1 : 0) });
    res.json({ mensaje: 'Servicio actualizado exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al actualizar servicio');
  }
};

module.exports = { getAllServicios, createServicio, updateServicio };