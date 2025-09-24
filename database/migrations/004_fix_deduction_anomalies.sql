-- Migration: Fix Deduction Anomalies
-- This migration fixes the total_deduction calculation to properly include over_deduction and under_deduction

-- Drop the existing generated column
ALTER TABLE monthly_deductions DROP COLUMN IF EXISTS total_deduction;

-- Recreate the generated column with correct calculation
ALTER TABLE monthly_deductions ADD COLUMN total_deduction DECIMAL(15,2) GENERATED ALWAYS AS (
    COALESCE(regular_savings, 0) + COALESCE(special_savings, 0) + 
    COALESCE(shares, 0) + COALESCE(investment, 0) + 
    COALESCE(loan_repayment, 0) + COALESCE(over_deduction, 0) + 
    COALESCE(ileya_loan, 0) + COALESCE(business, 0) + 
    COALESCE(under_deduction, 0)
) STORED;

-- Add comment explaining the deduction anomalies
COMMENT ON COLUMN monthly_deductions.over_deduction IS 'Amount deducted in excess of what should have been deducted';
COMMENT ON COLUMN monthly_deductions.under_deduction IS 'Amount that should have been deducted but was not deducted';

-- Update any existing records to ensure consistency
UPDATE monthly_deductions SET 
    over_deduction = COALESCE(over_deduction, 0),
    under_deduction = COALESCE(under_deduction, 0)
WHERE over_deduction IS NULL OR under_deduction IS NULL; 