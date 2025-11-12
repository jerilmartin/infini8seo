import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';
import logger from '../utils/logger.js';
import ContentRepository from '../models/ContentRepository.js';

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
 * Phase B: Mass Content Generation
 * Generates 50 blog posts concurrently using gemini-2.5-flash with rate limiting
 * 
 * @param {Object} params - Input parameters
 * @param {string} params.jobId - MongoDB Job ID
 * @param {Array} params.scenarios - Array of 50 scenarios from Phase A
 * @param {string} params.niche - Business niche
 * @param {string[]} params.valuePropositions - Value propositions
 * @param {string} params.tone - Content tone
 * @param {Function} params.progressCallback - Callback to report progress
 * @returns {Promise<void>}
 */
export async function executePhaseB({
  jobId,
  scenarios,
  niche,
  valuePropositions,
  tone,
  progressCallback
}) {
  logger.info(`Phase B: Starting generation of ${scenarios.length} blog posts`);

  // Initialize Gemini client if not already done
  if (!genAI) {
    genAI = initGemini();
  }

  // Concurrency limiter - max 10 concurrent requests to respect API rate limits
  const maxConcurrency = parseInt(process.env.MAX_CONCURRENT_CONTENT_GENERATION) || 10;
  const limit = pLimit(maxConcurrency);

  logger.info(`Using concurrency limit: ${maxConcurrency}`);

  let completedCount = 0;
  const totalCount = scenarios.length;

  // Create an array of promises for concurrent execution
  const generationPromises = scenarios.map((scenario, index) => {
    return limit(async () => {
      try {
        logger.info(`Generating blog post ${scenario.scenario_id}/${totalCount}: "${scenario.blog_topic_headline}"`);

        const startTime = Date.now();
        
        const blogContent = await generateSingleBlogPost({
          scenario,
          niche,
          valuePropositions,
          tone
        });

        const generationTime = Date.now() - startTime;

        // Save to Supabase Content table
        await ContentRepository.create({
          jobId,
          scenarioId: scenario.scenario_id,
          blogTitle: scenario.blog_topic_headline,
          personaArchetype: scenario.persona_archetype,
          keywords: scenario.target_keywords,
          blogContent,
          wordCount: countWords(blogContent),
          generationTimeMs: generationTime,
          modelUsed: 'gemini-2.5-flash'
        });

        completedCount++;
        
        // Report progress
        if (progressCallback) {
          await progressCallback(completedCount, totalCount);
        }

        logger.info(`✅ Blog post ${scenario.scenario_id} completed and saved`);

        return {
          scenarioId: scenario.scenario_id,
          success: true
        };

      } catch (error) {
        logger.error(`Failed to generate blog post ${scenario.scenario_id}:`, error.message);

        // Save failed content record
        try {
          await ContentRepository.createFailed({
            jobId,
            scenarioId: scenario.scenario_id,
            blogTitle: scenario.blog_topic_headline,
            personaArchetype: scenario.persona_archetype,
            keywords: scenario.target_keywords,
            errorMessage: error.message
          });
        } catch (saveError) {
          logger.error(`Failed to save error record for scenario ${scenario.scenario_id}:`, saveError.message);
        }

        completedCount++;
        
        if (progressCallback) {
          await progressCallback(completedCount, totalCount);
        }

        return {
          scenarioId: scenario.scenario_id,
          success: false,
          error: error.message
        };
      }
    });
  });

  // Execute all blog post generations concurrently with rate limiting
  const results = await Promise.all(generationPromises);

  // Log summary
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info(`Phase B Complete: ${successCount} successful, ${failureCount} failed`);

  if (failureCount > 0) {
    logger.warn(`Failed scenarios: ${results.filter(r => !r.success).map(r => r.scenarioId).join(', ')}`);
  }

  return results;
}

/**
 * Generate a single blog post using gemini-2.5-flash
 * 
 * @param {Object} params
 * @returns {Promise<string>} The generated blog content in Markdown
 */
async function generateSingleBlogPost({ scenario, niche, valuePropositions, tone }) {
  if (!genAI) {
    genAI = initGemini();
  }
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192
    }
  });

  const systemInstruction = `You are a professional, authoritative, and ${tone} content writer for a business in the ${niche} industry. Your primary objective is to write a single, complete, highly detailed blog post, strictly between 950 and 1050 words. The content must directly address the specific persona, structure, and integration requirement below.`;

  const userPrompt = `
TONE: ${tone}

TARGET AUDIENCE: ${scenario.persona_archetype}

PERSONA NAME: ${scenario.persona_name}

PAIN POINT: ${scenario.pain_point_detail}

GOAL: ${scenario.goal_focus}

HEADLINE: ${scenario.blog_topic_headline}

KEYWORDS: ${scenario.target_keywords.join(', ')}

BUSINESS VALUE PROPOSITION: ${valuePropositions[0]}

INSTRUCTIONS:

1. **Strict Length:** Output must be between 950 and 1050 words. This is critical.

2. **Formatting:** Use valid **Markdown**. Start with the H1 (# ${scenario.blog_topic_headline}), then use H2 (##) for major sections, and H3 (###) for sub-points. Use lists for readability where appropriate.

3. **Structure:** The post must flow logically and contain these four mandatory H2 sections:
   * **## Introduction:** Hook the reader by vividly describing the **PAIN POINT** (${scenario.pain_point_detail}). Make it relatable and emotional.
   * **## Understanding the Challenge:** Explore the root causes of the problem and the path to the **GOAL** (${scenario.goal_focus}). Provide context and analysis.
   * **## Actionable Steps to Get Started:** Provide 3-5 concrete, general tips (not related to our product) on how to begin solving the problem. Make these practical and immediately applicable.
   * **## The Ultimate Solution:** Dedicate this section to explaining how the **BUSINESS VALUE PROPOSITION** (${valuePropositions[0]}) is the ultimate, inevitable solution to the persona's dilemma. Connect the dots between their pain point, their goal, and how this value proposition bridges that gap. Be persuasive but not overtly salesy.
   * **## Conclusion:** Strong summary and a final Call-to-Action encouraging them to take the next step.

4. **SEO:** Naturally incorporate the keywords [${scenario.target_keywords.join(', ')}] throughout the text. Don't force them, but ensure they appear in key places like headers and body text.

5. **Quality:** Write in a ${tone} tone. Be engaging, informative, and valuable. The reader should feel they've gained real insights after reading.

6. **CRITICAL:** Count your words carefully. The final output must be between 950-1050 words.

Now write the complete blog post in Markdown format. Return ONLY the blog post content, no additional commentary.
`;

  // Retry logic for blog generation
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const startTime = Date.now();

      // Combine prompts for more reliable generation
      const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;
      
      const result = await model.generateContent(fullPrompt);
      
      // Check for blocked content
      const response = result.response;
      if (!response || response.promptFeedback?.blockReason) {
        throw new Error(`Content blocked: ${response.promptFeedback?.blockReason || 'Unknown reason'}`);
      }
      
      const blogContent = response.text();

      if (!blogContent || blogContent.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      const endTime = Date.now();
      const generationTime = endTime - startTime;

      // Validate word count
      const wordCount = countWords(blogContent);
      
      if (wordCount < 700) {
        logger.warn(`Blog post ${scenario.scenario_id} too short (${wordCount} words), retrying...`);
        attempts++;
        if (attempts >= maxAttempts) {
          // Accept it anyway rather than failing
          logger.warn(`⚠️ Accepting short blog post ${scenario.scenario_id} after ${maxAttempts} attempts`);
          return blogContent;
        }
        continue;
      }

      logger.info(`✅ Blog post ${scenario.scenario_id} generated: ${wordCount} words in ${generationTime}ms`);

      return blogContent;

    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate blog post after ${maxAttempts} attempts: ${error.message}`);
      }
      logger.warn(`⚠️ Blog generation attempt ${attempts}/${maxAttempts} failed for scenario ${scenario.scenario_id}: ${error.message}`);
      
      // Exponential backoff
      const backoffMs = 1000 * Math.pow(2, attempts);
      logger.info(`Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Count words in text
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export default executePhaseB;

