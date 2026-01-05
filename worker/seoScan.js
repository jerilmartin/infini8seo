import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import SeoScanRepository from '../models/SeoScanRepository.js';
import { fetchWhoisData } from './utils/whoisFetcher.js';

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
            model: 'gemini-3-pro-preview',
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
        // STEP 3: Ranking Position Check via Google Search
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 55, 'Checking SERP positions');
        logger.info('Step 3: SERP position sampling');

        // Use ONLY discovered non-branded keywords for position checking
        // Skip the brand name as it's obvious they rank for their own name
        const domainName = domain.split('.')[0].toLowerCase();
        const discoveredKeywords = (researchData.observed_keywords || [])
            .filter(k => {
                const kLower = k.toLowerCase();
                // Filter out brand name and short/garbage keywords
                return kLower.length > 3 &&
                    !kLower.includes(domainName) &&
                    !kLower.includes('also') &&
                    !kLower.includes('identified') &&
                    k.split(' ').length <= 5; // Max 5 words
            })
            .slice(0, 5);

        const positionPrompt = `You are an SEO Analyst checking SERP rankings for "${domain}".

TASK: Search Google for each keyword and check if "${domain}" (or its main variation like .com) appears in the TOP 10 organic results.

KEYWORDS TO CHECK:
${discoveredKeywords.map((k, i) => `${i + 1}. "${k}"`).join('\n')}

INSTRUCTIONS:
1. Search each keyword on Google
2. Check positions 1-10 (ignore ads)
3. Look for "${domain}" OR any close variation (e.g. if checking "amazon.co.uk", also accept "amazon.com")
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

        let positionData = { rankings: [], overall_visibility: 'Unknown' };

        if (discoveredKeywords.length > 0) {
            try {
                const positionResult = await searchModel.generateContent(positionPrompt);
                const positionResponse = positionResult.response.text();
                positionData = extractJSON(positionResponse);
                logger.info(`Position data: ${positionData.rankings?.length || 0} keywords checked`);
            } catch (error) {
                logger.error('Position check failed:', error.message);
            }
        }

        // Filter and validate SERP positions
        const sampledPositions = (positionData.rankings || [])
            .filter(r => {
                // Must be found, have valid position, and keyword must be clean
                if (!r.found || !r.position || r.position > 10) return false;
                if (!r.keyword || r.keyword.length < 4) return false;
                // Filter out garbage keywords
                const kw = r.keyword.toLowerCase();
                if (kw.includes(domainName)) return false;
                if (kw.includes('also') || kw.includes('identified')) return false;
                if (kw.includes('(') || kw.includes(')')) return false;
                return true;
            })
            .map(r => ({ keyword: r.keyword, position: r.position }));

        logger.info(`Step 3 Complete: ${sampledPositions.length} rankings found`);

        // =========================================================================
        // STEP 4: Domain Age Signal (WHOIS)
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 70, 'Fetching domain authority signals');
        logger.info('Step 4: WHOIS lookup');

        const whoisData = await fetchWhoisData(domain);
        const domainAge = {
            years: whoisData.ageYears,
            created: whoisData.creationDate,
            expires: whoisData.expiryDate,
            registrar: whoisData.registrar,
            label: 'observed',
        };

        logger.info(`Step 4 Complete: Domain age ${domainAge.years || 'unknown'} years`);

        // =========================================================================
        // STEP 5: Generate Strategic Keyword Analysis
        // =========================================================================
        await SeoScanRepository.updateProgress(scanId, 85, 'Developing keyword strategy');
        logger.info('Step 5: Generating keyword opportunities');

        const totalIndexed = researchData.indexed_pages?.length || 0;
        const totalKeywords = researchData.observed_keywords?.length || 0;
        const rankingsFound = sampledPositions.length;

        const analysisPrompt = `You are a Senior SEO Strategist.
    
Based on the research for "${domain}" (Business: ${researchData.business_summary || 'Unknown'}), generate a high-value Keyword Strategy.

DATA:
- Current Keywords: ${researchData.observed_keywords?.join(', ') || 'None hidden'}
- Competitors: ${(competitorData.direct_competitors || []).map(c => typeof c === 'string' ? c : c.domain).join(', ')}

TASK:
Generate EXACTLY 30 high-value keyword opportunities categorized by intent.
Focus on keywords that would actually drive valuable traffic to this specific business.

CATEGORIES (Total 30 keywords):
1. "High Intent / Transactional" (10 keywords): Keywords users search when ready to buy/use.
2. "Informational / Educational" (10 keywords): Questions and topics to capture top-of-funnel traffic.
3. "Niche / Long-Tail" (10 keywords): Specific, lower competition terms they can dominate.

Also provide a Health Score (0-100) and 3-5 strategic recommendations.

REQUIRED JSON OUTPUT:
{
  "health_score": 75,
  "score_breakdown": {
    "technical": 20,
    "content": 20,
    "authority": 20,
    "user_experience": 15
  },
  "suggested_keywords": [
    {
      "category": "High Intent / Transactional",
      "keywords": ["keyword 1", "keyword 2", "...", "keyword 10"]
    },
    {
      "category": "Informational / Educational",
      "keywords": ["keyword 1", "keyword 2", "...", "keyword 10"]
    },
    {
      "category": "Niche / Long-Tail",
      "keywords": ["keyword 1", "keyword 2", "...", "keyword 10"]
    }
  ],
  "recommendations": [
    "Rec 1", "Rec 2", "Rec 3"
  ]
}`;

        let analysis = {
            health_score: 50,
            score_breakdown: {},
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

        logger.info(`Step 5 Complete: Generated ${analysis.suggested_keywords?.reduce((acc, g) => acc + g.keywords.length, 0) || 0} keywords`);

        // =========================================================================
        // Compile Final Results
        // =========================================================================
        const results = {
            domain,
            scanned_at: new Date().toISOString(),
            data_source: 'gemini_pro_research',
            business_summary: researchData.business_summary || '',
            observed_keywords: (researchData.observed_keywords || []).map(k => ({ keyword: k, label: 'observed' })),
            sampled_positions: sampledPositions,
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
            health_score: analysis.health_score || 50,
            score_breakdown: analysis.score_breakdown || {},
            recommendations: (analysis.recommendations || []).map(r => ({ text: r, label: 'ai-generated' })),
            suggested_keywords: analysis.suggested_keywords || [], // New field
            market_position: competitorData.market_position || '',
            visibility: positionData.overall_visibility || '',
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
