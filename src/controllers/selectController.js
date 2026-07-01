const { Category, ProductBrand, Brand, VehicleModel, VehicleYear, VehicleDisplacement } = require('../models');

exports.categories = async (req, res) => {
  try {
    const list = await Category.findAll({
      attributes: ['id', 'name', 'slug', 'image_path'],
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.productBrands = async (req, res) => {
  try {
    const list = await ProductBrand.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.vehicleBrands = async (req, res) => {
  try {
    const list = await Brand.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.vehicleModels = async (req, res) => {
  try {
    const where = {};
    if (req.query.brand_id) {
      where.brand_id = req.query.brand_id;
    }
    const list = await VehicleModel.findAll({
      attributes: ['id', 'name', 'brand_id'],
      where,
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.vehicleYears = async (req, res) => {
  try {
    const list = await VehicleYear.findAll({
      attributes: ['id', 'year'],
      order: [['year', 'DESC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.vehicleDisplacements = async (req, res) => {
  try {
    const list = await VehicleDisplacement.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
