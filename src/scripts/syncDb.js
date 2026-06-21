const { sequelize } = require('../models');

async function syncDatabase() {
  try {
    console.log('Syncing database models with tables...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
}

syncDatabase();
