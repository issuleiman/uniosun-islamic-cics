-- Initial Data for UNIOSUN Islamic CICS Database
-- This file contains the initial data needed to bootstrap the system

-- Insert default admin user
-- Default password is 'password' (will be hashed by the application)
INSERT INTO users (
    member_id, first_name, surname, email, role, status, password_hash,
    department, designation, created_at
) VALUES (
    'ADMIN001', 
    'System', 
    'Administrator', 
    'admin@uniosun.edu.ng', 
    'admin', 
    'active',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Administration',
    'System Administrator',
    CURRENT_TIMESTAMP
) ON CONFLICT (member_id) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('cooperative_name', 'UNIOSUN Islamic CICS', 'Name of the cooperative society'),
    ('min_loan_amount', '10000', 'Minimum loan amount allowed'),
    ('max_loan_amount', '500000', 'Maximum loan amount allowed'),
    
    ('max_loan_duration', '24', 'Maximum loan duration in months'),
    ('min_savings_balance', '5000', 'Minimum savings balance required'),
    ('admin_email', 'admin@uniosun.edu.ng', 'Administrator email address'),
    ('system_currency', 'NGN', 'System currency'),
    ('fiscal_year_start', '1', 'Fiscal year start month (1=January)'),
    ('late_payment_penalty', '2.0', 'Late payment penalty percentage'),
    ('withdrawal_processing_days', '7', 'Number of days to process withdrawal requests'),
    ('loan_approval_required', 'true', 'Whether loan applications require approval'),
    ('max_withdrawal_amount', '100000', 'Maximum withdrawal amount per request'),
    ('backup_frequency', 'daily', 'Database backup frequency'),
    ('maintenance_mode', 'false', 'System maintenance mode flag')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample loan types (optional)
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('loan_type_regular', 'Regular Loan', 'Standard personal loan'),
    ('loan_type_emergency', 'Emergency Loan', 'Emergency assistance loan'),
    ('loan_type_education', 'Education Loan', 'Educational purposes loan'),
    ('loan_type_business', 'Business Loan', 'Business development loan'),
    ('loan_type_ileya', 'Ileya Loan', 'Festival/celebration loan')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert withdrawal types
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('withdrawal_type_savings', 'Savings Withdrawal', 'Withdrawal from savings account'),
    ('withdrawal_type_shares', 'Shares Withdrawal', 'Withdrawal from shares account'),
    ('withdrawal_type_investment', 'Investment Withdrawal', 'Withdrawal from investment account'),
    ('withdrawal_type_emergency', 'Emergency Withdrawal', 'Emergency withdrawal'),
    ('withdrawal_type_final', 'Final Settlement', 'Final settlement withdrawal')
ON CONFLICT (setting_key) DO NOTHING;

-- Create a sample member for testing (optional)
INSERT INTO users (
    member_id, first_name, surname, email, role, status, password_hash,
    department, designation, phone, salary, created_at
) VALUES (
    'MEM001', 
    'John', 
    'Doe', 
    'john.doe@uniosun.edu.ng', 
    'member', 
    'active',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Computer Science',
    'Lecturer',
    '08012345678',
    250000.00,
    CURRENT_TIMESTAMP
) ON CONFLICT (member_id) DO NOTHING;

-- Insert sample monthly deductions for the test member
INSERT INTO monthly_deductions (
    user_id, month, year, regular_savings, special_savings, shares, investment
) VALUES (
    (SELECT id FROM users WHERE member_id = 'MEM001'),
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    5000.00,
    2000.00,
    1000.00,
    3000.00
) ON CONFLICT (user_id, month, year) DO NOTHING;

-- Log the initial setup in audit log
INSERT INTO audit_log (
    user_id, action, table_name, new_values, ip_address, user_agent
) VALUES (
    (SELECT id FROM users WHERE member_id = 'ADMIN001'),
    'INITIAL_SETUP',
    'system',
    '{"action": "Database initialized with initial data", "timestamp": "' || CURRENT_TIMESTAMP || '"}',
    '127.0.0.1',
    'System Setup'
);