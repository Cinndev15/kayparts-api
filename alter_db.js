const { sequelize } = require('./src/models');

async function alterDb() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    await sequelize.query('ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255) NULL AFTER apple_id;');
    console.log('Column facebook_id added successfully.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

alterDb();
