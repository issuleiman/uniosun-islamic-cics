# Database Directory

This directory contains all database-related files for the UNIOSUN Islamic CICS system.

## Structure

```
database/
├── schemas/
│   ├── schema.sql          # Main database schema
│   └── initial_data.sql    # Initial data and default settings
├── migrations/
│   └── 001_initial_schema.sql  # Database migration files
├── setup.sql               # Complete database setup script
└── README.md              # This file
```

## Database Setup

### Prerequisites
- PostgreSQL 12 or higher installed
- Database user with CREATE privileges
- Environment variables configured in `.env` file

### Quick Setup

1. **Create Database** (if not exists):
   ```sql
   CREATE DATABASE uniosun_project;
   ```

2. **Run Complete Setup**:
   ```bash
   psql -U your_username -d uniosun_project -f database/setup.sql
   ```

### Manual Setup

1. **Create Schema**:
   ```bash
   psql -U your_username -d uniosun_project -f database/schemas/schema.sql
   ```

2. **Insert Initial Data**:
   ```bash
   psql -U your_username -d uniosun_project -f database/schemas/initial_data.sql
   ```

## Schema Overview

### Core Tables

- **users**: System users (members and administrators)
- **monthly_deductions**: Monthly deduction records for each member
- **loan_applications**: Loan application submissions
- **loans**: Active loan records
- **loan_payments**: Loan payment history
- **withdrawal_requests**: Withdrawal request submissions
- **system_settings**: System configuration settings
- **audit_log**: System activity audit trail

### Key Features

- **Automatic ID Generation**: Uses sequences for loan IDs, application IDs, etc.
- **Audit Trail**: All major actions are logged in the audit_log table
- **Data Integrity**: Foreign key constraints and check constraints
- **Performance**: Optimized indexes on frequently queried columns
- **Timestamps**: Automatic updated_at triggers on relevant tables

## Default Data

The system comes with default data including:

- **Admin User**: 
  - Member ID: `ADMIN001`
  - Password: `password` (change immediately in production)
  - Email: `admin@uniosun.edu.ng`

- **Test Member**:
  - Member ID: `MEM001`
  - Password: `password`
  - Email: `john.doe@uniosun.edu.ng`

- **System Settings**: Default configuration for loan limits, etc.

## Environment Variables

Ensure these are set in your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uniosun_project
DB_USER=your_username
DB_PASSWORD=your_password
```

## Migrations

Migration files are stored in the `migrations/` directory and should be run in order:

1. `001_initial_schema.sql` - Initial database schema

To run migrations:
```bash
psql -U your_username -d uniosun_project -f database/migrations/001_initial_schema.sql
```

## Security Notes

### Production Deployment

1. **Change Default Passwords**: Update the admin password immediately
2. **Database Security**: Use strong database user passwords
3. **Network Security**: Restrict database access to application servers only
4. **SSL/TLS**: Enable SSL connections for production
5. **Backup Strategy**: Implement regular automated backups

### Development

- Default passwords are provided for easy development setup
- Test data is included for development convenience
- Audit logging is enabled to track all system activities

## Backup and Restore

### Backup
```bash
pg_dump -U your_username -h localhost uniosun_project > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore
```bash
psql -U your_username -d uniosun_project < backup_file.sql
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure database user has sufficient privileges
2. **Connection Failed**: Check PostgreSQL service and connection parameters
3. **Schema Exists**: Use `DROP SCHEMA IF EXISTS` if recreating database
4. **Foreign Key Violations**: Ensure data integrity when modifying existing data

### Database Connection Test

From the application directory:
```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

## Maintenance

### Regular Tasks

1. **Analyze Tables**: Run `ANALYZE;` weekly for query optimization
2. **Vacuum**: Run `VACUUM ANALYZE;` monthly to reclaim space
3. **Monitor Logs**: Check PostgreSQL logs for errors and performance issues
4. **Update Statistics**: Ensure query planner has up-to-date statistics

### Performance Monitoring

- Monitor query performance using `pg_stat_statements`
- Check index usage with `pg_stat_user_indexes`
- Monitor table sizes and growth patterns
- Set up alerting for connection limits and performance thresholds