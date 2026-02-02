import logger from '../../utils/logger.js';

/**
 * Google Search Console API Utility
 * Fetches real search performance data (Clicks, Impressions, CTR, Positions).
 */

const GSC_API_URL = 'https://www.googleapis.com/webmasters/v3/sites';

/**
 * Fetch search analytics for a site
 * Requires valid OAuth 2.0 Access Token
 * 
 * @param {string} siteUrl - The site URL (e.g., 'https://example.com/')
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object|null>} GSC performance data
 */
export async function fetchSearchAnalytics(siteUrl, accessToken) {
    if (!accessToken) {
        logger.warn('Search Console: No access token provided');
        return null;
    }

    try {
        // Normalize site URL for GSC API (must include protocol and trailing slash)
        const normalizedUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
        const url = `${GSC_API_URL}/${encodeURIComponent(normalizedUrl)}/searchAnalytics/query`;

        logger.info(`Fetching Search Console data for: ${normalizedUrl}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
                endDate: new Date().toISOString().split('T')[0],
                dimensions: ['query', 'page'],
                rowLimit: 10
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`Search Console API error (${response.status}): ${errorText}`);
            return null;
        }

        const data = await response.json();
        return data.rows || [];

    } catch (error) {
        logger.error('Search Console fetch failed:', error.message);
        return null;
    }
}

export default { fetchSearchAnalytics };
