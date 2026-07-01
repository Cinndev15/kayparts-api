const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoicingResolution = sequelize.define('InvoicingResolution', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  prefix: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  resolution_number: {
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
  resolution_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
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
  tableName: 'invoicing_resolutions',
  timestamps: true,
  underscored: true,
});

module.exports = InvoicingResolution;
