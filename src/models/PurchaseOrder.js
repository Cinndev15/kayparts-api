const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  po_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  sequence_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  supplier_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  issue_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expected_delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'),
    defaultValue: 'draft',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'purchase_orders',
  timestamps: true,
  underscored: true,
});

module.exports = PurchaseOrder;
