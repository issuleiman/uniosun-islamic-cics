-- UNIOSUN Islamic CICS Database Setup Script
-- This script sets up the complete database schema and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the main schema
\i schemas/schema.sql

-- Run migrations in order
\i migrations/001_initial_schema.sql
\i migrations/003_add_missing_user_columns.sql
\i migrations/004_fix_deduction_anomalies.sql

-- Insert initial admin user
INSERT INTO users (
    member_id, 
    first_name, 
    surname, 
    email, 
    phone, 
    password_hash, 
    role, 
    is_first_login
) VALUES (
    'ADMIN001',
    'Admin',
    'User',
    'admin@uniosun.edu.ng',
    '08012345678',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'admin',
    false
) ON CONFLICT (member_id) DO NOTHING;

-- Insert sample member user
INSERT INTO users (
    member_id, 
    first_name, 
    surname, 
    email, 
    phone, 
    password_hash, 
    role, 
    is_first_login
) VALUES (
    'MEMBER001',
    'John',
    'Doe',
    'member@uniosun.edu.ng',
    '08087654321',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'user',
    false
) ON CONFLICT (member_id) DO NOTHING;

-- Insert sample monthly deductions for current month
INSERT INTO monthly_deductions (
    user_id, 
    month, 
    year, 
    regular_savings, 
    special_savings, 
    shares, 
    investment, 
    loan_repayment, 
    over_deduction, 
    under_deduction, 
    ileya_loan, 
    business
) 
SELECT 
    u.id,
    EXTRACT(MONTH FROM CURRENT_DATE),
    EXTRACT(YEAR FROM CURRENT_DATE),
    5000, -- regular_savings
    2000, -- special_savings
    3000, -- shares
    1500, -- investment
    0,    -- loan_repayment
    0,    -- over_deduction
    0,    -- under_deduction
    0,    -- ileya_loan
    0     -- business
FROM users u 
WHERE u.member_id = 'MEMBER001'
ON CONFLICT (user_id, month, year) DO NOTHING;

-- Update cumulative values for sample user
UPDATE users SET
    cumulative_savings = 5000,
    cumulative_shares = 3000,
    cumulative_investment = 1500,
    special_savings_balance = 2000
WHERE member_id = 'MEMBER001';

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('minimum_withdrawal', '100', 'Minimum withdrawal amount for special savings'),
('loan_interest_rate', '0.05', 'Annual interest rate for loans'),
('max_loan_amount', '1000000', 'Maximum loan amount'),
('min_loan_amount', '10000', 'Minimum loan amount')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_monthly_deductions_user_id ON monthly_deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_deductions_month_year ON monthly_deductions(month, year);

CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON loan_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON loan_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Display setup completion message
SELECT 'Database setup completed successfully!' as message;
SELECT 'Default admin credentials: admin@uniosun.edu.ng / password' as admin_info;
SELECT 'Default member credentials: member@uniosun.edu.ng / password' as member_info;