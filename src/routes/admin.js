const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');
const userAddressController = require('../controllers/userAddressController');
const productController = require('../controllers/productController');
const genericCrudController = require('../controllers/genericCrudController');

const {
  Category,
  Subcategory,
  Brand,
  ProductBrand,
  VehicleModel,
  Tax,
  VehicleYear,
  VehicleDisplacement,
  User,
  UserAddress
} = require('../models');

// Configure Multer for product image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/products');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper to create a single image upload middleware for generic resources
const createUploadMiddleware = (subfolder) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, `../../public/uploads/${subfolder}`);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  return multer({ storage });
};

// Helper to register Laravel-style apiResource routes
const registerResource = (routePath, controller, uploadMiddleware = null) => {
  if (controller.index) router.get(`/${routePath}`, controller.index);
  if (controller.store) {
    if (uploadMiddleware) {
      router.post(`/${routePath}`, uploadMiddleware.single('image'), controller.store);
    } else {
      router.post(`/${routePath}`, controller.store);
    }
  }
  if (controller.show) router.get(`/${routePath}/:id`, controller.show);
  if (controller.update) {
    if (uploadMiddleware) {
      router.put(`/${routePath}/:id`, uploadMiddleware.single('image'), controller.update);
      router.patch(`/${routePath}/:id`, uploadMiddleware.single('image'), controller.update);
    } else {
      router.put(`/${routePath}/:id`, controller.update);
      router.patch(`/${routePath}/:id`, controller.update);
    }
  }
  if (controller.destroy) router.delete(`/${routePath}/:id`, controller.destroy);
};

// Protect all routes under /admin
router.use(authMiddleware);

// Auth Profile
router.get('/user', authController.user);
router.post('/logout', authController.logout);

// User Addresses
router.post('/user/addresses', userAddressController.store);
router.patch('/addresses/:id/primary', userAddressController.setPrimary);
registerResource('addresses', userAddressController);

// Product Resource (needs multer upload for store/update)
router.get('/products', productController.index);
router.post('/products', upload.array('images'), productController.store);
router.get('/products/:id', productController.show);
router.put('/products/:id', upload.array('images'), productController.update);
router.patch('/products/:id', upload.array('images'), productController.update);
router.delete('/products/:id', productController.destroy);

// Generic Admin Resources
registerResource('categories', genericCrudController(Category, ['name', 'slug'], [], true, 'categories'), createUploadMiddleware('categories'));
registerResource('subcategories', genericCrudController(Subcategory, ['name', 'slug'], [{ model: Category, as: 'category' }], true, 'subcategories'), createUploadMiddleware('subcategories'));
registerResource('sub-categories', genericCrudController(Subcategory, ['name', 'slug'], [{ model: Category, as: 'category' }], true, 'subcategories'), createUploadMiddleware('subcategories')); // Alias
registerResource('brands', genericCrudController(Brand, ['name'], [], false, 'brands'), createUploadMiddleware('brands'));
registerResource('product-brands', genericCrudController(ProductBrand, ['name', 'slug'], [], true, 'product_brands'), createUploadMiddleware('product_brands'));
registerResource('vehicle-models', genericCrudController(VehicleModel, ['name'], [{ model: Brand, as: 'brand' }], false, 'vehicle_models'), createUploadMiddleware('vehicle_models'));
registerResource('taxes', genericCrudController(Tax, ['name'], [], false));
registerResource('vehicle-years', genericCrudController(VehicleYear, ['year'], [], false));
registerResource('vehicle-displacements', genericCrudController(VehicleDisplacement, ['name'], [], false));

const userCrud = genericCrudController(User, ['name', 'email'], [{ model: UserAddress, as: 'addresses' }], false);
registerResource('users', userCrud);
registerResource('clients', userCrud); // Alias

module.exports = router;
