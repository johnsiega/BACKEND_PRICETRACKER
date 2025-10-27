const { extractTextFromPDF } = require('./services/pdfParser');

async function test() {
  const text = await extractTextFromPDF('./Daily-Price-Index-October-7-2025.pdf');
  
  // Find rice sections
  const lines = text.split('\n');
  let inRiceSection = false;
  let riceLines = [];
  
  for (let line of lines) {
    if (line.includes('COMMERCIAL RICE')) {
      inRiceSection = true;
      riceLines.push('>>> ' + line);
    } else if (line.includes('CORN') || line.includes('FISH')) {
      inRiceSection = false;
    } else if (inRiceSection && line.trim()) {
      riceLines.push(line);
    }
  }
  
  console.log('Rice sections found in PDF:');
  riceLines.forEach(line => console.log(line));
}

test();