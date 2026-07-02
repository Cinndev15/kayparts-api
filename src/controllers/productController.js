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
