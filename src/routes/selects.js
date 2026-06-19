const express = require('express');
const router = express.Router();
const selectController = require('../controllers/selectController');

router.get('/categories', selectController.categories);
router.get('/product-brands', selectController.productBrands);
router.get('/vehicle-brands', selectController.vehicleBrands);
router.get('/vehicle-models', selectController.vehicleModels);
router.get('/vehicle-years', selectController.vehicleYears);
router.get('/vehicle-displacements', selectController.vehicleDisplacements);

module.exports = router;
