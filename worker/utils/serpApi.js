import logger from '../../utils/logger.js';

/**
 * SERP API Integration - Accurate Google SERP Data
 * Provides 100% accurate keyword rankings, competition, and SERP features
 * 
 * Features:
 * - Keyword rankings & difficulty
 * - SERP features (Featured Snippets, PAA, Related Searches, Local Pack, Knowledge Graph)
 * - Competitor analysis & gap analysis
 * - Regional rankings (multi-location)
 * - Mobile vs Desktop rankings
 * - Search intent classification
 * - Quick win & opportunity scoring
 * - CTR analysis
 */

const SERPAPI_BASE = 'https://serpapi.com/search';

/**
 * Search Google via SERP API with full SERP features
 * @param {string} keyword - Keyword to search
 * @param {string} location - Location (e.g., "United States", "India", "United Kingdom")
 * @param {string} domain - Domain to check rankings for
 * @param {string} device - Device type: "desktop" or "mobile"
 * @returns {Promise<Object>} Complete SERP data
 */
export async function searchSerpApi(keyword, location = 'United States', domain = null, device = 'desktop') {
    const apiKey = process.env.SERPAPI_KEY;
    
    if (!apiKey) {
        logger.warn('SERPAPI_KEY not configured');
        return null;
    }

    try {
        const params = new URLSearchParams({
            engine: 'google',
            q: keyword,
            location: location,
            google_domain: 'google.com',
            hl: 'en',
            gl: 'us',
            api_key: apiKey,
            num: 100, // Get top 100 results
            device: device // desktop or mobile
        });

        const url = `${SERPAPI_BASE}?${params}`;
        logger.info(`SERP API: Searching "${keyword}" [${location}, ${device}]`);

        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(`SERP API error (${response.status}): ${errorText.substring(0, 200)}`);
            return null;
        }

        const data = await response.json();
        
        // Extract organic results
        const organicResults = data.organic_results || [];
        
        // Find domain position
        let myPosition = null;
        let myResult = null;
        
        if (domain) {
            const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
            const index = organicResults.findIndex(r => {
                const resultDomain = extractDomain(r.link);
                return resultDomain === cleanDomain || resultDomain.includes(cleanDomain);
            });
            
            if (index >= 0) {
                myPosition = index + 1;
                myResult = organicResults[index];
            }
        }

        // Extract comprehensive SERP features
        const serpFeatures = extractAllSerpFeatures(data);

        // Top 10 competitors
        const topCompetitors = organicResults.slice(0, 10).map((r, idx) => ({
            position: idx + 1,
            title: r.title,
            link: r.link,
            domain: extractDomain(r.link),
            snippet: r.snippet,
            displayed_link: r.displayed_link,
            rich_snippet: r.rich_snippet || null,
            sitelinks: r.sitelinks || null
        }));

        return {
            keyword,
            location,
            device,
            total_results: data.search_information?.total_results || 0,
            my_position: myPosition,
            my_result: myResult,
            top_competitors: topCompetitors,
            serp_features: serpFeatures,
            search_metadata: {
                id: data.search_metadata?.id,
                status: data.search_metadata?.status,
                created_at: data.search_metadata?.created_at,
                processed_at: data.search_metadata?.processed_at
            }
        };

    } catch (error) {
        logger.error(`SERP API search failed for "${keyword}":`, error.message);
        return null;
    }
}

/**
 * Extract ALL SERP features from SERP API response
 * @param {Object} data - Raw SERP API response
 * @returns {Object} Comprehensive SERP features
 */
function extractAllSerpFeatures(data) {
    const features = {
        // Featured Snippet / Answer Box
        featured_snippet: data.answer_box ? {
            type: data.answer_box.type,
            title: data.answer_box.title,
            snippet: data.answer_box.snippet || data.answer_box.answer,
            link: data.answer_box.link,
            source_domain: data.answer_box.link ? extractDomain(data.answer_box.link) : null,
            list: data.answer_box.list || null,
            table: data.answer_box.table || null
        } : null,

        // Knowledge Graph
        knowledge_graph: data.knowledge_graph ? {
            title: data.knowledge_graph.title,
            type: data.knowledge_graph.type,
            description: data.knowledge_graph.description,
            source: data.knowledge_graph.source?.name,
            website: data.knowledge_graph.website,
            attributes: data.knowledge_graph.attributes || {},
            profiles: data.knowledge_graph.profiles || []
        } : null,

        // People Also Ask
        people_also_ask: (data.related_questions || []).map(q => ({
            question: q.question,
            snippet: q.snippet,
            title: q.title,
            link: q.link,
            source_domain: q.link ? extractDomain(q.link) : null,
            displayed_link: q.displayed_link
        })),

        // Related Searches
        related_searches: (data.related_searches || []).map(s => ({
            query: s.query,
            link: s.link
        })),

        // Local Pack / Map Results
        local_pack: data.local_results ? {
            present: true,
            count: data.local_results.places?.length || 0,
            places: (data.local_results.places || []).map(p => ({
                position: p.position,
                title: p.title,
                rating: p.rating,
                reviews: p.reviews,
                address: p.address,
                phone: p.phone,
                type: p.type,
                hours: p.hours
            }))
        } : null,

        // Shopping Results / Product Carousel
        shopping_results: data.shopping_results ? {
            present: true,
            count: data.shopping_results.length,
            products: data.shopping_results.slice(0, 5).map(p => ({
                title: p.title,
                price: p.price,
                source: p.source,
                link: p.link,
                rating: p.rating,
                reviews: p.reviews
            }))
        } : null,

        // Image Pack
        images: data.inline_images ? {
            present: true,
            count: data.inline_images.length,
            sources: data.inline_images.slice(0, 3).map(img => ({
                title: img.title,
                source: img.source,
                link: img.link
            }))
        } : null,

        // Video Results
        videos: data.inline_videos ? {
            present: true,
            count: data.inline_videos.length,
            videos: data.inline_videos.slice(0, 3).map(v => ({
                title: v.title,
                link: v.link,
                channel: v.channel,
                duration: v.duration,
                platform: v.platform
            }))
        } : null,

        // Top Stories / News
        top_stories: data.top_stories ? {
            present: true,
            count: data.top_stories.length,
            stories: data.top_stories.slice(0, 3).map(s => ({
                title: s.title,
                link: s.link,
                source: s.source,
                date: s.date,
                thumbnail: s.thumbnail
            }))
        } : null,

        // Twitter Results
        twitter_results: data.twitter_results ? {
            present: true,
            count: data.twitter_results.tweets?.length || 0
        } : null,

        // Rich Results Summary
        rich_results_summary: {
            total_features: 0,
            feature_types: []
        }
    };

    // Count total features present
    let featureCount = 0;
    const featureTypes = [];

    if (features.featured_snippet) { featureCount++; featureTypes.push('Featured Snippet'); }
    if (features.knowledge_graph) { featureCount++; featureTypes.push('Knowledge Graph'); }
    if (features.people_also_ask.length > 0) { featureCount++; featureTypes.push('People Also Ask'); }
    if (features.related_searches.length > 0) { featureCount++; featureTypes.push('Related Searches'); }
    if (features.local_pack) { featureCount++; featureTypes.push('Local Pack'); }
    if (features.shopping_results) { featureCount++; featureTypes.push('Shopping Results'); }
    if (features.images) { featureCount++; featureTypes.push('Image Pack'); }
    if (features.videos) { featureCount++; featureTypes.push('Video Results'); }
    if (features.top_stories) { featureCount++; featureTypes.push('Top Stories'); }
    if (features.twitter_results) { featureCount++; featureTypes.push('Twitter Results'); }

    features.rich_results_summary = {
        total_features: featureCount,
        feature_types: featureTypes
    };

    return features;
}

/**
 * Batch check multiple keywords with rate limiting
 * @param {string[]} keywords - Keywords to check
 * @param {string} domain - Domain to check rankings for
 * @param {string} location - Location
 * @returns {Promise<Array>} Array of SERP data
 */
export async function batchCheckKeywords(keywords, domain, location = 'United States') {
    const results = [];
    
    for (const keyword of keywords) {
        const serpData = await searchSerpApi(keyword, location, domain);
        
        if (serpData) {
            results.push(serpData);
            logger.info(`✓ "${keyword}": ${serpData.my_position ? `#${serpData.my_position}` : 'Not ranking'}`);
        }
        
        // Rate limit: 1 request per second (SERP API allows more, but being safe)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

/**
 * Get keyword difficulty score based on SERP analysis
 * @param {Object} serpData - SERP data from searchSerpApi
 * @returns {Object} Difficulty analysis
 */
export function calculateKeywordDifficulty(serpData) {
    if (!serpData) return null;

    let difficultyScore = 0;
    let factors = [];

    // Factor 1: Total results (more = harder)
    const totalResults = serpData.total_results;
    if (totalResults > 100000000) {
        difficultyScore += 30;
        factors.push('Very high competition (100M+ results)');
    } else if (totalResults > 10000000) {
        difficultyScore += 20;
        factors.push('High competition (10M+ results)');
    } else if (totalResults > 1000000) {
        difficultyScore += 10;
        factors.push('Medium competition (1M+ results)');
    } else {
        difficultyScore += 5;
        factors.push('Low competition (<1M results)');
    }

    // Factor 2: SERP features (more = harder)
    const features = serpData.serp_features;
    if (features.featured_snippet) {
        difficultyScore += 15;
        factors.push('Featured snippet present');
    }
    if (features.knowledge_graph) {
        difficultyScore += 10;
        factors.push('Knowledge graph present');
    }
    if (features.local_pack) {
        difficultyScore += 10;
        factors.push('Local pack present');
    }

    // Factor 3: Top competitor domain authority (estimate based on domain)
    const topDomains = serpData.top_competitors.slice(0, 3).map(c => c.domain);
    const highAuthorityDomains = ['wikipedia.org', 'amazon.com', 'youtube.com', 'facebook.com', 'linkedin.com', 'reddit.com'];
    const authorityCount = topDomains.filter(d => highAuthorityDomains.some(ha => d.includes(ha))).length;
    
    if (authorityCount >= 2) {
        difficultyScore += 25;
        factors.push('Multiple high-authority domains in top 3');
    } else if (authorityCount === 1) {
        difficultyScore += 15;
        factors.push('High-authority domain in top 3');
    }

    // Factor 4: Related searches (more = more interest = harder)
    if (features.related_searches.length >= 8) {
        difficultyScore += 10;
        factors.push('High search interest (8+ related searches)');
    }

    // Normalize to 0-100
    difficultyScore = Math.min(100, difficultyScore);

    let difficulty;
    if (difficultyScore >= 70) difficulty = 'Very Hard';
    else if (difficultyScore >= 50) difficulty = 'Hard';
    else if (difficultyScore >= 30) difficulty = 'Medium';
    else difficulty = 'Easy';

    return {
        score: difficultyScore,
        difficulty,
        factors,
        recommendation: difficultyScore >= 70 
            ? 'Focus on long-tail variations' 
            : difficultyScore >= 50 
            ? 'Requires strong content and backlinks' 
            : 'Good opportunity with quality content'
    };
}

/**
 * Analyze SERP features and opportunities
 * @param {Object} serpData - SERP data
 * @returns {Object} SERP feature analysis
 */
export function analyzeSerpFeatures(serpData) {
    if (!serpData) return null;

    const features = serpData.serp_features;
    const opportunities = [];
    const threats = [];

    // Featured snippet opportunity
    if (features.featured_snippet) {
        if (serpData.my_position && serpData.my_position <= 10) {
            opportunities.push({
                type: 'Featured Snippet',
                description: 'You rank in top 10 - optimize for featured snippet',
                action: 'Add clear, concise answer in first paragraph with proper heading',
                potential: 'High'
            });
        } else {
            threats.push({
                type: 'Featured Snippet',
                description: 'Competitor owns featured snippet',
                impact: 'Takes clicks from position #1'
            });
        }
    } else {
        opportunities.push({
            type: 'Featured Snippet',
            description: 'No featured snippet - opportunity to claim it',
            action: 'Structure content with clear Q&A format',
            potential: 'High'
        });
    }

    // People Also Ask
    if (features.people_also_ask.length > 0) {
        opportunities.push({
            type: 'People Also Ask',
            description: `${features.people_also_ask.length} related questions found`,
            action: 'Create content answering these questions',
            potential: 'Medium',
            questions: features.people_also_ask.map(q => q.question)
        });
    }

    // Related searches
    if (features.related_searches.length > 0) {
        opportunities.push({
            type: 'Related Keywords',
            description: `${features.related_searches.length} related search terms`,
            action: 'Target these as secondary keywords',
            potential: 'Medium',
            keywords: features.related_searches
        });
    }

    // Local pack
    if (features.local_pack) {
        if (features.local_pack.count > 0) {
            opportunities.push({
                type: 'Local SEO',
                description: 'Local pack present - local intent detected',
                action: 'Optimize Google Business Profile and local citations',
                potential: 'High'
            });
        }
    }

    return {
        opportunities,
        threats,
        serp_type: determineSearchIntent(features),
        competition_level: calculateKeywordDifficulty(serpData).difficulty
    };
}

/**
 * Determine search intent from SERP features
 */
function determineSearchIntent(features) {
    if (features.local_pack) return 'Local';
    if (features.shopping_results) return 'Transactional';
    if (features.knowledge_graph) return 'Informational';
    if (features.featured_snippet) return 'Informational';
    if (features.videos) return 'Informational';
    
    return 'Mixed';
}

/**
 * Classify search intent with confidence score
 * @param {Object} serpData - SERP data from searchSerpApi
 * @returns {Object} Intent classification
 */
export function classifySearchIntent(serpData) {
    if (!serpData) return null;

    const features = serpData.serp_features;
    const keyword = serpData.keyword.toLowerCase();
    
    let intent = 'Informational';
    let confidence = 0;
    const signals = [];

    // Transactional signals
    if (features.shopping_results) {
        intent = 'Transactional';
        confidence += 40;
        signals.push('Shopping results present');
    }
    
    if (keyword.match(/\b(buy|purchase|price|cheap|deal|discount|shop|order|sale)\b/)) {
        intent = 'Transactional';
        confidence += 30;
        signals.push('Transactional keywords in query');
    }

    // Local intent signals
    if (features.local_pack) {
        intent = 'Local';
        confidence += 50;
        signals.push('Local pack present');
    }
    
    if (keyword.match(/\b(near me|nearby|location|address|directions)\b/)) {
        intent = 'Local';
        confidence += 30;
        signals.push('Local keywords in query');
    }

    // Navigational signals
    if (keyword.match(/\b(login|sign in|account|dashboard|portal)\b/)) {
        intent = 'Navigational';
        confidence += 40;
        signals.push('Navigational keywords in query');
    }

    // Informational signals (default)
    if (features.featured_snippet) {
        if (intent === 'Informational') confidence += 30;
        signals.push('Featured snippet present');
    }
    
    if (features.people_also_ask.length > 0) {
        if (intent === 'Informational') confidence += 20;
        signals.push(`${features.people_also_ask.length} PAA questions`);
    }
    
    if (keyword.match(/\b(how|what|why|when|where|guide|tutorial|tips|best)\b/)) {
        if (intent === 'Informational') confidence += 25;
        signals.push('Informational keywords in query');
    }

    confidence = Math.min(100, confidence);

    return {
        intent,
        confidence,
        signals,
        serp_type: determineSearchIntent(features)
    };
}

/**
 * Calculate "Quick Win" score for a keyword
 * Quick wins = low difficulty + close to ranking + opportunity present
 * @param {Object} serpData - SERP data
 * @param {number} myPosition - Current ranking position (null if not ranking)
 * @returns {Object} Quick win analysis
 */
export function calculateQuickWinScore(serpData, myPosition = null) {
    if (!serpData) return null;

    let score = 0;
    const factors = [];

    // Factor 1: Difficulty (easier = higher score)
    const difficulty = calculateKeywordDifficulty(serpData);
    if (difficulty.score < 30) {
        score += 40;
        factors.push('Low difficulty (easy to rank)');
    } else if (difficulty.score < 50) {
        score += 25;
        factors.push('Medium difficulty');
    } else if (difficulty.score < 70) {
        score += 10;
        factors.push('High difficulty');
    }

    // Factor 2: Current position (closer = higher score)
    if (myPosition) {
        if (myPosition <= 3) {
            score += 10; // Already ranking well
            factors.push('Already in top 3');
        } else if (myPosition <= 10) {
            score += 30; // Close to top, easy to improve
            factors.push('Ranking in top 10 - easy to improve');
        } else if (myPosition <= 20) {
            score += 25; // On first 2 pages
            factors.push('Ranking on page 1-2');
        } else if (myPosition <= 50) {
            score += 15;
            factors.push('Ranking in top 50');
        }
    } else {
        // Not ranking yet - check if it's easy to break in
        if (difficulty.score < 30) {
            score += 20;
            factors.push('Not ranking yet, but low competition');
        }
    }

    // Factor 3: SERP opportunities
    const features = serpData.serp_features;
    
    if (!features.featured_snippet) {
        score += 15;
        factors.push('No featured snippet - opportunity to claim');
    }
    
    if (features.people_also_ask.length > 0) {
        score += 10;
        factors.push(`${features.people_also_ask.length} PAA questions to target`);
    }
    
    if (features.related_searches.length >= 5) {
        score += 5;
        factors.push('Multiple related keywords to target');
    }

    score = Math.min(100, score);

    let priority;
    if (score >= 70) priority = 'High Priority';
    else if (score >= 50) priority = 'Medium Priority';
    else if (score >= 30) priority = 'Low Priority';
    else priority = 'Not Recommended';

    return {
        score,
        priority,
        factors,
        recommendation: score >= 70 
            ? 'Quick win opportunity - prioritize this keyword' 
            : score >= 50 
            ? 'Good opportunity with moderate effort' 
            : score >= 30
            ? 'Requires significant effort'
            : 'Focus on easier keywords first'
    };
}

/**
 * Calculate opportunity score based on SERP features
 * @param {Object} serpData - SERP data
 * @returns {Object} Opportunity analysis
 */
export function calculateOpportunityScore(serpData) {
    if (!serpData) return null;

    let score = 0;
    const opportunities = [];
    const features = serpData.serp_features;

    // Featured snippet opportunity
    if (!features.featured_snippet) {
        score += 25;
        opportunities.push({
            type: 'Featured Snippet',
            value: 25,
            description: 'No featured snippet - opportunity to claim position zero',
            action: 'Structure content with clear Q&A format, use proper headings'
        });
    } else if (serpData.my_position && serpData.my_position <= 10) {
        score += 15;
        opportunities.push({
            type: 'Featured Snippet',
            value: 15,
            description: 'You rank in top 10 - can compete for featured snippet',
            action: 'Optimize existing content for featured snippet format'
        });
    }

    // People Also Ask
    if (features.people_also_ask.length >= 3) {
        score += 20;
        opportunities.push({
            type: 'People Also Ask',
            value: 20,
            description: `${features.people_also_ask.length} PAA questions found`,
            action: 'Create FAQ section answering these questions',
            questions: features.people_also_ask.slice(0, 5).map(q => q.question)
        });
    }

    // Related searches
    if (features.related_searches.length >= 5) {
        score += 15;
        opportunities.push({
            type: 'Related Keywords',
            value: 15,
            description: `${features.related_searches.length} related search terms`,
            action: 'Target these as secondary keywords in content',
            keywords: features.related_searches.slice(0, 8).map(s => s.query)
        });
    }

    // Local pack
    if (features.local_pack) {
        score += 20;
        opportunities.push({
            type: 'Local SEO',
            value: 20,
            description: 'Local pack present - local intent detected',
            action: 'Optimize Google Business Profile, get local citations'
        });
    }

    // Shopping results
    if (features.shopping_results) {
        score += 15;
        opportunities.push({
            type: 'Shopping/Product',
            value: 15,
            description: 'Shopping results present - e-commerce opportunity',
            action: 'Implement product schema, optimize product pages'
        });
    }

    // Image pack
    if (features.images) {
        score += 10;
        opportunities.push({
            type: 'Image SEO',
            value: 10,
            description: 'Image pack present',
            action: 'Optimize images with proper alt text and file names'
        });
    }

    // Video results
    if (features.videos) {
        score += 10;
        opportunities.push({
            type: 'Video Content',
            value: 10,
            description: 'Video results present',
            action: 'Consider creating video content for this keyword'
        });
    }

    score = Math.min(100, score);

    return {
        score,
        total_opportunities: opportunities.length,
        opportunities,
        priority: score >= 60 ? 'High' : score >= 40 ? 'Medium' : 'Low'
    };
}

/**
 * Check rankings across multiple locations (regional analysis)
 * @param {string} keyword - Keyword to check
 * @param {string} domain - Domain to check
 * @param {string[]} locations - Array of locations to check
 * @returns {Promise<Object>} Regional ranking data
 */
export async function checkRegionalRankings(keyword, domain, locations = ['United States', 'India', 'United Kingdom']) {
    const results = [];
    
    for (const location of locations) {
        const serpData = await searchSerpApi(keyword, location, domain);
        
        if (serpData) {
            results.push({
                location,
                position: serpData.my_position,
                total_results: serpData.total_results,
                top_competitor: serpData.top_competitors[0]?.domain,
                serp_features: serpData.serp_features.rich_results_summary.feature_types
            });
            
            logger.info(`✓ "${keyword}" in ${location}: ${serpData.my_position ? `#${serpData.my_position}` : 'Not ranking'}`);
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analyze regional differences
    const positions = results.filter(r => r.position).map(r => r.position);
    const avgPosition = positions.length > 0 
        ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)
        : null;
    
    const bestLocation = results
        .filter(r => r.position)
        .sort((a, b) => a.position - b.position)[0];
    
    const worstLocation = results
        .filter(r => r.position)
        .sort((a, b) => b.position - a.position)[0];
    
    return {
        keyword,
        locations: results,
        analysis: {
            avg_position: avgPosition,
            best_location: bestLocation?.location,
            best_position: bestLocation?.position,
            worst_location: worstLocation?.location,
            worst_position: worstLocation?.position,
            ranking_in: positions.length,
            not_ranking_in: results.length - positions.length,
            regional_variance: positions.length > 1 
                ? Math.max(...positions) - Math.min(...positions)
                : 0
        }
    };
}

/**
 * Compare mobile vs desktop rankings
 * @param {string} keyword - Keyword to check
 * @param {string} domain - Domain to check
 * @param {string} location - Location
 * @returns {Promise<Object>} Device comparison data
 */
export async function compareMobileVsDesktop(keyword, domain, location = 'United States') {
    logger.info(`Comparing mobile vs desktop for "${keyword}"`);
    
    // Desktop search
    const desktopData = await searchSerpApi(keyword, location, domain, 'desktop');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mobile search
    const mobileData = await searchSerpApi(keyword, location, domain, 'mobile');
    
    if (!desktopData || !mobileData) {
        return null;
    }
    
    const difference = (mobileData.my_position || 0) - (desktopData.my_position || 0);
    
    let analysis = '';
    if (!desktopData.my_position && !mobileData.my_position) {
        analysis = 'Not ranking on either device';
    } else if (desktopData.my_position && !mobileData.my_position) {
        analysis = 'Ranking on desktop only - mobile optimization needed';
    } else if (!desktopData.my_position && mobileData.my_position) {
        analysis = 'Ranking on mobile only - unusual pattern';
    } else if (difference === 0) {
        analysis = 'Same position on both devices';
    } else if (difference > 0) {
        analysis = `Ranking ${Math.abs(difference)} positions lower on mobile`;
    } else {
        analysis = `Ranking ${Math.abs(difference)} positions higher on mobile`;
    }
    
    return {
        keyword,
        location,
        desktop: {
            position: desktopData.my_position,
            total_results: desktopData.total_results,
            serp_features: desktopData.serp_features.rich_results_summary.feature_types
        },
        mobile: {
            position: mobileData.my_position,
            total_results: mobileData.total_results,
            serp_features: mobileData.serp_features.rich_results_summary.feature_types
        },
        difference,
        analysis,
        recommendation: difference > 5 
            ? 'Significant mobile ranking gap - prioritize mobile optimization'
            : difference < -5
            ? 'Mobile performing better - leverage mobile-first indexing'
            : 'Rankings consistent across devices'
    };
}

/**
 * Analyze title and description CTR potential
 * @param {Object} serpData - SERP data
 * @param {string} myDomain - Your domain
 * @returns {Object} CTR analysis
 */
export function analyzeCTRPotential(serpData, myDomain) {
    if (!serpData || !serpData.my_result) {
        return null;
    }
    
    const myResult = serpData.my_result;
    const topCompetitors = serpData.top_competitors.slice(0, 3);
    
    // Analyze title
    const myTitleLength = myResult.title?.length || 0;
    const avgCompetitorTitleLength = topCompetitors.reduce((sum, c) => sum + (c.title?.length || 0), 0) / topCompetitors.length;
    
    // Analyze description
    const myDescLength = myResult.snippet?.length || 0;
    const avgCompetitorDescLength = topCompetitors.reduce((sum, c) => sum + (c.snippet?.length || 0), 0) / topCompetitors.length;
    
    // Check for power words in titles
    const powerWords = ['best', 'top', 'guide', 'ultimate', 'complete', 'free', 'new', 'proven', 'easy', 'fast'];
    const myPowerWords = powerWords.filter(w => myResult.title?.toLowerCase().includes(w));
    const competitorPowerWords = topCompetitors.map(c => 
        powerWords.filter(w => c.title?.toLowerCase().includes(w)).length
    );
    const avgCompetitorPowerWords = competitorPowerWords.reduce((a, b) => a + b, 0) / competitorPowerWords.length;
    
    // Check for numbers in title
    const myHasNumber = /\d/.test(myResult.title);
    const competitorsWithNumbers = topCompetitors.filter(c => /\d/.test(c.title)).length;
    
    const recommendations = [];
    
    // Title recommendations
    if (myTitleLength < 30) {
        recommendations.push({
            type: 'Title Length',
            issue: 'Title too short',
            current: myTitleLength,
            recommended: '50-60 characters',
            action: 'Expand title with descriptive keywords'
        });
    } else if (myTitleLength > 60) {
        recommendations.push({
            type: 'Title Length',
            issue: 'Title too long (may be truncated)',
            current: myTitleLength,
            recommended: '50-60 characters',
            action: 'Shorten title to avoid truncation'
        });
    }
    
    if (myPowerWords.length < avgCompetitorPowerWords) {
        recommendations.push({
            type: 'Title Power Words',
            issue: 'Fewer power words than competitors',
            current: myPowerWords.length,
            competitor_avg: Math.round(avgCompetitorPowerWords),
            action: `Add power words like: ${powerWords.slice(0, 5).join(', ')}`
        });
    }
    
    if (!myHasNumber && competitorsWithNumbers >= 2) {
        recommendations.push({
            type: 'Title Numbers',
            issue: 'Competitors use numbers in titles',
            action: 'Add numbers (e.g., "10 Best...", "2024 Guide...")'
        });
    }
    
    // Description recommendations
    if (myDescLength < 120) {
        recommendations.push({
            type: 'Description Length',
            issue: 'Description too short',
            current: myDescLength,
            recommended: '150-160 characters',
            action: 'Expand description with compelling copy'
        });
    } else if (myDescLength > 160) {
        recommendations.push({
            type: 'Description Length',
            issue: 'Description too long (may be truncated)',
            current: myDescLength,
            recommended: '150-160 characters',
            action: 'Shorten description to avoid truncation'
        });
    }
    
    // CTR score (0-100)
    let ctrScore = 50; // Base score
    
    if (myTitleLength >= 50 && myTitleLength <= 60) ctrScore += 15;
    if (myDescLength >= 150 && myDescLength <= 160) ctrScore += 15;
    if (myPowerWords.length >= avgCompetitorPowerWords) ctrScore += 10;
    if (myHasNumber) ctrScore += 10;
    
    ctrScore = Math.min(100, ctrScore);
    
    return {
        keyword: serpData.keyword,
        my_position: serpData.my_position,
        ctr_score: ctrScore,
        my_title: {
            text: myResult.title,
            length: myTitleLength,
            power_words: myPowerWords,
            has_number: myHasNumber
        },
        my_description: {
            text: myResult.snippet,
            length: myDescLength
        },
        competitor_avg: {
            title_length: Math.round(avgCompetitorTitleLength),
            desc_length: Math.round(avgCompetitorDescLength),
            power_words: Math.round(avgCompetitorPowerWords),
            with_numbers: competitorsWithNumbers
        },
        recommendations,
        priority: recommendations.length >= 3 ? 'High' : recommendations.length >= 1 ? 'Medium' : 'Low'
    };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return url.split('/')[2]?.replace(/^www\./, '').toLowerCase() || '';
    }
}

/**
 * Get competitor gap analysis
 * @param {Array} serpResults - Array of SERP results for multiple keywords
 * @param {string} myDomain - Your domain
 * @returns {Object} Gap analysis
 */
export function analyzeCompetitorGap(serpResults, myDomain) {
    const competitorMap = new Map();
    const myKeywords = new Set();
    const missedKeywords = [];

    serpResults.forEach(serp => {
        if (serp.my_position) {
            myKeywords.add(serp.keyword);
        } else {
            missedKeywords.push({
                keyword: serp.keyword,
                difficulty: calculateKeywordDifficulty(serp).difficulty,
                top_competitor: serp.top_competitors[0]?.domain
            });
        }

        // Track competitor appearances
        serp.top_competitors.slice(0, 10).forEach(comp => {
            if (comp.domain !== myDomain) {
                if (!competitorMap.has(comp.domain)) {
                    competitorMap.set(comp.domain, {
                        domain: comp.domain,
                        appearances: 0,
                        keywords: [],
                        avg_position: 0,
                        positions: []
                    });
                }
                
                const compData = competitorMap.get(comp.domain);
                compData.appearances++;
                compData.keywords.push(serp.keyword);
                compData.positions.push(comp.position);
            }
        });
    });

    // Calculate average positions
    competitorMap.forEach(comp => {
        comp.avg_position = Math.round(
            comp.positions.reduce((a, b) => a + b, 0) / comp.positions.length
        );
    });

    // Sort by appearances
    const topCompetitors = Array.from(competitorMap.values())
        .sort((a, b) => b.appearances - a.appearances)
        .slice(0, 10);

    return {
        my_keywords_count: myKeywords.size,
        missed_opportunities: missedKeywords.length,
        missed_keywords: missedKeywords.slice(0, 10),
        top_competitors: topCompetitors,
        total_keywords_analyzed: serpResults.length
    };
}

export default {
    searchSerpApi,
    batchCheckKeywords,
    calculateKeywordDifficulty,
    analyzeSerpFeatures,
    analyzeCompetitorGap,
    classifySearchIntent,
    calculateQuickWinScore,
    calculateOpportunityScore,
    checkRegionalRankings,
    compareMobileVsDesktop,
    analyzeCTRPotential
};
