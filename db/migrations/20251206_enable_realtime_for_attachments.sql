-- Enable Realtime for attachments table
-- This allows real-time synchronization between mobile and desktop

-- 1. Set REPLICA IDENTITY to FULL so that DELETE events include all columns
ALTER TABLE attachments REPLICA IDENTITY FULL;

-- 2. Add table to supabase_realtime publication
-- First check if it exists, if not create it
DO $$
BEGIN
    -- Check if the publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Add table to publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attachments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE attachments;
    END IF;
END $$;

-- 3. Grant necessary permissions for realtime
GRANT SELECT ON attachments TO authenticated;
GRANT SELECT ON attachments TO anon;

-- Also enable for transactions table for full sync
ALTER TABLE transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;
END $$;

-- And for transaction_items
ALTER TABLE transaction_items REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transaction_items;
    END IF;
END $$;

COMMENT ON TABLE attachments IS 'Realtime enabled for mobile-desktop sync';
