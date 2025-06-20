/*
  # Create advanced security tables for enhanced document delivery
  
  1. New Tables
    - `secure_download_sessions` - Multi-factor authentication sessions
    - `session_documents` - Documents associated with MFA sessions
    - `blockchain_download_sessions` - Blockchain-verified downloads
    - `progressive_download_sessions` - Progressive unlock system
    - `progressive_unlocks` - Stage-based unlock schedule
    - `customer_portals` - Secure customer portal accounts
    - `portal_documents` - Documents in customer portals
    - `qr_download_sessions` - QR code-based access
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each access method
    - Add indexes for performance
*/

-- Multi-Factor Authentication Sessions
CREATE TABLE IF NOT EXISTS secure_download_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  recipient_email text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  max_downloads integer DEFAULT 3,
  download_count integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  device_fingerprint text,
  allowed_ip_addresses text[],
  download_window_start integer DEFAULT 9,
  download_window_end integer DEFAULT 18,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session Documents
CREATE TABLE IF NOT EXISTS session_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES secure_download_sessions(id) ON DELETE CASCADE,
  document_id uuid REFERENCES project_documents(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_category text NOT NULL,
  review_stage text NOT NULL,
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Blockchain Download Sessions
CREATE TABLE IF NOT EXISTS blockchain_download_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  blockchain_tx_id text UNIQUE NOT NULL,
  proof_of_delivery text NOT NULL,
  document_hashes text[] NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Progressive Download Sessions
CREATE TABLE IF NOT EXISTS progressive_download_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  recipient_email text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Progressive Unlocks
CREATE TABLE IF NOT EXISTS progressive_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES progressive_download_sessions(id) ON DELETE CASCADE,
  review_stage text NOT NULL,
  unlock_time timestamptz NOT NULL,
  documents jsonb NOT NULL,
  is_unlocked boolean DEFAULT false,
  unlocked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Customer Portals
CREATE TABLE IF NOT EXISTS customer_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  temporary_password text NOT NULL,
  password_changed boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  last_login timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Portal Documents
CREATE TABLE IF NOT EXISTS portal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id uuid REFERENCES customer_portals(id) ON DELETE CASCADE,
  document_id uuid REFERENCES project_documents(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text NOT NULL,
  document_category text NOT NULL,
  review_stage text NOT NULL,
  download_count integer DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- QR Download Sessions
CREATE TABLE IF NOT EXISTS qr_download_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_token text UNIQUE NOT NULL,
  recipient_email text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  documents jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  is_scanned boolean DEFAULT false,
  scanned_at timestamptz,
  device_info jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_sessions_token ON secure_download_sessions(token);
CREATE INDEX IF NOT EXISTS idx_secure_sessions_email ON secure_download_sessions(recipient_email);
CREATE INDEX IF NOT EXISTS idx_secure_sessions_expires ON secure_download_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_documents_session ON session_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_sessions_tx ON blockchain_download_sessions(blockchain_tx_id);
CREATE INDEX IF NOT EXISTS idx_progressive_sessions_token ON progressive_download_sessions(token);
CREATE INDEX IF NOT EXISTS idx_progressive_unlocks_session ON progressive_unlocks(session_id);
CREATE INDEX IF NOT EXISTS idx_progressive_unlocks_time ON progressive_unlocks(unlock_time);
CREATE INDEX IF NOT EXISTS idx_customer_portals_token ON customer_portals(access_token);
CREATE INDEX IF NOT EXISTS idx_customer_portals_email ON customer_portals(customer_email);
CREATE INDEX IF NOT EXISTS idx_portal_documents_portal ON portal_documents(portal_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_download_sessions(verification_token);

-- Enable RLS on all tables
ALTER TABLE secure_download_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_download_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressive_download_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressive_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_download_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secure_download_sessions
CREATE POLICY "Public can create MFA sessions"
  ON secure_download_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view active MFA sessions"
  ON secure_download_sessions
  FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Public can update MFA sessions for verification"
  ON secure_download_sessions
  FOR UPDATE
  TO public
  USING (is_active = true AND expires_at > now())
  WITH CHECK (true);

-- RLS Policies for session_documents
CREATE POLICY "Public can view session documents"
  ON session_documents
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage session documents"
  ON session_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for blockchain_download_sessions
CREATE POLICY "Public can view blockchain sessions"
  ON blockchain_download_sessions
  FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Authenticated users can manage blockchain sessions"
  ON blockchain_download_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for progressive_download_sessions
CREATE POLICY "Public can view progressive sessions"
  ON progressive_download_sessions
  FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Authenticated users can manage progressive sessions"
  ON progressive_download_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for progressive_unlocks
CREATE POLICY "Public can view unlocked stages"
  ON progressive_unlocks
  FOR SELECT
  TO public
  USING (is_unlocked = true OR unlock_time <= now());

CREATE POLICY "Authenticated users can manage progressive unlocks"
  ON progressive_unlocks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_portals
CREATE POLICY "Public can view active portals"
  ON customer_portals
  FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Public can update portal login info"
  ON customer_portals
  FOR UPDATE
  TO public
  USING (is_active = true AND expires_at > now())
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage portals"
  ON customer_portals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for portal_documents
CREATE POLICY "Public can view available portal documents"
  ON portal_documents
  FOR SELECT
  TO public
  USING (is_available = true);

CREATE POLICY "Authenticated users can manage portal documents"
  ON portal_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for qr_download_sessions
CREATE POLICY "Public can view active QR sessions"
  ON qr_download_sessions
  FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Public can update QR sessions"
  ON qr_download_sessions
  FOR UPDATE
  TO public
  USING (is_active = true AND expires_at > now())
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage QR sessions"
  ON qr_download_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to automatically unlock progressive stages
CREATE OR REPLACE FUNCTION unlock_progressive_stages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE progressive_unlocks 
  SET is_unlocked = true, unlocked_at = now()
  WHERE unlock_time <= now() AND is_unlocked = false;
END;
$$;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cleanup expired MFA sessions
  UPDATE secure_download_sessions 
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;
  
  -- Cleanup expired blockchain sessions
  UPDATE blockchain_download_sessions 
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;
  
  -- Cleanup expired progressive sessions
  UPDATE progressive_download_sessions 
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;
  
  -- Cleanup expired customer portals
  UPDATE customer_portals 
  SET is_active = false, updated_at = now()
  WHERE expires_at < now() AND is_active = true;
  
  -- Cleanup expired QR sessions
  UPDATE qr_download_sessions 
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$$;