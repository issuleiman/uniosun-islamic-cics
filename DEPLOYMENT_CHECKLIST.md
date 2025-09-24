# UNIOSUN Islamic CICS System - Deployment Checklist

## 🚀 Pre-Deployment Checklist

### ✅ Development Testing Completed
- [x] All features tested and working
- [x] Database connection established
- [x] API endpoints responding correctly
- [x] Frontend build successful
- [x] Authentication system working
- [x] Role-based access implemented
- [x] Error handling in place
- [x] Code cleanup completed
- [x] Unused features removed

### 🔧 Production Environment Setup

#### 1. Server Requirements
- [ ] **Operating System:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- [ ] **Node.js:** Version 16+ installed
- [ ] **npm:** Latest version installed
- [ ] **PostgreSQL:** Version 12+ installed and configured
- [ ] **Nginx:** Latest version installed
- [ ] **PM2:** Process manager installed (`npm install -g pm2`)
- [ ] **SSL Certificate:** Valid SSL certificate obtained

#### 2. Database Setup
- [ ] **PostgreSQL Installation:**
  ```bash
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  ```
- [ ] **Database Creation:**
  ```bash
  sudo -u postgres createdb uniosun_project
  ```
- [ ] **User Creation:**
  ```bash
  sudo -u postgres createuser --interactive
  ```
- [ ] **Schema Setup:**
  ```bash
  psql -U postgres -d uniosun_project -f database/setup.sql
  ```

#### 3. Application Deployment
- [ ] **Code Upload:** Upload application to server
- [ ] **Environment Configuration:**
  ```bash
  cp production.env.example .env
  # Edit .env with production values
  ```
- [ ] **Dependencies Installation:**
  ```bash
  npm install --production
  cd client && npm install --production
  ```
- [ ] **Frontend Build:**
  ```bash
  cd client && npm run build
  ```
- [ ] **PM2 Configuration:**
  ```bash
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup
  ```

#### 4. Web Server Configuration
- [ ] **Nginx Installation:**
  ```bash
  sudo apt install nginx
  ```
- [ ] **SSL Certificate Setup:**
  ```bash
  # Using Let's Encrypt
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d your-domain.com
  ```
- [ ] **Nginx Configuration:**
  ```bash
  sudo cp nginx.conf /etc/nginx/sites-available/uniosun-cics
  sudo ln -s /etc/nginx/sites-available/uniosun-cics /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl reload nginx
  ```

#### 5. Security Configuration
- [ ] **Firewall Setup:**
  ```bash
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```
- [ ] **SSL/TLS Configuration:**
  - [ ] SSL certificate installed
  - [ ] HTTPS redirect configured
  - [ ] Security headers implemented
- [ ] **Environment Variables:**
  - [ ] JWT_SECRET changed to secure value
  - [ ] Database credentials updated
  - [ ] Production NODE_ENV set

#### 6. Monitoring & Maintenance
- [ ] **Logging Setup:**
  ```bash
  sudo mkdir -p /var/log/uniosun-cics
  sudo chown www-data:www-data /var/log/uniosun-cics
  ```
- [ ] **Backup Configuration:**
  ```bash
  chmod +x backup.sh
  # Add to crontab: 0 2 * * * /path/to/backup.sh
  ```
- [ ] **Monitoring Setup:**
  ```bash
  chmod +x monitor.sh
  # Add to crontab: */5 * * * * /path/to/monitor.sh
  ```

## 🔍 Post-Deployment Verification

### 1. Application Health Checks
- [ ] **Backend API:** `curl https://your-domain.com/api/health`
- [ ] **Frontend Access:** Visit `https://your-domain.com`
- [ ] **Database Connection:** Application connects to database
- [ ] **Authentication:** Login system working
- [ ] **File Uploads:** Upload functionality working

### 2. Security Verification
- [ ] **HTTPS:** All traffic redirected to HTTPS
- [ ] **SSL Certificate:** Valid and trusted
- [ ] **Security Headers:** Proper headers implemented
- [ ] **Rate Limiting:** API rate limiting active
- [ ] **Authentication:** JWT tokens working correctly

### 3. Performance Testing
- [ ] **Load Testing:** Application handles concurrent users
- [ ] **Database Performance:** Queries optimized
- [ ] **Memory Usage:** Application within limits
- [ ] **Response Times:** API responses under 200ms

### 4. Backup Verification
- [ ] **Database Backup:** Backup script working
- [ ] **File Backup:** Application files backed up
- [ ] **Restore Test:** Backup restoration tested
- [ ] **Automation:** Backup cron job active

## 📋 Production Maintenance

### Daily Tasks
- [ ] Check application logs for errors
- [ ] Monitor system resources
- [ ] Verify backup completion
- [ ] Check SSL certificate validity

### Weekly Tasks
- [ ] Review security logs
- [ ] Update system packages
- [ ] Check disk space usage
- [ ] Review performance metrics

### Monthly Tasks
- [ ] Update application dependencies
- [ ] Review and rotate logs
- [ ] Test disaster recovery procedures
- [ ] Update SSL certificates

## 🚨 Emergency Procedures

### Application Down
1. Check PM2 status: `pm2 status`
2. Restart application: `pm2 restart uniosun-cics-backend`
3. Check logs: `pm2 logs uniosun-cics-backend`
4. Verify database connection

### Database Issues
1. Check PostgreSQL status: `sudo systemctl status postgresql`
2. Restart database: `sudo systemctl restart postgresql`
3. Check connection: `pg_isready -h localhost`
4. Review database logs

### SSL Certificate Issues
1. Check certificate validity: `openssl x509 -enddate -noout -in /path/to/cert`
2. Renew certificate: `sudo certbot renew`
3. Reload nginx: `sudo systemctl reload nginx`

## 📞 Support Information

### Default Credentials (CHANGE IMMEDIATELY)
- **Admin:** admin@uniosun-cics.com / password
- **Member:** member@uniosun.edu.ng / password

### Important Files
- **Application:** `/var/www/uniosun-cics/`
- **Logs:** `/var/log/uniosun-cics/`
- **Backups:** `/var/backups/uniosun-cics/`
- **Nginx Config:** `/etc/nginx/sites-available/uniosun-cics`

### Contact Information
- **System Administrator:** [Your Contact]
- **Database Administrator:** [Your Contact]
- **Emergency Contact:** [Your Contact]

---

**Status:** ✅ READY FOR DEPLOYMENT  
**Last Updated:** August 7, 2025  
**Next Review:** After deployment 