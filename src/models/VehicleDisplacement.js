const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VehicleDisplacement = sequelize.define('VehicleDisplacement', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  created_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
}, {
  tableName: 'vehicle_displacements',
});

module.exports = VehicleDisplacement;
