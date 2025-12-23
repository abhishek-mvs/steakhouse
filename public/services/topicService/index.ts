import { getSupabaseAdminClient } from "../../pkg/db/supabaseClient.js";
import { Topic } from "../../db_models/topic.js";

/**
 * Get topics for an organization
 * @param organizationId - Organization ID
 * @param status - Optional status filter ('Completed' | 'pending')
 * @returns Array of topics for the organization
 */
export async function getTopicsByOrganizationId(
  organizationId: string,
  status?: 'Completed' | 'pending'
): Promise<Topic[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from('topics')
    .select('*')
    .eq('organization_id', organizationId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: topics, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch topics');
  }

  return topics || [];
}

/**
 * Upsert a topic for an organization
 * Creates a new topic if it doesn't exist, or updates existing topic
 * Uses the unique constraint on (organization_id, slug)
 * @param organizationId - Organization ID
 * @param topicName - Topic name
 * @param slug - Topic slug (unique per organization)
 * @param status - Topic status (defaults to 'pending')
 * @param summary - Topic summary (optional)
 * @returns Created or updated topic
 */
export async function upsertTopic(
  organizationId: string,
  topicName: string,
  slug: string,
  status: 'Completed' | 'pending' = 'pending',
  summary?: string | null
): Promise<Topic> {
  const supabase = getSupabaseAdminClient();

  // Check if topic exists with same slug for this organization
  const { data: existingTopic } = await supabase
    .from('topics')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .single();

  if (existingTopic) {
    // Update existing topic
    const { data: topic, error } = await supabase
      .from('topics')
      .update({
        topic_name: topicName,
        status,
        summary: summary || null,
      })
      .eq('id', existingTopic.id)
      .select()
      .single();

    if (error || !topic) {
      throw new Error(error?.message || 'Failed to update topic');
    }

    return topic;
  } else {
    // Create new topic
    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        organization_id: organizationId,
        topic_name: topicName,
        slug,
        status,
        summary: summary || null,
      })
      .select()
      .single();

    if (error || !topic) {
      throw new Error(error?.message || 'Failed to create topic');
    }

    return topic;
  }
}

