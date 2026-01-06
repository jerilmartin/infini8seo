import logger from '../../utils/logger.js';

/**
 * Google Custom Search API Integration
 * Provides accurate, structured SERP data for position checking
 */

const CSE_API_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Search Google using Custom Search API
 * Returns structured results with exact positions
 * 
 * @param {string} query - Search query
 * @param {number} numResults - Number of results (max 10)
 * @returns {Promise<Array>} Array of search results with position, title, url, domain
 */
export async function searchGoogle(query, numResults = 10) {
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;

    logger.info(`Google CSE check: API Key=${apiKey ? 'SET (' + apiKey.substring(0, 10) + '...)' : 'MISSING'}, CX=${cx || 'MISSING'}`);

    if (!apiKey || !cx) {
        logger.warn('Google CSE credentials not configured, skipping API search');
        return null; // Signal to use fallback
    }

    try {
        const url = `${CSE_API_URL}?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${Math.min(numResults, 10)}`;
        logger.info(`Searching Google CSE for: "${query}"`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Google CSE API error (${response.status}): ${errorText.substring(0, 500)}`);
            return null;
        }

        const data = await response.json();
        logger.info(`Google CSE returned ${data.items?.length || 0} results for "${query}"`);

        return (data.items || []).map((item, index) => ({
            position: index + 1,
            title: item.title,
            url: item.link,
            domain: extractDomainFromUrl(item.link),
            snippet: item.snippet
        }));
    } catch (error) {
        logger.error('Google CSE fetch failed:', error.message);
        return null;
    }
}

/**
 * Extract clean domain from URL
 */
function extractDomainFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return url.split('/')[2]?.replace(/^www\./, '').toLowerCase() || '';
    }
}

/**
 * Check if a target domain ranks in top N for a keyword
 * Uses flexible domain matching to catch variations
 * 
 * @param {string} keyword - Search keyword
 * @param {string} targetDomain - Domain to look for (e.g., "chatgpt.com")
 * @returns {Promise<Object|null>} { keyword, position, url } or null if not found
 */
export async function checkDomainPosition(keyword, targetDomain) {
    const results = await searchGoogle(keyword, 10);

    if (!results) {
        return null; // API not available or error
    }

    const cleanTarget = targetDomain.replace(/^www\./, '').toLowerCase();

    // Flexible domain matching - handles variations
    const match = results.find(r => {
        const resultDomain = r.domain;

        // Exact match
        if (resultDomain === cleanTarget) return true;

        // Subdomain match (chat.openai.com for openai.com)
        if (resultDomain.endsWith('.' + cleanTarget)) return true;

        // Parent domain match (openai.com for chatgpt.com via known mappings)
        // For chatgpt.com, also accept openai.com results
        const knownMappings = {
            'chatgpt.com': ['openai.com', 'chat.openai.com'],
            'bard.google.com': ['google.com', 'ai.google'],
            'claude.ai': ['anthropic.com'],
        };

        const alternates = knownMappings[cleanTarget] || [];
        if (alternates.some(alt => resultDomain === alt || resultDomain.endsWith('.' + alt))) {
            return true;
        }

        // Partial match (core domain name appears)
        const coreName = cleanTarget.split('.')[0];
        if (coreName.length > 3 && resultDomain.includes(coreName)) {
            return true;
        }

        return false;
    });

    if (match) {
        return {
            keyword,
            position: match.position,
            url: match.url,
            matchedDomain: match.domain,
            source: 'google_cse'
        };
    }

    return null;
}

/**
 * Batch check multiple keywords for a domain
 * 
 * @param {string[]} keywords - Array of keywords to check
 * @param {string} targetDomain - Domain to look for
 * @returns {Promise<Object>} { rankings: [...], available: boolean }
 */
export async function batchCheckPositions(keywords, targetDomain) {
    const results = {
        rankings: [],
        notRanking: [],
        available: true
    };

    // Check if API is configured
    if (!process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_ID) {
        results.available = false;
        return results;
    }

    for (const keyword of keywords) {
        try {
            const position = await checkDomainPosition(keyword, targetDomain);

            if (position) {
                results.rankings.push(position);
                logger.info(`✓ Found "${keyword}" at position #${position.position}`);
            } else {
                results.notRanking.push(keyword);
                logger.info(`✗ "${keyword}" not in top 10`);
            }

            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            logger.error(`Error checking "${keyword}":`, error.message);
            results.notRanking.push(keyword);
        }
    }

    return results;
}

export default {
    searchGoogle,
    checkDomainPosition,
    batchCheckPositions
};
