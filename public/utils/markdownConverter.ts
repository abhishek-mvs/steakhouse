/**
 * BlogContent type for article generation
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
  content: string;
};

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
 * Escape special characters in YAML strings
 */
function escapeYamlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r');  // Escape carriage returns
}

