import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { fetchWhoisData } from './utils/whoisFetcher.js';
import { checkTechnical } from './utils/technicalChecker.js';
import { getPageSpeedInsights, calculatePerformanceScore, calculateOnPageSeoScore, getLighthouseMetrics } from './utils/pagespeedChecker.js';
import { searchKnowledgeGraph } from './utils/knowledgeGraph.js';
import { analyzeContentEntities } from './utils/naturalLanguage.js';
import { fetchPageContent } from './utils/htmlFetcher.js';
import { searchSerpApi, batchCheckKeywords } from './utils/serpApi.js';
import { extractTechnicalIssues } from './utils/lighthouseAudits.js';

let genAI;

function initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is required');
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

function extractJSON(text) {
    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) { }
    
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
    cleaned = cleaned.trim();
    
    // Try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }
    
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        logger.error('Failed to parse JSON:', cleaned.substring(0, 200));
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

/**
 * CLEAN V2 SEO SCAN - Comprehensive SERP Intelligence
 * 
 * Features:
 * - Gemini-powered business understanding
 * - Industry-specific competitor discovery
 * - Keyword clustering & topic mapping
 * - Content gap analysis
 * - Featured snippet opportunities
 * - Local SEO insights
 * - Competitor strategy analysis
 * - Content quality scoring
 * - Automated action plan
 */
export async function executeSeoScanV2({ scanId, url }) {
    logger.info(`[V2] Starting comprehensive SEO scan for ${url} (ID: ${scanId})`);
    const domain = extractDomain(url);
    
    try {
        if (!genAI) genAI = initGemini();
        await SeoScanRepository.update(scanId, { status: 'SCANNING' });
        
        // PHASE 1: Data Collection
        const collectedData = await collectData(scanId, url, domain);
        
        // PHASE 2: Gemini Analysis
        const analysis = await performGeminiAnalysis(scanId, domain, collectedData);
        
        // PHASE 3: Compile Results
        const results = compileResults(domain, collectedData, analysis);
        
        await SeoScanRepository.markAsComplete(scanId, results);
        logger.info(`[V2] ✓ Scan complete: ${scanId} - Score: ${results.health_score}`);
        
        return results;
        
    } catch (error) {
        logger.error('[V2] Scan failed:', error.message);
        logger.error('Stack:', error.stack);
        await SeoScanRepository.markAsFailed(scanId, error.message);
        throw error;
    }
}

/**
 * PHASE 1: Collect all data from various sources
 */
async function collectData(scanId, url, domain) {
    logger.info('[V2] Phase 1: Data Collection');
    
    // Step 1: Fetch page content
    await SeoScanRepository.updateProgress(scanId, 5, 'Fetching page content');
    const pageContent = await fetchPageContent(url.startsWith('http') ? url : `https://${url}`);
    logger.info(`✓ Page content: ${pageContent?.text?.length || 0} chars`);
    
    // Step 2: Technical & Performance
    await SeoScanRepository.updateProgress(scanId, 15, 'Checking technical SEO');
    const [technical, pageSpeed] = await Promise.all([
        checkTechnical(domain),
        getPageSpeedInsights(`https://${domain}`)
    ]);
    
    const performance = calculatePerformanceScore(pageSpeed);
    const onPageSeo = calculateOnPageSeoScore(pageSpeed);
    const lighthouse = getLighthouseMetrics(pageSpeed);
    const technicalIssues = extractTechnicalIssues(pageSpeed);
    
    logger.info(`✓ Technical: ${technical.score}/${technical.maxScore}, Performance: ${performance.score}/${performance.maxScore}`);
    
    // Step 3: Domain Authority
    await SeoScanRepository.updateProgress(scanId, 25, 'Analyzing domain authority');
    const whoisData = await fetchWhoisData(domain);
    const domainAge = {
        years: whoisData.ageYears,
        created: whoisData.creationDate,
        expires: whoisData.expiryDate,
        registrar: whoisData.registrar
    };
    
    // Step 4: Entity & Content Analysis
    await SeoScanRepository.updateProgress(scanId, 35, 'Analyzing content');
    const brandName = domain.split('.')[0];
    const [kgData, nlData] = await Promise.all([
        searchKnowledgeGraph(brandName),
        pageContent?.text?.length > 500 ? analyzeContentEntities(pageContent.text) : null
    ]);
    
    logger.info(`✓ Entity: ${kgData ? 'Found' : 'Not found'}, NL entities: ${nlData?.length || 0}`);
    
    return {
        pageContent,
        technical,
        performance,
        onPageSeo,
        lighthouse,
        technicalIssues,
        pageSpeed,
        domainAge,
        kgData,
        nlData
    };
}

/**
 * PHASE 2: Comprehensive Gemini-powered analysis
 */
async function performGeminiAnalysis(scanId, domain, data) {
    logger.info('[V2] Phase 2: Gemini Analysis');
    
    await SeoScanRepository.updateProgress(scanId, 45, 'Understanding business context');
    
    // Step 1: Business Understanding
    const businessContext = await analyzeBusinessContext(domain, data.pageContent);
    logger.info(`✓ Business: ${businessContext.type}`);
    
    // Step 2: Extract keywords from page content
    await SeoScanRepository.updateProgress(scanId, 50, 'Extracting keywords from page');
    const { extractRealKeywords } = await import('./utils/keywordPlanner.js');
    const pageKeywords = extractRealKeywords(data.pageContent);
    logger.info(`✓ Extracted ${pageKeywords.length} keywords from page`);
    
    // Step 3: SERP Data Collection (use both business terms and page keywords)
    await SeoScanRepository.updateProgress(scanId, 55, 'Collecting SERP data');
    const serpData = await collectSerpData(domain, businessContext, pageKeywords);
    logger.info(`✓ SERP: ${serpData.keywords.length} keywords, ${serpData.competitors.length} competitors`);
    
    // Step 4: Comprehensive Analysis
    await SeoScanRepository.updateProgress(scanId, 75, 'Performing comprehensive analysis');
    const comprehensiveAnalysis = await performComprehensiveAnalysis(
        domain,
        businessContext,
        serpData,
        data
    );
    
    logger.info(`✓ Analysis: ${comprehensiveAnalysis.keyword_clusters?.length || 0} clusters, ${comprehensiveAnalysis.content_gaps?.length || 0} gaps`);
    
    return {
        businessContext,
        serpData,
        ...comprehensiveAnalysis
    };
}

/**
 * Analyze business context using Gemini
 */
async function analyzeBusinessContext(domain, pageContent) {
    const title = pageContent?.html?.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const metaDesc = pageContent?.html?.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
    const h1s = Array.from(pageContent?.html?.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi) || []).map(m => m[1]).slice(0, 3);
    
    const prompt = `Analyze this website and provide business context:

DOMAIN: ${domain}
TITLE: ${title}
META DESCRIPTION: ${metaDesc}
H1 HEADINGS: ${h1s.join(', ')}

Return JSON:
{
  "type": "specific business type (e.g., 'maternity clothing e-commerce', 'real estate developer')",
  "industry": "industry category",
  "target_market": "primary geographic market",
  "search_terms": ["5 industry-specific search terms that would find direct competitors"]
}`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        });
        const result = await model.generateContent(prompt);
        const analysis = extractJSON(result.response.text());
        
        // Ensure we have search terms
        if (!analysis.search_terms || analysis.search_terms.length === 0) {
            // Fallback: use domain-based terms
            const domainName = domain.split('.')[0];
            analysis.search_terms = [
                `${domainName} products`,
                `${domainName} services`,
                `${domainName} alternatives`,
                `best ${analysis.industry || 'products'}`,
                `${analysis.type || domainName}`
            ];
        }
        
        return analysis;
    } catch (error) {
        logger.error('Business analysis failed:', error.message);
        const domainName = domain.split('.')[0];
        return {
            type: 'e-commerce',
            industry: 'general',
            target_market: domain.endsWith('.in') ? 'India' : 'United States',
            search_terms: [
                `${domainName} products`,
                `${domainName} services`,
                `best ${domainName}`,
                `${domainName} online`,
                `buy ${domainName}`
            ]
        };
    }
}

/**
 * Collect SERP data for analysis
 */
async function collectSerpData(domain, businessContext, pageKeywords = []) {
    // Combine business search terms with page keywords (prioritize page keywords)
    const allKeywords = [
        ...pageKeywords.slice(0, 15), // Top 15 from page
        ...businessContext.search_terms.slice(0, 5) // Top 5 business terms
    ];
    
    const searchTerms = [...new Set(allKeywords)].slice(0, 20); // Dedupe and limit to 20
    logger.info(`Checking ${searchTerms.length} keywords for SERP data`);
    
    const allSerpResults = [];
    const competitorMap = new Map();
    
    // Collect SERP data for each search term
    for (const term of searchTerms) {
        const serpResult = await searchSerpApi(term, 'United States', domain);
        if (serpResult) {
            allSerpResults.push(serpResult);
            
            // Track competitors
            serpResult.top_competitors.slice(0, 15).forEach(comp => {
                const compDomain = extractDomain(comp.link);
                if (compDomain !== domain) {
                    if (!competitorMap.has(compDomain)) {
                        competitorMap.set(compDomain, {
                            domain: compDomain,
                            appearances: 0,
                            titles: [],
                            snippets: []
                        });
                    }
                    const data = competitorMap.get(compDomain);
                    data.appearances++;
                    data.titles.push(comp.title);
                    data.snippets.push(comp.snippet);
                }
            });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Filter competitors using Gemini
    const competitors = await filterCompetitorsWithGemini(
        domain,
        businessContext,
        Array.from(competitorMap.values()).sort((a, b) => b.appearances - a.appearances).slice(0, 20)
    );
    
    // Analyze keywords with batch check (this gives us positions)
    const keywordAnalysis = await batchCheckKeywords(searchTerms, domain);
    
    return {
        keywords: keywordAnalysis,
        competitors,
        rawSerpData: allSerpResults
    };
}

/**
 * Filter competitors intelligently using Gemini
 */
async function filterCompetitorsWithGemini(domain, businessContext, potentialCompetitors) {
    if (potentialCompetitors.length === 0) return [];
    
    // Manual filtering first - remove obvious non-competitors
    const excludeDomains = [
        'wikipedia.org', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
        'reddit.com', 'pinterest.com', 'tiktok.com', 'amazon.com', 'ebay.com', 'walmart.com',
        'indeed.com', 'glassdoor.com', 'cnn.com', 'bbc.com', 'nytimes.com', 'forbes.com',
        'merriam-webster.com', 'dictionary.com', 'apps.apple.com', 'play.google.com',
        'cambridge.org', 'thesaurus.com', 'vocabulary.com', 'collinsdictionary.com' // Add dictionary sites
    ];
    
    const manuallyFiltered = potentialCompetitors.filter(c => 
        !excludeDomains.some(excluded => c.domain.includes(excluded))
    );
    
    // If we have good competitors after manual filtering, use those
    if (manuallyFiltered.length >= 5) {
        logger.info(`Manual filtering kept ${manuallyFiltered.length} competitors`);
        return manuallyFiltered.slice(0, 10);
    }
    
    // Otherwise try Gemini
    const prompt = `Filter competitors for ${businessContext.type} business (${domain}) in ${businessContext.target_market}.

Potential competitors:
${potentialCompetitors.slice(0, 15).map(c => `- ${c.domain} (${c.appearances}x): ${c.titles[0]}`).join('\n')}

Return JSON with direct competitors (technology companies, retailers, manufacturers):
{
  "competitors": ["domain1.com", "domain2.com", "domain3.com", "domain4.com", "domain5.com"]
}

Include at least 5 competitors. Exclude: Wikipedia, YouTube, social media, dictionaries, news sites.`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
        });
        const result = await model.generateContent(prompt);
        const filtered = extractJSON(result.response.text());
        
        const competitors = (filtered.competitors || [])
            .map(domain => potentialCompetitors.find(c => c.domain === domain))
            .filter(c => c !== undefined);
        
        // If still too few, use manual filtering
        if (competitors.length < 3) {
            logger.warn('Gemini returned too few competitors, using manual filtering');
            return manuallyFiltered.slice(0, 10);
        }
        
        return competitors.slice(0, 10);
    } catch (error) {
        logger.error('Competitor filtering failed:', error.message);
        return manuallyFiltered.slice(0, 10);
    }
}

/**
 * Perform comprehensive analysis with all features
 */
async function performComprehensiveAnalysis(domain, businessContext, serpData, collectedData) {
    // Prepare comprehensive data for Gemini
    const analysisData = {
        domain,
        business_type: businessContext.type,
        target_market: businessContext.target_market,
        competitors: serpData.competitors.map(c => c.domain),
        keywords: serpData.keywords.map(k => ({
            keyword: k.keyword,
            position: k.my_position,
            difficulty: k.total_results > 10000000 ? 'High' : k.total_results > 1000000 ? 'Medium' : 'Low',
            featured_snippet: k.serp_features?.featured_snippet,
            paa: k.serp_features?.people_also_ask?.slice(0, 3),
            related: k.serp_features?.related_searches?.slice(0, 5)
        })),
        health_score: Math.round(
            (collectedData.technical.score / collectedData.technical.maxScore) * 25 +
            (collectedData.onPageSeo.score / collectedData.onPageSeo.maxScore) * 25 +
            (collectedData.performance.score / collectedData.performance.maxScore) * 25 +
            10 // Base authority score
        )
    };
    
    const prompt = `Comprehensive SEO analysis for ${businessContext.type} (${domain}) in ${businessContext.target_market}.

CURRENT STATE:
- Health Score: ${analysisData.health_score}/100
- Competitors: ${analysisData.competitors.join(', ')}
- Keywords analyzed: ${analysisData.keywords.length}

SERP DATA:
${analysisData.keywords.map(k => `
"${k.keyword}": Position ${k.position || 'Not ranking'}, Difficulty: ${k.difficulty}
- Featured Snippet: ${k.featured_snippet ? k.featured_snippet.source_domain : 'None'}
- PAA: ${k.paa?.map(p => p.question).join('; ') || 'None'}
`).join('\n')}

Provide comprehensive analysis in JSON:
{
  "keyword_clusters": [
    {"name": "Topic", "keywords": ["kw1", "kw2"], "priority": "High", "action": "Create pillar page"}
  ],
  "content_gaps": [
    {"topic": "Missing topic", "competitors": ["comp.com"], "opportunity": "Why important", "action": "What to create"}
  ],
  "featured_snippet_opportunities": [
    {"keyword": "kw", "owner": "comp.com", "format": "list/table/paragraph", "recommendation": "How to win"}
  ],
  "local_seo": {
    "has_local_intent": true/false,
    "recommendations": ["action 1", "action 2"]
  },
  "competitor_strategy": {
    "patterns": ["What they do"],
    "strengths": ["Their advantages"],
    "weaknesses": ["Gaps to exploit"]
  },
  "content_quality": {
    "score": 65,
    "improvements": ["What to improve"]
  },
  "action_plan": [
    {"priority": 1, "task": "Task", "impact": "High", "effort": "Medium", "timeline": "2 weeks"}
  ],
  "suggested_keywords": [
    {"category": "Transactional", "keywords": [{"word": "long tail phrase", "intent": "transactional"}]},
    {"category": "Informational", "keywords": [{"word": "how to phrase", "intent": "informational"}]},
    {"category": "Long-Tail", "keywords": [{"word": "specific phrase", "intent": "navigational"}]}
  ]
}`;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.7, maxOutputTokens: 16384 }
        });
        
        logger.info('Requesting comprehensive analysis from Gemini...');
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        logger.info(`Gemini response length: ${responseText.length} characters`);
        
        const analysis = extractJSON(responseText);
        logger.info(`Parsed analysis: ${Object.keys(analysis).join(', ')}`);
        
        // Ensure we have suggested keywords - generate fallback if empty
        if (!analysis.suggested_keywords || analysis.suggested_keywords.length === 0) {
            logger.warn('No suggested keywords from Gemini, using fallback');
            analysis.suggested_keywords = generateFallbackKeywords(domain, businessContext);
        }
        
        // Ensure we have action plan
        if (!analysis.action_plan || analysis.action_plan.length === 0) {
            logger.warn('No action plan from Gemini, using fallback');
            analysis.action_plan = generateFallbackActionPlan(analysisData.health_score);
        }
        
        logger.info(`Final analysis: clusters=${analysis.keyword_clusters?.length || 0}, gaps=${analysis.content_gaps?.length || 0}, snippets=${analysis.featured_snippet_opportunities?.length || 0}`);
        
        return analysis;
    } catch (error) {
        logger.error('Comprehensive analysis failed:', error.message);
        logger.error('Error stack:', error.stack);
        return {
            keyword_clusters: [],
            content_gaps: [],
            featured_snippet_opportunities: [],
            local_seo: null,
            competitor_strategy: null,
            content_quality: null,
            action_plan: generateFallbackActionPlan(analysisData.health_score),
            suggested_keywords: generateFallbackKeywords(domain, businessContext)
        };
    }
}

/**
 * Generate fallback keywords when Gemini fails
 */
function generateFallbackKeywords(domain, businessContext) {
    const domainName = domain.split('.')[0];
    const industry = businessContext.industry || 'products';
    const type = businessContext.type || 'business';
    
    return [
        {
            category: 'Transactional',
            keywords: [
                { word: `buy ${domainName} products online`, intent: 'transactional' },
                { word: `${domainName} ${industry} for sale`, intent: 'transactional' },
                { word: `best ${domainName} deals`, intent: 'transactional' },
                { word: `${domainName} online store`, intent: 'transactional' },
                { word: `order ${domainName} products`, intent: 'transactional' }
            ]
        },
        {
            category: 'Informational',
            keywords: [
                { word: `what is ${domainName}`, intent: 'informational' },
                { word: `how to use ${domainName}`, intent: 'informational' },
                { word: `${domainName} guide`, intent: 'informational' },
                { word: `${domainName} reviews`, intent: 'informational' },
                { word: `${domainName} vs competitors`, intent: 'informational' }
            ]
        },
        {
            category: 'Long-Tail',
            keywords: [
                { word: `best ${domainName} for beginners`, intent: 'navigational' },
                { word: `${domainName} ${industry} comparison`, intent: 'navigational' },
                { word: `affordable ${domainName} options`, intent: 'navigational' },
                { word: `${domainName} customer service`, intent: 'navigational' },
                { word: `${domainName} near me`, intent: 'navigational' }
            ]
        }
    ];
}

/**
 * Generate fallback action plan based on health score
 */
function generateFallbackActionPlan(healthScore) {
    const actions = [];
    
    if (healthScore < 70) {
        actions.push({
            priority: 1,
            task: 'Improve Technical SEO',
            impact: 'High',
            effort: 'Medium',
            timeline: '2 weeks'
        });
    }
    
    if (healthScore < 80) {
        actions.push({
            priority: 2,
            task: 'Optimize On-Page SEO',
            impact: 'High',
            effort: 'Low',
            timeline: '1 week'
        });
    }
    
    actions.push({
        priority: 3,
        task: 'Create Content Strategy',
        impact: 'High',
        effort: 'High',
        timeline: '4 weeks'
    });
    
    actions.push({
        priority: 4,
        task: 'Build Quality Backlinks',
        impact: 'Medium',
        effort: 'High',
        timeline: '8 weeks'
    });
    
    return actions;
}

/**
 * PHASE 3: Compile final results
 */
function compileResults(domain, collectedData, analysis) {
    // Calculate authority score based on multiple factors
    let authorityScore = 10; // Base score
    
    // Knowledge Graph bonus (up to 10 points)
    if (collectedData.kgData && collectedData.kgData.score) {
        const kgScore = collectedData.kgData.score;
        if (kgScore > 10000) authorityScore += 10; // Very high authority
        else if (kgScore > 5000) authorityScore += 8;
        else if (kgScore > 1000) authorityScore += 6;
        else if (kgScore > 500) authorityScore += 4;
        else authorityScore += 2;
    }
    
    // Domain age bonus (up to 5 points)
    if (collectedData.domainAge.years) {
        if (collectedData.domainAge.years >= 20) authorityScore += 5;
        else if (collectedData.domainAge.years >= 10) authorityScore += 3;
        else if (collectedData.domainAge.years >= 5) authorityScore += 2;
        else if (collectedData.domainAge.years >= 2) authorityScore += 1;
    }
    
    authorityScore = Math.min(25, authorityScore); // Cap at 25
    
    const healthScore = Math.round(
        (collectedData.technical.score / collectedData.technical.maxScore) * 25 +
        (collectedData.onPageSeo.score / collectedData.onPageSeo.maxScore) * 25 +
        (collectedData.performance.score / collectedData.performance.maxScore) * 25 +
        authorityScore
    );
    
    // Calculate visibility
    const rankedKeywords = analysis.serpData.keywords.filter(k => k.my_position && k.my_position <= 100);
    const visibilityPercentage = analysis.serpData.keywords.length > 0
        ? Math.round((rankedKeywords.length / analysis.serpData.keywords.length) * 100)
        : 0;
    
    return {
        domain,
        scanned_at: new Date().toISOString(),
        data_source: 'serpapi_gemini_v2',
        
        // Business Context
        business_type: analysis.businessContext.type,
        target_market: analysis.businessContext.target_market,
        
        // Keywords & Rankings
        observed_keywords: analysis.serpData.keywords.map(k => ({ keyword: k.keyword })),
        sampled_positions: analysis.serpData.keywords.filter(k => k.my_position).map(k => ({
            keyword: k.keyword,
            position: k.my_position
        })),
        
        // Competitors
        serp_competitors: {
            direct: analysis.serpData.competitors.map(c => ({ 
                domain: c.domain, 
                appearances: c.appearances 
            })),
            content: [] // V2 doesn't distinguish content competitors
        },
        
        // Scores
        health_score: healthScore,
        score_breakdown: {
            technical: collectedData.technical.score,
            on_page_seo: collectedData.onPageSeo.score,
            performance: collectedData.performance.score,
            authority: authorityScore
        },
        
        // Technical
        technical_details: {
            https: collectedData.technical.checks.https.passed,
            robots_txt: collectedData.technical.checks.robotsTxt.passed,
            sitemap: collectedData.technical.checks.sitemap.passed,
            score: collectedData.technical.score,
            max_score: collectedData.technical.maxScore
        },
        technical_issues: collectedData.technicalIssues,
        
        // Performance
        lighthouse_metrics: collectedData.lighthouse,
        pagespeed: collectedData.pageSpeed ? {
            performance: collectedData.pageSpeed.performance,
            accessibility: collectedData.pageSpeed.accessibility,
            seo: collectedData.pageSpeed.seo,
            mobile_optimized: collectedData.pageSpeed.mobileOptimized,
            lcp: collectedData.pageSpeed.lcpSeconds
        } : null,
        
        // Domain
        domain_age: collectedData.domainAge,
        
        // Entity
        entity_verification: collectedData.kgData ? {
            recognized: true,
            name: collectedData.kgData.name,
            types: collectedData.kgData.type,
            description: collectedData.kgData.description,
            score: collectedData.kgData.score || 0
        } : { recognized: false },
        
        // Content
        content_salience: collectedData.nlData?.map(e => ({
            entity: e.name,
            type: e.type,
            weight: e.salience
        })) || [],
        
        // NEW: Comprehensive Analysis
        keyword_clusters: analysis.keyword_clusters || [],
        content_gaps: analysis.content_gaps || [],
        featured_snippet_opportunities: analysis.featured_snippet_opportunities || [],
        local_seo_insights: analysis.local_seo,
        competitor_strategy: analysis.competitor_strategy,
        content_quality_score: analysis.content_quality,
        
        // Action Plan (format for frontend)
        recommendations: (analysis.action_plan || []).map(action => ({
            title: action.task,
            text: `Priority ${action.priority} • ${action.impact} Impact • ${action.effort} Effort • Timeline: ${action.timeline}`,
            impact: action.impact
        })),
        
        // Keywords (format for frontend)
        suggested_keywords: analysis.suggested_keywords || [],
        
        // Visibility
        visibility_percentage: visibilityPercentage,
        visibility_label: visibilityPercentage >= 70 ? 'Strong' : visibilityPercentage >= 40 ? 'Moderate' : 'Weak'
    };
}

export default executeSeoScanV2;
