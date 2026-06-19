const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VehicleYear = sequelize.define('VehicleYear', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'vehicle_years',
});

module.exports = VehicleYear;
