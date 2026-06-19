const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PersonalAccessToken = sequelize.define('PersonalAccessToken', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  tokenable_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tokenable_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  abilities: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'personal_access_tokens',
});

module.exports = PersonalAccessToken;
