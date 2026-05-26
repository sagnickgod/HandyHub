-- Supabase Migration: Task Economy Update
-- Add the new fields to the `tasks` table for the Task Economy Update

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS min_coins integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS worker_reward integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee integer DEFAULT 0;

-- Optional: If needed to backfill standard fee structures for existing tasks, run this block:
-- UPDATE tasks SET 
--    worker_reward = ROUND(points_offered * 0.7),
--    platform_fee = points_offered - ROUND(points_offered * 0.7),
--    min_coins = CASE WHEN urgency = 'high' THEN 250 WHEN urgency = 'medium' THEN 170 ELSE 100 END
-- WHERE worker_reward = 0;
