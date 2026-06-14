-- Add subscription fields to organizations
-- plan         : current plan tier (defaults to 'solo' for all existing orgs)
-- plan_status  : subscription lifecycle state
-- plan_renews_at: next billing date (null for free / enterprise)
-- trial_ends_at : when the Business trial expires (null if not trialing)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'solo'
    CONSTRAINT organizations_plan_check
      CHECK (plan IN ('solo', 'business', 'cabinet', 'enterprise')),

  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'free'
    CONSTRAINT organizations_plan_status_check
      CHECK (plan_status IN ('free', 'trialing', 'active', 'canceled', 'past_due')),

  ADD COLUMN IF NOT EXISTS plan_renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at  TIMESTAMPTZ;

-- Existing rows: Solo plan, free status (already handled by defaults above,
-- but explicit in case the migration runs on a populated table)
UPDATE organizations
SET plan = 'solo', plan_status = 'free'
WHERE plan IS NULL OR plan = '';

-- Index to support looking up orgs due for renewal (e.g. billing cron)
CREATE INDEX IF NOT EXISTS idx_organizations_plan_renews_at
  ON organizations (plan_renews_at)
  WHERE plan_renews_at IS NOT NULL;
