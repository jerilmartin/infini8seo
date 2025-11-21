import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import { fetchScenarioImageUrls } from './utils/images.js';

// Initialize Google Generative AI
let genAI;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    logger.error('❌ GEMINI_API_KEY not found in environment variables!');
    logger.error('Please check your .env file has: GEMINI_API_KEY=your_key_here');
    throw new Error('GEMINI_API_KEY is required');
  }
  
  logger.info(`✅ Gemini API Key loaded: ${apiKey.substring(0, 20)}...`);
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * AGGRESSIVE JSON extraction - tries EVERYTHING
 */
function extractJSONAggressively(text) {
  logger.info('Trying aggressive extraction methods...');
  
  // Method 1: Find largest JSON-like structure
  const matches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
  if (matches) {
    logger.info(`Found ${matches.length} potential JSON objects`);
    // Try each from largest to smallest
    const sorted = matches.sort((a, b) => b.length - a.length);
    for (const match of sorted) {
      try {
        const parsed = JSON.parse(match);
        if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
          logger.info('✅ Found valid scenarios object!');
          return parsed;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  // Method 2: Remove ALL markdown and try
  let cleaned = text.replace(/```[a-z]*\s*/g, '').replace(/```/g, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.scenarios) return parsed;
  } catch (e) {}
  
  // Method 3: Find first { and last } and extract
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const extracted = text.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(extracted);
      if (parsed.scenarios) return parsed;
    } catch (e) {}
  }
  
  return null;
}

/**
 * Extract JSON from text that might have markdown formatting or extra text
 * Handles multiple issues:
 * - Markdown code blocks with/without language identifier
 * - Multiple JSON objects in one response (takes first one only)
 * - Extra whitespace or text before/after JSON
 * - Various malformed response patterns
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // Continue with extraction
  }

  // Remove markdown code blocks - handle ALL variations
  let cleaned = text.trim();
  
  // Remove opening backticks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove closing backticks
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  // Remove any remaining backticks
  cleaned = cleaned.replace(/```/g, '');
  
  cleaned = cleaned.trim();

  // Try to parse after markdown removal
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    // Continue
  }

  // Gemini sometimes returns multiple JSON objects - we want only the first
  // Check for multiple patterns
  const multiObjectPatterns = ['}\n{', '}\r\n{', '} {', '}\n\n{'];
  for (const pattern of multiObjectPatterns) {
    if (cleaned.includes(pattern)) {
      const splitPoint = cleaned.indexOf(pattern);
      if (splitPoint > 0) {
        cleaned = cleaned.substring(0, splitPoint + 1); // +1 to include the closing brace
        break;
      }
    }
  }

  // Try to parse after splitting
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue with brace-balanced extraction
  }

  // Last resort: extract first complete JSON object with balanced braces
  // This handles cases where there's text before/after the JSON
  let braceCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    // Handle string escaping
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    // Track if we're inside a string
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    // Only count braces outside of strings
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
    const extracted = cleaned.substring(startIndex, endIndex);
    try {
      return JSON.parse(extracted);
    } catch (e2) {
      // Log for debugging
      logger.error('Brace-balanced extraction also failed');
      logger.error('Extracted text preview:', extracted.substring(0, 300));
    }
  }

  throw new Error('Could not extract valid JSON from response');
}

/**
 * Phase A: Deep Research & Scenario Generation
 * Uses Gemini with Google Search grounding to generate 50 unique personas/scenarios
 * 
 * @param {Object} params - Input parameters
 * @param {string} params.niche - Business niche
 * @param {string[]} params.valuePropositions - Value propositions
 * @param {string} params.tone - Content tone
 * @returns {Promise<Array>} Array of 50 scenario objects
 */
export async function executePhaseA({ niche, valuePropositions, tone, totalBlogs, blogTypeAllocations }) {
  logger.info(`Phase A: Initiating deep research for niche: ${niche}`);

  if (totalBlogs) {
    logger.info(`Phase A: Target total blogs -> ${totalBlogs}`);
  }

  if (blogTypeAllocations) {
    logger.info(`Phase A: Blog type allocations -> ${JSON.stringify(blogTypeAllocations)}`);
  }

  try {
    // Initialize Gemini client if not already done
    if (!genAI) {
      genAI = initGemini();
    }
    
    // Use gemini-2.5-pro - higher reasoning ability with search grounding support
    // NOTE: Can't use responseMimeType with tools, so we'll parse JSON manually
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 1.0, // Higher for creative, diverse research insights
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 16384 // Enough for 30 scenarios
        // NO responseMimeType - conflicts with Google Search tool
      },
      tools: [{
        googleSearch: {}
      }]
    });

    // Create comprehensive, research-focused prompt for THINKING model
    logger.info('⚡ Using THINKING model for deep research - this will take longer but produce much better results');
    
    const prompt = `You are an EXPERT Market Research Analyst and Strategic Content Architect with deep expertise in the ${niche} industry.

YOUR MISSION:
Conduct DEEP, REAL-TIME research using Google Search to understand the current market landscape, pain points, trends, and customer needs in the "${niche}" industry. Then generate EXACTLY 30 unique, high-value customer scenarios that will form the foundation for premium, research-backed blog content.

Keep each field CONCISE and focused.

BUSINESS CONTEXT:
- Industry: ${niche}
- Value Propositions: ${valuePropositions.join(', ')}
- Content Tone: ${tone}
- Blog Allocation Targets: ${blogTypeAllocations ? JSON.stringify(blogTypeAllocations) : 'Not specified'}

RESEARCH REQUIREMENTS (USE GOOGLE SEARCH EXTENSIVELY):
1. **Industry Trends**: Search for latest trends, statistics, and market changes in ${niche}
2. **Pain Points**: Research common problems, frustrations, and challenges faced by people in this niche
3. **Customer Segments**: Identify different customer types, experience levels, and use cases
4. **Competitor Analysis**: Look at what content is ranking, what questions are being asked
5. **Search Intent**: Find high-intent keywords and topics people are actively searching for
6. **Real Data**: Include current statistics, facts, and market insights you find

SCENARIO GENERATION REQUIREMENTS:
Generate EXACTLY 30 scenarios that are:
- **Diverse**: Cover different customer segments, experience levels, pain points, and goals
- **Specific**: Each persona should feel like a real person with real problems
- **Current**: Based on your Google Search findings about current market state
- **High-Intent**: Each should represent someone actively looking for solutions
- **Unique**: No two scenarios should be similar - vary pain points, goals, and contexts significantly

**CRITICAL AEO (Answer Engine Optimization) REQUIREMENTS:**
- **Informational Blog Topics**: MUST be phrased as direct, high-intent questions users would ask AI (e.g., "What is the average cost of ${niche} implementation for small businesses?")
- **Distribution**: Ensure scenarios match the allocation: ${blogTypeAllocations ? JSON.stringify(blogTypeAllocations) : 'balanced distribution'}
- **Question Format**: All informational topics should be natural questions that AI assistants would answer

QUALITY STANDARDS (KEEP CONCISE):
- pain_point_detail: 2 sentences MAX - specific problem backed by research
- goal_focus: 1 sentence - exact outcome they want
- blog_topic_headline: Compelling, benefit-driven (under 100 chars)
- keywords: 5 actual search terms from research
- research_insight: 1 sentence with ONE specific stat or trend
- BE CONCISE - we need all 50 scenarios to fit!

JSON OUTPUT FORMAT:
{
  "business_niche": "${niche}",
  "research_summary": "Brief 2-3 sentence summary of key insights from your Google Search research",
  "scenarios": [
    {
      "scenario_id": 1,
      "persona_name": "Name, the Role",
      "persona_archetype": "The [Type] [Role]",
      "pain_point_detail": "2 sentences MAX: Exact problem + why it matters.",
      "goal_focus": "1 sentence: What they want to achieve.",
      "blog_topic_headline": "Benefit-driven headline under 100 chars",
      "target_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "required_word_count": 1000,
      "research_insight": "1 sentence with ONE stat/trend"
    }
    ... (29 more unique scenarios, total of 30)
  ]
}

CRITICAL INSTRUCTIONS:
- ACTUALLY USE Google Search for your research - don't make up generic scenarios
- Each scenario should reflect REAL market insights you discovered
- Ensure all 30 scenarios are SUBSTANTIALLY DIFFERENT from each other
- Include diverse experience levels: beginners, intermediate, advanced, enterprise
- Vary the contexts: budget-conscious, time-pressed, scaling up, starting out, etc.
- Return ONLY the JSON object, no markdown formatting, no extra text

BEGIN YOUR RESEARCH NOW.`;

    logger.info('Sending request to Gemini with Google Search grounding...');

    const startTime = Date.now();
    
    // Generate content with retry logic (handles rate limits)
    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        
        // Check if we got blocked for safety
        const response = result.response;
        if (!response || response.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${response.promptFeedback?.blockReason || 'Unknown reason'}`);
        }
        
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        
        // Check if it's a rate limit error
        const isRateLimit = error.message && (
          error.message.includes('429') || 
          error.message.includes('quota') ||
          error.message.includes('Too Many Requests')
        );
        
        if (attempts >= maxAttempts) {
          if (isRateLimit) {
            throw new Error('Rate limit exceeded. Please wait 60 seconds and try again, or use a different API key with higher quota.');
          }
          throw error;
        }
        
        // If rate limit, wait longer
        const waitTime = isRateLimit ? 60000 : (2000 * attempts);
        logger.warn(`Phase A attempt ${attempts} failed: ${error.message}`);
        logger.warn(`Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logger.info(`Phase A: Received response from Gemini (took ${duration}s)`);

    // Get and parse the response text
    const responseText = result.response.text();
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    logger.info(`Response length: ${responseText.length} characters`);
    
    // Save raw response for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fs = await import('fs');
    await fs.promises.writeFile(
      `debug-response-${timestamp}.txt`, 
      responseText
    ).catch(() => {}); // Ignore write errors
    
    let parsedResponse;
    try {
      parsedResponse = extractJSON(responseText);
      logger.info('✅ Successfully parsed JSON response');
    } catch (parseError) {
      logger.error('❌ JSON EXTRACTION FAILED');
      logger.error('Error:', parseError.message);
      logger.error('Response saved to: debug-response-' + timestamp + '.txt');
      logger.error('First 500 chars:', responseText.substring(0, 500));
      logger.error('Last 500 chars:', responseText.substring(responseText.length - 500));
      
      // One more aggressive attempt
      try {
        logger.info('Attempting aggressive JSON extraction...');
        const aggressive = extractJSONAggressively(responseText);
        if (aggressive) {
          logger.info('✅ Aggressive extraction succeeded!');
          parsedResponse = aggressive;
        } else {
          throw parseError;
        }
      } catch (e) {
        throw new Error(`Invalid JSON response from Gemini API: ${parseError.message}`);
      }
    }

    // Validate the response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Response is not a valid JSON object');
    }

    if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
      logger.error('Invalid response structure:', JSON.stringify(parsedResponse).substring(0, 500));
      throw new Error('Response does not contain a valid scenarios array');
    }

    let scenarios = parsedResponse.scenarios;

    if (scenarios.length === 0) {
      throw new Error('No scenarios generated');
    }

    // Filter out incomplete scenarios (missing required fields)
    scenarios = scenarios.filter(s => {
      return s.pain_point_detail && 
             s.goal_focus && 
             s.blog_topic_headline &&
             s.pain_point_detail.trim().length > 20 &&
             s.goal_focus.trim().length > 10 &&
             s.blog_topic_headline.trim().length > 10;
    });

    if (scenarios.length < 15) {
      throw new Error(`Too few complete scenarios generated: ${scenarios.length}. Try again.`);
    }

    if (scenarios.length < 30) {
      logger.warn(`⚠️ Generated ${scenarios.length} complete scenarios (expected 30). Proceeding with available scenarios.`);
    }

    logger.info(`Validating ${scenarios.length} scenarios...`);

    // Validate and fix each scenario
    const validatedScenarios = await Promise.all(scenarios.slice(0, 30).map(async (scenario, index) => {
      // Auto-fix missing required fields
      if (!scenario.scenario_id) scenario.scenario_id = index + 1;
      if (!scenario.persona_name) scenario.persona_name = `Persona ${index + 1}`;
      if (!scenario.persona_archetype) scenario.persona_archetype = 'Professional User';
      if (!scenario.required_word_count) scenario.required_word_count = 1000;
      if (!scenario.target_keywords || !Array.isArray(scenario.target_keywords)) {
        scenario.target_keywords = [`${niche}`, 'solution', 'guide'];
      }

      // Fetch Unsplash imagery ONLY for first 2 scenarios (to save API quota)
      if (index < 2) {
        const images = await fetchScenarioImageUrls({
          keywords: scenario.target_keywords,
          personaName: scenario.persona_name,
        });
        scenario.image_urls = images;
      } else {
        scenario.image_urls = [];
      }

      // Validate critical fields
      if (!scenario.pain_point_detail || scenario.pain_point_detail.trim().length < 10) {
        throw new Error(`Scenario ${index + 1} has invalid or missing pain_point_detail`);
      }
      if (!scenario.goal_focus || scenario.goal_focus.trim().length < 10) {
        throw new Error(`Scenario ${index + 1} has invalid or missing goal_focus`);
      }
      if (!scenario.blog_topic_headline || scenario.blog_topic_headline.trim().length < 5) {
        throw new Error(`Scenario ${index + 1} has invalid or missing blog_topic_headline`);
      }

      return scenario;
    }));

    logger.info(`✅ Phase A Complete: Successfully validated ${validatedScenarios.length} scenarios`);

    return validatedScenarios;

  } catch (error) {
    logger.error('❌ Phase A failed:', error.message);
    logger.error('Stack trace:', error.stack);
    throw new Error(`Phase A (Research) failed: ${error.message}`);
  }
}

export default executePhaseA;
