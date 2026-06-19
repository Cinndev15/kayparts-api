const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCriterion = sequelize.define('ProductCriterion', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'product_criteria',
});

module.exports = ProductCriterion;
