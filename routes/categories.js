const express = require('express');
const router = express.Router();
const commodityController = require('../controllers/commodityController');

// Get all categories
router.get('/', commodityController.getCategories);

module.exports = router;