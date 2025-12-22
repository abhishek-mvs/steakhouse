import { getOrganizationById } from "../../services/organizationService";
import { getDomainScrappersByOrganizationId, getScrappersByOrganizationId } from "../../services/scrapperService";
import { generateKeywords} from "../../agents/keywordsAgent";
import { getKeywordsByOrganizationId, upsertKeywords } from "../../services/keywordService";


export async function generateKeywordsForOrganization(organizationId: string): Promise<string[]> {
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
        throw new Error('Organization not found');
    }
    const domainScrappers = await getDomainScrappersByOrganizationId(organizationId);
    if (!domainScrappers) {
        throw new Error('Domain scrapers not found');
    }
    const scrapedContent = domainScrappers.map((scrapper) => scrapper.extracted_text).join('\n');
    const keywords = await generateKeywords({organization, scrapedContent});
    const result = await upsertKeywords(organizationId, keywords);
    if (!result) {
        throw new Error('Failed to upsert keywords');
    }
    return keywords;
}

export async function getKeywordsForOrganization(organizationId: string): Promise<string[]> {
    const keywords = await getKeywordsByOrganizationId(organizationId);

    return keywords?.keywords || [];
}