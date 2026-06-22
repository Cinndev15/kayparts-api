const { sequelize } = require('../models');

async function recreateTables() {
  try {
    console.log('Dropping dispatches and dispatch_trackings tables to resolve FK constraints...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.query('DROP TABLE IF EXISTS dispatch_trackings;');
    await sequelize.query('DROP TABLE IF EXISTS dispatches;');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('Syncing database...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables recreated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to recreate tables:', error);
    process.exit(1);
  }
}

recreateTables();
