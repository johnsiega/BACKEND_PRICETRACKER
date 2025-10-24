const { extractTextFromPDF } = require('../services/pdfParser');
const { processFullDocument } = require('../services/dataProcessor');
const {
  getCategoryIdByName,
  findOrCreateCommodity,
  insertPriceHistory,
  checkPriceChange
} = require('../models/commodityModel');
const fs = require('fs');

async function processUpload(req, res) {
    try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('📄 Processing PDF:', req.file.originalname);
    // Step 1: Extract text from PDF
    const filePath = req.file.path;
    const text = await extractTextFromPDF(filePath);
    console.log('✅ Text extracted, length:', text.length);
    // Step 2: Process the document
    const processedData = processFullDocument(text);
    console.log('✅ Document processed');
    console.log('   Date:', processedData.date);
    console.log('   Commodities found:', processedData.commodities.length);
    // Step 3: Save to database
    const summary = {
      date: processedData.date,
      totalCommodities: processedData.commodities.length,
      saved: 0,
      priceChanges: []
    };
    for (const commodity of processedData.commodities) {
        try {
        // Get category ID
        const categoryId = await getCategoryIdByName(commodity.category_name);
        
        if (!categoryId) {
          console.warn('⚠️  Category not found:', commodity.category_name);
          continue;
        }
        // Find or create commodity
        const commodityId = await findOrCreateCommodity({
          name: commodity.name,
          specification: commodity.specification,
          category_id: categoryId,
          unit: commodity.unit
        });
        // Insert price history
        await insertPriceHistory(
          commodityId,
          commodity.price,
          processedData.date
        );
        summary.saved++;
        // Check for price changes
        const priceChange = await checkPriceChange(
          commodityId,
          commodity.price,
          processedData.date
        );
            if (priceChange) {
          summary.priceChanges.push({
            name: commodity.name,
            oldPrice: parseFloat(priceChange.old_price),
            newPrice: parseFloat(priceChange.new_price),
            changePercentage: parseFloat(priceChange.change_percentage),
            isIncrease: priceChange.is_increase
          });
        }
        } catch (itemError) {
        console.error('Error processing commodity:', commodity.name, itemError.message);
        // Continue with next commodity
      }
    };
    console.log('✅ Saved to database:', summary.saved, 'commodities');
    console.log('📊 Price changes detected:', summary.priceChanges.length);
    // Step 4: Delete temporary PDF file
    fs.unlinkSync(filePath);
    console.log('🗑️  Temporary file deleted');
  // Step 5: Send success response
    res.status(200).json({
      success: true,
      message: 'PDF processed successfully',
      summary: summary
    });
    } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message
    });
  }
};
module.exports = { processUpload };