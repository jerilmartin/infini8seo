import logger from '../../utils/logger.js';

/**
 * Google Ads Keyword Planner API
 * Gets REAL search volume and competition data
 */

const KEYWORD_PLANNER_API = 'https://googleads.googleapis.com/v18/customers';

/**
 * Get keyword ideas and search volume using Google Ads API
 * Requires OAuth 2.0 access token
 * 
 * @param {string[]} keywords - Keywords to check
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Array>} Keyword data with volume and competition
 */
export async function getKeywordMetrics(keywords, accessToken) {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!customerId || !developerToken || !accessToken) {
        logger.warn('Google Ads API not configured - search volume unavailable');
        return null;
    }

    try {
        const url = `${KEYWORD_PLANNER_API}/${customerId}/googleAds:generateKeywordIdeas`;

        const payload = {
            keywords: keywords.slice(0, 10), // Limit to 10 keywords per request
            geoTargetConstants: ['geoTargetConstants/2356'], // India
            language: 'languageConstants/1000', // English
            includeAdultKeywords: false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'developer-token': developerToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error(`Keyword Planner API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.results?.map(result => ({
            keyword: result.text,
            avgMonthlySearches: result.keywordIdeaMetrics?.avgMonthlySearches || 0,
            competition: result.keywordIdeaMetrics?.competition || 'UNKNOWN',
            competitionIndex: result.keywordIdeaMetrics?.competitionIndex || 0,
            lowTopOfPageBid: result.keywordIdeaMetrics?.lowTopOfPageBidMicros / 1000000 || 0,
            highTopOfPageBid: result.keywordIdeaMetrics?.highTopOfPageBidMicros / 1000000 || 0
        })) || [];

    } catch (error) {
        logger.error('Keyword Planner fetch failed:', error.message);
        return null;
    }
}

/**
 * Extract keyword PHRASES (2-3 words) from page content
 * This gives us ACTUAL product/service phrases the site is targeting
 * Returns meaningful phrases like "maternity wear online", "real estate coimbatore"
 */
export function extractRealKeywords(pageContent) {
    if (!pageContent) return [];

    const phrases = new Set();
    const singleKeywords = new Set();

    // Use HTML content if available, otherwise use text
    const content = pageContent.html || pageContent.text || '';
    
    if (!content || content.length < 100) {
        return [];
    }

    const stopWords = ['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'will', 'your', 'their', 'about', 'more', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between'];
    
    // Helper function to extract phrases from text
    function extractPhrasesFromText(text, maxPhrases = 10) {
        const cleaned = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const words = cleaned.split(' ').filter(w => w.length >= 3 && !stopWords.includes(w));
        
        // Extract 2-word phrases
        for (let i = 0; i < words.length - 1 && phrases.size < maxPhrases; i++) {
            const phrase = `${words[i]} ${words[i + 1]}`;
            if (phrase.length >= 8 && phrase.length <= 40) {
                phrases.add(phrase);
            }
        }
        
        // Extract 3-word phrases (most valuable)
        for (let i = 0; i < words.length - 2 && phrases.size < maxPhrases; i++) {
            const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (phrase.length >= 12 && phrase.length <= 50) {
                phrases.add(phrase);
            }
        }
        
        // Also collect single keywords as fallback
        words.forEach(w => {
            if (w.length >= 4 && w.length <= 20) {
                singleKeywords.add(w);
            }
        });
    }

    // 1. Extract from meta keywords (highest priority - often has phrases)
    const metaKeywords = content.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    if (metaKeywords && metaKeywords[1]) {
        metaKeywords[1].split(',').forEach(kw => {
            const cleaned = kw.trim().toLowerCase();
            if (cleaned.length >= 8 && cleaned.length <= 50 && cleaned.includes(' ')) {
                phrases.add(cleaned);
            } else if (cleaned.length >= 4 && cleaned.length <= 20) {
                singleKeywords.add(cleaned);
            }
        });
    }

    // 2. Extract from meta description (product/service descriptions)
    const metaDesc = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDesc && metaDesc[1]) {
        extractPhrasesFromText(metaDesc[1], 5);
    }

    // 3. Extract from title tag (high priority)
    const title = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title && title[1]) {
        extractPhrasesFromText(title[1], 5);
    }

    // 4. Extract from h1 tags (main headings - product/service categories)
    const h1Matches = content.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi);
    for (const match of h1Matches) {
        extractPhrasesFromText(match[1], 3);
    }

    // 5. Extract from h2 tags (subheadings - product names)
    const h2Matches = content.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi);
    let h2Count = 0;
    for (const match of h2Matches) {
        if (h2Count++ < 5) {
            extractPhrasesFromText(match[1], 2);
        }
    }

    // 6. Extract from alt tags (product names)
    const altMatches = content.matchAll(/alt=["']([^"']+)["']/gi);
    let altCount = 0;
    for (const match of altMatches) {
        if (altCount++ < 10) {
            extractPhrasesFromText(match[1], 2);
        }
    }

    // 7. Extract from aria-label (common in modern sites)
    if (pageContent.html) {
        const ariaLabels = pageContent.html.matchAll(/aria-label=["']([^"']+)["']/gi);
        let ariaCount = 0;
        for (const match of ariaLabels) {
            if (ariaCount++ < 10) {
                extractPhrasesFromText(match[1], 2);
            }
        }
    }

    // Combine phrases and single keywords (prioritize phrases)
    const allKeywords = [
        ...Array.from(phrases),
        ...Array.from(singleKeywords).slice(0, 15) // Add some single keywords as fallback
    ];

    // Filter out generic/useless phrases
    const genericPhrases = ['home page', 'click here', 'read more', 'learn more', 'contact us', 'about us', 'sign in', 'log in', 'sign up', 'get started'];
    const filtered = allKeywords.filter(kw => !genericPhrases.includes(kw));

    return [...new Set(filtered)].slice(0, 30);
}

/**
 * Check actual competition for keywords using Google Custom Search
 */
export async function checkKeywordCompetition(keywords, domain) {
    const { searchGoogle } = await import('./googleCustomSearch.js');
    
    const competitionData = [];

    for (const keyword of keywords.slice(0, 5)) { // Check top 5 keywords
        try {
            const results = await searchGoogle(keyword, 10);
            
            if (results && results.length > 0) {
                const myPosition = results.findIndex(r => r.domain === domain);
                const topCompetitors = results.slice(0, 3).map(r => r.domain);
                
                competitionData.push({
                    keyword,
                    myPosition: myPosition >= 0 ? myPosition + 1 : null,
                    topCompetitors,
                    totalResults: results.length,
                    difficulty: results.length >= 10 ? 'High' : results.length >= 5 ? 'Medium' : 'Low'
                });
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            logger.error(`Competition check failed for "${keyword}":`, error.message);
        }
    }

    return competitionData;
}

export default {
    getKeywordMetrics,
    extractRealKeywords,
    checkKeywordCompetition
};
