import logger from '../../utils/logger.js';

/**
 * Automatically highlight SEO keywords in content with proper escaping
 */
export function highlightKeywords(content, keywords, wordCount = 1200) {
  if (!content || !keywords || keywords.length === 0) {
    logger.warn('No content or keywords for highlighting');
    return content;
  }
  
  const targetHighlights = Math.floor(20 + ((wordCount - 500) / 100));
  logger.info(`Highlighting keywords - target: ${targetHighlights} for ${wordCount} words`);
  
  let result = content;
  let totalHighlights = 0;
  const highlightedPositions = new Set(); // Track what we've already highlighted
  
  // Process each keyword
  for (const keyword of keywords) {
    if (!keyword || totalHighlights >= targetHighlights) break;
    
    const kw = keyword.trim();
    if (!kw) continue;
    
    const maxPerKeyword = 3;
    let highlightedCount = 0;
    
    // Escape special regex characters
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex for word boundary matching (case insensitive)
    const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');
    
    // Find all matches first
    const matches = [];
    let match;
    while ((match = regex.exec(result)) !== null) {
      // Skip if already inside a <mark> tag or heading
      const before = result.substring(Math.max(0, match.index - 50), match.index);
      const after = result.substring(match.index, Math.min(result.length, match.index + 100));
      
      // Skip if already highlighted or in a heading
      if (before.includes('<mark') && !before.includes('</mark>')) continue;
      if (before.includes('\n#') || after.startsWith('#')) continue;
      if (highlightedPositions.has(match.index)) continue;
      
      matches.push({
        index: match.index,
        text: match[1],
        length: match[1].length
      });
    }
    
    // Highlight matches (in reverse order to preserve indices)
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
