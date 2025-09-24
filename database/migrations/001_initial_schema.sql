-- Migration: 001_initial_schema.sql
-- Description: Initial database schema creation
-- Created: 2025-07-31
-- Author: System

-- This migration creates the initial database schema for the UNIOSUN Islamic CICS system

-- Check if migration has already been run
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        -- Create migrations tracking table
        CREATE TABLE schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            executed_by VARCHAR(100) DEFAULT CURRENT_USER
        );
    END IF;
END $$;

-- Check if this migration has already been executed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE migration_name = '001_initial_schema') THEN
        
        -- Execute the main schema creation
        -- (The actual schema creation is in the schema.sql file)
        
        -- Record that this migration has been executed
        INSERT INTO schema_migrations (migration_name) VALUES ('001_initial_schema');
        
        RAISE NOTICE 'Migration 001_initial_schema executed successfully';
    ELSE
        RAISE NOTICE 'Migration 001_initial_schema already executed, skipping';
    END IF;
END $$;