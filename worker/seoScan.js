import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { fetchWhoisData } from './utils/whoisFetcher.js';
import { checkTechnical } from './utils/technicalChecker.js';
import { getPageSpeedInsights, calculatePerformanceScore, calculateOnPageSeoScore, getLighthouseMetrics } from './utils/pagespeedChecker.js';
import { searchKnowledgeGraph } from './utils/knowledgeGraph.js';
import { analyzeContentEntities } from './utils/naturalLanguage.js';
import { fetchPageContent } from './utils/htmlFetcher.js';
import { searchSerpApi, batchCheckKeywords, calculateKeywordDifficulty, analyzeSerpFeatures, analyzeCompetitorGap, classifySearchIntent, calculateQuickWinScore, calculateOpportunityScore, checkRegionalRankings, compareMobileVsDesktop, analyzeCTRPotential } from './utils/serpApi.js';
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
        // STEP 3: Intelligent Competitor Discovery using Gemini + SERP API
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 30, 'Finding competitors via SERP API');
        logger.info(`Step 3: Intelligent competitor discovery (Gemini + SERP)`);
        
        // First, use Gemini to understand the business and generate search terms
        let industrySearchTerms = [];
        let businessType = '';
        
        try {
            const businessAnalysisPrompt = `Analyze this website content and identify the business:

DOMAIN: ${domain}
TITLE: ${pageContent?.html?.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ''}
META DESCRIPTION: ${pageContent?.html?.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''}
H1 HEADINGS: ${Array.from(pageContent?.html?.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi) || []).map(m => m[1]).slice(0, 3).join(', ')}

Based on this, provide:
1. Business type (e.g., "real estate developer", "maternity clothing e-commerce", "restaurant")
2. 5 industry-specific search terms that would find direct competitors

Return ONLY valid JSON:
{
  "business_type": "specific business type",
  "search_terms": ["term 1", "term 2", "term 3", "term 4", "term 5"]
}`;

            const businessModel = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
            });
            
            const businessResult = await businessModel.generateContent(businessAnalysisPrompt);
            const businessData = extractJSON(businessResult.response.text());
            
            businessType = businessData.business_type || '';
            industrySearchTerms = businessData.search_terms || [];
            
            logger.info(`✓ Business identified: ${businessType}`);
            logger.info(`✓ Industry search terms:`, industrySearchTerms);
        } catch (error) {
            logger.error('Gemini business analysis failed:', error.message);
            // Fallback to phrase-based search
            const phraseKeywords = realWebsiteKeywords.filter(kw => kw.includes(' ') && kw.length > 8);
            industrySearchTerms = phraseKeywords.slice(0, 5);
        }
        
        // Search SERP API with industry-specific terms
        const allSerpResults = [];
        const competitorDomains = new Map();
        
        for (const searchTerm of industrySearchTerms.slice(0, 5)) {
            const serpResult = await searchSerpApi(searchTerm, 'United States', domain);
            if (serpResult && serpResult.top_competitors) {
                allSerpResults.push({
                    search_term: searchTerm,
                    competitors: serpResult.top_competitors.slice(0, 15)
                });
                
                // Collect all domains
                serpResult.top_competitors.slice(0, 15).forEach(comp => {
                    const compDomain = extractDomain(comp.link);
                    if (compDomain !== domain) {
                        if (!competitorDomains.has(compDomain)) {
                            competitorDomains.set(compDomain, {
                                domain: compDomain,
                                appearances: 0,
                                titles: [],
                                snippets: []
                            });
                        }
                        const data = competitorDomains.get(compDomain);
                        data.appearances++;
                        data.titles.push(comp.title);
                        data.snippets.push(comp.snippet);
                    }
                });
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        }
        
        logger.info(`✓ Collected ${competitorDomains.size} potential competitor domains`);
        
        // Now use Gemini to intelligently filter competitors
        let competitorList = [];
        
        if (competitorDomains.size > 0) {
            try {
                const competitorData = Array.from(competitorDomains.entries())
                    .sort((a, b) => b[1].appearances - a[1].appearances)
                    .slice(0, 20)
                    .map(([domain, data]) => ({
                        domain,
                        appearances: data.appearances,
                        sample_title: data.titles[0],
                        sample_snippet: data.snippets[0]
                    }));
                
                const competitorFilterPrompt = `You are analyzing competitors for a ${businessType} business (${domain}) targeting ${domain.endsWith('.in') ? 'India' : 'international'} market.

Here are domains that appeared in search results for industry terms:

${competitorData.map(c => `- ${c.domain} (appeared ${c.appearances}x)
  Title: ${c.sample_title}
  Snippet: ${c.sample_snippet}`).join('\n\n')}

Filter this list to include RELEVANT competitors:
${domain.endsWith('.in') ? '- PRIORITIZE Indian/regional competitors (domains ending in .in, or India-focused businesses)' : ''}
- EXCLUDE: Large marketplaces (amazon, flipkart, myntra, ebay), social media, news sites, job sites, generic platforms
- INCLUDE: Direct competitors in the same industry and target market
- For ${domain.endsWith('.in') ? 'Indian' : 'international'} business, prefer ${domain.endsWith('.in') ? 'regional/local' : 'similar-sized'} competitors

Return ONLY valid JSON array of competitor domains (max 10):
{
  "competitors": ["domain1.com", "domain2.com", "domain3.com"]
}`;

                const filterModel = genAI.getGenerativeModel({
                    model: 'gemini-2.0-flash',
                    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
                });
                
                const filterResult = await filterModel.generateContent(competitorFilterPrompt);
                const filterData = extractJSON(filterResult.response.text());
                
                const validCompetitors = filterData.competitors || [];
                
                // Map back to full data
                competitorList = validCompetitors
                    .map(domain => {
                        const data = competitorDomains.get(domain);
                        return data ? {
                            domain,
                            appearances: data.appearances,
                            avg_position: 5, // Approximate
                            keywords: industrySearchTerms.slice(0, data.appearances)
                        } : null;
                    })
                    .filter(c => c !== null)
                    .slice(0, 10);
                
                logger.info(`✓ Gemini filtered to ${competitorList.length} real competitors:`, competitorList.map(c => c.domain));
            } catch (error) {
                logger.error('Gemini competitor filtering failed:', error.message);
                // Fallback: use frequency-based filtering
                competitorList = Array.from(competitorDomains.entries())
                    .filter(([domain, data]) => data.appearances >= 2)
                    .sort((a, b) => b[1].appearances - a[1].appearances)
                    .slice(0, 10)
                    .map(([domain, data]) => ({
                        domain,
                        appearances: data.appearances,
                        avg_position: 5,
                        keywords: industrySearchTerms.slice(0, data.appearances)
                    }));
            }
        }
        
        logger.info(`✓ Final competitor list: ${competitorList.length} competitors`);

        // =========================================================================
        // STEP 4: Check SERP rankings + comprehensive SERP intelligence
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 50, 'Analyzing SERP data');
        logger.info(`Step 4: Comprehensive SERP analysis`);
        
        // Use INDUSTRY SEARCH TERMS (from Gemini) for analysis, not observed keywords
        // This ensures we analyze relevant product keywords, not brand names
        const keywordsToAnalyze = industrySearchTerms.length > 0 
            ? industrySearchTerms.slice(0, 10)
            : observedKeywords.slice(0, 10);
        
        logger.info(`Analyzing ${keywordsToAnalyze.length} keywords:`, keywordsToAnalyze);
        
        const serpResults = await batchCheckKeywords(keywordsToAnalyze, domain);
        
        const sampledPositions = serpResults
            .filter(r => r.my_position)
            .map(r => ({
                keyword: r.keyword,
                position: r.my_position,
                url: r.my_result?.link,
                source: 'verified-serpapi',
                total_results: r.total_results
            }));
        
        // Comprehensive SERP analysis with all new features
        const serpAnalysis = serpResults.map(r => {
            const difficulty = calculateKeywordDifficulty(r);
            const intent = classifySearchIntent(r);
            const quickWin = calculateQuickWinScore(r, r.my_position);
            const opportunity = calculateOpportunityScore(r);
            const ctrAnalysis = r.my_position ? analyzeCTRPotential(r, domain) : null;
            
            return {
                keyword: r.keyword,
                my_position: r.my_position,
                total_results: r.total_results,
                
                // Difficulty analysis
                difficulty: {
                    score: difficulty.score,
                    level: difficulty.difficulty,
                    factors: difficulty.factors,
                    recommendation: difficulty.recommendation
                },
                
                // Search intent
                search_intent: {
                    intent: intent.intent,
                    confidence: intent.confidence,
                    signals: intent.signals,
                    serp_type: intent.serp_type
                },
                
                // Quick win score
                quick_win: {
                    score: quickWin.score,
                    priority: quickWin.priority,
                    factors: quickWin.factors,
                    recommendation: quickWin.recommendation
                },
                
                // Opportunity score
                opportunity: {
                    score: opportunity.score,
                    total_opportunities: opportunity.total_opportunities,
                    opportunities: opportunity.opportunities,
                    priority: opportunity.priority
                },
                
                // CTR analysis (if ranking)
                ctr_analysis: ctrAnalysis,
                
                // SERP features
                serp_features: {
                    featured_snippet: r.serp_features.featured_snippet,
                    knowledge_graph: r.serp_features.knowledge_graph,
                    people_also_ask: r.serp_features.people_also_ask,
                    related_searches: r.serp_features.related_searches,
                    local_pack: r.serp_features.local_pack,
                    shopping_results: r.serp_features.shopping_results,
                    images: r.serp_features.images,
                    videos: r.serp_features.videos,
                    top_stories: r.serp_features.top_stories,
                    rich_results_summary: r.serp_features.rich_results_summary
                },
                
                // Top competitors
                top_3_competitors: r.top_competitors.slice(0, 3).map(c => ({
                    position: c.position,
                    domain: c.domain,
                    title: c.title,
                    snippet: c.snippet
                }))
            };
        });
        
        logger.info(`✓ SERP analysis complete: ${sampledPositions.length} rankings, ${serpAnalysis.length} keywords analyzed`);
        
        // Filter Quick wins & opportunities - differentiate them properly
        const observedKeywordSet = new Set(observedKeywords.map(k => k.toLowerCase()));
        
        // QUICK WINS = Keywords you're CLOSE to ranking for OR very low difficulty
        // Focus: Easy wins, low-hanging fruit
        const quickWins = serpAnalysis
            .filter(s => 
                !observedKeywordSet.has(s.keyword.toLowerCase()) && // Not in observed keywords
                s.keyword.length > 8 && // Meaningful phrases only
                s.keyword.includes(' ') && // Must be a phrase
                (
                    (s.my_position && s.my_position >= 11 && s.my_position <= 50) || // Close to ranking
                    (s.difficulty.score < 40 && !s.my_position) || // Low difficulty, not ranking yet
                    s.quick_win.score >= 50 // High quick win score
                )
            )
            .sort((a, b) => {
                // Prioritize: already ranking > low difficulty > high quick win score
                if (a.my_position && !b.my_position) return -1;
                if (!a.my_position && b.my_position) return 1;
                if (a.my_position && b.my_position) return a.my_position - b.my_position;
                return b.quick_win.score - a.quick_win.score;
            })
            .slice(0, 5);
        
        logger.info(`✓ Found ${quickWins.length} quick win opportunities`);
        
        // HIGH OPPORTUNITIES = Keywords with RICH SERP FEATURES to target
        // Focus: Featured snippets, PAA, Related searches - content opportunities
        const highOpportunities = serpAnalysis
            .filter(s => 
                !observedKeywordSet.has(s.keyword.toLowerCase()) && // Not in observed keywords
                s.keyword.length > 8 && // Meaningful phrases only
                s.keyword.includes(' ') && // Must be a phrase
                !quickWins.find(qw => qw.keyword === s.keyword) && // Not already in quick wins
                (
                    s.opportunity.total_opportunities >= 3 || // Multiple SERP features
                    s.serp_features.people_also_ask.length >= 3 || // Has PAA questions
                    !s.serp_features.featured_snippet || // No featured snippet (opportunity)
                    s.serp_features.related_searches.length >= 5 // Many related searches
                )
            )
            .sort((a, b) => b.opportunity.score - a.opportunity.score)
            .slice(0, 5);
        
        logger.info(`✓ Found ${highOpportunities.length} high opportunity keywords`);

        // Competitor gap analysis
        const competitorGapAnalysis = serpResults.length > 0 ? analyzeCompetitorGap(serpResults, domain) : null;

        // =========================================================================
        // STEP 4.5: Regional & Device Analysis (using industry keywords)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 55, 'Checking regional & device rankings');
        logger.info('Step 4.5: Regional & device analysis');
        
        let regionalAnalysis = null;
        let deviceComparison = null;
        
        // Use industry search terms (from Gemini) for regional analysis
        const keywordsForRegionalAnalysis = industrySearchTerms.length > 0 
            ? industrySearchTerms.slice(0, 2)
            : observedKeywords.filter(kw => 
                kw.length > 8 && 
                kw.includes(' ') &&
                !kw.toLowerCase().includes(domain.split('.')[0].toLowerCase())
              ).slice(0, 2);
        
        logger.info(`Keywords for regional analysis:`, keywordsForRegionalAnalysis);
        
        if (keywordsForRegionalAnalysis.length > 0) {
            // Regional analysis - prioritize target market
            try {
                const targetLocations = domain.endsWith('.in') 
                    ? ['India', 'United States', 'United Kingdom']
                    : domain.endsWith('.uk')
                    ? ['United Kingdom', 'United States', 'India']
                    : domain.endsWith('.au')
                    ? ['Australia', 'United States', 'United Kingdom']
                    : ['United States', 'India', 'United Kingdom'];
                
                regionalAnalysis = await checkRegionalRankings(
                    keywordsForRegionalAnalysis[0], 
                    domain, 
                    targetLocations
                );
                logger.info(`✓ Regional analysis: ${regionalAnalysis.analysis.ranking_in}/${regionalAnalysis.locations.length} locations`);
            } catch (error) {
                logger.warn('Regional analysis failed:', error.message);
            }
            
            // Device comparison
            try {
                const primaryLocation = domain.endsWith('.in') ? 'India' 
                    : domain.endsWith('.uk') ? 'United Kingdom'
                    : domain.endsWith('.au') ? 'Australia'
                    : 'United States';
                    
                deviceComparison = await compareMobileVsDesktop(
                    keywordsForRegionalAnalysis[0],
                    domain,
                    primaryLocation
                );
                logger.info(`✓ Device comparison: ${deviceComparison.analysis}`);
            } catch (error) {
                logger.warn('Device comparison failed:', error.message);
            }
        } else {
            logger.warn('No suitable keywords found for regional/device analysis');
        }

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
        // STEP 8: Gemini strategic keywords (based on SERP gaps & regional context)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 85, 'Generating strategic keywords');
        logger.info('Step 8: Gemini strategic keyword generation with SERP intelligence');
        
        const calculatedHealthScore = Math.round(
            (technicalResults.score / technicalResults.maxScore) * 25 +
            (onPageSeoScore.score / onPageSeoScore.maxScore) * 25 +
            (authorityScore / 25) * 25 +
            (performanceScore.score / performanceScore.maxScore) * 25
        );
        
        // Detect target market
        const targetMarket = domain.endsWith('.in') ? 'India' : 'United States';
        const isIndianBusiness = domain.endsWith('.in');
        
        // Prepare SERP intelligence for Gemini
        const serpIntelligence = {
            business_type: businessType || 'e-commerce',
            target_market: targetMarket,
            current_keywords: observedKeywords.slice(0, 10),
            competitors: competitorList.slice(0, 5).map(c => c.domain),
            serp_gaps: serpAnalysis
                .filter(s => !s.my_position && s.difficulty.score < 50)
                .slice(0, 5)
                .map(s => ({
                    keyword: s.keyword,
                    difficulty: s.difficulty.level,
                    opportunities: s.opportunity.opportunities.slice(0, 2).map(o => o.type)
                })),
            paa_questions: serpAnalysis
                .flatMap(s => s.serp_features.people_also_ask.slice(0, 2).map(q => q.question))
                .slice(0, 10),
            related_searches: serpAnalysis
                .flatMap(s => s.serp_features.related_searches.slice(0, 2).map(r => r.query))
                .slice(0, 10)
        };
        
        const analysisPrompt = `You are an SEO expert analyzing a ${businessType} business targeting ${targetMarket}.

BUSINESS CONTEXT:
- Domain: ${domain}
- Target Market: ${targetMarket}
- Current Keywords: ${serpIntelligence.current_keywords.join(', ')}
- Competitors: ${serpIntelligence.competitors.join(', ')}

SERP INTELLIGENCE:
- People Also Ask Questions: ${serpIntelligence.paa_questions.slice(0, 5).join('; ')}
- Related Searches: ${serpIntelligence.related_searches.slice(0, 5).join('; ')}
- SERP Gaps (low competition): ${serpIntelligence.serp_gaps.map(g => g.keyword).join(', ')}

Generate 30 ACTIONABLE long-tail keywords (3-5 words each) that:
1. Are NOT in the current keywords list
2. Are specific to ${targetMarket} market ${isIndianBusiness ? '(include city names, regional terms)' : ''}
3. Have clear search intent (transactional, informational, or navigational)
4. Are based on actual SERP data (PAA questions, related searches)
5. Include location modifiers if relevant

Categories:
1. High Intent / Transactional (10 keywords) - buying intent, "buy X", "X online", "X price"
2. Informational / Educational (10 keywords) - "how to", "best", "guide", "tips"
3. Niche / Long-Tail (10 keywords) - specific, low competition, 4-5 words

Return ONLY valid JSON:
{
  "suggested_keywords": [
    {"category": "High Intent / Transactional", "keywords": [{"word": "buy maternity dresses online india", "intent": "transactional"}, ...]},
    {"category": "Informational / Educational", "keywords": [{"word": "how to choose maternity clothes", "intent": "informational"}, ...]},
    {"category": "Niche / Long-Tail", "keywords": [{"word": "cotton maternity kurtis for summer india", "intent": "navigational"}, ...]}
  ],
  "recommendations": [
    {"title": "Target Regional Keywords", "text": "Focus on city-specific terms like 'maternity wear bangalore' to capture local traffic", "impact": "High"},
    {"title": "Answer PAA Questions", "text": "Create content answering: ${serpIntelligence.paa_questions[0] || 'common questions'}", "impact": "Medium"}
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

        // Filter out duplicates with observed keywords (double-check)
        const filteredSuggestedKeywords = (analysis.suggested_keywords || []).map(category => ({
            ...category,
            keywords: category.keywords.filter(kw => !observedKeywordSet.has(kw.word.toLowerCase()))
        })).filter(category => category.keywords.length > 0);

        // =========================================================================
        // Compile final results with comprehensive SERP data
        // =========================================================================
        const results = {
            domain,
            scanned_at: new Date().toISOString(),
            data_source: 'serpapi_primary',
            business_summary: businessSummary,
            real_website_keywords: realWebsiteKeywords.map(k => ({ keyword: k, label: 'extracted-from-site' })),
            observed_keywords: observedKeywords.map(k => ({ keyword: k, label: 'verified-serpapi' })),
            sampled_positions: sampledPositions,
            
            // Comprehensive SERP analysis
            serp_analysis: serpAnalysis,
            
            // Quick wins & opportunities
            quick_wins: quickWins.map(qw => ({
                keyword: qw.keyword,
                score: qw.quick_win.score,
                priority: qw.quick_win.priority,
                current_position: qw.my_position,
                difficulty: qw.difficulty.level,
                recommendation: qw.quick_win.recommendation,
                label: 'verified-serpapi'
            })),
            
            high_opportunity_keywords: highOpportunities.map(ho => ({
                keyword: ho.keyword,
                opportunity_score: ho.opportunity.score,
                total_opportunities: ho.opportunity.total_opportunities,
                opportunities: ho.opportunity.opportunities,
                current_position: ho.my_position,
                label: 'verified-serpapi'
            })),
            
            // Regional & device data
            regional_analysis: regionalAnalysis,
            device_comparison: deviceComparison,
            
            // Competitor data
            competitor_gap: competitorGapAnalysis,
            keyword_competition: serpAnalysis.map(s => ({
                keyword: s.keyword,
                my_position: s.my_position,
                difficulty: s.difficulty.level,
                difficulty_score: s.difficulty.score,
                search_intent: s.search_intent.intent,
                intent_confidence: s.search_intent.confidence,
                total_results: s.total_results,
                label: 'verified-serpapi'
            })),
            serp_competitors: {
                direct: competitorList.map(c => ({ 
                    domain: c.domain, 
                    appearances: c.appearances,
                    avg_position: c.avg_position,
                    keywords: c.keywords,
                    label: 'verified-serpapi' 
                })),
                content: []
            },
            
            // Domain authority
            domain_age: domainAge,
            health_score: calculatedHealthScore,
            score_breakdown: {
                technical: technicalResults.score,
                on_page_seo: onPageSeoScore.score,
                authority: authorityScore,
                performance: performanceScore.score
            },
            
            // Technical data
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
            
            // Strategic recommendations (Gemini interpretation of SERP data)
            recommendations: (analysis.recommendations || []).map(r => ({
                title: typeof r === 'string' ? 'Recommendation' : r.title,
                text: typeof r === 'string' ? r : r.text,
                impact: typeof r === 'string' ? 'Medium' : r.impact,
                label: 'ai-strategic'
            })),
            suggested_keywords: filteredSuggestedKeywords,
            
            // Visibility metrics
            visibility_label: sampledPositions.length > 3 ? 'Strong' : sampledPositions.length > 0 ? 'Moderate' : 'Weak',
            visibility_percentage: calculateVisibility(sampledPositions),
            keyword_distribution: calculateKeywordDistribution(sampledPositions),
            
            // Entity & content
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
