import logger from '../../utils/logger.js';

/**
 * Extract SPECIFIC technical issues from Lighthouse audit
 * Returns actionable, data-driven recommendations
 */

export function extractTechnicalIssues(pageSpeedData) {
    if (!pageSpeedData || !pageSpeedData.audits) {
        return [];
    }

    const issues = [];
    const audits = pageSpeedData.audits;

    // 1. Image Optimization Issues
    if (audits['uses-optimized-images'] && audits['uses-optimized-images'].score < 1) {
        const details = audits['uses-optimized-images'].details;
        const savings = details?.overallSavingsBytes || 0;
        const count = details?.items?.length || 0;
        
        if (count > 0) {
            issues.push({
                category: 'Images',
                severity: 'High',
                issue: `${count} unoptimized images`,
                impact: `Could save ${Math.round(savings / 1024)}KB`,
                fix: 'Convert images to WebP format and compress',
                metric: 'LCP',
                data: details?.items?.slice(0, 3).map(item => ({
                    url: item.url,
                    wastedBytes: item.wastedBytes
                }))
            });
        }
    }

    // 2. Render-Blocking Resources
    if (audits['render-blocking-resources'] && audits['render-blocking-resources'].score < 1) {
        const details = audits['render-blocking-resources'].details;
        const count = details?.items?.length || 0;
        const savings = details?.overallSavingsMs || 0;
        
        if (count > 0) {
            issues.push({
                category: 'JavaScript/CSS',
                severity: 'High',
                issue: `${count} render-blocking resources`,
                impact: `Blocking render for ${Math.round(savings)}ms`,
                fix: 'Defer non-critical CSS/JS or inline critical resources',
                metric: 'FCP',
                data: details?.items?.slice(0, 3).map(item => ({
                    url: item.url,
                    wastedMs: item.wastedMs
                }))
            });
        }
    }

    // 3. Unused CSS
    if (audits['unused-css-rules'] && audits['unused-css-rules'].score < 1) {
        const details = audits['unused-css-rules'].details;
        const savings = details?.overallSavingsBytes || 0;
        const count = details?.items?.length || 0;
        
        if (savings > 10000) { // Only report if > 10KB
            issues.push({
                category: 'CSS',
                severity: 'Medium',
                issue: `${Math.round(savings / 1024)}KB unused CSS`,
                impact: `Remove ${count} unused stylesheets`,
                fix: 'Use PurgeCSS or remove unused CSS rules',
                metric: 'FCP'
            });
        }
    }

    // 4. Largest Contentful Paint Element
    if (audits['largest-contentful-paint-element']) {
        const details = audits['largest-contentful-paint-element'].details;
        const lcpElement = details?.items?.[0];
        
        if (lcpElement) {
            issues.push({
                category: 'LCP Element',
                severity: 'Critical',
                issue: `LCP element: ${lcpElement.node?.snippet || 'Unknown'}`,
                impact: `Takes ${Math.round(lcpElement.node?.lcp || 0)}ms to load`,
                fix: 'Optimize this specific element (preload, compress, or lazy-load)',
                metric: 'LCP',
                data: {
                    element: lcpElement.node?.nodeLabel,
                    type: lcpElement.node?.type
                }
            });
        }
    }

    // 5. Missing Image Alt Text
    if (audits['image-alt'] && audits['image-alt'].score < 1) {
        const details = audits['image-alt'].details;
        const count = details?.items?.length || 0;
        
        if (count > 0) {
            issues.push({
                category: 'SEO',
                severity: 'Medium',
                issue: `${count} images missing alt text`,
                impact: 'Hurts accessibility and SEO',
                fix: 'Add descriptive alt text to all images',
                metric: 'SEO Score'
            });
        }
    }

    // 6. Missing Meta Description
    if (audits['meta-description'] && audits['meta-description'].score < 1) {
        issues.push({
            category: 'SEO',
            severity: 'High',
            issue: 'Missing or poor meta description',
            impact: 'Lower click-through rate from search results',
            fix: 'Add unique, compelling meta description (150-160 chars)',
            metric: 'SEO Score'
        });
    }

    // 7. Not Mobile Friendly
    if (audits['viewport'] && audits['viewport'].score < 1) {
        issues.push({
            category: 'Mobile',
            severity: 'Critical',
            issue: 'Not mobile-friendly',
            impact: 'Poor mobile user experience, lower mobile rankings',
            fix: 'Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
            metric: 'Mobile Score'
        });
    }

    // 8. Slow Server Response Time
    if (audits['server-response-time']) {
        const ttfb = audits['server-response-time'].numericValue;
        if (ttfb > 600) { // > 600ms is slow
            issues.push({
                category: 'Server',
                severity: 'High',
                issue: `Slow server response: ${Math.round(ttfb)}ms`,
                impact: 'Delays all page loading',
                fix: 'Upgrade hosting, enable caching, or use a CDN',
                metric: 'TTFB'
            });
        }
    }

    // 9. Large DOM Size
    if (audits['dom-size']) {
        const domSize = audits['dom-size'].numericValue;
        if (domSize > 1500) {
            issues.push({
                category: 'DOM',
                severity: 'Medium',
                issue: `Large DOM: ${domSize} elements`,
                impact: 'Slower rendering and JavaScript execution',
                fix: 'Reduce DOM complexity, lazy-load content',
                metric: 'Performance'
            });
        }
    }

    // 10. Missing Structured Data
    if (audits['structured-data'] && audits['structured-data'].score < 1) {
        issues.push({
            category: 'SEO',
            severity: 'Low',
            issue: 'No structured data (Schema.org)',
            impact: 'Missing rich snippets in search results',
            fix: 'Add JSON-LD structured data for products/organization',
            metric: 'SEO Score'
        });
    }

    // Sort by severity
    const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
}

/**
 * Get full Lighthouse audit data for detailed analysis
 */
export async function getDetailedLighthouseAudit(url) {
    const { getPageSpeedInsights } = await import('./pagespeedChecker.js');
    
    try {
        logger.info(`Fetching detailed Lighthouse audit for ${url}`);
        
        // Get full PageSpeed data
        const pageSpeedData = await getPageSpeedInsights(url);
        
        if (!pageSpeedData) {
            logger.warn('PageSpeed data unavailable for detailed audit');
            return null;
        }

        // Extract all audits
        const audits = pageSpeedData.audits || {};
        
        return {
            performance: pageSpeedData.performance,
            seo: pageSpeedData.seo,
            accessibility: pageSpeedData.accessibility,
            audits: {
                // Core Web Vitals
                lcp: audits['largest-contentful-paint']?.numericValue,
                fcp: audits['first-contentful-paint']?.numericValue,
                cls: audits['cumulative-layout-shift']?.numericValue,
                tti: audits['interactive']?.numericValue,
                tbt: audits['total-blocking-time']?.numericValue,
                
                // Opportunities (things to fix)
                opportunities: Object.keys(audits)
                    .filter(key => audits[key].score !== null && audits[key].score < 1)
                    .map(key => ({
                        id: key,
                        title: audits[key].title,
                        description: audits[key].description,
                        score: audits[key].score,
                        numericValue: audits[key].numericValue,
                        displayValue: audits[key].displayValue
                    }))
                    .slice(0, 10) // Top 10 issues
            },
            issues: extractTechnicalIssues({ audits })
        };
        
    } catch (error) {
        logger.error('Detailed Lighthouse audit failed:', error.message);
        return null;
    }
}

export default {
    extractTechnicalIssues,
    getDetailedLighthouseAudit
};
