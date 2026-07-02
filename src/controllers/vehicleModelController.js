const { sequelize, VehicleModel, Brand } = require('../models');

// Download CSV Template for Vehicle Models
exports.downloadTemplate = (req, res) => {
  const headers = ['name', 'brand_id', 'image_path'];
  const sampleRow = ['Prado', '1', 'vehicle_models/prado.png'];
  const csvContent = headers.join(',') + '\n' + sampleRow.join(',') + '\n';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=kayparts_vehicle_models_template.csv');
  return res.status(200).send(csvContent);
};

// Export Vehicle Brands CSV
exports.exportBrands = async (req, res) => {
  try {
    const brands = await Brand.findAll({
      attributes: ['id', 'name', 'image_path'],
      order: [['name', 'ASC']]
    });

    const headers = ['id', 'name', 'image_path'];
    let csvContent = headers.join(',') + '\n';
    
    brands.forEach(b => {
      const name = b.name.includes(',') ? `"${b.name}"` : b.name;
      csvContent += `${b.id},${name},${b.image_path || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=kayparts_brands_export.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ message: 'Error al exportar marcas: ' + error.message });
  }
};

// Import Vehicle Models from CSV
exports.importModels = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un archivo CSV.' });
    }

    const fileContent = req.file.buffer.toString('utf8');

    // Parse CSV
    const lines = fileContent.split(/\r?\n/);
    if (lines.length === 0) {
      return res.status(400).json({ message: 'El archivo CSV está vacío.' });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = [];
      let currentVal = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] !== undefined ? values[index] : '';
      });
      rows.push(row);
    }

    let importedCount = 0;
    const errors = [];

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2;

        if (!row.name || !row.brand_id) {
          errors.push(`Línea ${lineNum}: name y brand_id son campos obligatorios.`);
          continue;
        }

        const brandId = parseInt(row.brand_id, 10);
        const brand = await Brand.findByPk(brandId, { transaction: t });
        if (!brand) {
          errors.push(`Línea ${lineNum}: La marca con ID '${row.brand_id}' no existe.`);
          continue;
        }

        await VehicleModel.create({
          name: row.name,
          brand_id: brandId,
          image_path: row.image_path || null,
          created_by: req.user ? req.user.id : null
        }, { transaction: t });

        importedCount++;
      }
    });

    if (importedCount === 0 && errors.length > 0) {
      return res.status(422).json({
        message: 'No se pudo importar ningún modelo.',
        errors
      });
    }

    return res.status(200).json({
      message: `Se importaron ${importedCount} modelos exitosamente.`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error durante la importación: ' + error.message });
  }
};
