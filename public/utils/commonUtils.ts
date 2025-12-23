/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
  


export function ensureUniqueSlug(
    slug: string,
    previousTopics: Array<{ slug: string }>
  ): string {
    const baseSlug = slug.toLowerCase().trim();
    const existingSlugs = new Set(previousTopics.map((t) => t.slug));
  
    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }
  
    // Append number if duplicate
    let counter = 1;
    let uniqueSlug = `${baseSlug}-${counter}`;
    while (existingSlugs.has(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
  
    return uniqueSlug;
  }