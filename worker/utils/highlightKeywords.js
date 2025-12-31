import logger from '../../utils/logger.js';

/**
 * Automatically highlight SEO keywords in content with proper escaping
 * Only highlights in paragraph text, never in headings, subheadings, or tables
 * Rules:
 * - Max 1-2 highlighted phrases per paragraph
 * - Evenly distributed across the article
 * - Never stacked close together
 */
export function highlightKeywords(content, keywords, wordCount = 1200) {
  if (!content || !keywords || keywords.length === 0) {
    logger.warn('No content or keywords for highlighting');
    return content;
  }

  // Target: fewer highlights, more evenly distributed
  // Aim for ~1 highlight per 150-200 words
  const targetHighlights = Math.min(
    Math.floor(wordCount / 175),
    12 // Hard cap to prevent over-highlighting
  );

  logger.info(`Highlighting keywords - target: ${targetHighlights} for ${wordCount} words`);

  // Split content into paragraphs for even distribution
  const paragraphs = content.split(/\n\n+/);
  const paragraphsWithHighlights = new Set();

  let result = content;
  let totalHighlights = 0;
  const highlightedPositions = [];

  // Distribute highlights evenly - skip some paragraphs
  const skipInterval = Math.max(1, Math.floor(paragraphs.length / (targetHighlights + 1)));

  for (const keyword of keywords) {
    if (!keyword || totalHighlights >= targetHighlights) break;

    const kw = keyword.trim();
    if (!kw) continue;

    // Max 2 per keyword
    const maxPerKeyword = 2;
    let highlightedCount = 0;

    // Properly escape regex special characters
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedKw})\\b`, 'gi');

    const matches = [];
    let match;
    while ((match = regex.exec(result)) !== null) {
      const before = result.substring(Math.max(0, match.index - 150), match.index);
      const after = result.substring(match.index, Math.min(result.length, match.index + 150));

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

      // Find which paragraph this match is in
      let charCount = 0;
      let paragraphIndex = 0;
      for (let i = 0; i < paragraphs.length; i++) {
        charCount += paragraphs[i].length + 2; // +2 for \n\n
        if (match.index < charCount) {
          paragraphIndex = i;
          break;
        }
      }

      // Skip if this paragraph already has a highlight
      if (paragraphsWithHighlights.has(paragraphIndex)) continue;

      // Skip if too close to another highlight (within 200 chars)
      const tooClose = highlightedPositions.some(pos => Math.abs(pos - match.index) < 200);
      if (tooClose) continue;

      matches.push({
        index: match.index,
        text: match[1],
        length: match[1].length,
        paragraphIndex
      });
    }

    // Process matches - prioritize even distribution across paragraphs
    const sortedMatches = matches.sort((a, b) => a.paragraphIndex - b.paragraphIndex);

    // Take only matches from paragraphs we haven't highlighted yet
    for (const m of sortedMatches) {
      if (highlightedCount >= maxPerKeyword || totalHighlights >= targetHighlights) break;
      if (paragraphsWithHighlights.has(m.paragraphIndex)) continue;

      // Simple mark tag - styling handled by CSS
      const highlighted = `<mark>${m.text}</mark>`;
      result = result.substring(0, m.index) + highlighted + result.substring(m.index + m.length);

      highlightedPositions.push(m.index);
      paragraphsWithHighlights.add(m.paragraphIndex);
      highlightedCount++;
      totalHighlights++;

      // Adjust indices for subsequent matches (we added characters)
      const addedLength = highlighted.length - m.length;
      for (const match of sortedMatches) {
        if (match.index > m.index) {
          match.index += addedLength;
        }
      }
    }

    if (highlightedCount > 0) {
      logger.info(`Highlighted "${kw}" ${highlightedCount} times`);
    }
  }

  logger.info(`Total keywords highlighted: ${totalHighlights} out of target ${targetHighlights}`);
  return result;
}
