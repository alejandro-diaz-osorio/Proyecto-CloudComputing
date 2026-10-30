const bcrypt = require('bcryptjs');
const Usuario = require('../model/usuario');
const { emailRegex, esIdValido, textoOpcional } = require('../utils/validar');
const { manejarError } = require('../utils/manejarError');

// Perfil del usuario autenticado
const getPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.status(200).json(usuario);
  } catch (error) {
    manejarError(res, error, 'Error al obtener el perfil');
  }
};

const updatePerfil = async (req, res) => {
  try {
    const { nombre, apellido, telefono } = req.body;
    if (!nombre?.trim() || !apellido?.trim()) {
      return res.status(400).json({ mensaje: 'Nombre y apellido son obligatorios' });
    }
    await Usuario.update(req.usuario.id, { nombre: nombre.trim(), apellido: apellido.trim(), telefono: textoOpcional(telefono) });
    res.json({ mensaje: 'Perfil actualizado exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al actualizar el perfil');
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ mensaje: 'La contraseña actual y la nueva son obligatorias' });
    }
    if (String(passwordNueva).length < 8) {
      return res.status(400).json({ mensaje: 'La contraseña nueva debe tener al menos 8 caracteres' });
    }

    const actual = await Usuario.findById(req.usuario.id);
    const conHash = await Usuario.findByEmail(actual.email);
    if (!(await bcrypt.compare(String(passwordActual), conHash.password_hash))) {
      return res.status(401).json({ mensaje: 'La contraseña actual no es correcta' });
    }

    await Usuario.actualizarPassword(req.usuario.id, await bcrypt.hash(String(passwordNueva), 12));
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al cambiar la contraseña');
  }
};

// ── Solo administradoras ──────────────────────────────────────

const getAllUsuarios = async (req, res) => {
  try {
    const { rol } = req.query;
    if (rol && !['cliente', 'admin'].includes(rol)) {
      return res.status(400).json({ mensaje: 'El rol debe ser cliente o admin' });
    }
    res.status(200).json(await Usuario.findAll(rol || null));
  } catch (error) {
    manejarError(res, error, 'Error al obtener usuarios');
  }
};

const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.status(200).json(usuario);
  } catch (error) {
    manejarError(res, error, 'Error al obtener usuario');
  }
};

// Crea una cuenta de administradora
const createAdministradora = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;
    if (!nombre?.trim() || !apellido?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ mensaje: 'Nombre, apellido, email y contraseña son obligatorios' });
    }
    if (!emailRegex.test(email)) return res.status(400).json({ mensaje: 'El formato del email no es válido' });
    if (String(password).length < 8) return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
    if (await Usuario.existeEmail(email)) return res.status(409).json({ mensaje: 'Ya existe una cuenta con este email' });

    const id = await Usuario.create({
      nombre: nombre.trim(), apellido: apellido.trim(), email,
      password_hash: await bcrypt.hash(String(password), 12), telefono: textoOpcional(telefono), rol: 'admin',
    });
    res.status(201).json({ mensaje: 'Administradora creada exitosamente', id });
  } catch (error) {
    manejarError(res, error, 'Error al crear administradora');
  }
};

// Activar / desactivar (los usuarios no se borran)
const setActivoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });
    if (typeof activo !== 'boolean') return res.status(400).json({ mensaje: 'El campo activo debe ser true o false' });
    if (Number(id) === req.usuario.id) return res.status(409).json({ mensaje: 'No puedes desactivar tu propia cuenta' });
    if (!(await Usuario.findById(id))) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    await Usuario.setActivo(id, activo);
    res.json({ mensaje: activo ? 'Usuario activado' : 'Usuario desactivado' });
  } catch (error) {
    manejarError(res, error, 'Error al cambiar el estado del usuario');
  }
};

module.exports = { getPerfil, updatePerfil, cambiarPassword, getAllUsuarios, getUsuarioById, createAdministradora, setActivoUsuario };