import archiver from 'archiver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import MarkdownIt from 'markdown-it';
import logger from '../utils/logger.js';

const md = new MarkdownIt();

/**
 * Export Service - Handles content export in various formats
 */

/**
 * Convert markdown to DOCX format
 */
export async function markdownToDocx(title, content) {
  try {
    // Parse markdown to extract structure
    const lines = content.split('\n');
    const docElements = [];

    // Add title
    docElements.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    );

    let currentParagraph = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Handle headings
      if (trimmed.startsWith('# ')) {
        if (currentParagraph.length > 0) {
          docElements.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
        docElements.push(
          new Paragraph({
            text: trimmed.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        );
      } else if (trimmed.startsWith('## ')) {
        if (currentParagraph.length > 0) {
          docElements.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
        docElements.push(
          new Paragraph({
            text: trimmed.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 }
          })
        );
      } else if (trimmed.startsWith('### ')) {
        if (currentParagraph.length > 0) {
          docElements.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
        docElements.push(
          new Paragraph({
            text: trimmed.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        );
      } else if (trimmed === '') {
        // Empty line - flush current paragraph
        if (currentParagraph.length > 0) {
          docElements.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
          currentParagraph = [];
        }
      } else {
        // Regular text - parse inline formatting
        const textRuns = parseInlineFormatting(trimmed);
        currentParagraph.push(...textRuns);
      }
    }

    // Flush remaining paragraph
    if (currentParagraph.length > 0) {
      docElements.push(new Paragraph({ children: currentParagraph, spacing: { after: 200 } }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: docElements
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    logger.error('Failed to convert markdown to DOCX:', error);
    throw error;
  }
}

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 */
function parseInlineFormatting(text) {
  const runs = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Bold (**text**)
    if (text.substring(i, i + 2) === '**') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText }));
        currentText = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        runs.push(new TextRun({ text: text.substring(i + 2, endIndex), bold: true }));
        i = endIndex + 2;
        continue;
      }
    }

    // Italic (*text* or _text_)
    if (text[i] === '*' || text[i] === '_') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText }));
        currentText = '';
      }
      const endChar = text[i];
      const endIndex = text.indexOf(endChar, i + 1);
      if (endIndex !== -1) {
        runs.push(new TextRun({ text: text.substring(i + 1, endIndex), italics: true }));
        i = endIndex + 1;
        continue;
      }
    }

    // Code (`text`)
    if (text[i] === '`') {
      if (currentText) {
        runs.push(new TextRun({ text: currentText }));
        currentText = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex !== -1) {
        runs.push(new TextRun({ 
          text: text.substring(i + 1, endIndex),
          font: 'Courier New',
          color: '666666'
        }));
        i = endIndex + 1;
        continue;
      }
    }

    // Links [text](url) - just extract text
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i);
      const openParen = text.indexOf('(', closeBracket);
      const closeParen = text.indexOf(')', openParen);
      
      if (closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1) {
        if (currentText) {
          runs.push(new TextRun({ text: currentText }));
          currentText = '';
        }
        const linkText = text.substring(i + 1, closeBracket);
        runs.push(new TextRun({ text: linkText, color: '0000FF', underline: {} }));
        i = closeParen + 1;
        continue;
      }
    }

    // Remove HTML tags (like <mark>)
    if (text[i] === '<') {
      const closeTag = text.indexOf('>', i);
      if (closeTag !== -1) {
        i = closeTag + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    runs.push(new TextRun({ text: currentText }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '' })];
}

/**
 * Create a ZIP archive with multiple files
 */
export function createZipArchive() {
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  archive.on('error', (err) => {
    logger.error('Archive error:', err);
    throw err;
  });

  return archive;
}

/**
 * Add file to archive
 */
export function addFileToArchive(archive, content, filename) {
  if (Buffer.isBuffer(content)) {
    archive.append(content, { name: filename });
  } else {
    archive.append(content, { name: filename });
  }
}

/**
 * Generate safe filename from title
 */
export function generateSafeFilename(title, extension = 'md') {
  const safe = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
  
  return `${safe}.${extension}`;
}

export default {
  markdownToDocx,
  createZipArchive,
  addFileToArchive,
  generateSafeFilename
};
