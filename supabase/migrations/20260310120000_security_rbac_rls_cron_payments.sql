-- PRIORITY 1 — Security & RBAC

-- 1) Role system
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent', 'owner');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2) Fix RLS policies (replace permissive WITH CHECK (true) policies)

-- LEADS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users manage leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users update leads" ON public.leads;
DROP POLICY IF EXISTS "Auth users delete leads" ON public.leads;

-- Agents can read leads assigned to them (or admin/manager can read all)
DROP POLICY IF EXISTS "agents_read_own_leads" ON public.leads;
CREATE POLICY "agents_read_own_leads" ON public.leads
  FOR SELECT USING (
    assigned_agent_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Admin/manager/agent can insert leads (as provided)
DROP POLICY IF EXISTS "admin_manager_insert_leads" ON public.leads;
CREATE POLICY "admin_manager_insert_leads" ON public.leads
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'agent')
  );

-- Admin/manager can update any lead; agents can update their assigned leads
DROP POLICY IF EXISTS "admin_manager_agent_update_leads" ON public.leads;
CREATE POLICY "admin_manager_agent_update_leads" ON public.leads
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR assigned_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR assigned_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Only admin/manager can delete leads
DROP POLICY IF EXISTS "admin_manager_delete_leads" ON public.leads;
CREATE POLICY "admin_manager_delete_leads" ON public.leads
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- AGENTS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read agents" ON public.agents;
DROP POLICY IF EXISTS "Auth users manage agents" ON public.agents;
DROP POLICY IF EXISTS "Auth users update agents" ON public.agents;
DROP POLICY IF EXISTS "Auth users delete agents" ON public.agents;

DROP POLICY IF EXISTS "admin_manager_manage_agents" ON public.agents;
CREATE POLICY "admin_manager_manage_agents" ON public.agents
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "agents_read_self" ON public.agents;
CREATE POLICY "agents_read_self" ON public.agents
  FOR SELECT USING (user_id = auth.uid());

-- RESERVATIONS (critical: stop anonymous writes)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anyone update reservations" ON public.reservations;

DROP POLICY IF EXISTS "authenticated_insert_reservations" ON public.reservations;
CREATE POLICY "authenticated_insert_reservations" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_read_reservations" ON public.reservations;
CREATE POLICY "admin_read_reservations" ON public.reservations
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- BOOKINGS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Auth users insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Auth users update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Auth users delete bookings" ON public.bookings;

DROP POLICY IF EXISTS "admin_manager_manage_bookings" ON public.bookings;
CREATE POLICY "admin_manager_manage_bookings" ON public.bookings
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "agents_read_own_bookings" ON public.bookings;
CREATE POLICY "agents_read_own_bookings" ON public.bookings
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE assigned_agent_id IN (
        SELECT id FROM public.agents WHERE user_id = auth.uid()
      )
    )
  );

-- VISITS (schema uses assigned_staff_id, not agent_id)
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read visits" ON public.visits;
DROP POLICY IF EXISTS "Auth users manage visits" ON public.visits;
DROP POLICY IF EXISTS "Auth users update visits" ON public.visits;
DROP POLICY IF EXISTS "Auth users delete visits" ON public.visits;

DROP POLICY IF EXISTS "agents_manage_own_visits" ON public.visits;
CREATE POLICY "agents_manage_own_visits" ON public.visits
  FOR ALL USING (
    assigned_staff_id IN (
      SELECT id FROM public.agents WHERE user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- PROPERTIES (and inventory-like tables are managed through roles; properties remain public-read)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read properties" ON public.properties;
DROP POLICY IF EXISTS "Auth users manage properties" ON public.properties;
DROP POLICY IF EXISTS "Auth users update properties" ON public.properties;
DROP POLICY IF EXISTS "Auth users delete properties" ON public.properties;

DROP POLICY IF EXISTS "public_read_properties" ON public.properties;
CREATE POLICY "public_read_properties" ON public.properties
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manager_owner_modify_properties" ON public.properties;
CREATE POLICY "admin_manager_owner_modify_properties" ON public.properties
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'owner')
  );

-- PRIORITY 3 — Automation with pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-stale-locks',
  '*/10 * * * *',
  $$
    UPDATE public.beds
    SET status = 'vacant'
    WHERE id IN (
      SELECT bed_id FROM public.soft_locks
      WHERE expires_at < now() AND is_active = true
    );

    UPDATE public.soft_locks
    SET is_active = false
    WHERE expires_at < now() AND is_active = true;
  $$
);

SELECT cron.schedule(
  'recalculate-lead-scores',
  '0 * * * *',
  $$
    UPDATE public.leads
    SET lead_score = GREATEST(0, lead_score - 5)
    WHERE last_activity_at < now() - interval '48 hours'
    AND status NOT IN ('booked', 'lost');
  $$
);

SELECT cron.schedule(
  'daily-followup-reminders',
  '0 9 * * *',
  $$
    INSERT INTO public.follow_up_reminders (lead_id, reminder_date, note)
    SELECT id, now() + interval '2 hours', 'Auto: No activity in 24hrs'
    FROM public.leads
    WHERE last_activity_at < now() - interval '24 hours'
    AND status NOT IN ('booked', 'lost')
    AND id NOT IN (
      SELECT lead_id FROM public.follow_up_reminders
      WHERE is_completed = false
    );
  $$
);

-- PRIORITY 5 — Payment table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  gateway text DEFAULT 'razorpay',
  gateway_transaction_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_payments" ON public.payment_transactions;
CREATE POLICY "admin_manage_payments" ON public.payment_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

