#!/bin/bash

# UNIOSUN Islamic CICS System - Production Build Script
# This script prepares the application for production deployment

echo "🚀 Starting production build process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install --production

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install --production

# Build frontend for production
echo "🔨 Building frontend for production..."
npm run build

# Copy build to server directory
echo "📁 Copying build files..."
cp -r build ../server/public

# Go back to root
cd ..

# Create production directories
echo "📁 Creating production directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# Set proper permissions
echo "🔐 Setting file permissions..."
chmod 755 server/public
chmod 644 server/public/*
chmod 755 uploads
chmod 755 logs

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'uniosun-cics-backend',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create systemd service file
echo "⚙️ Creating systemd service configuration..."
cat > uniosun-cics.service << 'EOF'
[Unit]
Description=UNIOSUN Islamic CICS System
After=network.target

[Service]
Type=forking
User=www-data
WorkingDirectory=/var/www/uniosun-cics
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
echo "⚙️ Creating nginx configuration..."
cat > nginx.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
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

    # Static files
    location / {
        root /var/www/uniosun-cics/server/public;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /var/www/uniosun-cics/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
EOF

# Create backup script
echo "💾 Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for UNIOSUN Islamic CICS System
BACKUP_DIR="/var/backups/uniosun-cics"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="uniosun_project"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Creating database backup..."
pg_dump -h localhost -U postgres $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
echo "Creating application backup..."
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=uploads \
    .

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash

# Monitoring script for UNIOSUN Islamic CICS System

# Check if application is running
if ! pm2 list | grep -q "uniosun-cics-backend"; then
    echo "❌ Application is not running"
    exit 1
fi

# Check database connection
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ Database is not accessible"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "⚠️ Disk usage is high: ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "⚠️ Memory usage is high: ${MEMORY_USAGE}%"
fi

echo "✅ System is healthy"
EOF

chmod +x monitor.sh

echo "✅ Production build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update production.env.example with your values"
echo "2. Copy to .env file"
echo "3. Install PM2: npm install -g pm2"
echo "4. Start the application: pm2 start ecosystem.config.js"
echo "5. Configure nginx with the provided nginx.conf"
echo "6. Set up SSL certificates"
echo "7. Configure systemd service"
echo ""
echo "🚀 Your application is ready for production deployment!" 