import { getOrganizationById, updateOrganizationSummary } from '../../services/organizationService';
import { getScrappersByOrganizationId } from '../../services/scrapperService';
import { generateCompanySummary } from '../../agents/summaryAgent';

/**
 * Generate company summary for an organization
 * Fetches organization details and scrapped content, then generates comprehensive summary
 * @param organizationId - Organization ID
 * @returns Company summary as a string
 */
export async function generateSummaryForOrganization(organizationId: string): Promise<string> {
  // Step 1: Get organization details
  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    throw new Error('Organization not found');
  }

  // Step 2: Get scrapped content
  const scrappers = await getScrappersByOrganizationId(organizationId);
  if (!scrappers || scrappers.length === 0) {
    throw new Error('Scrapped content not found. Please scrape organization URLs first.');
  }

  console.log('Generating summary for organization: ', organization.name);
  // Step 3: Generate summary using summary agent
  const summary = await generateCompanySummary({
    organization,
    scrappers,
  });
  console.log('Summary generated: ', summary);
  // Step 4: Update organization summary in database
  await updateOrganizationSummary(organizationId, summary);

  return summary;
}

