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
    
    console.warn('⚠️  No category match found for:', categoryName);
    return null;
  } catch (error) {
    console.error('Error getting category ID:', error);
    throw error;
  }
}

async function findOrCreateCommodity(commodityData) {
    try {
    // First, try to find existing commodity
    const findQuery = `
      SELECT id FROM commodities 
      WHERE name = $1 AND specification = $2
    `;
    const findResult = await pool.query(findQuery, [
      commodityData.name, 
      commodityData.specification
    ]);
    if (findResult.rows.length > 0) {
      // Commodity exists, return its ID
      return findResult.rows[0].id;
    }
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
    console.error('Error in findOrCreateCommodity:', error);
    throw error;
  } 
};

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

module.exports = {
  getCategoryIdByName,
  findOrCreateCommodity,
  insertPriceHistory,
  checkPriceChange
};