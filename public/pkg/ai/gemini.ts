import { google } from '@ai-sdk/google';
import { generateText } from 'ai';


// Lazy load env to avoid validation errors at module load time
let googleApiKeySet = false;

function ensureGoogleApiKey() {
  if (!googleApiKeySet) {
    // Set the API key in environment for @ai-sdk/google
    // The library looks for GOOGLE_GENERATIVE_AI_API_KEY by default
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
    }
    googleApiKeySet = true;
  }
}

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generateTextWithAI(options: GenerateTextOptions): Promise<string> {
  // Ensure API key is set before making requests
  ensureGoogleApiKey();
  
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 8000 } = options;

  try {
    // Ensure maxTokens doesn't exceed Gemini 2.5 Flash's limit
    const safeMaxTokens = Math.min(maxTokens, 8192);
    
    const result = await generateText({
      model: google('gemini-2.5-pro'),
      prompt,
      system: systemPrompt,
      temperature,
      maxTokens: safeMaxTokens,
    });

    if (!result.text || result.text.trim().length === 0) {
      throw new Error(
        `AI returned empty response. The model may have hit the token limit (${safeMaxTokens} tokens). ` +
        `Consider reducing article length requirements or using a model with higher token limits.`
      );
    }

    return result.text;
  } catch (error) {
    // Provide more helpful error messages
    if (error instanceof Error) {
      const errorMessage = error.message || '';
      const errorName = error.name || '';
      
      // Check for MAX_TOKENS finish reason or empty response
      if (errorMessage.includes('MAX_TOKENS') || 
          errorMessage.includes('token') || 
          errorMessage.includes('parts') ||
          errorName.includes('TypeValidation') ||
          errorName.includes('APICall')) {
        throw new Error(
          `AI generation hit token limit (maxTokens: ${Math.min(maxTokens, 8192)}). ` +
          `Gemini 2.5 Flash has a limit of 8192 output tokens. ` +
          `Consider: 1) Reducing article length requirements, 2) Using gemini-1.5-pro for longer articles, or 3) Splitting content generation. ` +
          `Original error: ${errorMessage || errorName}`
        );
      }
      
      if (errorMessage.includes('validation') || errorMessage.includes('Invalid JSON')) {
        throw new Error(
          `AI returned invalid response format. This may indicate the model hit token limits or returned an incomplete response. ` +
          `Try reducing maxTokens or article length requirements. ` +
          `Original error: ${errorMessage}`
        );
      }
    }
    throw error;
  }
}

export { google };

