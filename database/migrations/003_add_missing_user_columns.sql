-- Migration: Add missing columns to users table
-- This migration adds the missing columns that are referenced in the User model

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cumulative_savings DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cumulative_shares DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cumulative_investment DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS special_savings_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;

-- Update existing records to have default values
UPDATE users SET 
    cumulative_savings = COALESCE(cumulative_savings, 0),
    cumulative_shares = COALESCE(cumulative_shares, 0),
    cumulative_investment = COALESCE(cumulative_investment, 0),
    special_savings_balance = COALESCE(special_savings_balance, 0),
    is_first_login = COALESCE(is_first_login, TRUE)
WHERE cumulative_savings IS NULL 
   OR cumulative_shares IS NULL 
   OR cumulative_investment IS NULL 
   OR special_savings_balance IS NULL 
   OR is_first_login IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_cumulative_savings ON users(cumulative_savings);
CREATE INDEX IF NOT EXISTS idx_users_special_savings_balance ON users(special_savings_balance);
CREATE INDEX IF NOT EXISTS idx_users_is_first_login ON users(is_first_login); 