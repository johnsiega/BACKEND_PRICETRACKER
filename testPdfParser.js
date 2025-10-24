const { extractTextFromPDF } = require('./services/pdfParser');

async function test() {
  try {
    // Use your actual PDF file path
    const text = await extractTextFromPDF('./Daily-Price-Index-October-7-2025.pdf');
    
    console.log('✅ PDF parsed successfully!');
    console.log('First 500 characters:');
    console.log(text.substring(0, 500));
    console.log('\n--- END OF SAMPLE ---');
    console.log('Total text length:', text.length);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();