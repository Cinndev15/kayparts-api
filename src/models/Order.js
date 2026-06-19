const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  order_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed', 'cancelled'),
    defaultValue: 'pending',
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bold_transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shipping_address: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'orders',
});

// Replicate the Bold integrity hash generation
Order.prototype.generateBoldHash = function () {
  const currency = 'COP';
  const secretKey = process.env.BOLD_INTEGRITY_SECRET || '';
  // Replicate exact string: order_number + total_amount + currency + secretKey
  // Since total_amount is decimal, make sure it is formatted with two decimal places if needed.
  // In Laravel, casting to decimal:2 outputs like '150.00' (string representation of the float).
  const formattedAmount = Number(this.total_amount).toFixed(2);
  const stringToHash = `${this.order_number}${formattedAmount}${currency}${secretKey}`;
  return crypto.createHash('sha256').update(stringToHash).digest('hex');
};

module.exports = Order;
