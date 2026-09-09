-- Additive: extends TestAssignmentStatus with an in-progress lifecycle state.
-- ASSIGNED = assigned, not started; IN_PROGRESS = saved partial answers; COMPLETED = submitted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TestAssignmentStatus' AND e.enumlabel = 'IN_PROGRESS'
  ) THEN
    ALTER TYPE "TestAssignmentStatus" ADD VALUE 'IN_PROGRESS';
  END IF;
END
$$;