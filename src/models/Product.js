const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  brand_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  supplier_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  category_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  subcategory_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
  },
  condition: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  spare_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  side: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transmission: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
  tableName: 'products',
  paranoid: true, // Enables SoftDeletes
  deletedAt: 'deleted_at',
});

module.exports = Product;
