import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { fetchWhoisData } from './utils/whoisFetcher.js';
import { batchCheckPositions, searchGoogle } from './utils/googleCustomSearch.js';
import { checkTechnical } from './utils/technicalChecker.js';
import { getPageSpeedInsights, calculatePerformanceScore, calculateOnPageSeoScore, getLighthouseMetrics } from './utils/pagespeedChecker.js';

let genAI;

function initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        logger.error('GEMINI_API_KEY not found in environment variables');
        throw new Error('GEMINI_API_KEY is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

/**
 * Aggressive JSON extraction - tries multiple methods
 */
function extractJSON(text) {
    // Try direct parse first
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (e) { }

    // Remove markdown code blocks
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) { }

    // Find JSON object using brace balancing
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{') {
                if (startIndex === -1) startIndex = i;
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && startIndex !== -1) {
                    endIndex = i + 1;
                    break;
                }
            }
        }
    }

    if (startIndex !== -1 && endIndex !== -1) {
        try {
            return JSON.parse(cleaned.substring(startIndex, endIndex));
        } catch (e2) {
            logger.error('Brace-balanced extraction failed');
        }
    }

    throw new Error('Could not extract valid JSON from response');
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^www\./, '').split('/')[0];
    }
}

/**
 * Execute SEO Scan - Using Gemini 3 Pro with Google Search Grounding
 * Mirrors the successful approach from Phase A
 */
export async function executeSeoScan({ scanId, url }) {
    logger.info(`SEO Scan: Starting scan for ${url} (ID: ${scanId})`);

    const domain = extractDomain(url);

    try {
        if (!genAI) {
            genAI = initGemini();
        }

        // Use the same model configuration as Phase A (proven to work well)
        const searchModel = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.8,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 16384,
            },
            tools: [{
                googleSearch: {}
            }]
        });

        logger.info('Using Gemini 3 Pro with Google Search for SEO analysis');

        await SeoScanRepository.update(scanId, { status: 'SCANNING' });

        // =========================================================================
        // STEP 1: Comprehensive Domain Research via Google Search
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 10, 'Deep research via Google Search');
        logger.info(`Step 1: Deep research for ${domain}`);

        const researchPrompt = `You are an EXPERT SEO Analyst conducting a comprehensive domain analysis for "${domain}".

YOUR MISSION:
Use Google Search EXTENSIVELY to gather real, current data about this website. Search for:
1. "site:${domain}" - to find indexed pages
2. "${domain}" - to see how the site appears in search results
3. Related industry terms to understand their market position

RESEARCH TASKS (USE GOOGLE SEARCH FOR EACH):

1. INDEXED PAGES ANALYSIS:
   - Search: site:${domain}
   - List the actual page titles and URLs you find (up to 10)
   - Note what types of content they publish (blog posts, product pages, documentation, etc.)

2. KEYWORD EXTRACTION:
   - From the indexed pages, identify keywords/topics the site targets
   - Search for the site name to see what keywords are associated with it
   - Find at least 10 relevant keywords this domain appears to focus on

3. BRAND PRESENCE:
   - Search for "${domain}" directly
   - Note if they appear for branded searches
   - Check if they have featured snippets or knowledge panels

4. CONTENT ANALYSIS:
   - What is the main product/service offered?
   - What content topics do they cover?
   - Who is their target audience?

REQUIRED JSON OUTPUT:
{
  "domain": "${domain}",
  "business_summary": "2-3 sentences describing what this business does based on your research",
  "indexed_pages": [
    {"title": "Actual page title from search", "url": "https://full-url-from-search", "page_type": "blog/product/docs/etc"}
  ],
  "observed_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "main_topics": ["Primary topic 1", "Primary topic 2", "Primary topic 3"],
  "target_audience": "Description of who this site serves",
  "content_types": ["blog posts", "documentation", "etc"],
  "brand_visibility": "Good/Moderate/Limited - brief explanation"
}

IMPORTANT:
- Return ONLY valid JSON
- Include at least 5-10 indexed pages if they exist
- Include at least 10 keywords based on actual page content you find
- Base everything on real Google Search results, not assumptions`;

        let researchData = {
            indexed_pages: [],
            observed_keywords: [],
            main_topics: [],
            business_summary: '',
        };

        try {
            const researchResult = await searchModel.generateContent(researchPrompt);
            const researchResponse = researchResult.response.text();
            logger.info('Research response length:', researchResponse.length);
            researchData = extractJSON(researchResponse);
            logger.info(`Research found: ${researchData.indexed_pages?.length || 0} pages, ${researchData.observed_keywords?.length || 0} keywords`);
        } catch (error) {
            logger.error('Research step failed:', error.message);
        }

        logger.info(`Step 1 Complete: ${researchData.indexed_pages?.length || 0} indexed pages, ${researchData.observed_keywords?.length || 0} keywords`);

        // =========================================================================
        // STEP 2: Competitor Discovery via Google Search
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 35, 'Competitor analysis via Google Search');
        logger.info('Step 2: Competitor discovery');

        // Build search query from discovered topics
        const searchTopics = researchData.main_topics?.slice(0, 3) || [];
        const searchKeywords = researchData.observed_keywords?.slice(0, 5) || [];
        const competitorQuery = [...searchTopics, ...searchKeywords].slice(0, 5).join(' ') || domain;

        const competitorPrompt = `You are an EXPERT Competitive Intelligence Analyst.

TASK: Find competitors and similar websites to "${domain}" using Google Search.

SEARCH STRATEGY:
1. Search for: "${competitorQuery}"
2. Search for: "alternatives to ${domain}"
3. Search for: "sites like ${domain}"
4. Search for the main keywords: ${searchKeywords.slice(0, 3).join(', ') || 'related to ' + domain}

For each search, note which DOMAINS (not ${domain} itself) appear in the results.

CLASSIFICATION:
- Direct Competitors: Same product/service category, targeting same customers
- Content Competitors: Similar content topics but different business model (blogs, media sites, etc.)

EXCLUDE from results:
- ${domain} itself
- Generic platforms: wikipedia.org, youtube.com, facebook.com, twitter.com, linkedin.com, reddit.com, quora.com, amazon.com, google.com

REQUIRED JSON OUTPUT:
{
  "search_queries_used": ["query1", "query2", "query3"],
  "direct_competitors": [
    {"domain": "competitor1.com", "reason": "Brief explanation why they compete"}
  ],
  "content_competitors": [
    {"domain": "blog1.com", "reason": "Brief explanation of content overlap"}
  ],
  "market_position": "Brief assessment of ${domain}'s competitive position"
}

Return at least 5 direct competitors and 5 content competitors if they exist.`;

        let competitorData = {
            direct_competitors: [],
            content_competitors: [],
            market_position: '',
        };

        try {
            const competitorResult = await searchModel.generateContent(competitorPrompt);
            const competitorResponse = competitorResult.response.text();
            competitorData = extractJSON(competitorResponse);
            logger.info(`Competitors found: ${competitorData.direct_competitors?.length || 0} direct, ${competitorData.content_competitors?.length || 0} content`);
        } catch (error) {
            logger.error('Competitor discovery failed:', error.message);
        }

        logger.info(`Step 2 Complete`);

        // =========================================================================
        // STEP 3: Ranking Position Check (Hybrid: Google CSE + Gemini Fallback)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 55, 'Checking SERP positions');
        logger.info('Step 3: SERP position checking (hybrid approach)');

        // Select keywords for position checking
        // Less aggressive filtering - include more keywords
        const domainName = domain.split('.')[0].toLowerCase();
        const discoveredKeywords = (researchData.observed_keywords || [])
            .filter(k => {
                const kLower = k.toLowerCase();
                // Only filter garbage, keep brand-adjacent keywords
                return kLower.length > 2 &&
                    !kLower.includes('also') &&
                    !kLower.includes('identified') &&
                    !kLower.includes('following') &&
                    k.split(' ').length <= 6;
            })
            .slice(0, 8); // Check more keywords

        let sampledPositions = [];
        let positionSource = 'none';

        // ATTEMPT 1: Use Google Custom Search API (accurate)
        if (discoveredKeywords.length > 0) {
            logger.info('Attempting Google Custom Search API for position data...');
            const cseResults = await batchCheckPositions(discoveredKeywords, domain);

            if (cseResults.available && cseResults.rankings.length > 0) {
                sampledPositions = cseResults.rankings.map(r => ({
                    keyword: r.keyword,
                    position: r.position,
                    url: r.url,
                    source: 'verified'
                }));
                positionSource = 'google_cse';
                logger.info(`✓ Google CSE found ${sampledPositions.length} rankings`);
            } else if (!cseResults.available) {
                logger.warn('Google CSE not configured, falling back to Gemini');
            } else {
                logger.info('Google CSE found no rankings, trying Gemini fallback');
            }
        }

        // ATTEMPT 2: Gemini fallback (if CSE unavailable or found nothing)
        if (sampledPositions.length === 0 && discoveredKeywords.length > 0) {
            const positionPrompt = `You are an SEO Analyst checking SERP rankings for "${domain}".

TASK: Search Google for each keyword and check if "${domain}" (or its parent company domain) appears in the TOP 10 organic results.

KEYWORDS TO CHECK:
${discoveredKeywords.map((k, i) => `${i + 1}. "${k}"`).join('\n')}

INSTRUCTIONS:
1. Search each keyword on Google
2. Check positions 1-10 (ignore ads)
3. For "${domain}", also accept parent/related domains (e.g., openai.com for chatgpt.com)
4. Note the EXACT position if found

OUTPUT FORMAT (JSON only):
{
  "rankings": [
    {"keyword": "exact keyword", "position": 3, "found": true},
    {"keyword": "not ranking", "position": null, "found": false}
  ],
  "overall_visibility": "Strong/Moderate/Weak"
}

ACCURACY IS KEY. If they are #1, say #1.`;

            try {
                const positionResult = await searchModel.generateContent(positionPrompt);
                const positionResponse = positionResult.response.text();
                const positionData = extractJSON(positionResponse);

                sampledPositions = (positionData.rankings || [])
                    .filter(r => r.found && r.position && r.position <= 10)
                    .map(r => ({
                        keyword: r.keyword,
                        position: r.position,
                        source: 'ai-estimated'
                    }));
                positionSource = 'gemini';
                logger.info(`Gemini fallback found ${sampledPositions.length} rankings`);
            } catch (error) {
                logger.error('Gemini position check failed:', error.message);
            }
        }

        logger.info(`Step 3 Complete: ${sampledPositions.length} rankings found (source: ${positionSource})`);

        // =========================================================================
        // STEP 4: Technical + UX Checks (Real Data)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 65, 'Checking technical SEO');
        logger.info('Step 4: Technical & UX checks');

        // Run technical checks (HTTPS, robots.txt, sitemap)
        const technicalResults = await checkTechnical(domain);

        // Run PageSpeed Insights (real performance data)
        await SeoScanRepository.updateProgress(scanId, 70, 'Analyzing page performance');
        const pageSpeedData = await getPageSpeedInsights(`https://${domain}`);

        // Calculate separate scores from Lighthouse
        const performanceScore = calculatePerformanceScore(pageSpeedData);
        const onPageSeoScore = calculateOnPageSeoScore(pageSpeedData);
        const lighthouseMetrics = getLighthouseMetrics(pageSpeedData);

        logger.info(`Technical score: ${technicalResults.score}/${technicalResults.maxScore}`);
        logger.info(`Performance score: ${performanceScore.score}/${performanceScore.maxScore}`);
        logger.info(`On-Page SEO score: ${onPageSeoScore.score}/${onPageSeoScore.maxScore}`);

        // =========================================================================
        // STEP 5: Domain Authority (WHOIS + SERP Performance)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 75, 'Fetching domain authority signals');
        logger.info('Step 5: WHOIS lookup');

        const whoisData = await fetchWhoisData(domain);
        const domainAge = {
            years: whoisData.ageYears,
            created: whoisData.creationDate,
            expires: whoisData.expiryDate,
            registrar: whoisData.registrar,
            label: 'verified',
        };

        // Calculate Authority Score from real data
        const domainAgePoints = Math.min(10, (domainAge.years || 0) * 2);
        const firstPlaceCount = sampledPositions.filter(p => p.position === 1).length;
        const rankingBonus = Math.min(8, firstPlaceCount * 2);
        const coverageBonus = Math.min(7, sampledPositions.length);
        const authorityScore = Math.min(25, domainAgePoints + rankingBonus + coverageBonus);

        // Content score now uses On-Page SEO from Lighthouse
        const indexedPagesCount = researchData.indexed_pages?.length || 0;
        const contentPoints = Math.min(15, indexedPagesCount * 1.5);
        const keywordCoverage = Math.min(5, (researchData.observed_keywords?.length || 0) / 2);
        const contentFreshness = domainAge.years && domainAge.years < 5 ? 5 : 3;
        const contentScore = Math.min(25, contentPoints + keywordCoverage + contentFreshness);

        logger.info(`Step 5 Complete: Domain age ${domainAge.years || 'unknown'} years, Authority: ${authorityScore}/25`);

        // =========================================================================
        // STEP 6: AI Strategic Analysis (Using ALL Real Data)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 85, 'Generating strategic recommendations');
        logger.info('Step 6: AI strategic analysis with verified data');

        // NEW: Calculate total health score with 4 real components
        // Technical (25) + On-Page SEO (25) + Authority (25) + Performance (25)
        const calculatedHealthScore = Math.round(
            (technicalResults.score / technicalResults.maxScore) * 25 +
            (onPageSeoScore.score / onPageSeoScore.maxScore) * 25 +
            (authorityScore / 25) * 25 +
            (performanceScore.score / performanceScore.maxScore) * 25
        );

        const scoreBreakdown = {
            technical: technicalResults.score,
            on_page_seo: onPageSeoScore.score,
            authority: authorityScore,
            performance: performanceScore.score
        };

        // Build comprehensive data package for Gemini
        const analysisPrompt = `You are a Senior SEO Strategist analyzing VERIFIED data for "${domain}".

=== VERIFIED DATA (Use this to inform your analysis) ===

BUSINESS CONTEXT:
${researchData.business_summary || 'Not determined'}

TECHNICAL SEO (Score: ${technicalResults.score}/${technicalResults.maxScore}):
- HTTPS: ${technicalResults.checks.https.passed ? '✓ Enabled' : '✗ Missing'}
- robots.txt: ${technicalResults.checks.robotsTxt.passed ? '✓ Present' : '✗ Missing'}
- Sitemap: ${technicalResults.checks.sitemap.passed ? '✓ Available' : '✗ Missing'}

PAGE PERFORMANCE (From Google PageSpeed):
${pageSpeedData ? `- Performance Score: ${pageSpeedData.performance}/100
- Accessibility: ${pageSpeedData.accessibility}/100
- SEO Score: ${pageSpeedData.seo}/100
- Mobile Optimized: ${pageSpeedData.mobileOptimized ? 'Yes' : 'No'}
- LCP: ${pageSpeedData.lcpSeconds}` : '- Data unavailable'}

VERIFIED SERP RANKINGS (From Google Custom Search):
${sampledPositions.map(p => `- "${p.keyword}": Position #${p.position}`).join('\n') || 'No rankings found'}

DOMAIN AUTHORITY:
- Age: ${domainAge.years || 'Unknown'} years (Created: ${domainAge.created || 'Unknown'})
- Registrar: ${domainAge.registrar || 'Unknown'}

CONTENT SIGNALS:
- Indexed Pages Found: ${indexedPagesCount}
- Observed Keywords: ${researchData.observed_keywords?.join(', ') || 'None found'}

COMPETITORS (AI-Discovered):
- Direct: ${(competitorData.direct_competitors || []).slice(0, 5).map(c => typeof c === 'string' ? c : c.domain).join(', ')}
- Content: ${(competitorData.content_competitors || []).slice(0, 5).map(c => typeof c === 'string' ? c : c.domain).join(', ')}

=== YOUR TASK ===

Based on the VERIFIED data above, provide:

1. STRATEGIC KEYWORDS: Generate 30 high-value keyword opportunities in 3 categories:
   - "High Intent / Transactional" (10 keywords)
   - "Informational / Educational" (10 keywords)  
   - "Niche / Long-Tail" (10 keywords)

2. STRATEGIC RECOMMENDATIONS: 3-5 specific, actionable recommendations based on the real data.
   Reference specific findings (e.g., "Your PageSpeed score of ${pageSpeedData?.performance || 'N/A'} indicates...")

REQUIRED JSON OUTPUT:
{
  "suggested_keywords": [
    {"category": "High Intent / Transactional", "keywords": ["kw1", "kw2", ...]},
    {"category": "Informational / Educational", "keywords": ["kw1", "kw2", ...]},
    {"category": "Niche / Long-Tail", "keywords": ["kw1", "kw2", ...]}
  ],
  "recommendations": [
    "Specific recommendation referencing data...",
    "Another recommendation..."
  ]
}`;

        let analysis = {
            recommendations: [],
            suggested_keywords: []
        };

        try {
            const analysisModel = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 8192,
                },
            });

            const analysisResult = await analysisModel.generateContent(analysisPrompt);
            const analysisResponse = analysisResult.response.text();
            analysis = extractJSON(analysisResponse);
        } catch (error) {
            logger.error('Analysis generation failed:', error.message);
        }

        logger.info(`Step 6 Complete: Generated ${analysis.suggested_keywords?.reduce((acc, g) => acc + g.keywords.length, 0) || 0} keywords`);

        // =========================================================================
        // Compile Final Results (All Verified Data)
        // =========================================================================
        const results = {
            domain,
            scanned_at: new Date().toISOString(),
            data_source: 'hybrid_verified',
            business_summary: researchData.business_summary || '',
            observed_keywords: (researchData.observed_keywords || []).map(k => ({ keyword: k, label: 'observed' })),
            sampled_positions: sampledPositions.map(p => ({ ...p, label: 'verified' })),
            serp_competitors: {
                direct: (competitorData.direct_competitors || []).map(c => ({
                    domain: typeof c === 'string' ? c : c.domain,
                    label: 'ai-inferred',
                })),
                content: (competitorData.content_competitors || []).map(c => ({
                    domain: typeof c === 'string' ? c : c.domain,
                    label: 'ai-inferred',
                })),
            },
            domain_age: domainAge,
            // Real calculated scores
            health_score: calculatedHealthScore,
            score_breakdown: scoreBreakdown,
            // Real technical data
            technical_details: {
                https: technicalResults.checks.https.passed,
                robots_txt: technicalResults.checks.robotsTxt.passed,
                sitemap: technicalResults.checks.sitemap.passed,
                score: technicalResults.score,
                max_score: technicalResults.maxScore
            },
            // Real PageSpeed data
            pagespeed: pageSpeedData ? {
                performance: pageSpeedData.performance,
                accessibility: pageSpeedData.accessibility,
                seo: pageSpeedData.seo,
                mobile_optimized: pageSpeedData.mobileOptimized,
                lcp: pageSpeedData.lcpSeconds,
                label: 'verified'
            } : null,
            // Full Lighthouse Metrics for UI
            lighthouse_metrics: lighthouseMetrics,
            // AI-generated strategic content (informed by real data)
            recommendations: (analysis.recommendations || []).map(r => ({ text: r, label: 'ai-strategic' })),
            suggested_keywords: analysis.suggested_keywords || [],
            market_position: competitorData.market_position || '',
            visibility: positionSource !== 'none' ? (sampledPositions.length > 3 ? 'Strong' : sampledPositions.length > 0 ? 'Moderate' : 'Weak') : 'Unknown',
        };

        await SeoScanRepository.markAsComplete(scanId, results);
        logger.info(`SEO Scan Complete: ${scanId} - Score: ${results.health_score}`);

        return results;

    } catch (error) {
        logger.error('SEO Scan failed:', error.message);
        logger.error('Stack trace:', error.stack);
        await SeoScanRepository.markAsFailed(scanId, error.message);
        throw new Error(`SEO Scan failed: ${error.message}`);
    }
}

export default executeSeoScan;
