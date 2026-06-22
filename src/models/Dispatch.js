const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Dispatch = sequelize.define('Dispatch', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  carrier_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  tracking_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  responsible_person: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('recibido', 'alistamiento', 'despachado', 'en_transito', 'entregado', 'devuelto', 'cancelado'),
    defaultValue: 'recibido',
  },
  dispatch_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'dispatches',
  timestamps: true,
  underscored: true,
});

module.exports = Dispatch;
