-- ============================================================
-- OrthoApp Payment Columns Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add payment columns to doctor_profiles
ALTER TABLE doctor_profiles
  ADD COLUMN IF NOT EXISTS consultation_fee  INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS upi_id            TEXT,
  ADD COLUMN IF NOT EXISTS payment_qr_url    TEXT;

-- 2. Add payment columns to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_status    TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- 3. Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('doctor_profiles', 'appointments')
  AND column_name IN ('consultation_fee', 'upi_id', 'payment_qr_url', 'payment_status', 'payment_reference')
ORDER BY table_name, column_name;
