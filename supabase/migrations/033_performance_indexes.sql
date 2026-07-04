-- ============================================================
-- 033_performance_indexes.sql — Database speed optimization
--
-- Adds composite and single-column indexes on key columns
-- to speed up chat loading, list views, and statistics queries.
-- ============================================================

-- Speed up fetching active conversation list, ordered by last message time
CREATE INDEX IF NOT EXISTS idx_conversations_account_last_msg 
  ON public.conversations(account_id, last_message_at DESC);

-- Speed up fetching contact directory in a workspace
CREATE INDEX IF NOT EXISTS idx_contacts_account_id 
  ON public.contacts(account_id);

-- Speed up fetching statistics for broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcasts_account_id 
  ON public.broadcasts(account_id);

-- Speed up automation logs queries
CREATE INDEX IF NOT EXISTS idx_automation_logs_account_id 
  ON public.automation_logs(account_id);

-- Speed up flow logs queries
CREATE INDEX IF NOT EXISTS idx_flow_runs_account_id 
  ON public.flow_runs(account_id);
