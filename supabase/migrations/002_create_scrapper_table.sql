-- Scrapper table
-- Stores scrapped website data for organizations
CREATE TABLE scrapper (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  self BOOLEAN NOT NULL DEFAULT false,
  url TEXT NOT NULL,
  html TEXT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, url)
);

-- Indexes for performance
CREATE INDEX idx_scrapper_organization_id ON scrapper(organization_id);
CREATE INDEX idx_scrapper_self ON scrapper(self);
CREATE INDEX idx_scrapper_organization_self ON scrapper(organization_id, self);
CREATE INDEX idx_scrapper_url ON scrapper(url);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scrapper_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_scrapper_updated_at BEFORE UPDATE ON scrapper
  FOR EACH ROW EXECUTE FUNCTION update_scrapper_updated_at();

