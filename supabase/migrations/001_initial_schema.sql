-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
-- Organizations table
-- This table stores organization information
CREATE TABLE organizations (
  organization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain_url TEXT NOT NULL,
  competitive_url TEXT[] DEFAULT '{}', -- Array of URLs
  description TEXT,
  industry TEXT,
  elevator_pitch TEXT,
  target_audience_description TEXT,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_organizations_domain_url ON organizations(domain_url);
CREATE INDEX idx_organizations_name ON organizations(name);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Users table
-- This table extends Supabase auth.users with additional organization and role information
-- The user_id references auth.users(id) from Supabase Auth
CREATE TABLE users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Member')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

-- Indexes for performance
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- KEYWORDS TABLE
-- ============================================================================
-- Keywords table
-- Stores keywords for each organization
CREATE TABLE keywords (
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}', -- Array of keyword strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id)
);

-- Index for performance
CREATE INDEX idx_keywords_organization_id ON keywords(organization_id);

-- ============================================================================
-- TOPICS TABLE
-- ============================================================================
-- Topics table
-- Stores topics for each organization
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Completed', 'pending')),
  slug TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Indexes for performance
CREATE INDEX idx_topics_organization_id ON topics(organization_id);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_organization_status ON topics(organization_id, status);
CREATE INDEX idx_topics_slug ON topics(slug);

-- ============================================================================
-- ARTICLES TABLE
-- ============================================================================
-- Articles table
-- Stores articles for each organization and topic
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  md_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_articles_organization_id ON articles(organization_id);
CREATE INDEX idx_articles_topic_id ON articles(topic_id);
CREATE INDEX idx_articles_organization_topic ON articles(organization_id, topic_id);

-- ============================================================================
-- UPDATE TRIGGER FUNCTIONS
-- ============================================================================
-- Function to update updated_at timestamp for organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for keywords
CREATE OR REPLACE FUNCTION update_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for topics
CREATE OR REPLACE FUNCTION update_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update updated_at timestamp for articles
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

CREATE TRIGGER update_keywords_updated_at BEFORE UPDATE ON keywords
  FOR EACH ROW EXECUTE FUNCTION update_keywords_updated_at();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_topics_updated_at();

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_articles_updated_at();

