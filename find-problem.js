import { readFileSync } from 'fs';

const responseText = readFileSync('gemini-response.txt', 'utf-8');

// Clean it
let cleaned = responseText.trim();
if (cleaned.startsWith('```')) {
  cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
}

console.log('Finding the problem character at position ~3600...\n');
console.log('='.repeat(80));

// Show context around position 3600
const start = Math.max(0, 3550);
const end = Math.min(cleaned.length, 3650);

console.log(`\nCharacters from position ${start} to ${end}:`);
console.log('='.repeat(80));
console.log(cleaned.substring(start, end));
console.log('='.repeat(80));

// Try to find all backticks in the cleaned text
console.log('\n\nSearching for backticks (`) in the cleaned JSON...');
const backtickPositions = [];
for (let i = 0; i < cleaned.length; i++) {
  if (cleaned[i] === '`') {
    backtickPositions.push(i);
    console.log(`Found backtick at position ${i}`);
    console.log(`  Context: "${cleaned.substring(Math.max(0, i-20), Math.min(cleaned.length, i+20))}"`);
  }
}

if (backtickPositions.length === 0) {
  console.log('No backticks found in cleaned JSON!');
  console.log('\n\nLet me try parsing with explicit error location...');
  
  try {
    JSON.parse(cleaned);
  } catch (e) {
    console.log(`\nParse error: ${e.message}`);
    
    // Try to extract position from error
    const posMatch = e.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      console.log(`\nShowing characters around position ${pos}:`);
      console.log('='.repeat(80));
      console.log(cleaned.substring(Math.max(0, pos-100), Math.min(cleaned.length, pos+100)));
      console.log('='.repeat(80));
      console.log(`Character at position ${pos}: "${cleaned[pos]}" (charCode: ${cleaned.charCodeAt(pos)})`);
    }
  }
}

