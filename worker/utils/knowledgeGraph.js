import logger from '../../utils/logger.js';

/**
 * Google Knowledge Graph API Utility
 * Confirms if a brand or entity is recognized by Google.
 */

const KG_API_URL = 'https://kgsearch.googleapis.com/v1/entities:search';

/**
 * Search Knowledge Graph for an entity
 * Uses the standard Knowledge Graph Search API (works with API Key)
 * NOTE: This API is free but has quota limits. If you get 403 errors:
 * 1. Ensure billing is enabled in Google Cloud Console
 * 2. Wait 5-10 minutes after enabling the API
 * 3. Check API key restrictions in Cloud Console
 * 
 * @param {string} query - The entity name or domain
 * @param {number} limit - Max results
 * @returns {Promise<Object|null>} Entity data or null
 */
export async function searchKnowledgeGraph(query, limit = 1) {
    // Use GEMINI_API_KEY instead of GOOGLE_CSE_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        logger.warn('GEMINI_API_KEY missing, skipping Knowledge Graph search');
        return null;
    }

    try {
        const url = `${KG_API_URL}?query=${encodeURIComponent(query)}&key=${apiKey}&limit=${limit}&indent=true`;
        logger.info(`Searching Knowledge Graph for: "${query}"`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            
            // If 403, it's likely a billing or API enablement issue
            if (response.status === 403) {
                logger.warn(`Knowledge Graph API not accessible (403). This is optional - SEO scan will continue without entity verification.`);
                logger.warn(`To enable: 1) Enable billing in Google Cloud Console, 2) Wait 5-10 minutes after enabling API`);
            } else {
                logger.error(`Knowledge Graph API error (${response.status}): ${errorText.substring(0, 500)}`);
            }
            return null;
        }

        const data = await response.json();

        if (!data.itemListElement || data.itemListElement.length === 0) {
            logger.info(`No Knowledge Graph results found for "${query}"`);
            return null;
        }

        // Return the first match with consolidated data
        const item = data.itemListElement[0].result;
        return {
            name: item.name,
            type: item['@type'],
            description: item.description,
            detailedDescription: item.detailedDescription?.articleBody,
            url: item.detailedDescription?.url,
            score: data.itemListElement[0].resultScore,
            id: item['@id']
        };
    } catch (error) {
        logger.error('Knowledge Graph fetch failed:', error.message);
        return null;
    }
}

/**
 * Enterprise Knowledge Graph Search
 * Uses the specific project-based URL requested by the user.
 * Requires OAuth Access Token.
 */
export async function searchEnterpriseKnowledgeGraph(query, accessToken, limit = 1) {
    const projectId = 'infini8seo';
    const location = 'global';

    if (!accessToken) {
        logger.warn('Enterprise Knowledge Graph: No access token provided');
        return null;
    }

    try {
        const url = `https://enterpriseknowledgegraph.googleapis.com/v1/projects/${projectId}/locations/${location}/cloudKnowledgeGraphEntities:Search?query=${encodeURIComponent(query)}&limit=${limit}`;

        logger.info(`Searching Enterprise Knowledge Graph for: "${query}"`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Enterprise KG API error (${response.status}): ${errorText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        logger.error('Enterprise KG fetch failed:', error.message);
        return null;
    }
}

export default {
    searchKnowledgeGraph,
    searchEnterpriseKnowledgeGraph
};
