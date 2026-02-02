import logger from '../../utils/logger.js';

/**
 * Google PageSpeed Insights Integration
 * Uses the FREE PageSpeed Insights API for real performance data
 */

const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Fetch PageSpeed Insights data for a URL
 * @param {string} url - Full URL to analyze
 * @param {string} strategy - 'mobile' or 'desktop'
 * @returns {Promise<Object>} PageSpeed results
 */
export async function getPageSpeedInsights(url, strategy = 'mobile') {
    logger.info(`Fetching PageSpeed Insights for ${url} (${strategy})...`);

    const fetchWithRetry = async (attemptStrategy) => {
        try {
            // Use GEMINI_API_KEY instead of GOOGLE_CSE_API_KEY
            const apiKey = process.env.GEMINI_API_KEY;
            // Add key and strategy
            const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=${attemptStrategy}&category=performance&category=accessibility&category=seo&key=${apiKey}`;

            const response = await fetch(apiUrl, {
                signal: AbortSignal.timeout(90000) // 90 second timeout
            });

            if (response.ok) return await response.json();
            return null;
        } catch (e) {
            logger.warn(`PageSpeed attempt (${attemptStrategy}) failed: ${e.message}`);
            return null;
        }
    };

    // Try Mobile first
    let data = await fetchWithRetry('mobile');

    // If failed, try Desktop (often faster/lighter)
    if (!data) {
        logger.info('Retrying PageSpeed with desktop strategy...');
        data = await fetchWithRetry('desktop');
    }

    if (!data || !data.lighthouseResult) {
        return null;
    }

    const lighthouse = data.lighthouseResult;
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    const result = {
        // Scores (0-100)
        performance: Math.round((categories.performance?.score || 0) * 100),
        accessibility: Math.round((categories.accessibility?.score || 0) * 100),
        seo: Math.round((categories.seo?.score || 0) * 100),

        // Core Web Vitals
        lcp: audits['largest-contentful-paint']?.numericValue || null,
        fid: audits['max-potential-fid']?.numericValue || null,
        cls: audits['cumulative-layout-shift']?.numericValue || null,
        fcp: audits['first-contentful-paint']?.numericValue || null,

        // Friendly values
        lcpSeconds: audits['largest-contentful-paint']?.displayValue || 'N/A',
        fcpSeconds: audits['first-contentful-paint']?.displayValue || 'N/A',

        // Mobile specific
        mobileOptimized: (audits['viewport']?.score || 0) === 1,

        // Raw data for reference
        strategy,
        url: data.id
    };

    logger.info(`PageSpeed scores - Performance: ${result.performance}, SEO: ${result.seo}, Accessibility: ${result.accessibility}`);

    return result;

}

/**
 * Calculate Performance score from PageSpeed data
 * @param {Object} pageSpeed - PageSpeed results
 * @returns {Object} Performance score breakdown
 */
export function calculatePerformanceScore(pageSpeed) {
    if (!pageSpeed) {
        return {
            score: 0,
            maxScore: 25,
            percentage: 0,
            details: { error: 'PageSpeed data unavailable' }
        };
    }

    let score = 0;

    // Performance score contribution (0-12 points)
    const perfPoints = Math.round(pageSpeed.performance / 8.5);
    score += Math.min(12, perfPoints);

    // Mobile optimization (0-5 points)
    if (pageSpeed.mobileOptimized) score += 5;
    else if (pageSpeed.performance > 50) score += 2;

    // Core Web Vitals (0-8 points)
    if (pageSpeed.lcp && pageSpeed.lcp < 2500) score += 3;
    else if (pageSpeed.lcp && pageSpeed.lcp < 4000) score += 1;

    if (pageSpeed.cls !== null && pageSpeed.cls < 0.1) score += 3;
    else if (pageSpeed.cls !== null && pageSpeed.cls < 0.25) score += 1;

    if (pageSpeed.fcp && pageSpeed.fcp < 1800) score += 2;
    else if (pageSpeed.fcp && pageSpeed.fcp < 3000) score += 1;

    score = Math.min(25, score);

    return {
        score,
        maxScore: 25,
        percentage: Math.round((score / 25) * 100),
        details: {
            raw_performance: pageSpeed.performance,
            mobile: pageSpeed.mobileOptimized ? 'Optimized' : 'Needs work',
            lcp: pageSpeed.lcpSeconds,
            fcp: pageSpeed.fcpSeconds
        }
    };
}

/**
 * Calculate On-Page SEO score from Lighthouse SEO audit
 * @param {Object} pageSpeed - PageSpeed results
 * @returns {Object} On-page SEO score breakdown
 */
export function calculateOnPageSeoScore(pageSpeed) {
    if (!pageSpeed || pageSpeed.seo === undefined) {
        return {
            score: 0,
            maxScore: 25,
            percentage: 0,
            details: { error: 'Lighthouse SEO data unavailable' }
        };
    }

    const score = Math.round(pageSpeed.seo / 4);

    return {
        score: Math.min(25, score),
        maxScore: 25,
        percentage: pageSpeed.seo,
        rawScore: pageSpeed.seo,
        details: {
            lighthouse_seo: pageSpeed.seo,
            accessibility: pageSpeed.accessibility
        }
    };
}

/**
 * Get complete Lighthouse metrics for display
 * @param {Object} pageSpeed - PageSpeed results  
 * @returns {Object} Formatted Lighthouse data for UI
 */
export function getLighthouseMetrics(pageSpeed) {
    if (!pageSpeed) {
        return null;
    }

    const getLabel = (score) => {
        if (score >= 90) return 'Good';
        if (score >= 50) return 'Needs Improvement';
        return 'Poor';
    };

    const getColor = (score) => {
        if (score >= 90) return 'green';
        if (score >= 50) return 'orange';
        return 'red';
    };

    return {
        performance: {
            score: pageSpeed.performance,
            label: getLabel(pageSpeed.performance),
            color: getColor(pageSpeed.performance)
        },
        seo: {
            score: pageSpeed.seo,
            label: getLabel(pageSpeed.seo),
            color: getColor(pageSpeed.seo)
        },
        accessibility: {
            score: pageSpeed.accessibility,
            label: getLabel(pageSpeed.accessibility),
            color: getColor(pageSpeed.accessibility)
        },
        core_web_vitals: {
            lcp: pageSpeed.lcpSeconds,
            fcp: pageSpeed.fcpSeconds,
            cls: pageSpeed.cls !== null ? pageSpeed.cls.toFixed(3) : 'N/A'
        },
        mobile_optimized: pageSpeed.mobileOptimized
    };
}

// Keep calculateUxScore for backwards compatibility
export function calculateUxScore(pageSpeed) {
    return calculatePerformanceScore(pageSpeed);
}

export default {
    getPageSpeedInsights,
    calculatePerformanceScore,
    calculateOnPageSeoScore,
    getLighthouseMetrics,
    calculateUxScore
};

