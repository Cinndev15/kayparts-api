const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  resolution_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  invoice_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  issue_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_nit_or_cedula: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('issued', 'cancelled'),
    defaultValue: 'issued',
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
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
});

module.exports = Invoice;
