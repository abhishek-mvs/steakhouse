import { readFileSync } from 'fs';
import { join } from 'path';
import { Organization } from '../db_models/organization.js';
import { generateTextWithAI } from '../pkg/ai/gemini.js';
import { ensureUniqueSlug, generateSlug } from '../utils/commonUtils.js';

/**
 * Topic interface for generation (before saving to database)
 */
export interface GeneratedTopic {
  title: string;
  slug: string;
  summary?: string;
}

/**
 * Context for topic generation
 */
export interface TopicGenerationContext {
  organization: Organization;
  keywords: string[];
  scrapedContent: string;
  previousTopics: Array<{ title: string; slug: string }>;
}

/**
 * Generate topics for an organization
 * @param context - Topic generation context with organization, keywords, scraped content, and previous topics
 * @returns Array of generated topics
 */
export async function generateTopics(context: TopicGenerationContext): Promise<GeneratedTopic[]> {
  const { organization, keywords, scrapedContent, previousTopics } = context;

  // Build prompt
  const systemPrompt = loadTopicGenerationPrompt();
  const prompt = buildTopicPrompt({
    organization,
    keywords,
    scrapedContent,
    previousTopics,
  });

  let topics: GeneratedTopic[] = [];
  let response: string | undefined;

  try {
    // Generate topics using AI
    response = await generateTextWithAI({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4000,
    });

    if (!response || response.trim().length === 0) {
      throw new Error('AI returned empty response for topic generation');
    }

    // Parse topics from response
    topics = parseTopics(response);

    if (topics.length === 0) {
      throw new Error('No topics parsed from response');
    }
  } catch (error) {
    console.warn('⚠️ Topic generation/parsing failed, attempting recovery...');
    console.warn(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

    // Try to extract partial topics from response if available
    if (response && response.trim().length > 0) {
      try {
        const partialTopics = parseTopics(response, true); // Allow partial parsing
        if (partialTopics.length > 0) {
          console.log(`✓ Recovered ${partialTopics.length} topic(s) from partial response`);
          topics = partialTopics;
        } else {
          throw new Error('Could not recover any topics from partial response');
        }
      } catch (recoveryError) {
        // If recovery fails, try regenerating with a simpler prompt
        console.warn('⚠️ Recovery failed, attempting simplified regeneration...');
        try {
          topics = await regenerateTopicsWithSimplifiedPrompt({
            organization,
            keywords,
            previousTopics,
          });
        } catch (regenerationError) {
          throw new Error(
            `Topic generation failed and recovery attempts failed. ` +
            `Original error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Recovery error: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}. ` +
            `Regeneration error: ${regenerationError instanceof Error ? regenerationError.message : 'Unknown error'}`
          );
        }
      }
    } else {
      // No response at all, try simplified regeneration
      console.warn('⚠️ No response received, attempting simplified regeneration...');
      try {
        topics = await regenerateTopicsWithSimplifiedPrompt({
          organization,
          keywords,
          previousTopics,
        });
      } catch (regenerationError) {
        throw new Error(
          `Topic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Simplified regeneration also failed: ${regenerationError instanceof Error ? regenerationError.message : 'Unknown error'}`
        );
      }
    }
  }

  // Ensure unique slugs
  const topicsWithUniqueSlugs = topics.map((topic) => ({
    ...topic,
    slug: ensureUniqueSlug(topic.slug, previousTopics),
  }));

  // Return up to 3 topics
  return topicsWithUniqueSlugs.slice(0, 3);
}

/**
 * Load the topic generation prompt from finetune file
 */
function loadTopicGenerationPrompt(): string {
  try {
    const promptPath = join(process.cwd(), 'public/finetune/topic-generation-dx.md');
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    // Fallback to inline prompt if file not found
    return `You are an expert content strategist specializing in SEO and GEO (Generative Engine Optimization).
Your goal is to generate 3 unique, high-potential blog post topics for the given organization.

Guidelines:
1. Topics must be distinct from previously covered topics.
2. Topics should target specific user intents (Informational, Commercial).
3. Each topic must include a catchy, SEO-optimized title and a URL-friendly slug.
4. Topics should align with the organization's offerings and target audience.
5. Ensure topics are diverse and highly relevant.`;
  }
}

/**
 * Build the topic generation prompt
 */
function buildTopicPrompt(context: TopicGenerationContext): string {
  const { organization, keywords, scrapedContent, previousTopics } = context;

  const previousTopicsList = previousTopics.length > 0
    ? previousTopics.map((t, i) => `${i + 1}. ${t.title} (${t.slug})`).join('\n')
    : 'None';

  return `Generate 3 unique, high-potential blog post topics for the following organization:

Business Name: ${organization.name}
Industry: ${organization.industry ?? 'Not specified'}
Description: ${organization.description ?? 'Not provided'}
Target Audience: ${organization.target_audience_description ?? 'Not specified'}

${scrapedContent ? `Website Content Summary:\n${scrapedContent.substring(0, 1500)}\n` : ''}

Relevant Keywords (sample):
${keywords.slice(0, 30).join(', ')}

Previously Covered Topics (avoid duplicates):
${previousTopicsList}

Requirements:
1. Generate EXACTLY 3 topics
2. Each topic must have:
   - A catchy, SEO-optimized title
   - A URL-friendly slug (lowercase, hyphens, no special chars)
   - An optional brief summary (1-2 sentences)
3. Topics should target specific user intents (Informational, Commercial)
4. Topics must be distinct from previously covered topics
5. Topics should align with the organization's offerings and target audience
6. Ensure topics are diverse and highly relevant

CRITICAL FORMATTING REQUIREMENTS:
1. You MUST respond with ONLY a valid JSON array
2. Do NOT wrap the response in markdown code blocks (no code fences)
3. Do NOT include any explanations, comments, or other text
4. Start directly with [ and end with ]
5. The response must be parseable as raw JSON

Example format (this is what your response should look like - no markdown, no code blocks):
[
  {
    "title": "Topic Title Here",
    "slug": "topic-slug-here",
    "summary": "Brief summary of the topic"
  },
  {
    "title": "Another Topic Title",
    "slug": "another-topic-slug",
    "summary": "Another brief summary"
  },
  {
    "title": "Third Topic Title",
    "slug": "third-topic-slug",
    "summary": "Third brief summary"
  }
]

IMPORTANT: Return ONLY the raw JSON array. Do not use markdown code blocks. Start with [ and end with ].`;
}

/**
 * Parse topics from AI response
 */
function parseTopics(response: string, allowPartial: boolean = false): GeneratedTopic[] {
  const topics: GeneratedTopic[] = [];

  // Clean the response - remove markdown code blocks if present
  let cleanedResponse = response.trim();

  // Remove markdown code blocks more aggressively
  cleanedResponse = cleanedResponse.replace(/^```(?:json|typescript)?\n?/i, '');
  cleanedResponse = cleanedResponse.replace(/\n?```\s*$/m, '');
  cleanedResponse = cleanedResponse.replace(/```[a-z]*\n?/gi, '');
  cleanedResponse = cleanedResponse.trim();

  // Try to parse as JSON first
  try {
    // Look for JSON array in the response - handle incomplete arrays
    let jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);

    // If no complete array found, try to extract partial array
    if (!jsonMatch) {
      const partialMatch = cleanedResponse.match(/\[[\s\S]*$/);
      if (partialMatch) {
        // Try to complete the partial JSON
        let partialJson = partialMatch[0];

        // Count open brackets and braces
        let bracketCount = (partialJson.match(/\[/g) || []).length - (partialJson.match(/\]/g) || []).length;
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = 0; i < partialJson.length; i++) {
          const char = partialJson[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }
        }

        // Close incomplete strings first
        if (inString) {
          partialJson += '"';
        }

        // Close incomplete structures
        if (braceCount > 0) {
          partialJson += '}'.repeat(braceCount);
        }
        if (bracketCount > 0) {
          partialJson += ']'.repeat(bracketCount);
        } else if (braceCount === 0 && !partialJson.endsWith(']')) {
          partialJson += ']';
        }

        jsonMatch = [partialJson];
      }
    }

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedTopic[] | GeneratedTopic;
        const topicsArray = Array.isArray(parsed) ? parsed : [parsed];

        if (topicsArray.length > 0 && topicsArray[0] && typeof topicsArray[0] === 'object') {
          const validTopics = topicsArray
            .filter((t): t is GeneratedTopic => t !== null && typeof t === 'object' && 'title' in t)
            .map((t) => ({
              title: String(t.title || ''),
              slug: t.slug ? String(t.slug) : generateSlug(String(t.title || '')),
              summary: t.summary ? String(t.summary) : undefined,
            }))
            .filter((t) => t.title.length > 0);

          if (validTopics.length > 0) {
            return validTopics;
          }
        }
      } catch (parseError) {
        // If parsing fails, try to extract individual objects
        const objectMatches = jsonMatch[0].match(/\{[^{}]*"title"[^{}]*\}/g) ||
          jsonMatch[0].match(/\{[^}]*"title"[^}]*/g);
        if (objectMatches && objectMatches.length > 0) {
          const extractedTopics: GeneratedTopic[] = [];
          for (const objStr of objectMatches) {
            try {
              // Try to complete the object if it's incomplete
              let completeObj = objStr;
              if (!completeObj.endsWith('}')) {
                // Count braces
                const openBraces = (completeObj.match(/\{/g) || []).length;
                const closeBraces = (completeObj.match(/\}/g) || []).length;
                const needed = openBraces - closeBraces;
                if (needed > 0) {
                  completeObj += '}'.repeat(needed);
                } else if (!completeObj.includes('}')) {
                  completeObj += '}';
                }
              }

              const obj = JSON.parse(completeObj) as Partial<GeneratedTopic>;
              if (obj.title && typeof obj.title === 'string' && obj.title.trim().length > 0) {
                extractedTopics.push({
                  title: String(obj.title).trim(),
                  slug: obj.slug && typeof obj.slug === 'string' ? String(obj.slug).trim() : generateSlug(String(obj.title).trim()),
                  summary: obj.summary && typeof obj.summary === 'string' ? String(obj.summary).trim() : undefined,
                });
              }
            } catch {
              // Skip invalid objects, try regex extraction as last resort
              const titleMatch = objStr.match(/"title"\s*:\s*"([^"]+)"/);
              if (titleMatch && titleMatch[1]) {
                extractedTopics.push({
                  title: titleMatch[1],
                  slug: generateSlug(titleMatch[1]),
                });
              }
            }
          }
          if (extractedTopics.length > 0) {
            return extractedTopics;
          }
        }
        // If allowPartial is false, throw the error; otherwise continue to text parsing
        if (!allowPartial) {
          throw parseError;
        }
      }
    }
  } catch (error) {
    // JSON parsing failed, continue to text parsing
    if (!allowPartial) {
      console.warn('JSON parsing failed, trying text parsing:', error);
    }
  }

  // Fallback: parse from text format
  const lines = cleanedResponse.split('\n').filter((line) => line.trim());
  let currentTopic: Partial<GeneratedTopic> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and markdown headers
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Try to match numbered list items (1., 2., etc.)
    const numberedMatch = trimmed.match(/^\d+[.)]\s*(.+)/);
    if (numberedMatch) {
      // Save previous topic if exists
      if (currentTopic.title) {
        topics.push({
          title: currentTopic.title,
          slug: currentTopic.slug || generateSlug(currentTopic.title),
          summary: currentTopic.summary,
        });
      }
      // Start new topic - assume the text after number is the title
      currentTopic = { title: numberedMatch[1]!.trim() };
      continue;
    }

    // Try to match JSON-like object patterns
    const jsonObjectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        const obj = JSON.parse(jsonObjectMatch[0]) as Partial<GeneratedTopic>;
        if (obj.title) {
          topics.push({
            title: String(obj.title),
            slug: obj.slug ? String(obj.slug) : generateSlug(String(obj.title)),
            summary: obj.summary ? String(obj.summary) : undefined,
          });
        }
      } catch {
        // Ignore JSON parse errors for individual objects
      }
      continue;
    }

    // Match field patterns
    if (trimmed.match(/^title\s*[:=]\s*/i)) {
      currentTopic.title = trimmed.replace(/^title\s*[:=]\s*/i, '').trim();
    } else if (trimmed.match(/^slug\s*[:=]\s*/i)) {
      currentTopic.slug = trimmed.replace(/^slug\s*[:=]\s*/i, '').trim();
    } else if (trimmed.match(/^summary\s*[:=]\s*/i)) {
      currentTopic.summary = trimmed.replace(/^summary\s*[:=]\s*/i, '').trim();
    } else if (currentTopic.title && trimmed.length > 10) {
      // If we have a title and this line looks like content, treat it as summary
      if (!currentTopic.summary) {
        currentTopic.summary = trimmed;
      }
    }
  }

  // Don't forget the last topic
  if (currentTopic.title) {
    topics.push({
      title: currentTopic.title,
      slug: currentTopic.slug || generateSlug(currentTopic.title),
      summary: currentTopic.summary,
    });
  }

  // If we still have no topics, try extracting from any text that looks like a topic title
  if (topics.length === 0) {
    const titlePatterns = [
      /(?:^|\n)\d+[.)]\s*([^\n]+)/g,
      /(?:^|\n)[•-]\s*([^\n]+)/g,
      /(?:^|\n)([A-Z][^\n]{20,100})/g,
    ];

    for (const pattern of titlePatterns) {
      const matches = [...cleanedResponse.matchAll(pattern)];
      if (matches.length >= 3) {
        return matches.slice(0, 3).map((match) => ({
          title: match[1]!.trim(),
          slug: generateSlug(match[1]!.trim()),
        }));
      }
    }
  }

  return topics;
}

/**
 * Regenerate topics with a simplified prompt (fallback)
 */
async function regenerateTopicsWithSimplifiedPrompt(context: {
  organization: Organization;
  keywords: string[];
  previousTopics: Array<{ title: string; slug: string }>;
}): Promise<GeneratedTopic[]> {
  const { organization, keywords, previousTopics } = context;

  const previousTopicsList = previousTopics.length > 0
    ? previousTopics.slice(0, 10).map((t) => t.title).join(', ')
    : 'None';

  const simplifiedPrompt = `Generate 3 blog topics for ${organization.name}.

Keywords: ${keywords.slice(0, 20).join(', ')}

Previous topics (avoid): ${previousTopicsList}

Return ONLY a JSON array with this exact format:
[
  {"title": "Topic 1", "slug": "topic-1"},
  {"title": "Topic 2", "slug": "topic-2"},
  {"title": "Topic 3", "slug": "topic-3"}
]

No markdown, no code blocks, just the JSON array.`;

  try {
    const response = await generateTextWithAI({
      prompt: simplifiedPrompt,
      systemPrompt: 'You are a content strategist. Generate exactly 3 blog topics as a JSON array. Return ONLY the JSON array, no other text.',
      temperature: 0.7,
      maxTokens: 1000,
    });

    if (!response || response.trim().length === 0) {
      throw new Error('Simplified regeneration returned empty response');
    }

    const topics = parseTopics(response, true);
    if (topics.length === 0) {
      throw new Error('Could not parse topics from simplified response');
    }

    return topics;
  } catch (error) {
    throw new Error(`Simplified topic regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
