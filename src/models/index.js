const sequelize = require('../config/database');
const User = require('./User');
const PersonalAccessToken = require('./PersonalAccessToken');
const Category = require('./Category');
const Subcategory = require('./Subcategory');
const Brand = require('./Brand');
const ProductBrand = require('./ProductBrand');
const VehicleModel = require('./VehicleModel');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductCriterion = require('./ProductCriterion');
const ProductAlternateReference = require('./ProductAlternateReference');
const VehicleYear = require('./VehicleYear');
const VehicleDisplacement = require('./VehicleDisplacement');
const UserAddress = require('./UserAddress');
const WorkshopApplication = require('./WorkshopApplication');
const Tax = require('./Tax');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Carrier = require('./Carrier');
const Dispatch = require('./Dispatch');
const DispatchTracking = require('./DispatchTracking');
const Article = require('./Article');
const Supplier = require('./Supplier');
const InvoicingResolution = require('./InvoicingResolution');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');

// User and Token
User.hasMany(PersonalAccessToken, { foreignKey: 'tokenable_id', constraints: false, scope: { tokenable_type: 'App\\Models\\User' } });
PersonalAccessToken.belongsTo(User, { foreignKey: 'tokenable_id', constraints: false });

// User and Address
User.hasMany(UserAddress, { foreignKey: 'user_id', as: 'addresses' });
UserAddress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order and User
User.hasMany(Order, { foreignKey: 'user_id' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Order and OrderItems
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order and Invoice
Order.hasOne(Invoice, { foreignKey: 'order_id', as: 'invoice' });
Invoice.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Invoice and InvoiceItem
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// InvoicingResolution and Invoice
InvoicingResolution.hasMany(Invoice, { foreignKey: 'resolution_id', as: 'invoices' });
Invoice.belongsTo(InvoicingResolution, { foreignKey: 'resolution_id', as: 'resolution' });

// OrderItem and Product
Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order and Dispatch
Order.hasOne(Dispatch, { foreignKey: 'order_id', as: 'dispatch' });
Dispatch.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Carrier and Dispatch
Carrier.hasMany(Dispatch, { foreignKey: 'carrier_id', as: 'dispatches' });
Dispatch.belongsTo(Carrier, { foreignKey: 'carrier_id', as: 'carrier' });

// Dispatch and DispatchTracking
Dispatch.hasMany(DispatchTracking, { foreignKey: 'dispatch_id', as: 'trackingHistory' });
DispatchTracking.belongsTo(Dispatch, { foreignKey: 'dispatch_id', as: 'dispatch' });

// Category and Subcategory
Category.hasMany(Subcategory, { foreignKey: 'category_id', as: 'subcategories' });
Subcategory.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Category and Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Subcategory and Product
Subcategory.hasMany(Product, { foreignKey: 'subcategory_id', as: 'products' });
Product.belongsTo(Subcategory, { foreignKey: 'subcategory_id', as: 'subcategory' });

// ProductBrand and Product
ProductBrand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });
Product.belongsTo(ProductBrand, { foreignKey: 'brand_id', as: 'brand' });

// Brand (Vehicle Make) and VehicleModel
Brand.hasMany(VehicleModel, { foreignKey: 'brand_id', as: 'vehicleModels' });
VehicleModel.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });

// Product and ProductImage
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product and Principal Image (hasOne image where is_primary = true)
Product.hasOne(ProductImage, {
  foreignKey: 'product_id',
  as: 'principalImage',
  scope: { is_primary: true }
});

// Product and ProductCriterion
Product.hasMany(ProductCriterion, { foreignKey: 'product_id', as: 'criteria' });
ProductCriterion.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product and Alternate References
Product.hasMany(ProductAlternateReference, { foreignKey: 'product_id', as: 'alternateReferences' });
ProductAlternateReference.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Product and VehicleModel (Many-to-Many)
Product.belongsToMany(VehicleModel, {
  through: 'product_vehicle_model',
  foreignKey: 'product_id',
  otherKey: 'vehicle_model_id',
  as: 'vehicleModels'
});
VehicleModel.belongsToMany(Product, {
  through: 'product_vehicle_model',
  foreignKey: 'vehicle_model_id',
  otherKey: 'product_id',
  as: 'products'
});

// Product and VehicleYear (Many-to-Many)
Product.belongsToMany(VehicleYear, {
  through: 'product_vehicle_year',
  foreignKey: 'product_id',
  otherKey: 'vehicle_year_id',
  as: 'vehicleYears'
});
VehicleYear.belongsToMany(Product, {
  through: 'product_vehicle_year',
  foreignKey: 'vehicle_year_id',
  otherKey: 'product_id',
  as: 'products'
});

// Product and VehicleDisplacement (Many-to-Many)
Product.belongsToMany(VehicleDisplacement, {
  through: 'product_vehicle_displacement',
  foreignKey: 'product_id',
  otherKey: 'vehicle_displacement_id',
  as: 'vehicleDisplacements'
});
VehicleDisplacement.belongsToMany(Product, {
  through: 'product_vehicle_displacement',
  foreignKey: 'vehicle_displacement_id',
  otherKey: 'product_id',
  as: 'products'
});

// Product and Tax (Many-to-Many)
Product.belongsToMany(Tax, {
  through: 'product_tax',
  foreignKey: 'product_id',
  otherKey: 'tax_id',
  as: 'taxes'
});
Tax.belongsToMany(Product, {
  through: 'product_tax',
  foreignKey: 'tax_id',
  otherKey: 'product_id',
  as: 'products'
});

// Product and Product Compatibility (Many-to-Many compatible products)
Product.belongsToMany(Product, {
  through: 'product_compatibility',
  foreignKey: 'product_id',
  otherKey: 'compatible_product_id',
  as: 'compatibleProducts'
});

// Creator and Updater relations
const auditedModels = [Product, Category, Subcategory, ProductBrand, Brand, VehicleModel, VehicleYear, VehicleDisplacement, Carrier, Article, WorkshopApplication, Tax, Dispatch, Supplier, InvoicingResolution, Invoice];
auditedModels.forEach(model => {
  model.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  model.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
});

// Define Virtual Getters / helper properties for image_url
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = process.env.APP_URL || 'https://api.kayparts.co';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/uploads/${imagePath}`;
};

// Add helper properties/methods to models to align output with Laravel
Brand.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

ProductBrand.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

ProductImage.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

Category.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

Subcategory.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

VehicleModel.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

Article.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values.image_url = getImageUrl(values.image_path);
  return values;
};

Product.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());

  // Format nested images if present
  if (values.images && Array.isArray(values.images)) {
    values.images = this.images.map(img => img.toJSON ? img.toJSON() : img);
  }
  if (values.principalImage) {
    values.principalImage = this.principalImage.toJSON ? this.principalImage.toJSON() : values.principalImage;
  }
  
  // Set main_image to match Laravel API output format
  if (values.principalImage) {
    values.main_image = values.principalImage.image_url;
  } else if (values.images && values.images.length > 0) {
    const primary = values.images.find(img => img.is_primary || img.is_principal);
    if (primary) {
      values.main_image = primary.image_url;
    } else {
      values.main_image = values.images[0].image_url;
    }
  } else {
    values.main_image = null;
  }

  // Format other associations if present
  if (values.brand && this.brand && this.brand.toJSON) {
    values.brand = this.brand.toJSON();
  }
  if (values.category && this.category && this.category.toJSON) {
    values.category = this.category.toJSON();
  }
  if (values.subcategory && this.subcategory && this.subcategory.toJSON) {
    values.subcategory = this.subcategory.toJSON();
  }
  if (values.vehicleModels && Array.isArray(values.vehicleModels)) {
    values.vehicleModels = this.vehicleModels.map(m => m.toJSON ? m.toJSON() : m);
  }

  return values;
};

module.exports = {
  sequelize,
  User,
  PersonalAccessToken,
  Category,
  Subcategory,
  Brand,
  ProductBrand,
  VehicleModel,
  Product,
  ProductImage,
  ProductCriterion,
  ProductAlternateReference,
  VehicleYear,
  VehicleDisplacement,
  UserAddress,
  WorkshopApplication,
  Tax,
  Order,
  OrderItem,
  Carrier,
  Dispatch,
  DispatchTracking,
  Article,
  Supplier,
  InvoicingResolution,
  Invoice,
  InvoiceItem,
};
