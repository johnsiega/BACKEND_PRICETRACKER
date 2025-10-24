const pool = require('./config/db');
const {
  getCategoryIdByName,
  findOrCreateCommodity,
  insertPriceHistory,
  checkPriceChange
} = require('./models/commodityModel');

async function testModel() {
  try {
    // Test 1: Get category ID
    console.log('=== Test 1: Get Category ID ===');
    const categoryId = await getCategoryIdByName('FISH PRODUCTS');
    console.log('Fish Products category ID:', categoryId);

    // Test 2: Create commodity
    console.log('\n=== Test 2: Create Commodity ===');
    const commodityId = await findOrCreateCommodity({
      name: 'Test Tomato',
      specification: '15-18 pcs/kg',
      category_id: categoryId,
      unit: 'kg'
    });
    console.log('Commodity ID:', commodityId);

    // Test 3: Insert price
    console.log('\n=== Test 3: Insert Price ===');
    const priceRecord = await insertPriceHistory(commodityId, 150.00, '2025-10-07');
    console.log('Price saved:', priceRecord);

    // Test 4: Insert different price (should detect change)
    console.log('\n=== Test 4: Check Price Change ===');
    await insertPriceHistory(commodityId, 160.00, '2025-10-08');
    const change = await checkPriceChange(commodityId, 160.00, '2025-10-08');
    console.log('Price change detected:', change);

    console.log('\n✅ All tests passed!');
    pool.end();
  } catch (error) {
    console.error('❌ Test failed:', error);
    pool.end();
  }
}

testModel();