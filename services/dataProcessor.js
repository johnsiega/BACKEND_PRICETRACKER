function extractDate(text) {
    const dateRegex = /\(([^)]+day[^)]+\d{4})\)/;
    const match = text.match(dateRegex);
    if (match ) {
        const dateString = match[1];
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return null;
}

function splitIntoLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function isCategoryHeader(line) {
  const categoryKeywords = [
    'IMPORTED COMMERCIAL RICE',
    'LOCAL COMMERCIAL RICE',
    'CORN PRODUCTS',
    'FISH PRODUCTS',
    'BEEF MEAT PRODUCTS',
    'PORK MEAT PRODUCTS',
    'OTHER LIVESTOCK MEAT PRODUCTS',
    'POULTRY PRODUCTS',
    'LOWLAND VEGETABLES',
    'HIGHLAND VEGETABLES',
    'SPICES',
    'FRUITS',
    'OTHER BASIC COMMODITIES'
  ];
  
  const upperLine = line.toUpperCase().trim();
  
  // Must not contain numbers (categories don't have prices)
  const hasNumber = /\d/.test(line);
  if (hasNumber) {
    return false;
  }
  
  // Must be EXACT match (not just contains)
  return categoryKeywords.includes(upperLine);
}

function normalizeCategoryName(pdfCategoryName) {
  // Map PDF category names to database category names
  const categoryMap = {
    'IMPORTED COMMERCIAL RICE': 'Imported Commercial Rice',
    'LOCAL COMMERCIAL RICE': 'Local Commercial Rice',
    'CORN PRODUCTS': 'Corn Products',
    'FISH PRODUCTS': 'Fish Products',
    'BEEF MEAT PRODUCTS': 'Beef Meat Products',
    'PORK MEAT PRODUCTS': 'Pork Meat Products',
    'OTHER LIVESTOCK MEAT PRODUCTS': 'Other Livestock Meat Products',
    'POULTRY PRODUCTS': 'Poultry Products',
    'LOWLAND VEGETABLES': 'Lowland Vegetables',
    'HIGHLAND VEGETABLES': 'Highland Vegetables',
    'SPICES': 'Spices',
    'FRUITS': 'Fruits',
    'OTHER BASIC COMMODITIES': 'Other Basic Commodities'
  };
  
  const upperName = pdfCategoryName.toUpperCase().trim();
  return categoryMap[upperName] || pdfCategoryName;
}

function parseCommodityLine(line) {
  // Skip header lines and n/a
  if (line.includes('COMMODITY') ||
      line.includes('SPECIFICATION') ||
      line.includes('PRICE') ||
      line.includes('RETAIL PRICE') ||
      line.includes('UNIT') ||
      line.includes('Page ') ||
      line.includes('n/a')) {
    return null;
  }

  // Extract price (last number with 2 decimals)
  const priceRegex = /(\d+\.\d{2})\s*$/;
  const priceMatch = line.match(priceRegex);
  
  if (!priceMatch) {
    return null;
  }

  const price = parseFloat(priceMatch[1]);
  const lineWithoutPrice = line.replace(priceRegex, '').trim();

  let name = lineWithoutPrice;
  let specification = '';

  // Pattern 1: Ends with something in parentheses, possibly with text before it
  const pattern1 = /^(.+?)\s+((?:Medium|Large|Small|Ripe|Fresh|Frozen|Male|Female).*\([^)]+\))$/;
  let match = lineWithoutPrice.match(pattern1);
  
  if (match) {
    name = match[1].trim();
    specification = match[2].trim();
    return { name, specification, price };
  }

  // Pattern 2: Has number range (like "15-18 pcs/kg" or "3-4 Small Bundles")
  const pattern2 = /^(.+?)\s+(\d+-\d+.*)$/;
  match = lineWithoutPrice.match(pattern2);
  
  if (match) {
    name = match[1].trim();
    specification = match[2].trim();
    return { name, specification, price };
  }

  // Pattern 3: Ends with just size words without parentheses
  const pattern3 = /^(.+?)\s+(Medium|Large|Small|Ripe|Fresh|Frozen)$/;
  match = lineWithoutPrice.match(pattern3);
  
  if (match) {
    name = match[1].trim();
    specification = match[2].trim();
    return { name, specification, price };
  }

  // Pattern 4: Has parentheses anywhere - split at LAST occurrence before size word
  const pattern4 = /^(.+\([^)]+\))\s+(.+)$/;
  match = lineWithoutPrice.match(pattern4);
  
  if (match) {
    name = match[1].trim();
    specification = match[2].trim();
    return { name, specification, price };
  }

  // If no pattern matched, entire line is the name (no specification)
  return { name: lineWithoutPrice, specification: '', price };
}

function processFullDocument(text) {
    const result = {
        date: null,
        commodities: []
    };
    result.date = extractDate(text);

    if (!result.date) {
        throw new Error('Could not extract date from PDF');
    }
    const lines = splitIntoLines(text);
    let currentCategory = null;
    for (let i=0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line is a category header
        if (isCategoryHeader(line)) {
          // Normalize category name for better matching
          currentCategory = normalizeCategoryName(line);
          console.log('Category detected:', currentCategory);
          continue;
        }
        
        if (!currentCategory) {
            continue;
        }
        
        const commodity = parseCommodityLine(line);
        if (commodity) {
            commodity.category_name = currentCategory;
            commodity.unit = 'kg';
            
            // DEBUG: Log rice commodities
            if (commodity.category_name.includes('Rice')) {
              console.log('DEBUG Rice commodity:', {
                name: commodity.name,
                category: commodity.category_name
              });
            }
            
            result.commodities.push(commodity);
        }
    }
    return result;
}

// Export all functions
module.exports = {
  extractDate,
  splitIntoLines,
  isCategoryHeader,
  parseCommodityLine,
  processFullDocument,
  normalizeCategoryName
};