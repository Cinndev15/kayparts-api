const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  Subcategory,
  ProductBrand,
  Brand,
  VehicleModel,
  VehicleYear,
  VehicleDisplacement,
  ProductImage,
  ProductCriterion,
  ProductAlternateReference,
  Tax
} = require('../models');

// Helper to format Product JSON exactly like ProductResource in Laravel
function formatProduct(product) {
  const data = product.toJSON ? product.toJSON() : product;

  // Calculate principal image
  let mainImageUrl = null;
  if (data.images && data.images.length > 0) {
    const primary = data.images.find(img => img.is_primary);
    mainImageUrl = primary ? primary.image_url : data.images[0].image_url;
  }

  // Calculate price with taxes
  let priceWithTaxes = parseFloat(data.price);
  if (data.taxes && data.taxes.length > 0) {
    const activeTaxes = data.taxes.filter(t => t.is_active);
    const totalTaxRate = activeTaxes.reduce((sum, t) => sum + parseFloat(t.rate), 0);
    priceWithTaxes = parseFloat(data.price) + (parseFloat(data.price) * (totalTaxRate / 100));
  }

  return {
    id: data.id,
    sku: data.sku,
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: parseFloat(data.price),
    stock: parseInt(data.stock),
    status: data.status,
    condition: data.condition,
    spare_type: data.spare_type,
    position: data.position,
    side: data.side,
    transmission: data.transmission,
    reference: data.reference,
    is_featured: !!data.is_featured,
    main_image: mainImageUrl,
    image: mainImageUrl,
    brand: data.brand || null,
    category: data.category || null,
    subcategory: data.subcategory || null,
    images: data.images || [],
    principal_image: data.principalImage || null,
    criteria: data.criteria || [],
    alternate_references: data.alternateReferences || [],
    compatible_products: (data.compatibleProducts || []).map(cp => formatProduct(cp)),
    vehicle_models: data.vehicleModels || [],
    vehicle_years: data.vehicleYears || [],
    vehicle_displacements: data.vehicleDisplacements || [],
    taxes: data.taxes || [],
    price_with_taxes: priceWithTaxes,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

exports.makes = async (req, res) => {
  try {
    const makes = await Brand.findAll({
      include: [{
        model: VehicleModel,
        as: 'vehicleModels',
        required: true,
        include: [{
          model: Product,
          as: 'products',
          required: true,
          where: { status: 'active' }
        }]
      }],
      order: [['name', 'ASC']],
    });
    return res.json(makes);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.models = async (req, res) => {
  try {
    const where = {};
    if (req.query.make_id) {
      where.brand_id = req.query.make_id;
    }

    const models = await VehicleModel.findAll({
      where,
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['name', 'ASC']],
    });
    return res.json(models);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.years = async (req, res) => {
  try {
    const years = await VehicleYear.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['year', 'DESC']],
    });

    let yearValues = years.map(y => y.year);

    if (yearValues.length === 0) {
      // Get min and max year from product_vehicle_model table
      const [results] = await sequelize.query('SELECT MIN(year_from) as min_year, MAX(year_to) as max_year FROM product_vehicle_model');
      if (results && results[0] && results[0].min_year && results[0].max_year) {
        for (let i = results[0].max_year; i >= results[0].min_year; i--) {
          yearValues.push(i);
        }
      }
    }

    return res.json(yearValues);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.displacements = async (req, res) => {
  try {
    const list = await VehicleDisplacement.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['name', 'ASC']],
    });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.categories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['name', 'ASC']],
    });
    
    // Format to append count of products
    const formatted = await Promise.all(categories.map(async (cat) => {
      const count = await Product.count({ where: { category_id: cat.id, status: 'active' } });
      const json = cat.toJSON();
      json.products_count = count;
      return json;
    }));

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.filters = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }]
    });

    const formattedCategories = await Promise.all(categories.map(async (cat) => {
      const count = await Product.count({ where: { category_id: cat.id, status: 'active' } });
      const json = cat.toJSON();
      json.products_count = count;
      return json;
    }));

    const productBrands = await ProductBrand.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }]
    });

    const formattedBrands = await Promise.all(productBrands.map(async (brand) => {
      const count = await Product.count({ where: { brand_id: brand.id, status: 'active' } });
      const json = brand.toJSON();
      json.products_count = count;
      return json;
    }));

    const vehicleMakes = await Brand.findAll({
      include: [{
        model: VehicleModel,
        as: 'vehicleModels',
        required: true,
        include: [{
          model: Product,
          as: 'products',
          required: true,
          where: { status: 'active' }
        }]
      }]
    });

    const years = await VehicleYear.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['year', 'DESC']],
    });

    let yearValues = years.map(y => y.year);
    if (yearValues.length === 0) {
      const [results] = await sequelize.query('SELECT MIN(year_from) as min_year, MAX(year_to) as max_year FROM product_vehicle_model');
      if (results && results[0] && results[0].min_year && results[0].max_year) {
        for (let i = results[0].max_year; i >= results[0].min_year; i--) {
          yearValues.push(i);
        }
      }
    }

    const displacements = await VehicleDisplacement.findAll({
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }]
    });

    return res.json({
      categories: formattedCategories,
      product_brands: formattedBrands,
      vehicle_makes: vehicleMakes,
      years: yearValues,
      displacements: displacements,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.index = async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      vehicle_make,
      vehicle_model,
      year,
      displacement,
      price_min,
      price_max,
      sort = 'relevance',
      page = 1,
      per_page = 12
    } = req.query;

    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;

    const where = { status: 'active' };
    const includes = [
      { model: ProductBrand, as: 'brand' },
      { model: Category, as: 'category' },
      { model: ProductImage, as: 'images' },
      { model: ProductImage, as: 'principalImage' },
      { model: VehicleModel, as: 'vehicleModels', include: [{ model: Brand, as: 'brand' }] },
      { model: VehicleYear, as: 'vehicleYears' },
      { model: VehicleDisplacement, as: 'vehicleDisplacements' },
      { model: ProductAlternateReference, as: 'alternateReferences' },
      { model: Tax, as: 'taxes' }
    ];

    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } }
      ];
    }

    // Category filter
    if (category) {
      const catWhere = isNaN(category) ? { slug: category } : { id: category };
      includes.find(i => i.as === 'category').where = catWhere;
    }

    // Brand filter
    if (brand) {
      const brandWhere = isNaN(brand) ? { slug: brand } : { id: brand };
      includes.find(i => i.as === 'brand').where = brandWhere;
    }

    // Price filters
    if (price_min) {
      where.price = { ...(where.price || {}), [Op.gte]: parseFloat(price_min) };
    }
    if (price_max) {
      where.price = { ...(where.price || {}), [Op.lte]: parseFloat(price_max) };
    }

    // Sorting
    let order = [['is_featured', 'DESC'], ['created_at', 'DESC']];
    if (sort === 'price_low') {
      order = [['price', 'ASC']];
    } else if (sort === 'price_high') {
      order = [['price', 'DESC']];
    } else if (sort === 'newest') {
      order = [['created_at', 'DESC']];
    }

    // Vehicle Search Filters using subqueries to avoid Sequelize pagination JOIN bugs
    const idConditions = [];

    if (vehicle_make || vehicle_model) {
      let subQuery = 'SELECT product_id FROM product_vehicle_model pvm JOIN vehicle_models vm ON pvm.vehicle_model_id = vm.id WHERE 1=1';
      if (vehicle_make) {
        if (isNaN(vehicle_make)) {
          subQuery += ` AND vm.brand_id IN (SELECT id FROM brands WHERE name LIKE '%${vehicle_make}%')`;
        } else {
          subQuery += ` AND vm.brand_id = ${parseInt(vehicle_make)}`;
        }
      }
      if (vehicle_model) {
        if (isNaN(vehicle_model)) {
          subQuery += ` AND vm.name LIKE '%${vehicle_model}%'`;
        } else {
          subQuery += ` AND vm.id = ${parseInt(vehicle_model)}`;
        }
      }
      idConditions.push({ [Op.in]: sequelize.literal(`(${subQuery})`) });
    }

    if (year) {
      idConditions.push({
        [Op.in]: sequelize.literal(`(SELECT product_id FROM product_vehicle_year WHERE vehicle_year_id IN (SELECT id FROM vehicle_years WHERE year = ${parseInt(year)}))`)
      });
    }

    if (displacement) {
      const dispCondition = isNaN(displacement) ? `name LIKE '%${displacement}%'` : `id = ${parseInt(displacement)}`;
      idConditions.push({
        [Op.in]: sequelize.literal(`(SELECT product_id FROM product_vehicle_displacement WHERE vehicle_displacement_id IN (SELECT id FROM vehicle_displacements WHERE ${dispCondition}))`)
      });
    }

    if (idConditions.length > 0) {
      where.id = { [Op.and]: idConditions };
    }

    const { rows: products, count } = await Product.findAndCountAll({
      where,
      include: includes,
      order,
      limit,
      offset,
      distinct: true // Prevents duplicate counts due to joins
    });

    const formattedProducts = products.map(formatProduct);

    // Mimic Laravel paginator response structure
    return res.json({
      data: formattedProducts,
      meta: {
        current_page: parseInt(page),
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.show = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({
      where: { slug, status: 'active' },
      include: [
        { model: ProductBrand, as: 'brand' },
        { model: Category, as: 'category' },
        { model: Subcategory, as: 'subcategory' },
        { model: ProductImage, as: 'images' },
        { model: ProductCriterion, as: 'criteria' },
        { model: ProductAlternateReference, as: 'alternateReferences' },
        { model: Product, as: 'compatibleProducts', include: [{ model: ProductImage, as: 'images' }] },
        { model: VehicleModel, as: 'vehicleModels', include: [{ model: Brand, as: 'brand' }] },
        { model: VehicleYear, as: 'vehicleYears' },
        { model: VehicleDisplacement, as: 'vehicleDisplacements' },
        { model: Tax, as: 'taxes' }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.json({ data: formatProduct(product) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.vehicleModelsByMake = async (req, res) => {
  try {
    const { makeId } = req.params;
    const models = await VehicleModel.findAll({
      where: { brand_id: makeId },
      include: [{
        model: Product,
        as: 'products',
        required: true,
        where: { status: 'active' }
      }],
      order: [['name', 'ASC']],
    });
    return res.json(models);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
