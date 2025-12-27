import { ContentSource } from '../../types/contentTypes.js';
import { loadBlogPrompt } from './blogPromptLoader.js';
import { loadLinkedInPrompt } from './linkedinPromptLoader.js';
import { loadTwitterPrompt } from './twitterPromptLoader.js';
import { loadRedditPrompt } from './redditPromptLoader.js';

/**
 * Factory function to load the appropriate prompt based on content source
 */
export function loadPrompt(source: ContentSource): string {
  switch (source) {
    case 'blog':
      return loadBlogPrompt();
    case 'linkedin':
      return loadLinkedInPrompt();
    case 'twitter':
      return loadTwitterPrompt();
    case 'reddit':
      return loadRedditPrompt();
    default:
      throw new Error(`Unsupported content source: ${source}`);
  }
}

