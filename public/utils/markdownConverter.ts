import { BlogContent, LinkedInPostContent, TwitterPostContent, RedditPostContent, ContentSource, PlatformContent } from '../types/contentTypes.js';

/**
 * Convert BlogContent to markdown format with frontmatter
 */
export function blogContentToMarkdown(blogContent: BlogContent): string {
  const frontmatter: string[] = [];
  
  // Add required fields
  frontmatter.push(`title: "${escapeYamlString(blogContent.title)}"`);
  frontmatter.push(`description: "${escapeYamlString(blogContent.description)}"`);
  frontmatter.push(`slug: "${blogContent.slug}"`);
  frontmatter.push(`publishedAt: "${blogContent.publishedAt}"`);
  frontmatter.push(`updatedAt: "${blogContent.updatedAt}"`);
  
  // Add author (nested object)
  frontmatter.push(`author:`);
  frontmatter.push(`  name: "${escapeYamlString(blogContent.author.name)}"`);
  frontmatter.push(`  url: "${blogContent.author.url}"`);
  
  // Add tags (array)
  frontmatter.push(`tags:`);
  blogContent.tags.forEach(tag => {
    frontmatter.push(`  - "${escapeYamlString(tag)}"`);
  });
  
  // Add optional ogImage
  if (blogContent.ogImage) {
    frontmatter.push(`ogImage: "${blogContent.ogImage}"`);
  }
  
  // Add FAQ (array of objects)
  frontmatter.push(`faq:`);
  blogContent.faq.forEach(item => {
    frontmatter.push(`  - question: "${escapeYamlString(item.question)}"`);
    frontmatter.push(`    answer: "${escapeYamlString(item.answer)}"`);
  });
  
  // Combine frontmatter and content (with blank lines between fields)
  return `---\n\n${frontmatter.join('\n\n')}\n\n---\n\n${blogContent.content}`;
}

/**
 * Convert LinkedInPostContent to markdown format
 */
export function linkedinContentToMarkdown(linkedinContent: LinkedInPostContent): string {
  const frontmatter: string[] = [];
  
  frontmatter.push(`title: "${escapeYamlString(linkedinContent.title)}"`);
  if (linkedinContent.description) {
    frontmatter.push(`description: "${escapeYamlString(linkedinContent.description)}"`);
  }
  frontmatter.push(`publishedAt: "${linkedinContent.publishedAt}"`);
  frontmatter.push(`updatedAt: "${linkedinContent.updatedAt}"`);
  frontmatter.push(`author:`);
  frontmatter.push(`  name: "${escapeYamlString(linkedinContent.author.name)}"`);
  frontmatter.push(`  url: "${linkedinContent.author.url}"`);
  
  if (linkedinContent.tags && linkedinContent.tags.length > 0) {
    frontmatter.push(`tags:`);
    linkedinContent.tags.forEach(tag => {
      frontmatter.push(`  - "${escapeYamlString(tag)}"`);
    });
  }
  
  frontmatter.push(`hashtags:`);
  linkedinContent.hashtags.forEach(hashtag => {
    frontmatter.push(`  - "${escapeYamlString(hashtag)}"`);
  });
  
  if (linkedinContent.callToAction) {
    frontmatter.push(`callToAction: "${escapeYamlString(linkedinContent.callToAction)}"`);
  }
  
  return `---\n\n${frontmatter.join('\n\n')}\n\n---\n\n${linkedinContent.content}`;
}

/**
 * Convert TwitterPostContent to markdown format
 */
export function twitterContentToMarkdown(twitterContent: TwitterPostContent): string {
  const frontmatter: string[] = [];
  
  if (twitterContent.title) {
    frontmatter.push(`title: "${escapeYamlString(twitterContent.title)}"`);
  }
  if (twitterContent.description) {
    frontmatter.push(`description: "${escapeYamlString(twitterContent.description)}"`);
  }
  frontmatter.push(`publishedAt: "${twitterContent.publishedAt}"`);
  frontmatter.push(`updatedAt: "${twitterContent.updatedAt}"`);
  frontmatter.push(`author:`);
  frontmatter.push(`  name: "${escapeYamlString(twitterContent.author.name)}"`);
  frontmatter.push(`  url: "${twitterContent.author.url}"`);
  
  if (twitterContent.tags && twitterContent.tags.length > 0) {
    frontmatter.push(`tags:`);
    twitterContent.tags.forEach(tag => {
      frontmatter.push(`  - "${escapeYamlString(tag)}"`);
    });
  }
  
  frontmatter.push(`isThread: ${twitterContent.isThread}`);
  frontmatter.push(`hashtags:`);
  twitterContent.hashtags.forEach(hashtag => {
    frontmatter.push(`  - "${escapeYamlString(hashtag)}"`);
  });
  
  if (twitterContent.threadTweets && twitterContent.threadTweets.length > 0) {
    frontmatter.push(`threadTweets:`);
    twitterContent.threadTweets.forEach(tweet => {
      frontmatter.push(`  - "${escapeYamlString(tweet)}"`);
    });
  }
  
  return `---\n\n${frontmatter.join('\n\n')}\n\n---\n\n${twitterContent.content}`;
}

/**
 * Convert RedditPostContent to markdown format
 */
export function redditContentToMarkdown(redditContent: RedditPostContent): string {
  const frontmatter: string[] = [];
  
  frontmatter.push(`title: "${escapeYamlString(redditContent.title)}"`);
  if (redditContent.description) {
    frontmatter.push(`description: "${escapeYamlString(redditContent.description)}"`);
  }
  frontmatter.push(`publishedAt: "${redditContent.publishedAt}"`);
  frontmatter.push(`updatedAt: "${redditContent.updatedAt}"`);
  frontmatter.push(`author:`);
  frontmatter.push(`  name: "${escapeYamlString(redditContent.author.name)}"`);
  frontmatter.push(`  url: "${redditContent.author.url}"`);
  
  if (redditContent.tags && redditContent.tags.length > 0) {
    frontmatter.push(`tags:`);
    redditContent.tags.forEach(tag => {
      frontmatter.push(`  - "${escapeYamlString(tag)}"`);
    });
  }
  
  if (redditContent.subreddit) {
    frontmatter.push(`subreddit: "${escapeYamlString(redditContent.subreddit)}"`);
  }
  
  if (redditContent.comments && redditContent.comments.length > 0) {
    frontmatter.push(`comments:`);
    redditContent.comments.forEach(comment => {
      frontmatter.push(`  - question: "${escapeYamlString(comment.question)}"`);
      frontmatter.push(`    answer: "${escapeYamlString(comment.answer)}"`);
    });
  }
  
  return `---\n\n${frontmatter.join('\n\n')}\n\n---\n\n${redditContent.content}`;
}

/**
 * Factory function to convert platform content to markdown based on source
 */
export function contentToMarkdown(source: ContentSource, content: PlatformContent): string {
  switch (source) {
    case 'blog':
      return blogContentToMarkdown(content as BlogContent);
    case 'linkedin':
      return linkedinContentToMarkdown(content as LinkedInPostContent);
    case 'twitter':
      return twitterContentToMarkdown(content as TwitterPostContent);
    case 'reddit':
      return redditContentToMarkdown(content as RedditPostContent);
    default:
      throw new Error(`Unsupported content source: ${source}`);
  }
}

/**
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r');  // Escape carriage returns
}

