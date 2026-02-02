import logger from '../../utils/logger.js';

/**
 * Google Cloud Natural Language API Utility
 * Provides advanced text analysis (Entities, Sentiment, Salience)
 */

const NL_API_URL = 'https://language.googleapis.com/v1/documents';

/**
 * Analyze entities and salience in text
 * 
 * @param {string} text - The content to analyze
 * @returns {Promise<Object|null>} Entities with salience scores
 */
export async function analyzeContentEntities(text) {
    // Use GEMINI_API_KEY instead of GOOGLE_CSE_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        logger.warn('GEMINI_API_KEY missing, skipping Natural Language analysis');
        return null;
    }

    if (!text || text.length < 50) {
        logger.warn('Text too short for meaningful Natural Language analysis');
        return null;
    }

    try {
        const url = `${NL_API_URL}:analyzeEntities?key=${apiKey}`;

        const payload = {
            document: {
                type: 'PLAIN_TEXT',
                content: text.substring(0, 10000) // API limit is around 1MB, but 10k chars is plenty for SEO
            },
            encodingType: 'UTF8'
        };

        logger.info(`Sending content to Natural Language API (${text.length} chars)`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Natural Language API error (${response.status}): ${errorText.substring(0, 500)}`);
            return null;
        }

        const data = await response.json();

        // Return top entities by salience
        return (data.entities || [])
            .sort((a, b) => b.salience - a.salience)
            .slice(0, 10)
            .map(e => ({
                name: e.name,
                type: e.type,
                salience: e.salience,
                metadata: e.metadata || {}
            }));

    } catch (error) {
        logger.error('Natural Language analysis failed:', error.message);
        return null;
    }
}

/**
 * Analyze overall sentiment of the text
 */
export async function analyzeSentiment(text) {
    // Use GEMINI_API_KEY instead of GOOGLE_CSE_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const url = `${NL_API_URL}:analyzeSentiment?key=${apiKey}`;
        const payload = {
            document: { type: 'PLAIN_TEXT', content: text.substring(0, 5000) }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data.documentSentiment;
    } catch {
        return null;
    }
}

export default {
    analyzeContentEntities,
    analyzeSentiment
};
