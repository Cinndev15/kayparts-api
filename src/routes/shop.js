const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

router.get('/products', shopController.index);
router.get('/filters', shopController.filters);
router.get('/products/:slug', shopController.show);
router.get('/vehicle-models/:makeId', shopController.vehicleModelsByMake);

// Individual filter endpoints
router.get('/makes', shopController.makes);
router.get('/models', shopController.models);
router.get('/years', shopController.years);
router.get('/displacements', shopController.displacements);
router.get('/categories', shopController.categories);

module.exports = router;
