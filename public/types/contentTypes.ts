/**
 * Content source/platform types
 */
export type ContentSource = 'blog' | 'linkedin' | 'twitter' | 'reddit';

/**
 * Base content interface shared across platforms
 */
export interface BaseContent {
  title: string;
  description?: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags?: string[];
}

/**
 * Blog content type (existing structure)
 */
export type BlogContent = {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags: string[];
  ogImage?: string;
  faq: {
    question: string;
    answer: string;
  }[];
  content: string; // Article body markdown
};

/**
 * LinkedIn post content type
 */
export type LinkedInPostContent = {
  title: string; // Post headline/hook
  description?: string; // Optional subtitle
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags?: string[]; // Hashtags
  content: string; // Main post content (max ~3000 chars)
  callToAction?: string; // Optional CTA text
  hashtags: string[]; // LinkedIn hashtags (3-5 recommended)
};

/**
 * Twitter/X post content type
 */
export type TwitterPostContent = {
  title?: string; // Optional title for context
  description?: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags?: string[];
  content: string; // Main tweet content (280 chars max for single tweet)
  isThread: boolean; // Whether this is a thread
  threadTweets?: string[]; // Additional tweets if thread (each max 280 chars)
  hashtags: string[]; // Twitter hashtags (1-3 recommended)
};

/**
 * Reddit post content type
 */
export type RedditPostContent = {
  title: string; // Reddit post title
  description?: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
  tags?: string[]; // Flair/tags
  content: string; // Main post body
  subreddit?: string; // Target subreddit
  comments?: Array<{
    question: string;
    answer: string;
  }>; // Anticipated Q&A comments
};

/**
 * Union type for all platform content
 */
export type PlatformContent = BlogContent | LinkedInPostContent | TwitterPostContent | RedditPostContent;

/**
 * Platform-specific settings
 */
export interface BlogSettings {
  min_article_length?: number;
  faq_count?: number;
  faq_answer_length?: number;
}

export interface LinkedInSettings {
  max_characters?: number; // Default ~3000
  hashtag_count?: number; // Default 3-5
  include_cta?: boolean; // Default true
}

export interface TwitterSettings {
  max_characters?: number; // Default 280
  thread_count?: number; // Default 1 (single tweet)
  hashtag_count?: number; // Default 1-3
}

export interface RedditSettings {
  max_post_length?: number; // Default ~4000
  include_comments?: boolean; // Default false
  comment_count?: number; // Default 0
}

/**
 * Union type for platform-specific settings
 */
export type PlatformSettings = BlogSettings | LinkedInSettings | TwitterSettings | RedditSettings;

/**
 * Generic article settings that can be platform-specific
 */
export interface ArticleSettings {
  // Blog settings
  min_article_length?: number;
  faq_count?: number;
  faq_answer_length?: number;
  
  // LinkedIn settings
  max_characters?: number;
  hashtag_count?: number;
  include_cta?: boolean;
  
  // Twitter settings
  thread_count?: number;
  
  // Reddit settings
  max_post_length?: number;
  include_comments?: boolean;
  comment_count?: number;
}

