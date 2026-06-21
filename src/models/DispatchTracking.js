const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DispatchTracking = sequelize.define('DispatchTracking', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  dispatch_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('recibido', 'alistamiento', 'despachado', 'en_transito', 'entregado', 'devuelto', 'cancelado'),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'dispatch_trackings',
  timestamps: true,
  underscored: true,
});

module.exports = DispatchTracking;
