const bcrypt = require('bcryptjs');
const Usuario = require('../model/usuario');
const { emailRegex, esIdValido, textoOpcional, validarPassword, telefonoRegex } = require('../utils/validar');
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
    if (!nombre?.trim()) {
      return res.status(400).json({ mensaje: 'Nombre es obligatorio' });
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

// ── Administración de usuarios ────────────────────────────────

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

const validarDatosGestion = (body, { passwordObligatoria = false, rolForzado = null } = {}) => {
  const nombre = String(body?.nombre ?? '').trim();
  const apellido = String(body?.apellido ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const telefono = textoOpcional(body?.telefono);
  const rol = rolForzado || String(body?.rol ?? '');

  if (!nombre || !apellido || !email || (passwordObligatoria && !password)) {
    return { error: passwordObligatoria
      ? 'Nombre, apellido, email y contraseña son obligatorios'
      : 'Nombre, apellido y email son obligatorios' };
  }
  if (nombre.length > 80 || apellido.length > 80) {
    return { error: 'El nombre y el apellido no pueden superar 80 caracteres' };
  }
  if (email.length > 190) return { error: 'El email no puede superar 190 caracteres' };
  if (!emailRegex.test(email)) return { error: 'El formato del email no es válido' };
  if (!['cliente', 'admin'].includes(rol)) return { error: 'El rol debe ser cliente o admin' };
  if (telefono !== null && !telefonoRegex.test(telefono)) {
    return { error: 'El teléfono no es válido (máximo 25 caracteres: dígitos, +, espacios)' };
  }
  if (password) {
    const errorPassword = validarPassword(password);
    if (errorPassword) return { error: errorPassword };
  }

  return { datos: { nombre, apellido, email, password, telefono, rol } };
};

const crearUsuario = async (req, res, rolForzado = null) => {
  try {
    const { datos, error } = validarDatosGestion(req.body, { passwordObligatoria: true, rolForzado });
    if (error) return res.status(400).json({ mensaje: error });
    if (await Usuario.existeEmail(datos.email)) return res.status(409).json({ mensaje: 'Ya existe una cuenta con este email' });

    const id = await Usuario.create({
      ...datos,
      password_hash: await bcrypt.hash(datos.password, 12),
      emailVerificado: true,
    });
    res.status(201).json({ mensaje: 'Usuario creado exitosamente', id });
  } catch (error) {
    manejarError(res, error, 'Error al crear usuario');
  }
};

const createUsuario = (req, res) => crearUsuario(req, res);
// Se conserva la ruta anterior para no romper integraciones existentes.
const createAdministradora = (req, res) => crearUsuario(req, res, 'admin');

const tieneOtroAdminActivo = async (usuario) => {
  if (usuario.rol !== 'admin' || !usuario.activo) return true;
  const administradores = await Usuario.findAdmins();
  return administradores.some((admin) => Number(admin.id) !== Number(usuario.id));
};

const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });

    const { datos, error } = validarDatosGestion(req.body);
    if (error) return res.status(400).json({ mensaje: error });
    const actual = await Usuario.findById(id);
    if (!actual) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (Number(id) === Number(req.usuario.id) && datos.rol !== 'admin') {
      return res.status(409).json({ mensaje: 'No puedes cambiar el rol de tu propia cuenta' });
    }
    if (actual.rol === 'admin' && actual.activo && datos.rol !== 'admin' && !(await tieneOtroAdminActivo(actual))) {
      return res.status(409).json({ mensaje: 'Debe existir al menos un administrador activo' });
    }
    if (await Usuario.existeEmail(datos.email, id)) {
      return res.status(409).json({ mensaje: 'Ya existe una cuenta con este email' });
    }

    await Usuario.updateGestion(id, {
      ...datos,
      password_hash: datos.password ? await bcrypt.hash(datos.password, 12) : null,
    });
    res.json({ mensaje: 'Usuario actualizado exitosamente' });
  } catch (error) {
    manejarError(res, error, 'Error al actualizar usuario');
  }
};

// Las cuentas se desactivan en vez de borrarse para conservar su historial.
const actualizarEstadoUsuario = async (req, res, activo) => {
  try {
    const { id } = req.params;
    if (!esIdValido(id)) return res.status(400).json({ mensaje: 'El ID no es válido' });
    if (!activo && Number(id) === Number(req.usuario.id)) return res.status(409).json({ mensaje: 'No puedes desactivar tu propia cuenta' });
    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (!activo && usuario.rol === 'admin' && usuario.activo && !(await tieneOtroAdminActivo(usuario))) {
      return res.status(409).json({ mensaje: 'Debe existir al menos un administrador activo' });
    }

    await Usuario.setActivo(id, activo);
    res.json({ mensaje: activo ? 'Usuario activado' : 'Usuario desactivado' });
  } catch (error) {
    manejarError(res, error, 'Error al cambiar el estado del usuario');
  }
};

const setActivoUsuario = (req, res) => {
  const { activo } = req.body;
  if (typeof activo !== 'boolean') return res.status(400).json({ mensaje: 'El campo activo debe ser true o false' });
  return actualizarEstadoUsuario(req, res, activo);
};

const deleteUsuario = (req, res) => actualizarEstadoUsuario(req, res, false);

module.exports = {
  getPerfil,
  updatePerfil,
  cambiarPassword,
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  createAdministradora,
  updateUsuario,
  setActivoUsuario,
  deleteUsuario,
};