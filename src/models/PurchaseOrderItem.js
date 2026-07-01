const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  purchase_order_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Unidad',
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 19.00,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'purchase_order_items',
  timestamps: true,
  underscored: true,
});

module.exports = PurchaseOrderItem;
