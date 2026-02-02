import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { fetchWhoisData } from './utils/whoisFetcher.js';
import { checkTechnical } from './utils/technicalChecker.js';
import { getPageSpeedInsights, calculatePerformanceScore, calculateOnPageSeoScore, getLighthouseMetrics } from './utils/pagespeedChecker.js';
import { searchKnowledgeGraph } from './utils/knowledgeGraph.js';
import { analyzeContentEntities } from './utils/naturalLanguage.js';
import { fetchPageContent } from './utils/htmlFetcher.js';
import { searchSerpApi, batchCheckKeywords, calculateKeywordDifficulty, analyzeSerpFeatures, analyzeCompetitorGap } from './utils/serpApi.js';
import { extractRealKeywords } from './utils/keywordPlanner.js';
import { extractTechnicalIssues } from './utils/lighthouseAudits.js';

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

function extractJSON(text) {
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) { }

    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        throw new Error('Could not extract valid JSON from response');
    }
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^www\./, '').split('/')[0];
    }
}

function calculateVisibility(rankings) {
    if (!rankings || rankings.length === 0) return 0;
    const weights = { 1: 0.312, 2: 0.156, 3: 0.098, 4: 0.069, 5: 0.048, 6: 0.038, 7: 0.031, 8: 0.027, 9: 0.024, 10: 0.021 };
    let actualCTR = 0;
    let maxPotentialCTR = rankings.length * weights[1];
    rankings.forEach(r => {
        if (r.position && weights[r.position]) actualCTR += weights[r.position];
        else if (r.position > 10) actualCTR += 0.01;
    });
    return Math.round((actualCTR / maxPotentialCTR) * 100);
}

function calculateKeywordDistribution(rankings) {
    const dist = { top3: 0, top10: 0, top50: 0, top100: 0 };
    rankings.forEach(r => {
        if (!r.position) return;
        if (r.position <= 3) dist.top3++;
        if (r.position <= 10) dist.top10++;
        if (r.position <= 50) dist.top50++;
        if (r.position <= 100) dist.top100++;
    });
    return dist;
}

/**
 * SERP-FIRST SEO Scan - Uses SERP API as primary data source
 */
export async function executeSeoScan({ scanId, url }) {
    logger.info(`SEO Scan: Starting SERP-first scan for ${url} (ID: ${scanId})`);
    const domain = extractDomain(url);

    try {
        if (!genAI) genAI = initGemini();
        await SeoScanRepository.update(scanId, { status: 'SCANNING' });

        // =========================================================================
        // STEP 1: Fetch page content with Puppeteer (handles JS-rendered sites)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 5, 'Fetching page content');
        logger.info(`Step 1: Fetching page content with Puppeteer`);
        
        const pageContent = await fetchPageContent(url.startsWith('http') ? url : `https://${url}`);
        
        if (pageContent && pageContent.text) {
            logger.info(`✓ Page content fetched: ${pageContent.text.length} characters`);
        } else {
            logger.warn('⚠ Failed to fetch page content');
        }

        // =========================================================================
        // STEP 2: Discover niche and keywords using SERP API
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 15, 'Discovering keywords via SERP API');
        logger.info(`Step 2: SERP API keyword discovery for ${domain}`);
        
        const domainSerpResult = await searchSerpApi(domain, 'United States');
        
        let discoveredKeywords = [];
        let businessSummary = '';
        
        if (domainSerpResult && domainSerpResult.top_competitors.length > 0) {
            const topResult = domainSerpResult.top_competitors[0];
            businessSummary = `${topResult.title} - ${topResult.snippet}`;
            
            // Extract keywords from SERP results
            const keywordSet = new Set();
            domainSerpResult.top_competitors.slice(0, 5).forEach(comp => {
                const text = `${comp.title} ${comp.snippet}`.toLowerCase();
                const words = text.match(/\b[a-z]{4,15}\b/g) || [];
                words.forEach(w => {
                    if (!['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'about', 'more', 'shop', 'online', 'india', 'best'].includes(w)) {
                        keywordSet.add(w);
                    }
                });
            });
            discoveredKeywords = Array.from(keywordSet).slice(0, 20);
            logger.info(`✓ SERP API discovered ${discoveredKeywords.length} keywords:`, discoveredKeywords.slice(0, 10));
        }
        
        // Extract keywords from HTML
        const realWebsiteKeywords = extractRealKeywords(pageContent);
        logger.info(`✓ Extracted ${realWebsiteKeywords.length} keywords from HTML`);
        
        // Combine all keywords
        const allKeywords = [...new Set([...discoveredKeywords, ...realWebsiteKeywords])];
        const observedKeywords = allKeywords.slice(0, 20);
        
        logger.info(`Step 2 Complete: ${observedKeywords.length} total keywords discovered`);

        // =========================================================================
        // STEP 3: Find competitors using SERP API
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 30, 'Finding competitors via SERP API');
        logger.info(`Step 3: SERP API competitor discovery`);
        
        const competitors = new Set();
        
        // Search for top keywords to find competitors
        for (const keyword of observedKeywords.slice(0, 3)) {
            const serpResult = await searchSerpApi(keyword, 'United States', domain);
            if (serpResult && serpResult.top_competitors) {
                serpResult.top_competitors.slice(0, 10).forEach(comp => {
                    const compDomain = extractDomain(comp.link);
                    if (compDomain !== domain && !compDomain.includes('google') && !compDomain.includes('facebook')) {
                        competitors.add(compDomain);
                    }
                });
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
        
        const competitorList = Array.from(competitors).slice(0, 10);
        logger.info(`✓ Found ${competitorList.length} competitors:`, competitorList.slice(0, 5));

        // =========================================================================
        // STEP 4: Check SERP rankings using SERP API
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 50, 'Checking SERP rankings');
        logger.info(`Step 4: SERP API ranking check for ${observedKeywords.length} keywords`);
        
        const serpResults = await batchCheckKeywords(observedKeywords.slice(0, 10), domain);
        
        const sampledPositions = serpResults
            .filter(r => r.my_position)
            .map(r => ({
                keyword: r.keyword,
                position: r.my_position,
                url: r.my_result?.link,
                source: 'verified-serpapi',
                total_results: r.total_results
            }));
        
        const serpAnalysis = serpResults.map(r => ({
            keyword: r.keyword,
            my_position: r.my_position,
            difficulty: calculateKeywordDifficulty(r),
            serp_features: analyzeSerpFeatures(r),
            top_3_competitors: r.top_competitors.slice(0, 3).map(c => ({
                position: c.position,
                domain: c.domain,
                title: c.title
            })),
            opportunities: analyzeSerpFeatures(r)?.opportunities || [],
            total_results: r.total_results
        }));
        
        logger.info(`✓ SERP API found ${sampledPositions.length} rankings out of ${serpResults.length} keywords checked`);

        // Competitor gap analysis
        const competitorGapAnalysis = serpResults.length > 0 ? analyzeCompetitorGap(serpResults, domain) : null;

        // =========================================================================
        // STEP 5: Technical + Performance checks
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 65, 'Checking technical SEO');
        logger.info('Step 5: Technical & Performance checks');
        
        const technicalResults = await checkTechnical(domain);
        const pageSpeedData = await getPageSpeedInsights(`https://${domain}`);
        const performanceScore = calculatePerformanceScore(pageSpeedData);
        const onPageSeoScore = calculateOnPageSeoScore(pageSpeedData);
        const lighthouseMetrics = getLighthouseMetrics(pageSpeedData);
        const technicalIssues = extractTechnicalIssues(pageSpeedData);
        
        logger.info(`Technical: ${technicalResults.score}/${technicalResults.maxScore}, Performance: ${performanceScore.score}/${performanceScore.maxScore}`);

        // =========================================================================
        // STEP 6: Domain authority signals
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 75, 'Analyzing domain authority');
        logger.info('Step 6: Domain authority');
        
        const whoisData = await fetchWhoisData(domain);
        const domainAge = {
            years: whoisData.ageYears,
            created: whoisData.creationDate,
            expires: whoisData.expiryDate,
            registrar: whoisData.registrar,
            label: 'verified'
        };
        
        const domainAgePoints = Math.min(10, (domainAge.years || 0) * 2);
        const firstPlaceCount = sampledPositions.filter(p => p.position === 1).length;
        const rankingBonus = Math.min(8, firstPlaceCount * 2);
        const coverageBonus = Math.min(7, sampledPositions.length);
        const authorityScore = Math.min(25, domainAgePoints + rankingBonus + coverageBonus);

        // =========================================================================
        // STEP 7: Entity & Content analysis
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 80, 'Analyzing content entities');
        logger.info('Step 7: Entity & Content analysis');
        
        const brandName = domain.split('.')[0];
        const kgData = await searchKnowledgeGraph(brandName);
        
        let nlData = null;
        if (pageContent && pageContent.text && pageContent.text.length > 500) {
            nlData = await analyzeContentEntities(pageContent.text);
            logger.info(`✓ Natural Language API found ${nlData?.length || 0} entities`);
        } else {
            logger.warn('⚠ Content too short for NL API analysis');
        }

        // =========================================================================
        // STEP 8: Gemini strategic keywords (NO Google Search grounding)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 85, 'Generating strategic keywords');
        logger.info('Step 8: Gemini strategic keyword generation');
        
        const calculatedHealthScore = Math.round(
            (technicalResults.score / technicalResults.maxScore) * 25 +
            (onPageSeoScore.score / onPageSeoScore.maxScore) * 25 +
            (authorityScore / 25) * 25 +
            (performanceScore.score / performanceScore.maxScore) * 25
        );
        
        const analysisPrompt = `You are an SEO Strategist. Based on this VERIFIED data, suggest 30 strategic keywords.

NICHE: ${businessSummary || 'E-commerce website'}
COMPETITORS: ${competitorList.slice(0, 5).join(', ')}
CURRENT KEYWORDS: ${observedKeywords.slice(0, 10).join(', ')}

Generate keywords in 3 categories:
1. High Intent / Transactional (10 keywords)
2. Informational / Educational (10 keywords)  
3. Niche / Long-Tail (10 keywords)

CRITICAL: Base keywords on the niche and competitors above. DO NOT suggest keywords already in CURRENT KEYWORDS list.

Return ONLY valid JSON:
{
  "suggested_keywords": [
    {"category": "High Intent / Transactional", "keywords": [{"word": "kw1", "intent": "transactional"}, ...]},
    {"category": "Informational / Educational", "keywords": [{"word": "kw2", "intent": "informational"}, ...]},
    {"category": "Niche / Long-Tail", "keywords": [{"word": "kw3", "intent": "navigational"}, ...]}
  ],
  "recommendations": [
    {"title": "Fix 1", "text": "Description", "impact": "High"}
  ]
}`;

        let analysis = { recommendations: [], suggested_keywords: [] };
        
        try {
            const analysisModel = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 8192 }
            });
            const analysisResult = await analysisModel.generateContent(analysisPrompt);
            analysis = extractJSON(analysisResult.response.text());
            logger.info(`✓ Generated ${analysis.suggested_keywords?.reduce((acc, g) => acc + g.keywords.length, 0) || 0} strategic keywords`);
        } catch (error) {
            logger.error('Gemini analysis failed:', error.message);
        }

        // Filter out duplicates
        const observedKeywordSet = new Set(observedKeywords.map(k => k.toLowerCase()));
        const filteredSuggestedKeywords = (analysis.suggested_keywords || []).map(category => ({
            ...category,
            keywords: category.keywords.filter(kw => !observedKeywordSet.has(kw.word.toLowerCase()))
        })).filter(category => category.keywords.length > 0);

        // =========================================================================
        // Compile final results
        // =========================================================================
        const results = {
            domain,
            scanned_at: new Date().toISOString(),
            data_source: 'serpapi_primary',
            business_summary: businessSummary,
            real_website_keywords: realWebsiteKeywords.map(k => ({ keyword: k, label: 'extracted-from-site' })),
            observed_keywords: observedKeywords.map(k => ({ keyword: k, label: 'verified-serpapi' })),
            sampled_positions: sampledPositions,
            serp_analysis: serpAnalysis,
            competitor_gap: competitorGapAnalysis,
            keyword_competition: serpAnalysis.map(s => ({
                keyword: s.keyword,
                my_position: s.my_position,
                difficulty: s.difficulty.difficulty,
                difficulty_score: s.difficulty.score,
                total_results: s.total_results,
                label: 'verified-serpapi'
            })),
            serp_competitors: {
                direct: competitorList.map(c => ({ domain: c, label: 'verified-serpapi' })),
                content: []
            },
            domain_age: domainAge,
            health_score: calculatedHealthScore,
            score_breakdown: {
                technical: technicalResults.score,
                on_page_seo: onPageSeoScore.score,
                authority: authorityScore,
                performance: performanceScore.score
            },
            technical_details: {
                https: technicalResults.checks.https.passed,
                robots_txt: technicalResults.checks.robotsTxt.passed,
                sitemap: technicalResults.checks.sitemap.passed,
                score: technicalResults.score,
                max_score: technicalResults.maxScore
            },
            technical_issues: technicalIssues,
            pagespeed: pageSpeedData ? {
                performance: pageSpeedData.performance,
                accessibility: pageSpeedData.accessibility,
                seo: pageSpeedData.seo,
                mobile_optimized: pageSpeedData.mobileOptimized,
                lcp: pageSpeedData.lcpSeconds,
                label: 'verified'
            } : null,
            lighthouse_metrics: lighthouseMetrics,
            recommendations: (analysis.recommendations || []).map(r => ({
                title: typeof r === 'string' ? 'Recommendation' : r.title,
                text: typeof r === 'string' ? r : r.text,
                impact: typeof r === 'string' ? 'Medium' : r.impact,
                label: 'ai-strategic'
            })),
            suggested_keywords: filteredSuggestedKeywords,
            visibility_label: sampledPositions.length > 3 ? 'Strong' : sampledPositions.length > 0 ? 'Moderate' : 'Weak',
            visibility_percentage: calculateVisibility(sampledPositions),
            keyword_distribution: calculateKeywordDistribution(sampledPositions),
            entity_verification: kgData ? {
                recognized: true,
                name: kgData.name,
                types: kgData.type,
                score: kgData.score,
                description: kgData.description,
                source: 'google_knowledge_graph'
            } : { recognized: false },
            content_salience: nlData ? nlData.map(e => ({
                entity: e.name,
                type: e.type,
                weight: e.salience,
                label: 'scientific-extraction'
            })) : []
        };

        await SeoScanRepository.markAsComplete(scanId, results);
        logger.info(`✓ SEO Scan Complete: ${scanId} - Score: ${results.health_score}`);

        return results;

    } catch (error) {
        logger.error('SEO Scan failed:', error.message);
        logger.error('Stack trace:', error.stack);
        await SeoScanRepository.markAsFailed(scanId, error.message);
        throw new Error(`SEO Scan failed: ${error.message}`);
    }
}

export default executeSeoScan;
