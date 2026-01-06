import logger from '../../utils/logger.js';

/**
 * Technical SEO Checker
 * Performs real checks for technical SEO factors
 */

/**
 * Check if a URL uses HTTPS
 */
async function checkHttps(domain) {
    try {
        const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        return response.ok || response.status < 400;
    } catch {
        return false;
    }
}

/**
 * Check if robots.txt exists
 */
async function checkRobotsTxt(domain) {
    try {
        const response = await fetch(`https://${domain}/robots.txt`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Check if sitemap.xml exists
 */
async function checkSitemap(domain) {
    try {
        // Try common sitemap locations
        const locations = [
            `https://${domain}/sitemap.xml`,
            `https://${domain}/sitemap_index.xml`,
            `https://www.${domain}/sitemap.xml`
        ];

        for (const url of locations) {
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(3000)
                });
                if (response.ok) return true;
            } catch {
                continue;
            }
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Complete technical check for a domain
 * Returns score out of 25 and detailed breakdown
 */
export async function checkTechnical(domain) {
    logger.info(`Running technical checks for ${domain}...`);

    const checks = {
        https: { passed: false, points: 0, maxPoints: 10, label: 'HTTPS Enabled' },
        robotsTxt: { passed: false, points: 0, maxPoints: 7, label: 'robots.txt Present' },
        sitemap: { passed: false, points: 0, maxPoints: 8, label: 'Sitemap Available' }
    };

    // Run checks in parallel
    const [httpsResult, robotsResult, sitemapResult] = await Promise.all([
        checkHttps(domain),
        checkRobotsTxt(domain),
        checkSitemap(domain)
    ]);

    if (httpsResult) {
        checks.https.passed = true;
        checks.https.points = checks.https.maxPoints;
    }

    if (robotsResult) {
        checks.robotsTxt.passed = true;
        checks.robotsTxt.points = checks.robotsTxt.maxPoints;
    }

    if (sitemapResult) {
        checks.sitemap.passed = true;
        checks.sitemap.points = checks.sitemap.maxPoints;
    }

    const totalScore = Object.values(checks).reduce((sum, c) => sum + c.points, 0);
    const maxScore = Object.values(checks).reduce((sum, c) => sum + c.maxPoints, 0);

    logger.info(`Technical score: ${totalScore}/${maxScore}`);

    return {
        score: totalScore,
        maxScore,
        percentage: Math.round((totalScore / maxScore) * 100),
        checks,
        summary: `${Object.values(checks).filter(c => c.passed).length}/3 checks passed`
    };
}

export default { checkTechnical };
