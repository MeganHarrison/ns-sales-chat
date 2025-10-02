-- Customers table (contacts in Keap)
CREATE TABLE IF NOT EXISTS keap_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keap_contact_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  date_created TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE,
  tag_ids JSONB DEFAULT '[]'::JSONB,
  custom_fields JSONB DEFAULT '{}'::JSONB,
  addresses JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keap_customers_keap_id ON keap_customers(keap_contact_id);
CREATE INDEX IF NOT EXISTS idx_keap_customers_email ON keap_customers(email);
CREATE INDEX IF NOT EXISTS idx_keap_customers_name ON keap_customers(first_name, last_name);

-- Products table
CREATE TABLE IF NOT EXISTS keap_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keap_product_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_desc TEXT,
  product_price DECIMAL(10,2),
  product_short_desc TEXT,
  subscription_only BOOLEAN DEFAULT false,
  sku TEXT,
  status INTEGER,
  subscription_plans JSONB DEFAULT '[]'::JSONB,
  product_options JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keap_products_keap_id ON keap_products(keap_product_id);
CREATE INDEX IF NOT EXISTS idx_keap_products_sku ON keap_products(sku);
CREATE INDEX IF NOT EXISTS idx_keap_products_status ON keap_products(status);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS keap_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keap_subscription_id TEXT UNIQUE NOT NULL,
  contact_id TEXT,
  product_id TEXT,
  program_id TEXT,
  billing_cycle TEXT,
  frequency INTEGER,
  billing_amount DECIMAL(10,2),
  status TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  next_bill_date TIMESTAMP WITH TIME ZONE,
  payment_gateway TEXT,
  credit_card_id TEXT,
  auto_charge BOOLEAN DEFAULT true,
  subscription_plan_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keap_subscriptions_keap_id ON keap_subscriptions(keap_subscription_id);
CREATE INDEX IF NOT EXISTS idx_keap_subscriptions_contact ON keap_subscriptions(contact_id);
CREATE INDEX IF NOT EXISTS idx_keap_subscriptions_status ON keap_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_keap_subscriptions_next_bill ON keap_subscriptions(next_bill_date);