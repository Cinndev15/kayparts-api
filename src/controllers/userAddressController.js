const { UserAddress } = require('../models');

exports.index = async (req, res) => {
  try {
    const addresses = await req.user.getAddresses({ order: [['is_primary', 'DESC']] });
    return res.json(addresses);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const {
      alias, recipient_name, phone, department, city, address_line_1, address_line_2, additional_info, is_primary
    } = req.body;

    if (!recipient_name || !phone || !department || !city || !address_line_1) {
      return res.status(422).json({ message: 'Campos requeridos faltantes.' });
    }

    const count = await UserAddress.count({ where: { user_id: req.user.id } });
    
    let isPrimary = is_primary === true || is_primary === 'true';
    if (count === 0) {
      isPrimary = true;
    }

    if (isPrimary) {
      // Set all other addresses of this user as NOT primary
      await UserAddress.update({ is_primary: false }, { where: { user_id: req.user.id } });
    }

    const address = await UserAddress.create({
      user_id: req.user.id,
      alias,
      recipient_name,
      phone,
      department,
      city,
      address_line_1,
      address_line_2,
      additional_info,
      is_primary: isPrimary
    });

    return res.status(201).json({
      message: 'Dirección creada exitosamente',
      address
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const address = await UserAddress.findByPk(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const {
      alias, recipient_name, phone, department, city, address_line_1, address_line_2, additional_info
    } = req.body;

    await address.update({
      alias, recipient_name, phone, department, city, address_line_1, address_line_2, additional_info
    });

    return res.json({
      message: 'Dirección actualizada exitosamente',
      address
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const address = await UserAddress.findByPk(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const wasPrimary = address.is_primary;
    await address.destroy();

    if (wasPrimary) {
      const nextAddress = await UserAddress.findOne({
        where: { user_id: req.user.id },
        order: [['id', 'ASC']]
      });
      if (nextAddress) {
        nextAddress.is_primary = true;
        await nextAddress.save();
      }
    }

    return res.json({ message: 'Dirección eliminada' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.setPrimary = async (req, res) => {
  try {
    const address = await UserAddress.findByPk(req.params.id);
    if (!address) {
      return res.status(404).json({ message: 'Dirección no encontrada' });
    }

    if (address.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await UserAddress.update({ is_primary: false }, { where: { user_id: req.user.id } });
    address.is_primary = true;
    await address.save();

    return res.json({ message: 'Dirección principal actualizada' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
