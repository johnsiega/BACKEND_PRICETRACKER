const {
  getAllCommodities,
  getCommodityById,
  getPriceHistory,
  getRecentPriceChanges,
  getAllCategories,
  searchCommodities
} = require('../models/commodityModel');

// Get all commodities with filters
async function getAll(req, res) {
  try {
    const filters = {
      category_id: req.query.category_id,
      market_type: req.query.market_type,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : 200,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };
    
    const commodities = await getAllCommodities(filters);
    
    res.json({
      success: true,
      count: commodities.length,
      data: commodities
    });
  } catch (error) {
    console.error('Error in getAll:', error);
    res.status(500).json({
      error: 'Failed to fetch commodities',
      message: error.message
    });
  }
}

// Get single commodity
async function getById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const commodity = await getCommodityById(id);
    
    if (!commodity) {
      return res.status(404).json({
        error: 'Commodity not found'
      });
    }
    
    res.json({
      success: true,
      data: commodity
    });
  } catch (error) {
    console.error('Error in getById:', error);
    res.status(500).json({
      error: 'Failed to fetch commodity',
      message: error.message
    });
  }
}

// Get price history
async function getHistory(req, res) {
  try {
    const id = parseInt(req.params.id);
    const days = req.query.days ? parseInt(req.query.days) : 30;
    
    const history = await getPriceHistory(id, days);
    
    res.json({
      success: true,
      commodity_id: id,
      days: days,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error in getHistory:', error);
    res.status(500).json({
      error: 'Failed to fetch price history',
      message: error.message
    });
  }
}

// Get price changes (news feed)
async function getPriceChanges(req, res) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const minPercentage = req.query.min_percentage ? parseFloat(req.query.min_percentage) : 5;
    
    const changes = await getRecentPriceChanges(days, minPercentage);
    
    res.json({
      success: true,
      count: changes.length,
      data: changes
    });
  } catch (error) {
    console.error('Error in getPriceChanges:', error);
    res.status(500).json({
      error: 'Failed to fetch price changes',
      message: error.message
    });
  }
}

// Get categories
async function getCategories(req, res) {
  try {
    const categories = await getAllCategories();
    
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      message: error.message
    });
  }
}

// Search commodities
async function search(req, res) {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const results = await searchCommodities(query);
    
    res.json({
      success: true,
      query: query,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
}

module.exports = {
  getAll,
  getById,
  getHistory,
  getPriceChanges,
  getCategories,
  search
};