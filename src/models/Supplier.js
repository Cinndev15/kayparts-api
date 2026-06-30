const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  nit_or_cedula: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  razon_social: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assigned_advisor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
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
  tableName: 'suppliers',
  timestamps: true,
  underscored: true,
});

module.exports = Supplier;
