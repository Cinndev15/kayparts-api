const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  invoice_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  product_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'invoice_items',
  timestamps: true,
  underscored: true,
});

module.exports = InvoiceItem;
