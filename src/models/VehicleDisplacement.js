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
}, {
  tableName: 'vehicle_displacements',
});

module.exports = VehicleDisplacement;
