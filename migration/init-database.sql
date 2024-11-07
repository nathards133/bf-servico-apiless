-- Primeiro criar as extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums primeiro
CREATE TYPE order_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'cancelled'
);

CREATE TYPE art_approval_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Criar a tabela users primeiro
CREATE TABLE IF NOT EXISTS public.users (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  role text not null default 'user',
  company jsonb not null,
  business_type text,
  has_certificate boolean default false,
  certificate_expiration timestamp with time zone,
  nfe_config jsonb default '{"ambiente": "homologacao", "serie": "1", "numero_inicial": 1}'::jsonb,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Depois as outras tabelas que dependem de users
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  name text not null,
  email text,
  phone text,
  document text,
  address jsonb,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  name text not null,
  description text,
  base_price decimal(10,2) default 0,
  attributes jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.service_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  client_id uuid references public.clients(id),
  service_id uuid references public.services(id),
  service_attributes jsonb default '[]'::jsonb,
  expected_completion_date timestamp with time zone,
  order_source text,
  description text,
  total_value decimal(10,2) default 0,
  payment_status payment_status default 'pending',
  payment_method text,
  art_approval_status art_approval_status default 'pending',
  art_observations text,
  art_file_url text,
  delivery_type text,
  delivery_address jsonb,
  internal_notes text,
  discount_value decimal(10,2) default 0,
  status order_status default 'pending',
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.service_order_items (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid references public.service_orders(id),
  print_type text,
  width decimal(10,2),
  height decimal(10,2),
  quantity integer default 1,
  material text,
  finishing jsonb default '[]'::jsonb,
  requires_installation boolean default false,
  unit_value decimal(10,2) default 0,
  total_value decimal(10,2) default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE public.service_order_history (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid references public.service_orders(id),
  user_id uuid references public.users(id),
  status order_status,
  notes text,
  created_at timestamp with time zone default now()
);

-- Funções
CREATE OR REPLACE FUNCTION search_suppliers(
  p_user_id uuid,
  p_search text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_sort_by text DEFAULT 'name',
  p_sort_order text DEFAULT 'asc',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  address jsonb,
  document text,
  active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_suppliers AS (
    SELECT s.*
    FROM clients s
    WHERE s.user_id = p_user_id
    AND s.active = true
    AND (
      p_search IS NULL
      OR s.name ILIKE '%' || p_search || '%'
      OR s.email ILIKE '%' || p_search || '%'
      OR s.document ILIKE '%' || p_search || '%'
    )
    AND (
      p_city IS NULL
      OR (s.address->>'city')::text ILIKE '%' || p_city || '%'
    )
  )
  SELECT 
    fs.*,
    COUNT(*) OVER() as total
  FROM filtered_suppliers fs
  ORDER BY
    CASE WHEN p_sort_order = 'asc' THEN
      CASE 
        WHEN p_sort_by = 'name' THEN fs.name
        WHEN p_sort_by = 'email' THEN fs.email
        ELSE fs.name
      END
    END ASC,
    CASE WHEN p_sort_order = 'desc' THEN
      CASE 
        WHEN p_sort_by = 'name' THEN fs.name
        WHEN p_sort_by = 'email' THEN fs.email
        ELSE fs.name
      END
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_history ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Clients policies
CREATE POLICY "Users can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

-- Services policies
CREATE POLICY "Users can view their own services" ON public.services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" ON public.services
  FOR UPDATE USING (auth.uid() = user_id);

-- Service Orders policies
CREATE POLICY "Users can view their own orders" ON public.service_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.service_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.service_orders
  FOR UPDATE USING (auth.uid() = user_id);