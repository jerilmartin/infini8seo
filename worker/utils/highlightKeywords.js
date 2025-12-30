import logger from '../../utils/logger.js';

/**
 * Automatically highlight SEO keywords in content with proper escaping
 * Only highlights in paragraph text, never in headings, subheadings, or tables
 */
export function highlightKeywords(content, keywords, wordCount = 1200) {
  if (!content || !keywords || keywords.length === 0) {
    logger.warn('No content or keywords for highlighting');
    return content;
  }
  
  // Slightly increased target: was 20 + (wordCount-500)/100, now 25 + (wordCount-500)/80
  const targetHighlights = Math.floor(25 + ((wordCount - 500) / 80));
  logger.info(`Highlighting keywords - target: ${targetHighlights} for ${wordCount} words`);
  
  let result = content;
  let totalHighlights = 0;
  const highlightedPositions = new Set();
  
  for (const keyword of keywords) {
    if (!keyword || totalHighlights >= targetHighlights) break;
    
    const kw = keyword.trim();
    if (!kw) continue;
    
    // Increased from 3 to 4 per keyword
    const maxPerKeyword = 4;
    let highlightedCount = 0;
    
    // Properly escape regex special characters
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');
    
    const matches = [];
    let match;
    while ((match = regex.exec(result)) !== null) {
      const before = result.substring(Math.max(0, match.index - 100), match.index);
      const after = result.substring(match.index, Math.min(result.length, match.index + 100));
      
      // Skip if already highlighted
      if (before.includes('<mark') && !before.includes('</mark>')) continue;
      
      // Skip if in a heading (# at start of line or after newline)
      if (/\n#+\s/.test(before) || /^#+\s/.test(before)) continue;
      
      // Skip if followed by heading marker
      if (/^\s*#+\s/.test(after)) continue;
      
      // Skip if inside HTML tags
      if (before.includes('<') && !before.includes('>')) continue;
      
      // Skip if inside a markdown table (line contains |)
      const lineStart = before.lastIndexOf('\n');
      const lineEnd = after.indexOf('\n');
      const currentLine = before.substring(lineStart + 1) + after.substring(0, lineEnd > -1 ? lineEnd : after.length);
      if (currentLine.includes('|')) continue;
      
      // Skip if already highlighted at this position
      if (highlightedPositions.has(match.index)) continue;
      
      matches.push({
        index: match.index,
        text: match[1],
        length: match[1].length
      });
    }
    
    // Process matches in reverse order to maintain correct indices
    matches.reverse().slice(0, maxPerKeyword).forEach(m => {
      if (highlightedCount >= maxPerKeyword || totalHighlights >= targetHighlights) return;
      
      const highlighted = `<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">${m.text}</mark>`;
      result = result.substring(0, m.index) + highlighted + result.substring(m.index + m.length);
      
      highlightedPositions.add(m.index);
      highlightedCount++;
      totalHighlights++;
    });
    
    if (highlightedCount > 0) {
      logger.info(`Highlighted "${kw}" ${highlightedCount} times`);
    }
  }
  
  logger.info(`Total keywords highlighted: ${totalHighlights} out of target ${targetHighlights}`);
  return result;
}
