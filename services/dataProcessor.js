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

/* Test
const sampleText = "DAILY PRICE INDEX\n(Tuesday, October 7, 2025)\nSome data...";
console.log('Extracted date:', extractDate(sampleText));
 Should print: Extracted date: 2025-10-07
*/
function splitIntoLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function isCategoryHeader(line) {
    const categoryKeywords = [
    'RICE',
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
  const upperLine = line.toUpperCase();
    return categoryKeywords.some(keyword => upperLine.includes(keyword));
};

/* Test
const testLines = [
  "FISH PRODUCTS",
  "Alumahan (Indian Mackerel) Medium (4-6 pcs/kg) 342.72",
  "BEEF MEAT PRODUCTS",
  "Some random text"
];

testLines.forEach(line => {
  console.log(`"${line}" is category:`, isCategoryHeader(line));
});

// Expected output:
// "FISH PRODUCTS" is category: true
// "Alumahan..." is category: false
// "BEEF MEAT PRODUCTS" is category: true
// "Some random text" is category: false
*/

function parseCommodityLine(line) {
  // Skip header lines and n/a
  if (line.includes('COMMODITY') ||
      line.includes('SPECIFICATION') ||
      line.includes('PRICE') ||
      line.includes('RETAIL PRICE') ||  // ← ADD THIS
      line.includes('UNIT') ||           // ← ADD THIS
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

  // Strategy: Find the LAST occurrence of specification patterns
  // Specification indicators (from right to left):
  // - Words in parentheses at the end: (something)
  // - Size indicators: Medium, Large, Small, etc.
  // - Number ranges: 3-4, 15-18, etc.
  
  let name = lineWithoutPrice;
  let specification = '';

  // Pattern 1: Ends with something in parentheses, possibly with text before it
  // Example: "Medium (4-6 pcs/kg)" or "Large (1-2 pcs)"
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

/* Test parsing
const testLines = [
  "Alumahan (Indian Mackerel) Medium (4-6 pcs/kg) 342.72",
  "Bangus, Large Large (1-2 pcs) 287.55",
  "Tomato 15-18 pcs/kg 155.30",
  "Special Rice White Rice 56.97",
  "Chicken Egg (White, Medium) 56-60 grams/pc 8.36",
  "n/a",  // Should return null
  "Page 1 of 8"  // Should return null
];

console.log('\n--- Testing Commodity Parser ---');
testLines.forEach(line => {
  const result = parseCommodityLine(line);
  console.log('\nInput:', line);
  console.log('Output:', result);
});
*/

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
      currentCategory = line.toUpperCase().trim();
      console.log(' Category detected:', currentCategory);  // Debug log
      continue;
    }
        if (!currentCategory) {
            continue; // Skip lines until a category is found
        }
        const commodity = parseCommodityLine(line);
        if (commodity) {
            commodity.category_name = currentCategory;
            commodity.unit  = 'kg';

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
  processFullDocument
};

/* Full document test
console.log('\n\n=== TESTING FULL DOCUMENT PROCESSING ===\n');

const fullText = `
DAILY PRICE INDEX
National Capital Region (NCR)
(Tuesday, October 7, 2025)

FISH PRODUCTS
Alumahan (Indian Mackerel) Medium (4-6 pcs/kg) 342.72
Bangus, Large Large (1-2 pcs) 287.55
Tilapia Medium (5-6 pcs/kg) 152.30

LOWLAND VEGETABLES
Tomato 15-18 pcs/kg 155.30
Eggplant 3-4 Small Bundles 145.40

FRUITS
Banana (Lakatan) 8-10 pcs/kg 98.07
`;

try {
  const result = processFullDocument(fullText);
  console.log('Date extracted:', result.date);
  console.log('\nTotal commodities found:', result.commodities.length);
  console.log('\nFirst 3 commodities:');
  result.commodities.slice(0, 3).forEach((item, index) => {
    console.log(`\n${index + 1}.`, item);
  });
} catch (error) {
  console.error('Error:', error.message);
}
*/

