const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/authController');
const userAddressController = require('../controllers/userAddressController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');
const userController = require('../controllers/userController');
const genericCrudController = require('../controllers/genericCrudController');
const dispatchController = require('../controllers/dispatchController');
const dispatchTrackingController = require('../controllers/dispatchTrackingController');
const invoiceController = require('../controllers/invoiceController');
const purchaseOrderController = require('../controllers/purchaseOrderController');

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
  UserAddress,
  Carrier,
  Article,
  WorkshopApplication,
  Supplier,
  InvoicingResolution,
  PurchaseOrderSequence
} = require('../models');

const getUploadPath = (subfolder) => {
  const prodBase = '/home/u691340716/domains/api.kayparts.co/public_html/uploads';
  if (fs.existsSync('/home/u691340716/domains/api.kayparts.co/public_html')) {
    return path.join(prodBase, subfolder);
  }
  return path.join(__dirname, `../../public/uploads/${subfolder}`);
};

// Configure Multer for product image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = getUploadPath('products');
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
      const uploadPath = getUploadPath(subfolder);
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
      router.post(`/${routePath}/:id`, uploadMiddleware.single('image'), controller.update); // Laravel-style method spoofing compatibility
    } else {
      router.put(`/${routePath}/:id`, controller.update);
      router.patch(`/${routePath}/:id`, controller.update);
      router.post(`/${routePath}/:id`, controller.update); // Laravel-style method spoofing compatibility
    }
  }
  if (controller.destroy) router.delete(`/${routePath}/:id`, controller.destroy);
};

// Protect all routes under /admin
router.use(authMiddleware);

// Auth Profile
router.get('/user', authController.user);
router.put('/user', authController.updateProfile);
router.patch('/user', authController.updateProfile);
router.post('/logout', authController.logout);

// User Addresses
router.post('/user/addresses', userAddressController.store);
router.patch('/addresses/:id/primary', userAddressController.setPrimary);
registerResource('addresses', userAddressController);

// User Orders
router.get('/user/orders', orderController.getUserOrders);
router.get('/orders', orderController.index);
router.put('/orders/:id/status', orderController.updateStatus);

// Product Resource (needs multer upload for store/update)
router.get('/products', productController.index);
router.get('/products/import-template', productController.downloadTemplate);
router.post('/products/import', multer().single('file'), productController.importProducts);
router.post('/products', upload.array('images'), productController.store);
router.get('/products/:id', productController.show);
router.put('/products/:id', upload.array('images'), productController.update);
router.patch('/products/:id', upload.array('images'), productController.update);
router.post('/products/:id', upload.array('images'), productController.update); // Laravel method spoofing compatibility
router.delete('/products/:id', productController.destroy);

// Generic Admin Resources
registerResource('categories', genericCrudController(Category, ['name'], [], false, 'categories'), createUploadMiddleware('categories'));
registerResource('subcategories', genericCrudController(Subcategory, ['name'], [{ model: Category, as: 'category' }], false, 'subcategories'), createUploadMiddleware('subcategories'));
registerResource('sub-categories', genericCrudController(Subcategory, ['name'], [{ model: Category, as: 'category' }], false, 'subcategories'), createUploadMiddleware('subcategories')); // Alias
registerResource('brands', genericCrudController(Brand, ['name'], [], false, 'brands'), createUploadMiddleware('brands'));
registerResource('product-brands', genericCrudController(ProductBrand, ['name'], [], false, 'product_brands'), createUploadMiddleware('product_brands'));
registerResource('vehicle-models', genericCrudController(VehicleModel, ['name'], [{ model: Brand, as: 'brand' }], false, 'vehicle_models'), createUploadMiddleware('vehicle_models'));
registerResource('taxes', genericCrudController(Tax, ['name'], [], false));
registerResource('vehicle-years', genericCrudController(VehicleYear, ['year'], [], false));
registerResource('vehicle-displacements', genericCrudController(VehicleDisplacement, ['name'], [], false));
registerResource('carriers', genericCrudController(Carrier, ['name'], [], false));
registerResource('dispatches', dispatchController);
registerResource('articles', genericCrudController(Article, ['title', 'category'], [], true, 'articles'), createUploadMiddleware('articles'));
registerResource('workshop-applications', genericCrudController(WorkshopApplication, ['workshop_name', 'owner_name', 'email'], [], false));
registerResource('suppliers', genericCrudController(Supplier, ['razon_social', 'nit_or_cedula', 'assigned_advisor'], [], false));
registerResource('invoicing-resolutions', genericCrudController(InvoicingResolution, ['prefix', 'resolution_number'], [], false));

// Invoice management routes
router.get('/invoices', invoiceController.index);
router.get('/invoices/:id', invoiceController.show);
router.post('/invoices', invoiceController.store);
router.post('/invoices/:id/cancel', invoiceController.cancel);

// Purchase Order Sequences CRUD
registerResource('purchase-order-sequences', genericCrudController(PurchaseOrderSequence, ['name', 'prefix'], [], false));

// Purchase Order routes
router.get('/purchase-orders', purchaseOrderController.index);
router.get('/purchase-orders/:id', purchaseOrderController.show);
router.post('/purchase-orders', purchaseOrderController.store);
router.put('/purchase-orders/:id', purchaseOrderController.update);
router.delete('/purchase-orders/:id', purchaseOrderController.destroy);
router.post('/purchase-orders/:id/send', purchaseOrderController.send);

// Dispatch Tracking routes
router.get('/dispatches/:dispatchId/tracking', dispatchTrackingController.index);
router.post('/dispatches/:dispatchId/tracking', dispatchTrackingController.store);
router.delete('/dispatches/tracking/:id', dispatchTrackingController.destroy);

registerResource('users', userController);
registerResource('clients', userController); // Alias

module.exports = router;
