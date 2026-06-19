const express = require('express');
const router = express.Router();
const colombiaGeoController = require('../controllers/colombiaGeoController');

router.get('/departments', colombiaGeoController.departments);
router.get('/cities', colombiaGeoController.cities);

module.exports = router;
