const { WorkshopApplication } = require('../models');

exports.store = async (req, res) => {
  try {
    const {
      workshop_name, nit, owner_name, email, phone, department, city, address, specialties
    } = req.body;

    if (!workshop_name || !owner_name || !email || !phone || !department || !city || !address) {
      return res.status(422).json({ message: 'Campos requeridos faltantes.' });
    }

    const application = await WorkshopApplication.create({
      workshop_name,
      nit,
      owner_name,
      email,
      phone,
      department,
      city,
      address,
      specialties,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Solicitud enviada exitosamente',
      application,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
