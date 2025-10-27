const pool = require('../config/db');

async function getCategoryIdByName(categoryName) {
  try {
    // First try exact match
    let query = 'SELECT id FROM categories WHERE UPPER(name) = UPPER($1)';
    let result = await pool.query(query, [categoryName]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // If no exact match, try partial match
    query = 'SELECT id FROM categories WHERE UPPER(name) LIKE UPPER($1)';
    result = await pool.query(query, [`%${categoryName}%`]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Try matching just the main keyword
    const keywords = {
      'RICE': ['Rice'],
      'CORN': ['Corn'],
      'FISH': ['Fish'],
      'BEEF': ['Beef'],
      'PORK': ['Pork'],
      'LIVESTOCK': ['Livestock'],
      'POULTRY': ['Poultry'],
      'VEGETABLES': ['Vegetables'],
      'SPICES': ['Spices'],
      'FRUITS': ['Fruits'],
      'BASIC': ['Basic']
    };
    
    for (const [key, patterns] of Object.entries(keywords)) {
      if (categoryName.includes(key)) {
        for (const pattern of patterns) {
          query = 'SELECT id FROM categories WHERE UPPER(name) LIKE UPPER($1)';
          result = await pool.query(query, [`%${pattern}%`]);
          if (result.rows.length > 0) {
            return result.rows[0].id;
          }
        }
      }
    }
    
    console.warn('  No category match found for:', categoryName);
    return null;
  } catch (error) {
    console.error('Error getting category ID:', error);
    throw error;
  }
}

async function findOrCreateCommodity(commodityData) {
  try {
    // First, try to find existing commodity
    // IMPORTANT: Include category_id in the search to allow same name in different categories
    const findQuery = `
      SELECT id FROM commodities 
      WHERE name = $1 AND specification = $2 AND category_id = $3
    `;
    
    const findResult = await pool.query(findQuery, [
      commodityData.name, 
      commodityData.specification,
      commodityData.category_id
    ]);
    
    // If exists, return its ID
    if (findResult.rows.length > 0) {
      return findResult.rows[0].id;
    }
    
    // If not exists, create new commodity
    const insertQuery = `
      INSERT INTO commodities (name, specification, category_id, unit)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const insertResult = await pool.query(insertQuery, [
      commodityData.name,
      commodityData.specification,
      commodityData.category_id,
      commodityData.unit
    ]);
    
    return insertResult.rows[0].id;
  } catch (error) {
    console.error('Error finding/creating commodity:', error);
    throw error;
  }
}

async function insertPriceHistory(commodityId, price, date) {
  try {
    const query = `
      INSERT INTO price_history (commodity_id, price, date)
      VALUES ($1, $2, $3)
      ON CONFLICT (commodity_id, date) 
      DO UPDATE SET price = $2
      RETURNING *
    `;
    const result = await pool.query(query, [commodityId, price, date]);
    return result.rows[0];
    } catch (error) {
    console.error('Error inserting price history:', error);
    throw error;
  }
};

async function checkPriceChange(commodityId, newPrice, date, threshold = 5) {
    try {
    // Get the most recent price BEFORE this date
    const query = `
      SELECT price FROM price_history
      WHERE commodity_id = $1 AND date < $2
      ORDER BY date DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [commodityId, date]);
    
    // If no previous price, nothing to compare
    if (result.rows.length === 0) {
      return null;
    }
    const oldPrice = parseFloat(result.rows[0].price);
    // Calculate change
    const changeAmount = newPrice - oldPrice;
    const changePercentage = (changeAmount / oldPrice) * 100;
    // Only record if change is significant
    if (Math.abs(changePercentage) >= threshold) {
        const insertQuery = `
        INSERT INTO price_changes 
        (commodity_id, old_price, new_price, change_amount, change_percentage, change_date, is_increase)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const changeResult = await pool.query(insertQuery, [
        commodityId,
        oldPrice,
        newPrice,
        changeAmount,
        changePercentage.toFixed(2),
        date,
        newPrice > oldPrice
      ]);
      return changeResult.rows[0];
    }
    
    return null;
    } catch (error) {
    console.error('Error checking price change:', error);
    throw error;
  }
}
// Get all commodities with optional filters
async function getAllCommodities(filters = {}) {
  try {
    let query = `
      SELECT 
        co.id,
        co.name,
        co.specification,
        co.unit,
        c.name as category_name,
        c.type as market_type,
        ph.price as latest_price,
        ph.date as price_date
      FROM commodities co
      JOIN categories c ON co.category_id = c.id
      LEFT JOIN LATERAL (
        SELECT price, date
        FROM price_history
        WHERE commodity_id = co.id
        ORDER BY date DESC
        LIMIT 1
      ) ph ON true
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Filter by category
    if (filters.category_id) {
      query += ` AND co.category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }
    
    // Filter by market type (wet/dry)
    if (filters.market_type) {
      query += ` AND c.type = $${paramCount}`;
      params.push(filters.market_type);
      paramCount++;
    }
    
    // Search by name
    if (filters.search) {
      query += ` AND co.name ILIKE $${paramCount}`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }
    
    query += ` ORDER BY co.name`;
    
    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting all commodities:', error);
    throw error;
  }
}

// Get single commodity with details
async function getCommodityById(id) {
  try {
    const query = `
      SELECT 
        co.id,
        co.name,
        co.specification,
        co.unit,
        c.name as category_name,
        c.type as market_type,
        ph.price as latest_price,
        ph.date as price_date
      FROM commodities co
      JOIN categories c ON co.category_id = c.id
      LEFT JOIN LATERAL (
        SELECT price, date
        FROM price_history
        WHERE commodity_id = co.id
        ORDER BY date DESC
        LIMIT 1
      ) ph ON true
      WHERE co.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting commodity by ID:', error);
    throw error;
  }
}

// Get price history for a commodity
async function getPriceHistory(commodityId, days = 30) {
  try {
    const query = `
      SELECT 
        date,
        price,
        source
      FROM price_history
      WHERE commodity_id = $1
        AND date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `;
    
    const result = await pool.query(query, [commodityId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting price history:', error);
    throw error;
  }
}

// Get recent price changes
async function getRecentPriceChanges(days = 7, minPercentage = 5) {
  try {
    const query = `
      SELECT 
        pc.id,
        co.name as commodity_name,
        co.specification,
        c.name as category_name,
        pc.old_price,
        pc.new_price,
        pc.change_amount,
        pc.change_percentage,
        pc.change_date,
        pc.is_increase
      FROM price_changes pc
      JOIN commodities co ON pc.commodity_id = co.id
      JOIN categories c ON co.category_id = c.id
      WHERE pc.change_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND ABS(pc.change_percentage) >= $1
      ORDER BY pc.change_date DESC, ABS(pc.change_percentage) DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [minPercentage]);
    return result.rows;
  } catch (error) {
    console.error('Error getting price changes:', error);
    throw error;
  }
}

// Get all categories
async function getAllCategories() {
  try {
    const query = `
      SELECT 
        c.id,
        c.name,
        c.type,
        COUNT(co.id) as commodity_count
      FROM categories c
      LEFT JOIN commodities co ON c.id = co.category_id
      GROUP BY c.id, c.name, c.type
      ORDER BY c.name
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

// Search commodities
async function searchCommodities(searchQuery) {
  try {
    const query = `
      SELECT 
        co.id,
        co.name,
        co.specification,
        c.name as category_name,
        ph.price as latest_price,
        ph.date as price_date
      FROM commodities co
      JOIN categories c ON co.category_id = c.id
      LEFT JOIN LATERAL (
        SELECT price, date
        FROM price_history
        WHERE commodity_id = co.id
        ORDER BY date DESC
        LIMIT 1
      ) ph ON true
      WHERE co.name ILIKE $1 OR co.specification ILIKE $1
      ORDER BY co.name
      LIMIT 20
    `;
    
    const result = await pool.query(query, [`%${searchQuery}%`]);
    return result.rows;
  } catch (error) {
    console.error('Error searching commodities:', error);
    throw error;
  }
}
module.exports = {
  getCategoryIdByName,
  findOrCreateCommodity,
  insertPriceHistory,
  checkPriceChange,
  getAllCommodities,
  getCommodityById,
  getPriceHistory,
  getRecentPriceChanges,
  getAllCategories,
  searchCommodities
};