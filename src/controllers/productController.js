const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductCriterion,
  ProductAlternateReference,
  ProductBrand,
  Category,
  Subcategory,
  Brand,
  VehicleModel,
  VehicleYear,
  VehicleDisplacement,
  Tax,
  Supplier
} = require('../models');

exports.index = async (req, res) => {
  try {
    const { search, page = 1, per_page = 20 } = req.query;
    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    const { rows: products, count } = await Product.findAndCountAll({
      where,
      include: [
        { model: ProductBrand, as: 'brand' },
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'principalImage' },
        { model: Tax, as: 'taxes' },
        { model: Supplier, as: 'supplier' }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    return res.json({
      data: products,
      meta: {
        current_page: parseInt(page),
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.store = async (req, res) => {
  try {
    const {
      sku, name, description, price, stock, brand_id, category_id, subcategory_id,
      status, condition, spare_type, position, side, transmission, reference, is_featured,
      model_ids, model_id, vehicle_year_ids, vehicle_displacement_ids, compatible_product_ids, tax_ids,
      criteria, alternate_references, image_labels, principal_image_index, supplier_id
    } = req.body;

    if (!sku || !name || !price || !category_id) {
      return res.status(422).json({ message: 'sku, name, price, and category_id are required fields.' });
    }

    const result = await sequelize.transaction(async (t) => {
      // Auto-generate KP consecutive code
      let kpCode = 'KP000001';
      const lastProduct = await Product.findOne({
        where: {
          code: {
            [Op.like]: 'KP%'
          }
        },
        order: [['code', 'DESC']],
        transaction: t
      });
      if (lastProduct && lastProduct.code) {
        const match = lastProduct.code.match(/^KP(\d+)$/);
        if (match) {
          const lastNum = parseInt(match[1], 10);
          kpCode = 'KP' + String(lastNum + 1).padStart(6, '0');
        }
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

      const product = await Product.create({
        sku, code: kpCode, name, slug, description, price, stock, brand_id, category_id, subcategory_id,
        supplier_id: supplier_id || 1, // Default to INTERNATIONAL PARTS SERVICE SAS (id 1)
        status: status || 'active', condition, spare_type, position, side, transmission, reference,
        is_featured: is_featured === 'true' || is_featured === true,
        created_by: req.user ? req.user.id : null,
      }, { transaction: t });

      // Handle Vehicle Models Sync
      if (model_ids) {
        const ids = typeof model_ids === 'string' ? JSON.parse(model_ids) : model_ids;
        await product.setVehicleModels(ids, { transaction: t });
      } else if (model_id) {
        await product.setVehicleModels([model_id], { transaction: t });
      }

      // Handle Years Sync
      if (vehicle_year_ids) {
        const ids = typeof vehicle_year_ids === 'string' ? JSON.parse(vehicle_year_ids) : vehicle_year_ids;
        await product.setVehicleYears(ids, { transaction: t });
      }

      // Handle Displacements Sync
      if (vehicle_displacement_ids) {
        const ids = typeof vehicle_displacement_ids === 'string' ? JSON.parse(vehicle_displacement_ids) : vehicle_displacement_ids;
        await product.setVehicleDisplacements(ids, { transaction: t });
      }

      // Handle Compatible Products Sync
      if (compatible_product_ids) {
        const ids = typeof compatible_product_ids === 'string' ? JSON.parse(compatible_product_ids) : compatible_product_ids;
        await product.setCompatibleProducts(ids, { transaction: t });
      }

      // Handle Taxes Sync
      if (tax_ids) {
        const ids = typeof tax_ids === 'string' ? JSON.parse(tax_ids) : tax_ids;
        await product.setTaxes(ids, { transaction: t });
      }

      // Handle Criteria
      if (criteria) {
        const items = typeof criteria === 'string' ? JSON.parse(criteria) : criteria;
        for (const item of items) {
          await ProductCriterion.create({
            product_id: product.id,
            key: item.key,
            value: item.value
          }, { transaction: t });
        }
      }

      // Handle Alternate References
      if (alternate_references) {
        const refs = typeof alternate_references === 'string' ? JSON.parse(alternate_references) : alternate_references;
        for (const ref of refs) {
          await ProductAlternateReference.create({
            product_id: product.id,
            reference_code: ref
          }, { transaction: t });
        }
      }

      // Handle uploaded files (images)
      if (req.files && req.files.length > 0) {
        let labels = [];
        if (image_labels) {
          if (typeof image_labels === 'string') {
            try {
              labels = JSON.parse(image_labels);
            } catch (e) {
              labels = [image_labels];
            }
          } else {
            labels = image_labels;
          }
        }
        const pIndex = principal_image_index ? parseInt(principal_image_index) : 0;

        for (let index = 0; index < req.files.length; index++) {
          const file = req.files[index];
          // Save path relative to uploads/
          const imagePath = `products/${file.filename}`;
          await ProductImage.create({
            product_id: product.id,
            image_path: imagePath,
            label: labels[index] || 'OTRA',
            is_primary: pIndex === index
          }, { transaction: t });
        }
      }

      return product;
    });

    // Reload with all relationships
    const reloaded = await Product.findByPk(result.id, {
      include: [
        { model: ProductBrand, as: 'brand' },
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images' },
        { model: VehicleModel, as: 'vehicleModels' },
        { model: VehicleYear, as: 'vehicleYears' },
        { model: VehicleDisplacement, as: 'vehicleDisplacements' },
        { model: Tax, as: 'taxes' },
        { model: Supplier, as: 'supplier' }
      ]
    });

    return res.status(201).json({ data: reloaded });
  } catch (error) {
    return res.status(500).json({ message: 'Error al guardar el producto: ' + error.message });
  }
};

exports.show = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: ProductBrand, as: 'brand' },
        { model: Category, as: 'category' },
        { model: Subcategory, as: 'subcategory' },
        { model: ProductImage, as: 'images' },
        { model: ProductCriterion, as: 'criteria' },
        { model: ProductAlternateReference, as: 'alternateReferences' },
        { model: Product, as: 'compatibleProducts' },
        { model: VehicleModel, as: 'vehicleModels', include: [{ model: Brand, as: 'brand' }] },
        { model: VehicleYear, as: 'vehicleYears' },
        { model: VehicleDisplacement, as: 'vehicleDisplacements' },
        { model: Tax, as: 'taxes' },
        { model: Supplier, as: 'supplier' }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.json({ data: product });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const {
      sku, name, description, price, stock, brand_id, category_id, subcategory_id,
      status, condition, spare_type, position, side, transmission, reference, is_featured,
      model_ids, vehicle_year_ids, vehicle_displacement_ids, compatible_product_ids, tax_ids,
      criteria, alternate_references, image_labels, principal_image_index, supplier_id
    } = req.body;

    await sequelize.transaction(async (t) => {
      const updateData = {};
      if (sku) updateData.sku = sku;
      if (name) {
        updateData.name = name;
        if (name !== product.name) {
          updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        }
      }
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (stock !== undefined) updateData.stock = stock;
      if (brand_id !== undefined) updateData.brand_id = brand_id;
      if (category_id !== undefined) updateData.category_id = category_id;
      if (subcategory_id !== undefined) updateData.subcategory_id = subcategory_id;
      if (supplier_id !== undefined) updateData.supplier_id = supplier_id;
      if (status) updateData.status = status;
      if (condition !== undefined) updateData.condition = condition;
      if (spare_type !== undefined) updateData.spare_type = spare_type;
      if (position !== undefined) updateData.position = position;
      if (side !== undefined) updateData.side = side;
      if (transmission !== undefined) updateData.transmission = transmission;
      if (reference !== undefined) updateData.reference = reference;
      if (is_featured !== undefined) updateData.is_featured = is_featured === 'true' || is_featured === true;
      if (req.user) updateData.updated_by = req.user.id;

      await product.update(updateData, { transaction: t });

      // Sync associations
      if (model_ids) {
        const ids = typeof model_ids === 'string' ? JSON.parse(model_ids) : model_ids;
        await product.setVehicleModels(ids, { transaction: t });
      }
      if (vehicle_year_ids) {
        const ids = typeof vehicle_year_ids === 'string' ? JSON.parse(vehicle_year_ids) : vehicle_year_ids;
        await product.setVehicleYears(ids, { transaction: t });
      }
      if (vehicle_displacement_ids) {
        const ids = typeof vehicle_displacement_ids === 'string' ? JSON.parse(vehicle_displacement_ids) : vehicle_displacement_ids;
        await product.setVehicleDisplacements(ids, { transaction: t });
      }
      if (compatible_product_ids) {
        const ids = typeof compatible_product_ids === 'string' ? JSON.parse(compatible_product_ids) : compatible_product_ids;
        await product.setCompatibleProducts(ids, { transaction: t });
      }
      if (tax_ids) {
        const ids = typeof tax_ids === 'string' ? JSON.parse(tax_ids) : tax_ids;
        await product.setTaxes(ids, { transaction: t });
      }

      // Re-create criteria
      if (criteria) {
        await ProductCriterion.destroy({ where: { product_id: product.id }, transaction: t });
        const items = typeof criteria === 'string' ? JSON.parse(criteria) : criteria;
        for (const item of items) {
          await ProductCriterion.create({ product_id: product.id, key: item.key, value: item.value }, { transaction: t });
        }
      }

      // Re-create alternate references
      if (alternate_references) {
        await ProductAlternateReference.destroy({ where: { product_id: product.id }, transaction: t });
        const refs = typeof alternate_references === 'string' ? JSON.parse(alternate_references) : alternate_references;
        for (const ref of refs) {
          await ProductAlternateReference.create({ product_id: product.id, reference_code: ref }, { transaction: t });
        }
      }

      // Handle new files upload
      if (req.files && req.files.length > 0) {
        let labels = [];
        if (image_labels) {
          if (typeof image_labels === 'string') {
            try {
              labels = JSON.parse(image_labels);
            } catch (e) {
              labels = [image_labels];
            }
          } else {
            labels = image_labels;
          }
        }
        const pIndex = principal_image_index ? parseInt(principal_image_index) : -1;

        if (pIndex !== -1) {
          // Reset existing primaries
          await ProductImage.update({ is_primary: false }, { where: { product_id: product.id }, transaction: t });
        }

        for (let index = 0; index < req.files.length; index++) {
          const file = req.files[index];
          const imagePath = `products/${file.filename}`;
          await ProductImage.create({
            product_id: product.id,
            image_path: imagePath,
            label: labels[index] || 'OTRA',
            is_primary: pIndex === index
          }, { transaction: t });
        }
      }
    });

    const reloaded = await Product.findByPk(product.id, {
      include: [
        { model: ProductBrand, as: 'brand' },
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images' },
        { model: VehicleModel, as: 'vehicleModels' },
        { model: VehicleYear, as: 'vehicleYears' },
        { model: VehicleDisplacement, as: 'vehicleDisplacements' },
        { model: Tax, as: 'taxes' },
        { model: Supplier, as: 'supplier' }
      ]
    });

    return res.json({ data: reloaded });
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar el producto: ' + error.message });
  }
};

exports.destroy = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: ProductImage, as: 'images' }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Delete physically if required or rely on soft delete.
    // In Laravel it deletes images then runs $product->delete().
    // We can destroy the product record (soft deletes since paranoid: true is set on Product).
    await product.destroy();

    return res.json({ message: 'Producto eliminado con éxito' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Download CSV Import Template
exports.downloadTemplate = (req, res) => {
  const headers = [
    'sku', 'name', 'description', 'price', 'stock', 'brand_id', 'category_id',
    'subcategory_id', 'supplier_id', 'condition', 'spare_type', 'position',
    'side', 'transmission', 'reference', 'is_featured', 'model_ids',
    'vehicle_year_ids', 'vehicle_displacement_ids', 'tax_ids'
  ];
  
  const sampleRow = [
    'SKU-TEST-001',
    'Pastillas de Freno Delanteras',
    'Pastillas de alta friccion y durabilidad para freno de disco',
    '125000.00',
    '25',
    '1', // brand_id
    '1', // category_id
    '1', // subcategory_id
    '1', // supplier_id
    'new',
    'original',
    'delantero',
    'ambos',
    'automatica',
    'REF-5599',
    'false',
    '"1,2"', // model_ids
    '"1"',   // vehicle_year_ids
    '"1"',   // vehicle_displacement_ids
    '"1"'    // tax_ids
  ];

  const csvContent = headers.join(',') + '\n' + sampleRow.join(',') + '\n';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=kayparts_import_template.csv');
  return res.status(200).send(csvContent);
};

// Import products from CSV
exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Debe subir un archivo CSV.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    
    // Custom CSV parser
    const parseCSV = (content) => {
      const lines = content.split(/\r?\n/);
      if (lines.length === 0) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const results = [];
      
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
        results.push(row);
      }
      return results;
    };

    const rows = parseCSV(fileContent);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'El archivo CSV está vacío o es inválido.' });
    }

    const parseIds = (val) => {
      if (!val) return [];
      if (val.startsWith('[') && val.endsWith(']')) {
        try { return JSON.parse(val); } catch(e) {}
      }
      return val.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
    };

    let importedCount = 0;
    const errors = [];

    await sequelize.transaction(async (t) => {
      // Find the last consecutive code to start incrementing from
      let lastKpNum = 0;
      const lastProduct = await Product.findOne({
        where: {
          code: {
            [Op.like]: 'KP%'
          }
        },
        order: [['code', 'DESC']],
        transaction: t
      });
      
      if (lastProduct && lastProduct.code) {
        const match = lastProduct.code.match(/^KP(\d+)$/);
        if (match) {
          lastKpNum = parseInt(match[1], 10);
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2; // header is line 1

        if (!row.sku || !row.name || !row.price || !row.category_id) {
          errors.push(`Línea ${lineNum}: sku, name, price y category_id son campos obligatorios.`);
          continue;
        }

        // Check if sku already exists
        const existingSku = await Product.findOne({
          where: { sku: row.sku },
          transaction: t
        });
        if (existingSku) {
          errors.push(`Línea ${lineNum}: El SKU '${row.sku}' ya está registrado.`);
          continue;
        }

        lastKpNum += 1;
        const kpCode = 'KP' + String(lastKpNum).padStart(6, '0');
        const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        const product = await Product.create({
          sku: row.sku,
          code: kpCode,
          name: row.name,
          slug,
          description: row.description || null,
          price: parseFloat(row.price),
          stock: parseInt(row.stock || 0, 10),
          brand_id: row.brand_id ? parseInt(row.brand_id, 10) : null,
          category_id: parseInt(row.category_id, 10),
          subcategory_id: row.subcategory_id ? parseInt(row.subcategory_id, 10) : null,
          supplier_id: row.supplier_id ? parseInt(row.supplier_id, 10) : 1, // Defaults to 1
          condition: row.condition || null,
          spare_type: row.spare_type || null,
          position: row.position || null,
          side: row.side || null,
          transmission: row.transmission || null,
          reference: row.reference || null,
          is_featured: row.is_featured === 'true' || row.is_featured === '1',
          created_by: req.user ? req.user.id : null
        }, { transaction: t });

        // Sync Associations
        if (row.model_ids) {
          await product.setVehicleModels(parseIds(row.model_ids), { transaction: t });
        }
        if (row.vehicle_year_ids) {
          await product.setVehicleYears(parseIds(row.vehicle_year_ids), { transaction: t });
        }
        if (row.vehicle_displacement_ids) {
          await product.setVehicleDisplacements(parseIds(row.vehicle_displacement_ids), { transaction: t });
        }
        if (row.tax_ids) {
          await product.setTaxes(parseIds(row.tax_ids), { transaction: t });
        }

        importedCount++;
      }
    });

    if (importedCount === 0 && errors.length > 0) {
      return res.status(422).json({
        message: 'No se pudo importar ningún producto.',
        errors
      });
    }

    return res.status(200).json({
      message: `Se importaron ${importedCount} productos exitosamente.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return res.status(500).json({ message: 'Error durante la importación: ' + error.message });
  }
};
