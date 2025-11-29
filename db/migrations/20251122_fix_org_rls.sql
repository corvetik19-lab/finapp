-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations Policies

-- 1. Users can view organizations they are members of
CREATE POLICY "Users can view their own organizations" ON organizations
FOR SELECT
USING (
  id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- 2. Super Admins can view all organizations
CREATE POLICY "Super Admins can view all organizations" ON organizations
FOR SELECT
USING (
  public.is_admin_or_super_admin()
);

-- 3. Super Admins can insert/update/delete organizations
CREATE POLICY "Super Admins can manage organizations" ON organizations
FOR ALL
USING (
  public.is_admin_or_super_admin()
);

-- Organization Members Policies

-- 1. Users can view their own memberships
CREATE POLICY "Users can view their own memberships" ON organization_members
FOR SELECT
USING (
  user_id = auth.uid()
);

-- 2. Super Admins can view all memberships
CREATE POLICY "Super Admins can view all memberships" ON organization_members
FOR SELECT
USING (
  public.is_admin_or_super_admin()
);

-- 3. Super Admins can manage memberships
CREATE POLICY "Super Admins can manage memberships" ON organization_members
FOR ALL
USING (
  public.is_admin_or_super_admin()
);
