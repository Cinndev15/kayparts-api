const bcrypt = require('bcryptjs');
const { User, UserAddress } = require('../models');
const { Op } = require('sequelize');

exports.index = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: UserAddress, as: 'addresses' }],
      order: [['created_at', 'DESC']]
    });
    return res.json({ data: users });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.show = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: UserAddress, as: 'addresses' }]
    });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    return res.json({ data: user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(422).json({
        message: 'El nombre, email y contraseña son obligatorios.',
        errors: {
          name: !name ? ['El campo nombre es obligatorio.'] : [],
          email: !email ? ['El campo email es obligatorio.'] : [],
          password: !password ? ['El campo contraseña es obligatorio.'] : []
        }
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(422).json({
        message: 'El correo electrónico ya ha sido registrado.',
        errors: { email: ['El correo electrónico ya ha sido registrado.'] }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      password: passwordHash
    });

    return res.status(201).json({ data: user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const { name, email, phone, password } = req.body;

    if (!name || !email) {
      return res.status(422).json({
        message: 'El nombre y email son obligatorios.',
        errors: {
          name: !name ? ['El campo nombre es obligatorio.'] : [],
          email: !email ? ['El campo email es obligatorio.'] : []
        }
      });
    }

    // Check email unique ignoring current user
    const existing = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: user.id }
      }
    });

    if (existing) {
      return res.status(422).json({
        message: 'El correo electrónico ya ha sido registrado.',
        errors: { email: ['El correo electrónico ya ha sido registrado.'] }
      });
    }

    const updateData = { name, email, phone };
    if (password && password.length >= 8) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await user.update(updateData);

    return res.json({ data: user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    await user.destroy();
    return res.json({ message: 'Usuario eliminado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
