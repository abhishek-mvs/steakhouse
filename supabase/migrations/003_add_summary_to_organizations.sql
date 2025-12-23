-- ============================================================================
-- ADD SUMMARY COLUMN TO ORGANIZATIONS TABLE
-- ============================================================================
-- Add summary column to organizations table
-- This column stores the AI-generated company summary

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS summary TEXT;


