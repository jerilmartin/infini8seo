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

let genAI;

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.error('GEMINI_API_KEY not found in environment variables');
    throw new Error('GEMINI_API_KEY is required');
  }

  logger.info(`Gemini API Key loaded: ${apiKey.substring(0, 20)}...`);
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

/**
 * Phase B: Mass Content Generation with AIO Optimization
 * Generates blog posts optimized for AI/LLM discovery and extraction
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

  if (!genAI) {
    genAI = initGemini();
  }

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

        logger.info(`Highlighting keywords for blog ${scenario.scenario_id}: ${scenario.target_keywords?.join(', ')}`);
        const contentWithKeywords = highlightKeywords(blogContentWithFaq, scenario.target_keywords, targetWordCount);
        logger.info(`Keyword highlighting complete - added ${(contentWithKeywords.match(/<mark/g) || []).length} highlights`);

        let contentWithImages = contentWithKeywords;

        if (scenario.scenario_id <= 2 && images.length > 0) {
          const sections = contentWithImages.split(/(?=##\s)/);

          if (sections.length >= 3 && images.length >= 2) {
            sections[1] = `${images[0] ? `![${images[0].alt || scenario.blog_topic_headline}](${images[0].url})\n*Photo by [${images[0].photographer}](${images[0].photographerUrl}) on Unsplash*\n\n` : ''}${sections[1]}`;

            if (sections.length >= 4) {
              sections[3] = `${images[1] ? `![${images[1].alt || scenario.blog_topic_headline}](${images[1].url})\n*Photo by [${images[1].photographer}](${images[1].photographerUrl}) on Unsplash*\n\n` : ''}${sections[3]}`;
            }

            contentWithImages = sections.join('');
          } else {
            contentWithImages = `${images.map((img) => `![${img.alt || scenario.blog_topic_headline}](${img.url})\n*Photo by [${img.photographer}](${img.photographerUrl}) on Unsplash*`).join('\n\n')}\n\n${contentWithKeywords}`;
          }
        }

        await ContentRepository.create({
          jobId,
          scenarioId: scenario.scenario_id,
          blogTitle: scenario.blog_topic_headline,
          personaArchetype: scenario.persona_archetype,
          keywords: scenario.target_keywords,
          blogContent: contentWithImages,
          wordCount: countWords(contentWithImages),
          generationTimeMs: generationTime,
          modelUsed: 'gemini-3-flash',
          blogType: scenario.blog_type,
          sourceScenarioId: scenario.source_scenario_id,
          imageUrls: images
        });

        completedCount += 1;

        if (progressCallback) {
          await progressCallback(completedCount, totalCount);
        }

        logger.info(`Blog ${scenario.scenario_id} (${scenario.blog_type}) completed and saved`);

        return {
          scenarioId: scenario.scenario_id,
          blogType: scenario.blog_type,
          success: true
        };

      } catch (error) {
        logger.error(`Failed to generate ${scenario.blog_type} blog ${scenario.scenario_id}:`, error.message);

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

  const results = await Promise.all(generationPromises);

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info(`Phase B Complete: ${successCount} successful, ${failureCount} failed`);

  if (failureCount > 0) {
    logger.warn(`Failed scenarios: ${results.filter(r => !r.success).map(r => `${r.blogType}#${r.scenarioId}`).join(', ')}`);
  }

  return results;
}

/**
 * Generate a single blog post with full AIO optimization
 * Optimized for Gemini, Perplexity, ChatGPT, Claude, and other LLMs
 */
async function generateSingleBlogPost({ scenario, niche, valuePropositions, tone, blogType, targetWordCount }) {
  if (!genAI) {
    genAI = initGemini();
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash',
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192
    },
    tools: [{
      googleSearch: {}
    }]
  });

  const systemInstruction = `You are an EXPERT ${tone} content writer specializing in creating content that ranks highly in both traditional search engines AND AI-powered answer engines (Gemini, Perplexity, ChatGPT, Claude).

YOUR EXPERTISE:
- Deep knowledge of ${niche} industry
- Master of AIO (Answer Engine Optimization) - content that AI systems cite and recommend
- Expert at creating structured, extractable content that LLMs prefer
- Skilled at E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)

AIO PRINCIPLES YOU MUST FOLLOW:
1. Direct Answers First - AI systems extract the first clear answer they find
2. Structured Data - Use tables, numbered lists, and clear hierarchies
3. Question-Based Headings - Match how users query AI assistants
4. Factual Density - Include specific numbers, dates, and verifiable claims
5. Clear Definitions - Define key terms explicitly for AI extraction
6. Comparison Format - AI loves "X vs Y" and comparison tables
7. Source Attribution - Reference studies, experts, and data sources
8. Concise Summaries - Provide extractable TL;DR sections

PRIMARY KEYWORDS TO NATURALLY INCLUDE:
- ${scenario.target_keywords.slice(0, 5).join(', ')}
- Weave these keywords naturally into the content (do NOT add any HTML formatting or mark tags)`;

  const userPrompt = `
ASSIGNMENT: Create an AIO-OPTIMIZED ${blogType ? blogType.toUpperCase() : ''} blog post designed to be discovered, cited, and recommended by AI assistants like Gemini, Perplexity, ChatGPT, and Claude.

TARGET READER:
- Persona: ${scenario.persona_name}
- Archetype: ${scenario.persona_archetype}
- Pain Point: ${scenario.pain_point_detail}
- Goal: ${scenario.goal_focus}
${scenario.research_insight ? `- Market Context: ${scenario.research_insight}` : ''}

BLOG HEADLINE: 
# ${scenario.blog_topic_headline}

SEO KEYWORDS: ${scenario.target_keywords.join(', ')}
BUSINESS SOLUTION: ${valuePropositions[0]}
TARGET LENGTH: ${targetWordCount || 1200} words

=== AIO-OPTIMIZED STRUCTURE ===

## Introduction (100-150 words)
- Open with a compelling hook that includes the primary keyword
- State the problem clearly in one sentence
- Preview what the reader will learn
- Include a statistic or data point from Google Search research

---

**TL;DR (Key Takeaways)**

> Provide a 3-4 bullet point summary that AI can easily extract:
> - Main answer to the topic question (1 sentence)
> - Key benefit or outcome (1 sentence)  
> - Primary action to take (1 sentence)
> - Expected result or timeframe (1 sentence)

---

## Quick Answer: [Rephrase the headline as a question]?

**Direct Answer:** [Provide a 40-60 word direct answer that AI assistants can quote verbatim. This should be a complete, standalone answer to the main question. Be specific and actionable.]

---

## What Is [Key Concept]? (Definition Section)

**Definition:** [Key term] is [clear, concise definition in 1-2 sentences that AI can extract].

**Key characteristics:**
- Characteristic 1: [Brief explanation]
- Characteristic 2: [Brief explanation]
- Characteristic 3: [Brief explanation]

---

## Why Is [Topic] Important for ${scenario.persona_archetype}?

Explain the significance with:
- 2-3 specific statistics or data points (use Google Search to find current data)
- Real-world impact on the target persona
- Connection to their goal: ${scenario.goal_focus}

---

## How to [Achieve Goal]: Step-by-Step Guide

Provide 5-7 numbered steps in this exact format (AI systems prefer numbered lists):

### Step 1: [Action Verb] + [Specific Task]
**What to do:** [2-3 sentences of specific instructions]
**Why it works:** [1 sentence explaining the reasoning]
**Pro tip:** [1 sentence with insider advice]

### Step 2: [Action Verb] + [Specific Task]
[Continue same format...]

---

## [Topic A] vs [Topic B]: Key Differences

| Factor | Option A | Option B |
|--------|----------|----------|
| [Factor 1] | [Value] | [Value] |
| [Factor 2] | [Value] | [Value] |
| [Factor 3] | [Value] | [Value] |
| Best for | [Use case] | [Use case] |

**Bottom line:** [1-2 sentence recommendation based on the comparison]

---

## Common Mistakes to Avoid

1. **[Mistake 1]:** [Why it's a problem and how to avoid it]
2. **[Mistake 2]:** [Why it's a problem and how to avoid it]
3. **[Mistake 3]:** [Why it's a problem and how to avoid it]

---

## Expert Insights: What Professionals Recommend

Include 1-2 expert perspectives or industry best practices:
- Reference specific methodologies, frameworks, or approaches
- Cite industry standards or benchmarks
- Connect to ${valuePropositions[0]} as a solution

---

## How ${valuePropositions[0]} Helps You Succeed

**The Challenge:** [Restate the pain point]
**Our Approach:** [How the solution addresses it specifically]
**The Result:** [Expected outcome with specifics]

---

## Conclusion: Your Next Steps

Summarize in 3 clear action items:
1. **Immediate action:** [What to do today]
2. **Short-term goal:** [What to achieve this week/month]
3. **Long-term strategy:** [Ongoing approach]

---

## Frequently Asked Questions

**Q: [Natural language question matching how users ask AI assistants]?**
A: [Direct, complete answer in 2-3 sentences. Include specific details.]

**Q: [Second question about cost, time, or difficulty]?**
A: [Direct answer with specific numbers or ranges when possible.]

**Q: [Third question about alternatives or comparisons]?**
A: [Balanced answer that helps the reader make a decision.]

**Q: [Fourth question about common concerns or objections]?**
A: [Reassuring answer that addresses the concern directly.]

**Q: [Fifth question connecting to ${valuePropositions[0]}]?**
A: [Answer that naturally positions the solution as helpful.]

---

=== CRITICAL AIO REQUIREMENTS ===

1. EXTRACTABLE ANSWERS: Every section should contain at least one sentence that AI can quote directly as an answer.

2. STRUCTURED DATA: Use tables, numbered lists, and clear hierarchies that AI systems can parse.

3. QUESTION MATCHING: H2 headings should match natural language queries users ask AI assistants.

4. FACTUAL DENSITY: Include specific numbers, percentages, timeframes, and verifiable claims.

5. DEFINITION BOXES: Explicitly define key terms so AI can extract definitions.

6. COMPARISON FORMAT: Include at least one comparison table for AI extraction.

7. FAQ OPTIMIZATION: Questions should match "People Also Ask" style queries.

8. NATURAL KEYWORD USAGE: Include the target keywords naturally in the text. Do NOT add any HTML mark tags or formatting - keywords will be highlighted automatically after generation.

9. SOURCE SIGNALS: Reference "research shows," "studies indicate," "experts recommend" to build AI trust.

10. CLEAR HIERARCHY: Use proper heading structure (##, ###) that AI can navigate.

=== OUTPUT REQUIREMENTS ===

- Return ONLY the blog post in Markdown format
- Include HTML mark tags for keyword highlighting
- No preamble or meta-commentary
- End with the FAQ section
- Target word count: ${targetWordCount || 1200} words (±100)

BEGIN WRITING NOW.
`;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const startTime = Date.now();

      const fullPrompt = `${systemInstruction}\n\n${userPrompt}`;

      const result = await model.generateContent(fullPrompt);

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

      const wordCount = countWords(blogContent);

      if (wordCount < 1000) {
        logger.warn(`Blog post ${scenario.scenario_id} too short (${wordCount} words), retrying...`);
        attempts++;
        if (attempts >= maxAttempts) {
          logger.warn(`Accepting short blog post ${scenario.scenario_id} after ${maxAttempts} attempts (${wordCount} words)`);
          return blogContent;
        }
        continue;
      }

      logger.info(`Blog post ${scenario.scenario_id} generated: ${wordCount} words in ${generationTime}ms`);

      return blogContent;

    } catch (error) {
      attempts++;

      const isRateLimit = error.message && (
        error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('Too Many Requests')
      );

      if (attempts >= maxAttempts) {
        throw new Error(`Failed to generate blog post after ${maxAttempts} attempts: ${error.message}`);
      }

      logger.warn(`Blog generation attempt ${attempts}/${maxAttempts} failed for scenario ${scenario.scenario_id}: ${error.message}`);

      const backoffMs = isRateLimit ? 60000 : (1000 * Math.pow(2, attempts));
      logger.info(`Retrying in ${backoffMs / 1000}s...`);
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
      question: `What is the best way to ${goal.toLowerCase()}?`,
      answer: `The most effective approach involves a systematic strategy that addresses ${painPointPhrase}. Start by assessing your current situation, then implement proven methods step by step. ${solution} can accelerate this process by providing structured guidance and expert frameworks.`
    },
    {
      question: `How long does it take to see results?`,
      answer: `Most ${personaPhrase} begin seeing initial improvements within 2-4 weeks of consistent implementation. Significant, sustainable results typically emerge within 2-3 months. The timeline depends on your starting point and how consistently you apply the strategies.`
    },
    {
      question: `What are the most common mistakes to avoid?`,
      answer: `The biggest mistakes include trying to do everything at once, not tracking progress, and giving up too early. Focus on one strategy at a time, measure your results, and stay consistent for at least 90 days before evaluating effectiveness.`
    },
    {
      question: `Do I need special tools or resources to get started?`,
      answer: `You can begin with basic resources you likely already have. As you progress, ${solution} can provide additional tools and frameworks to optimize your results. The key is starting with what you have rather than waiting for perfect conditions.`
    },
    {
      question: `How does ${solution} compare to other approaches?`,
      answer: `${solution} differentiates itself by combining proven methodologies with personalized guidance. Unlike generic solutions, it addresses the specific challenges faced by ${personaPhrase} and provides actionable steps tailored to achieving ${goal.toLowerCase()}.`
    }
  ];

  const faqMarkdown = [
    '## Frequently Asked Questions',
    '',
    ...fallbackFaqItems.map((item) => `**Q: ${item.question}**\n\nA: ${item.answer}`)
  ].join('\n\n');

  return `${content.trim()}\n\n${faqMarkdown}`;
}

/**
 * Count words in text
 */
function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

export default executePhaseB;
