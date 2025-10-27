const express = require('express');
const router = express.Router();
const commodityController = require('../controllers/commodityController');

// Get all commodities (with optional filters)
router.get('/', commodityController.getAll);

// Search commodities
router.get('/search', commodityController.search);

// Get single commodity
router.get('/:id', commodityController.getById);

// Get price history for commodity
router.get('/:id/history', commodityController.getHistory);

module.exports = router;