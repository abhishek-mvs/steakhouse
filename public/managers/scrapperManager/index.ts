import { getOrganizationById } from '../../services/organizationService/index.js';
import { getScrapperByUrl, upsertScrapper } from '../../services/scrapperService/index.js';
import { scrapeUrl } from '../../utils/scrapper.js';

/**
 * Scrape organization URLs and save to scrapper table
 * Fetches domain_url and competitive_urls from organization, checks if they exist in scrapper table,
 * and scrapes any missing URLs
 * @param organizationId - Organization ID
 * @returns Array of scraped URLs
 */
export async function scrapeOrganizationUrls(organizationId: string): Promise<string[]> {
  // Step 1: Get organization details
  const organization = await getOrganizationById(organizationId);
  
  if (!organization) {
    throw new Error('Organization not found');
  }

  // Step 2: Collect all URLs to scrape
  const urlsToScrape: Array<{ url: string; self: boolean }> = [];

  // Add domain_url (self = true)
  if (organization.domain_url) {
    urlsToScrape.push({ url: organization.domain_url, self: true });
  }

  // Add competitive_urls (self = false)
  if (organization.competitive_url && organization.competitive_url.length > 0) {
    for (const competitiveUrl of organization.competitive_url) {
      if (competitiveUrl) {
        urlsToScrape.push({ url: competitiveUrl, self: false });
      }
    }
  }

  if (urlsToScrape.length === 0) {
    return [];
  }

  // Step 3: Process each URL
  const scrapedUrls: string[] = [];

  for (const { url, self } of urlsToScrape) {
    try {
      // Check if URL already exists in scrapper table
      const existingScrapper = await getScrapperByUrl(organizationId, url);

      if (existingScrapper) {
        // URL already scraped, skip
        console.log(`URL ${url} already exists in scrapper table, skipping...`);
        scrapedUrls.push(url);
        continue;
      }

      // Scrape the URL
      console.log(`Scraping URL: ${url} (self: ${self})...`);
      const scrapeResult = await scrapeUrl(url);

      // Save to scrapper table using upsert (in case of race condition)
      await upsertScrapper(
        organizationId,
        scrapeResult.url,
        self,
        scrapeResult.rawHtml,
        scrapeResult.extractedText
      );

      scrapedUrls.push(scrapeResult.url);
      console.log(`Successfully scraped and saved: ${url}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to scrape URL ${url}: ${errorMessage}`);
      // Continue with other URLs even if one fails
      // You might want to track failures separately if needed
    }
  }

  return scrapedUrls;
}

