const express = require('express');
const router = express.Router();
const commodityController = require('../controllers/commodityController');

// Get recent price changes
router.get('/', commodityController.getPriceChanges);

module.exports = router;