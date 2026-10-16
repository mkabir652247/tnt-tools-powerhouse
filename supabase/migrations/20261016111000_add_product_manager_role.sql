-- Keep this enum change isolated. PostgreSQL requires the new enum value to be committed
-- before another migration can use it in policies or functions.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_manager';
