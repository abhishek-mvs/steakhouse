import { ScrapeResult } from "../schemas/scrapper.js";
import https from 'https';
import http from 'http';
import * as cheerio from 'cheerio';

/**
 * Scrape a single URL and extract text content
 * @param url - The URL to scrape
 * @returns A ScrapeResult object containing the raw HTML, extracted text, and URL
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      
      // Set environment variable to disable TLS rejection globally for this request
      // This is a workaround for Bun's https module behavior
      const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      
      try {
        // Temporarily disable TLS verification
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        
        // Create HTTPS agent that accepts all certificates
        const agent = isHttps ? new https.Agent({
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
        }) : undefined;
  
        let html = '';
        let usedRelaxedTls = isHttps;
  
        // Use Node's http/https module directly
        html = await new Promise<string>((resolve, reject) => {
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Connection': 'keep-alive',
              Host: urlObj.hostname + (urlObj.port ? `:${urlObj.port}` : ''),
            },
            ...(agent && { agent }),
            timeout: 30000,
          };
  
          const requestModule = isHttps ? https : http;
          
          const req = requestModule.request(options, (res) => {
            let data: Buffer[] = [];
  
            // Handle redirects
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const redirectUrl = res.headers.location.startsWith('http')
                ? res.headers.location
                : `${urlObj.protocol}//${urlObj.hostname}${res.headers.location}`;
              return resolve(scrapeUrl(redirectUrl).then((r) => r.rawHtml));
            }
  
            // Check for successful response
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`)
              );
            }
  
            res.on('data', (chunk: Buffer) => {
              data.push(chunk);
            });
  
            res.on('end', () => {
              const buffer = Buffer.concat(data);
              resolve(buffer.toString('utf-8'));
            });
          });
  
          req.on('error', (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('ERR_TLS_CERT') || errorMessage.includes('certificate')) {
              reject(
                new Error(
                  `TLS certificate error for ${url}: ${errorMessage}. ` +
                  `The site's certificate doesn't match the domain.`
                )
              );
            } else {
              reject(error);
            }
          });
  
          req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
  
          req.end();
        });
  
        // Restore original TLS setting
        if (originalTlsReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
  
        // Parse HTML with Cheerio
        const $ = cheerio.load(html);
  
        // Remove script and style elements
        $('script, style, noscript').remove();
  
        // Extract text content
        const extractedText = $('body')
          .text()
          .replace(/\s+/g, ' ')
          .trim();
  
        if (usedRelaxedTls) {
          console.warn(
            `Scraped ${url} with relaxed TLS verification (certificate issues detected)`
          );
        }
  
        return {
          url,
          rawHtml: html,
          extractedText,
        };
      } catch (innerError) {
        // Restore original TLS setting before rethrowing
        if (originalTlsReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
        throw innerError;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
  
      // Provide more helpful error messages
      if (errorMessage.includes('ERR_TLS_CERT') || errorMessage.includes('certificate')) {
        throw new Error(
          `Scraping failed for ${url}: SSL/TLS certificate validation error. ` +
          `The website's certificate doesn't match the domain or is invalid. ` +
          `This may indicate a misconfigured website. Original error: ${errorMessage}`
        );
      }
  
      if (errorMessage.includes('timeout')) {
        throw new Error(`Scraping failed for ${url}: Request timeout. The website may be slow or unresponsive.`);
      }
  
      throw new Error(`Scraping failed for ${url}: ${errorMessage}`);
    }
  }