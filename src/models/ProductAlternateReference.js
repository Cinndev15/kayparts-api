const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductAlternateReference = sequelize.define('ProductAlternateReference', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  reference_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'product_alternate_references',
});

module.exports = ProductAlternateReference;
