import { GoogleGenerativeAI } from '@google/generative-ai';
import pLimit from 'p-limit';
import logger from '../utils/logger.js';
import ContentRepository from '../models/ContentRepository.js';
import { highlightKeywords } from './utils/highlightKeywords.js';

const BLOG_TYPES = ['functional', 'transactional', 'commercial', 'informational'];

function normalizeAllocations(totalBlogs, allocations = {}) {
  const normalized = {};
  let sum = 0;

  BLOG_TYPES.forEach((type) => {
    const value = Math.max(0, Math.floor(Number(allocations?.[type]) || 0));
    normalized[type] = value;
    sum += value;
  });

  if (sum === 0) {
    const base = Math.floor(totalBlogs / BLOG_TYPES.length);
    let remainder = totalBlogs % BLOG_TYPES.length;
    BLOG_TYPES.forEach((type) => {
      normalized[type] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    });
    return normalized;
  }

  if (sum > totalBlogs) {
    let reductionNeeded = sum - totalBlogs;
    const typesByCount = [...BLOG_TYPES].sort((a, b) => normalized[b] - normalized[a]);
    for (const type of typesByCount) {
      if (reductionNeeded <= 0) break;
      const reducible = Math.min(normalized[type], reductionNeeded);
      normalized[type] -= reducible;
      reductionNeeded -= reducible;
    }
  } else if (sum < totalBlogs) {
    let remaining = totalBlogs - sum;
    while (remaining > 0) {
      for (const type of BLOG_TYPES) {
        if (remaining <= 0) break;
        normalized[type] += 1;
        remaining -= 1;
      }
    }
  }

  return normalized;
}

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
  totalBlogs,
  blogTypeAllocations,
  targetWordCount,
  progressCallback
}) {
  const targetTotal = totalBlogs || scenarios.length;
  const allocations = normalizeAllocations(targetTotal, blogTypeAllocations);

  logger.info(`Phase B: Starting generation of ${targetTotal} blog posts`);
  logger.info(`Allocation plan: ${JSON.stringify(allocations)}`);

  // Initialize Gemini client if not already done
  if (!genAI) {
    genAI = initGemini();
  }

  // Concurrency limiter - max 10 concurrent requests to respect API rate limits
  const maxConcurrency = parseInt(process.env.MAX_CONCURRENT_CONTENT_GENERATION) || 10;
  const limit = pLimit(maxConcurrency);

  logger.info(`Using concurrency limit: ${maxConcurrency}`);

  const sanitizedScenarios = scenarios.map((scenario, index) => ({
    ...scenario,
    scenario_id: scenario?.scenario_id || index + 1
  }));

  if (sanitizedScenarios.length === 0) {
    throw new Error('No scenarios available from Phase A to generate content.');
  }

  const generationPlan = [];
  let scenarioIndex = 0;

  BLOG_TYPES.forEach((type) => {
    const count = allocations[type] || 0;
    for (let i = 0; i < count; i += 1) {
      const sourceScenario = sanitizedScenarios[scenarioIndex % sanitizedScenarios.length];
      scenarioIndex += 1;

      generationPlan.push({
        ...sourceScenario,
        scenario_id: generationPlan.length + 1,
        source_scenario_id: sourceScenario.scenario_id,
        blog_type: type
      });
    }
  });

  const totalCount = generationPlan.length;
  let completedCount = 0;

  // Create an array of promises for concurrent execution
  const generationPromises = generationPlan.map((scenario) => {
    return limit(async () => {
      try {
        logger.info(`Generating ${scenario.blog_type} blog ${scenario.scenario_id}/${totalCount}: "${scenario.blog_topic_headline}"`);

        const startTime = Date.now();
        
        const blogContent = await generateSingleBlogPost({
          scenario,
          niche,
          valuePropositions,
          tone,
          blogType: scenario.blog_type,
          targetWordCount
        });

        const generationTime = Date.now() - startTime;

        const images = Array.isArray(scenario.image_urls) ? scenario.image_urls.slice(0, 2) : [];
        const blogContentWithFaq = ensureFaqSection(blogContent, scenario, valuePropositions[0]);
        
        // Highlight SEO keywords with visual styling
        logger.info(`Highlighting keywords for blog ${scenario.scenario_id}: ${scenario.target_keywords?.join(', ')}`);
        const contentWithKeywords = highlightKeywords(blogContentWithFaq, scenario.target_keywords, targetWordCount);
        logger.info(`Keyword highlighting complete - added ${(contentWithKeywords.match(/<mark/g) || []).length} highlights`);
        
        // Add images ONLY to first 2 blog posts (to save Unsplash API quota)
        let contentWithImages = contentWithKeywords;
        
        if (scenario.scenario_id <= 2 && images.length > 0) {
          // Split content into sections (by ## headers)
          const sections = contentWithImages.split(/(?=##\s)/);
          
          if (sections.length >= 3 && images.length >= 2) {
            // Add first image after introduction (after first section)
            sections[1] = `${images[0] ? `![${images[0].alt || scenario.blog_topic_headline}](${images[0].url})\n*Photo by [${images[0].photographer}](${images[0].photographerUrl}) on Unsplash*\n\n` : ''}${sections[1]}`;
            
            // Add second image in the middle (after 3rd section)
            if (sections.length >= 4) {
              sections[3] = `${images[1] ? `![${images[1].alt || scenario.blog_topic_headline}](${images[1].url})\n*Photo by [${images[1].photographer}](${images[1].photographerUrl}) on Unsplash*\n\n` : ''}${sections[3]}`;
            }
            
            contentWithImages = sections.join('');
          } else {
            // Fallback: add images at the top
            contentWithImages = `${images.map((img) => `![${img.alt || scenario.blog_topic_headline}](${img.url})\n*Photo by [${img.photographer}](${img.photographerUrl}) on Unsplash*`).join('\n\n')}\n\n${contentWithKeywords}`;
          }
        }

        // Save to Supabase Content table
        await ContentRepository.create({
          jobId,
          scenarioId: scenario.scenario_id,
          blogTitle: scenario.blog_topic_headline,
          personaArchetype: scenario.persona_archetype,
          keywords: scenario.target_keywords,
          blogContent: contentWithImages,
          wordCount: countWords(contentWithImages),
          generationTimeMs: generationTime,
          modelUsed: 'gemini-2.5-flash',
          blogType: scenario.blog_type,
          sourceScenarioId: scenario.source_scenario_id,
          imageUrls: images
        });

        completedCount += 1;
        
        // Report progress
        if (progressCallback) {
          await progressCallback(completedCount, totalCount);
        }

        logger.info(`✅ ${scenario.blog_type} blog ${scenario.scenario_id} completed and saved`);

        return {
          scenarioId: scenario.scenario_id,
          blogType: scenario.blog_type,
          success: true
        };

      } catch (error) {
        logger.error(`Failed to generate ${scenario.blog_type} blog ${scenario.scenario_id}:`, error.message);

        // Save failed content record
        try {
          await ContentRepository.createFailed({
            jobId,
            scenarioId: scenario.scenario_id,
            blogTitle: scenario.blog_topic_headline,
            personaArchetype: scenario.persona_archetype,
            keywords: scenario.target_keywords,
            blogType: scenario.blog_type,
            imageUrls: scenario.image_urls || null,
            errorMessage: error.message
          });
        } catch (saveError) {
          logger.error(`Failed to save error record for scenario ${scenario.scenario_id}:`, saveError.message);
        }

        completedCount += 1;
        
        if (progressCallback) {
          await progressCallback(completedCount, totalCount);
        }

        return {
          scenarioId: scenario.scenario_id,
          blogType: scenario.blog_type,
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
    logger.warn(`Failed scenarios: ${results.filter(r => !r.success).map(r => `${r.blogType}#${r.scenarioId}`).join(', ')}`);
  }

  return results;
}

/**
 * Generate a single blog post using gemini-2.5-flash
 * 
 * @param {Object} params
 * @returns {Promise<string>} The generated blog content in Markdown
 */
async function generateSingleBlogPost({ scenario, niche, valuePropositions, tone, blogType, targetWordCount }) {
  if (!genAI) {
    genAI = initGemini();
  }
  
  // Use gemini-2.5-flash - Higher quota limits than 2.0-flash-exp
  // This model supports Google Search and has better rate limits
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.9, // Higher for creative, engaging writing
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192
    },
    tools: [{
      googleSearch: {}
    }]
  });

  const systemInstruction = `You are an EXPERT ${tone} content writer and thought leader in the ${niche} industry. You have deep expertise, years of experience, and a talent for creating comprehensive, insightful content that resonates with readers and ranks highly in search engines.

YOUR WRITING STYLE:
- ${tone.charAt(0).toUpperCase() + tone.slice(1)} but authoritative
- Data-driven with real examples
- Actionable and practical
- Engaging storytelling that connects emotionally
- SEO-optimized with strategic keyword highlighting
- Premium quality that readers want to share

IMPORTANT: You MUST use HTML mark tags to highlight ${Math.floor(20 + ((targetWordCount || 1200) - 500) / 100)}-${Math.floor(25 + ((targetWordCount || 1200) - 500) / 100)} SEO keywords throughout the content.

**KEYWORD HIGHLIGHTING FORMULA:**
- For ${targetWordCount || 1200} words: Highlight approximately ${Math.floor(20 + ((targetWordCount || 1200) - 500) / 100)} keywords
- Format: <mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">[keyword]</mark>
- Include PRIMARY keywords (${scenario.target_keywords.slice(0, 3).join(', ')}) AND semantic variations
- Distribute naturally across all sections - intro, body, conclusion, FAQ`;

  const userPrompt = `
ASSIGNMENT: Write a PREMIUM, IN-DEPTH ${blogType ? blogType.toUpperCase() : ''} blog post that will become the definitive resource on this topic.

TARGET READER:
- Persona: ${scenario.persona_name}
- Type: ${scenario.persona_archetype}
- Pain Point: ${scenario.pain_point_detail}
- Goal: ${scenario.goal_focus}
${scenario.research_insight ? `- Market Context: ${scenario.research_insight}` : ''}
${blogType ? `- Blog Type Objective: Focus on a ${blogType} intent – tailor the structure, CTA, and depth to match this intent.` : ''}

BLOG HEADLINE: 
# ${scenario.blog_topic_headline}

SEO KEYWORDS (integrate naturally): ${scenario.target_keywords.join(', ')}

BUSINESS SOLUTION: ${valuePropositions[0]}

CONTENT REQUIREMENTS:

**LENGTH:** ${targetWordCount || 1200} words (±100 words is acceptable, aim for comprehensive content)

**RESEARCH:** Use Google Search to find:
- Current statistics and data relevant to this topic
- Real-world examples or case studies
- Latest trends or developments
- Expert insights or quotes
- Common misconceptions to address

**STRUCTURE:**

## Introduction (150-200 words)
- Start with a compelling hook (question, statistic, or story)
- Paint a vivid picture of the ${scenario.persona_archetype}'s pain point
- Make it deeply relatable - they should think "This is exactly me!"
- Preview the value they'll get from this article
- Include primary keyword naturally

## 🎯 Quick Answer (40-60 words) **CRITICAL FOR AEO**
**Immediately after the introduction, provide a 2-3 sentence direct answer summary:**
- Directly address the main topic/question
- 40-60 words, easily extractable
- Clear, concise, and actionable
- This enables Featured Snippets and AI Overview extraction
- Format: Bold or highlighted for easy identification

## Why Does [Problem] Happen? (250-300 words) **QUESTION-BASED HEADING**
- Deep dive into WHY this problem exists
- Explain the root causes most people miss
- Include relevant statistics or data you found through research
- Discuss why common approaches fail
- Connect to their goal: ${scenario.goal_focus}
- Address misconceptions

## What's the Best Approach to [Solve This]? (200-250 words) **QUESTION-BASED HEADING**
- Explain the overall approach that actually works
- Reference industry trends or expert consensus
- Outline the key principles they need to understand
- Set expectations realistically
- Build credibility with research-backed insights

## How Do You [Achieve Goal] Step-by-Step? (400-500 words) **QUESTION-BASED HEADING**
Provide 5-7 detailed, actionable steps (STRUCTURED DATA for HowTo Rich Snippets):

### Step 1: [Specific Action as Question or Clear Step]
- What to do (be specific and tactical)
- Why it works (explain the reasoning)
- Pro tip or common mistake to avoid

### Step 2: [Specific Action as Question or Clear Step]
(Continue pattern)

Each step should be:
- Immediately actionable
- Explained with reasoning
- Backed by logic or data
- Include practical examples
- **Use question format where natural** (e.g., "How do I set up X?")

## 🚀 E-E-A-T SIGNAL: Our Expertise (50-100 words) **CRITICAL**
**Include a brief paragraph establishing expertise:**
"As specialists in ${niche}, we've helped [hundreds/thousands] of clients achieve [specific outcome]. Our approach combines ${valuePropositions.join(', ')} to deliver measurable results. With [X years] of experience in the industry, we understand the unique challenges faced by ${scenario.persona_archetype} and have developed proven strategies that work."

## How Can [Business Solution] Accelerate Your Results? (200-250 words) **QUESTION-BASED**
- Explain how ${valuePropositions[0]} takes this to the next level
- Position it as the logical evolution, not just a sales pitch
- Show how it solves the hardest parts of the manual approach
- Include specific benefits related to their pain point
- Make the ROI clear (time saved, results improved, etc.)
- Natural transition, not jarring pitch

## Conclusion & Next Steps (150-200 words)
- Summarize the key insights
- Reframe their situation with new understanding
- Provide clear, specific next action
- Inspirational but realistic closing
- Final CTA that feels helpful, not pushy

## FAQ (4-5 questions) **STRUCTURED DATA - FAQPage Schema**
**CRITICAL FOR RICH SNIPPETS & AI EXTRACTION:**
- Provide 4-5 frequently asked questions that a ${scenario.persona_archetype} would naturally ask
- Each question MUST be phrased as a natural language question (e.g., "How much does X cost?", "What is the best way to Y?")
- Each question should be in bold (e.g., **How long does it take to see results?**)
- Each answer should be 2-3 sentences, specific, and directly answer the question
- Reference ${scenario.pain_point_detail} or their goal of ${scenario.goal_focus}
- Highlight how ${valuePropositions[0]} supports the answer wherever relevant
- Keep the tone reassuring and authoritative
- **Format for easy extraction by AI/LLMs**

**QUALITY STANDARDS:**

1. **Depth Over Fluff:** Every paragraph should provide value. No filler content.

2. **Research-Backed:** Include actual data, trends, or insights from your Google Search research. Cite "recent studies show..." or "industry data indicates..." when relevant.

3. **Specific & Tactical:** Replace generic advice with specific, actionable guidance. Instead of "create a strategy," say "map out your first 30 days with these three milestones..."

4. **Natural SEO:** Keywords should flow naturally. Don't stuff them awkwardly.

5. **Engaging Writing:** Use:
   - Short and long sentences for rhythm
   - Rhetorical questions to engage
   - Real-world examples or scenarios
   - Analogies to clarify complex concepts
   - Bold text for key points

6. **Professional Formatting:** 
   - Use ### for subsections within steps
   - Use bullet points for lists
   - Bold important concepts
   - Keep paragraphs 2-4 sentences max

7. **Authenticity:** Write like you genuinely want to help this person succeed. They should feel you understand their struggle.

8. **AEO OPTIMIZATION (Answer Engine Optimization):**
   - Use question-based H2/H3 headings throughout
   - Include Quick Answer section immediately after intro
   - Structure content for easy AI extraction
   - Use clear Q&A format in FAQ section
   - Enable Featured Snippets and AI Overview inclusion
   - Make answers directly extractable (40-60 word summaries)

9. **KEYWORD HIGHLIGHTING FOR SEO (CRITICAL - DYNAMIC SCALING):**
   
   **TARGET KEYWORD COUNT BASED ON WORD COUNT:**
   - 500-800 words: Highlight 20-25 keyword instances
   - 800-1200 words: Highlight 25-30 keyword instances
   - 1200-1800 words: Highlight 30-35 keyword instances
   - 1800-2500 words: Highlight 35-40 keyword instances
   
   **KEYWORD STRATEGY:**
   - Primary Keywords (from target list): ${scenario.target_keywords.join(', ')}
   - Also identify and highlight RELATED semantic keywords naturally occurring in content
   - Include: industry terms, action verbs, solution phrases, problem descriptors
   - Distribute evenly throughout: intro, body sections, conclusion, FAQ
   
   **HIGHLIGHTING RULES:**
   - Use HTML mark tag: \`<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">[keyword]</mark>\`
   - Highlight 2-4 occurrences of each PRIMARY keyword
   - Highlight 1-2 occurrences of SECONDARY/semantic keywords
   - Space them naturally - don't cluster in one paragraph
   - Prioritize: headings context, first paragraphs of sections, key explanations
   - Mix single words and 2-3 word phrases
   
   **EXAMPLES:**
   - "<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">digital marketing</mark>"
   - "<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">ROI optimization</mark>"
   - "<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">customer engagement</mark>"
   - "<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">data-driven strategies</mark>"
   
   **BALANCE:** Natural reading flow is priority - keywords should enhance, not disrupt

**CRITICAL AEO & SEO REQUIREMENTS:** 
- Word count: ${targetWordCount || 1200} words (±100 words acceptable)
- **MUST include Quick Answer section** (40-60 words) immediately after introduction
- **ALL H2/H3 headings MUST be questions** or clear actionable statements
- **E-E-A-T signal paragraph** establishing expertise in ${niche}
- **FAQ section with 4-5 natural language questions** for FAQPage schema

**KEYWORD HIGHLIGHTING (DYNAMIC SCALING):**
- **Target: ${Math.floor(20 + ((targetWordCount || 1200) - 500) / 100)}+ keyword highlights** (scales with word count)
- For ${targetWordCount || 1200} words: Aim for ${Math.floor(20 + ((targetWordCount || 1200) - 500) / 100)}-${Math.floor(25 + ((targetWordCount || 1200) - 500) / 100)} highlighted keywords
- Use \`<mark style="background-color: #FFF4E6; padding: 2px 4px; border-radius: 3px;">[keyword]</mark>\`
- Primary keywords: ${scenario.target_keywords.join(', ')}
- Also highlight semantic/related keywords naturally in content
- Distribute evenly throughout all sections
- 2-4 occurrences per primary keyword, 1-2 per secondary
- Natural placement - enhance readability, don't disrupt flow
- Use Google Search to enhance content with real data
- Structure for easy AI/LLM extraction
- End with the FAQ section—no content after it
- Return ONLY the blog post in Markdown with HTML mark tags for keywords
- No preamble, no "here's your blog post", just the content

BEGIN WRITING NOW.
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
      
      if (wordCount < 1000) {
        logger.warn(`Blog post ${scenario.scenario_id} too short (${wordCount} words), retrying...`);
        attempts++;
        if (attempts >= maxAttempts) {
          // Accept it anyway rather than failing
          logger.warn(`⚠️ Accepting short blog post ${scenario.scenario_id} after ${maxAttempts} attempts (${wordCount} words)`);
          return blogContent;
        }
        continue;
      }

      logger.info(`✅ Blog post ${scenario.scenario_id} generated: ${wordCount} words in ${generationTime}ms`);

      return blogContent;

      } catch (error) {
        attempts++;
        
        // Check if it's a rate limit error
        const isRateLimit = error.message && (
          error.message.includes('429') || 
          error.message.includes('quota') ||
          error.message.includes('Too Many Requests')
        );
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate blog post after ${maxAttempts} attempts: ${error.message}`);
        }
        
        logger.warn(`⚠️ Blog generation attempt ${attempts}/${maxAttempts} failed for scenario ${scenario.scenario_id}: ${error.message}`);
        
        // If rate limit, wait longer; otherwise exponential backoff
        const backoffMs = isRateLimit ? 60000 : (1000 * Math.pow(2, attempts));
        logger.info(`Retrying in ${backoffMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
  }
}

function ensureFaqSection(content, scenario, primaryValueProp) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const hasFaq = /##\s*(faq|frequently asked questions)/i.test(content);
  if (hasFaq) {
    return content.trim();
  }

  const safeText = (text, fallback) =>
    (typeof text === 'string' && text.trim().length > 0 ? text.trim() : fallback);

  const persona = safeText(scenario?.persona_archetype, 'customers');
  const painPoint = safeText(scenario?.pain_point_detail, 'their biggest challenge');
  const goal = safeText(scenario?.goal_focus, 'their primary goal');
  const solution = safeText(primaryValueProp, 'our solution');

  const personaPhrase = persona.toLowerCase();
  const painPointPhrase = painPoint.toLowerCase();

  const fallbackFaqItems = [
    {
      question: `How does ${solution} support ${personaPhrase}?`,
      answer: `${solution} helps ${personaPhrase} tackle ${painPointPhrase} by giving them structured guidance, expert-backed frameworks, and accountability loops so progress toward ${goal} becomes achievable.`
    },
    {
      question: `What should I tackle first after reading this article?`,
      answer: `Begin by implementing the first step in the action plan and document the baseline metrics tied to ${goal}. Layer ${solution} on top to automate the heavy lifting and keep momentum through reminders, templates, and coaching prompts.`
    },
    {
      question: `How quickly will I see results from these strategies?`,
      answer: `Most ${personaPhrase} notice early wins within a few weeks when they consistently execute each step and reinforce the work with ${solution}. Sustainable gains toward ${goal} follow as your new processes mature and your team stays aligned.`
    },
    {
      question: `Can ${solution} work alongside my existing tools or processes?`,
      answer: `${solution} complements the systems you already use by filling gaps that create ${painPointPhrase}. It amplifies what works, adds best-practice workflows, and keeps everyone focused on ${goal} without forcing a disruptive overhaul.`
    }
  ];

  const faqMarkdown = [
    '## FAQ',
    '',
    ...fallbackFaqItems.map((item) => `**${item.question}**\n${item.answer}`)
  ].join('\n\n');

  return `${content.trim()}\n\n${faqMarkdown}`;
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

