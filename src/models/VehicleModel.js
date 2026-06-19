const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VehicleModel = sequelize.define('VehicleModel', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  brand_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  year_from: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  year_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  image_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'vehicle_models',
});

module.exports = VehicleModel;
