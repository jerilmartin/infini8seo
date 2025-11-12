import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

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
 * Extract JSON from text that might have markdown formatting or extra text
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Ignore, try extraction
  }

  // Try to extract from markdown code blocks
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /\{[\s\S]*\}/
  ];

  for (const pattern of codeBlockPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const extracted = match[1] || match[0];
        return JSON.parse(extracted);
      } catch (e) {
        continue;
      }
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
export async function executePhaseA({ niche, valuePropositions, tone }) {
  logger.info(`Phase A: Initiating deep research for niche: ${niche}`);

  try {
    // Initialize Gemini client if not already done
    if (!genAI) {
      genAI = initGemini();
    }
    
    // Use gemini-2.0-flash-exp for research with Google Search
    // Note: We set responseMimeType but also have fallback JSON extraction
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      },
      tools: [{
        googleSearch: {}
      }]
    });

    // Create comprehensive prompt
    const prompt = `You are a Market Analyst and Persona Architect. Using the Google Search tool, research the following business niche and generate EXACTLY 50 unique customer personas/scenarios.

BUSINESS NICHE: ${niche}
VALUE PROPOSITIONS: ${valuePropositions.join(', ')}
DESIRED TONE: ${tone}

REQUIREMENTS:
1. Research current trends, pain points, and customer needs in the "${niche}" industry using Google Search
2. Generate EXACTLY 50 unique, diverse scenarios (no more, no less)
3. Each scenario must be substantially different from others
4. Each scenario should inspire a compelling 1000-word blog post
5. Include 3-5 commercial-intent, searchable keywords for each

OUTPUT FORMAT (JSON ONLY):
{
  "business_niche": "${niche}",
  "scenarios": [
    {
      "scenario_id": 1,
      "persona_name": "Specific persona name",
      "persona_archetype": "The [Type] [Role]",
      "pain_point_detail": "Detailed description of their main problem or challenge",
      "goal_focus": "What they ultimately want to achieve",
      "blog_topic_headline": "Compelling, clickable blog headline",
      "target_keywords": ["keyword1", "keyword2", "keyword3"],
      "required_word_count": 1000
    }
    ... (49 more scenarios for a total of 50)
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.`;

    logger.info('Sending request to Gemini with Google Search grounding...');

    const startTime = Date.now();
    
    // Generate content with retry logic
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
        if (attempts >= maxAttempts) {
          throw error;
        }
        logger.warn(`Phase A attempt ${attempts} failed, retrying in ${2 * attempts}s...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
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
    
    let parsedResponse;
    try {
      parsedResponse = extractJSON(responseText);
      logger.info('✅ Successfully parsed JSON response');
    } catch (parseError) {
      logger.error('Failed to parse Gemini response as JSON');
      logger.error('Response preview (first 2000 chars):', responseText.substring(0, 2000));
      logger.error('Parse error:', parseError.message);
      throw new Error(`Invalid JSON response from Gemini API: ${parseError.message}`);
    }

    // Validate the response structure
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Response is not a valid JSON object');
    }

    if (!parsedResponse.scenarios || !Array.isArray(parsedResponse.scenarios)) {
      logger.error('Invalid response structure:', JSON.stringify(parsedResponse).substring(0, 500));
      throw new Error('Response does not contain a valid scenarios array');
    }

    const scenarios = parsedResponse.scenarios;

    if (scenarios.length === 0) {
      throw new Error('No scenarios generated');
    }

    if (scenarios.length < 50) {
      logger.warn(`⚠️ Only ${scenarios.length} scenarios generated, expected 50. Will proceed with what we have.`);
    }

    logger.info(`Validating ${scenarios.length} scenarios...`);

    // Validate and fix each scenario
    const validatedScenarios = scenarios.slice(0, 50).map((scenario, index) => {
      // Auto-fix missing required fields
      if (!scenario.scenario_id) scenario.scenario_id = index + 1;
      if (!scenario.persona_name) scenario.persona_name = `Persona ${index + 1}`;
      if (!scenario.persona_archetype) scenario.persona_archetype = 'Professional User';
      if (!scenario.required_word_count) scenario.required_word_count = 1000;
      if (!scenario.target_keywords || !Array.isArray(scenario.target_keywords)) {
        scenario.target_keywords = [`${niche}`, 'solution', 'guide'];
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
    });

    logger.info(`✅ Phase A Complete: Successfully validated ${validatedScenarios.length} scenarios`);

    return validatedScenarios;

  } catch (error) {
    logger.error('❌ Phase A failed:', error.message);
    logger.error('Stack trace:', error.stack);
    throw new Error(`Phase A (Research) failed: ${error.message}`);
  }
}

export default executePhaseA;
