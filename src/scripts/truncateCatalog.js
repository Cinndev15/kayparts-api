require('dotenv').config();
const sequelize = require('../config/database');

const truncateTables = async () => {
  try {
    console.log('⚠️  Iniciando limpieza de tablas...');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('🔓 Foreign key checks desactivados.');

    const tables = [
      // Tablas de compatibilidad y relaciones de productos (primero)
      'product_vehicle_model',
      'product_vehicle_year',
      'product_vehicle_displacement',
      'product_compatibility',
      'product_tax',
      'product_images',
      'product_criteria',
      'product_alternate_references',
      'order_items',
      'user_addresses',
      'personal_access_tokens',
      // Tablas principales
      'products',
      'product_brands',
      'subcategories',
      'categories',
      'vehicle_displacements',
      'vehicle_years',
      'vehicle_models',
      'brands',
      'users'
    ];

    for (const table of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`✅ Tabla \`${table}\` limpiada y AUTO_INCREMENT reiniciado.`);
    }

    // Recrear usuario administrador de producción
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('Fergoga0803', 12);
    await sequelize.query(
      `INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
      { replacements: ['Fernando Gonzalez', 'fgonzalez@kayparts.co', passwordHash] }
    );
    console.log('👤 Administrador (fgonzalez@kayparts.co) recreado exitosamente.');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('🔒 Foreign key checks reactivados.');
    console.log('\n🎉 Limpieza completada exitosamente. Todos los índices han sido reiniciados a 1.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

truncateTables();
