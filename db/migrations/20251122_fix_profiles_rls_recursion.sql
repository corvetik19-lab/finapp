-- Fix infinite recursion in profiles RLS policies

-- 1. Create a secure function to check admin status without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND global_role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop recursive policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON profiles;
DROP POLICY IF EXISTS "Users update own, Admins update others" ON profiles;

-- 3. Re-create policies using the secure function
CREATE POLICY "Users can view own profile or admins view all" ON profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR 
    public.is_admin_or_super_admin()
  );

CREATE POLICY "Users update own, Admins update others" ON profiles
  FOR UPDATE USING (
    auth.uid() = id 
    OR 
    public.is_admin_or_super_admin()
  );
