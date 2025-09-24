# UNIOSUN Islamic CICS System - Deployment Guide

## Overview
This guide will help you deploy the UNIOSUN Islamic CICS Cooperative Society Management System to production.

## Prerequisites

### System Requirements
- **Node.js** (version 16 or higher)
- **npm** (Node Package Manager)
- **PostgreSQL** (version 12 or higher)
- **Git** (for version control)

### Operating System Support
- Windows 10/11
- macOS 10.15 or higher
- Linux (Ubuntu 18.04+, CentOS 7+)

## Step 1: Database Setup

### 1.1 Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql postgresql-server
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

### 1.2 Create Database and User
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE uniosun_project;
CREATE USER uniosun_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE uniosun_project TO uniosun_user;
\q
```

### 1.3 Run Database Setup Script
```bash
# Navigate to project directory
cd /path/to/auto-ui-5

# Run the database setup script
psql -U uniosun_user -d uniosun_project -f database/setup.sql
```

## Step 2: Environment Configuration

### 2.1 Create Environment File
Create a `.env` file in the project root:

```bash
# Production Environment Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=your_very_secure_jwt_secret_key_minimum_32_characters_change_this_in_production

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uniosun_project
DB_USER=uniosun_user
DB_PASSWORD=your_secure_password

# Optional: Enable verbose logging for debugging
VERBOSE_LOGGING=false
```

### 2.2 Security Considerations
- **Change the JWT_SECRET** to a strong, unique key
- **Use strong database passwords**
- **Enable SSL/TLS** for production
- **Set up firewall rules** to restrict access
- **Use environment-specific configurations**

## Step 3: Application Installation

### 3.1 Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3.2 Build Frontend for Production
```bash
# Build the React application
npm run build
```

## Step 4: Production Deployment

### 4.1 Using PM2 (Recommended for Node.js)

Install PM2:
```bash
npm install -g pm2
```

Create PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'uniosun-cics',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Start the application:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4.2 Using Systemd (Linux)

Create service file (`/etc/systemd/system/uniosun-cics.service`):
```ini
[Unit]
Description=UNIOSUN Islamic CICS System
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/auto-ui-5
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable uniosun-cics
sudo systemctl start uniosun-cics
sudo systemctl status uniosun-cics
```

### 4.3 Using Docker (Alternative)

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN cd client && npm install && npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=uniosun_project
      - POSTGRES_USER=uniosun_user
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose up -d
```

## Step 5: Web Server Configuration

### 5.1 Using Nginx (Recommended)

Install Nginx:
```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

Create Nginx configuration (`/etc/nginx/sites-available/uniosun-cics`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/uniosun-cics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.2 Using Apache

Install Apache:
```bash
# Ubuntu/Debian
sudo apt install apache2

# CentOS/RHEL
sudo yum install httpd
```

Create Apache configuration:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    ErrorLog ${APACHE_LOG_DIR}/uniosun-cics_error.log
    CustomLog ${APACHE_LOG_DIR}/uniosun-cics_access.log combined
</VirtualHost>
```

## Step 6: SSL/TLS Configuration

### 6.1 Using Let's Encrypt (Free SSL)

Install Certbot:
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-apache
```

Obtain SSL certificate:
```bash
# For Nginx
sudo certbot --nginx -d your-domain.com

# For Apache
sudo certbot --apache -d your-domain.com
```

## Step 7: Monitoring and Maintenance

### 7.1 Log Management
```bash
# View application logs
pm2 logs uniosun-cics

# View system logs
sudo journalctl -u uniosun-cics -f
```

### 7.2 Database Backups
```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U uniosun_user uniosun_project > $BACKUP_DIR/backup_$DATE.sql

# Add to crontab for daily backups
0 2 * * * /path/to/backup_script.sh
```

### 7.3 Application Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Restart application
pm2 restart uniosun-cics
```

## Step 8: Security Checklist

- [ ] Changed default JWT secret
- [ ] Set strong database passwords
- [ ] Enabled SSL/TLS
- [ ] Configured firewall rules
- [ ] Set up regular backups
- [ ] Updated default admin credentials
- [ ] Configured proper file permissions
- [ ] Set up monitoring and alerting

## Default Credentials

**⚠️ IMPORTANT: Change these credentials immediately after deployment!**

### Admin User
- **Member ID**: ADMIN001
- **Email**: admin@uniosun.edu.ng
- **Password**: password

### Sample Member
- **Member ID**: MEMBER001
- **Email**: member@uniosun.edu.ng
- **Password**: password

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check database service is running
   - Verify connection credentials in .env
   - Ensure database exists and is accessible

2. **Port Already in Use**
   - Check if another service is using port 5000
   - Change port in .env file
   - Update web server configuration

3. **Permission Denied**
   - Check file permissions
   - Ensure user has proper access rights
   - Verify database user permissions

4. **Build Errors**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall
   - Check Node.js version compatibility

### Support

For technical support or issues:
1. Check application logs
2. Verify database connectivity
3. Test API endpoints
4. Review error messages in browser console

## Performance Optimization

1. **Enable Gzip compression** in web server
2. **Set up caching** for static assets
3. **Optimize database queries** with proper indexes
4. **Use CDN** for static content delivery
5. **Monitor resource usage** and scale as needed

---

**Last Updated**: December 2024
**Version**: 1.0.0
**System**: UNIOSUN Islamic CICS Cooperative Society Management System 