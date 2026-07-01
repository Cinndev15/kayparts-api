const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrderSequence = sequelize.define('PurchaseOrderSequence', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prefix: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  start_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  end_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  current_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'purchase_order_sequences',
  timestamps: true,
  underscored: true,
});

module.exports = PurchaseOrderSequence;
