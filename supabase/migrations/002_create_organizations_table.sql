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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

