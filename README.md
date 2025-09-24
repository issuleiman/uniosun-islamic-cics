# UNIOSUN Islamic CICS Cooperative Society Management System

## System Overview

The UNIOSUN Islamic CICS Cooperative Society Management System is a comprehensive web-based application designed to manage cooperative society operations including member management, loan processing, withdrawal requests, monthly deductions, and financial reporting.

### Features
- **Member Management**: Add, edit, and manage society members
- **Loan Management**: Process loan applications and track repayments
- **Withdrawal Requests**: Handle member withdrawal requests
- **Monthly Deductions**: Manage monthly savings and deductions
- **Financial Reporting**: Generate PDF and Excel reports
- **Role-based Access**: Separate admin and member dashboards
- **PDF Generation**: Dynamic table generation with proper formatting

## System Requirements

### Prerequisites
- **Node.js** (version 16 or higher)
- **npm** (Node Package Manager)
- **Git** (for cloning the repository)
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

### Operating System Support
- Windows 10/11
- macOS 10.15 or higher
- Linux (Ubuntu 18.04+, CentOS 7+)

## Installation Guide

### Step 1: Clone or Download the Project

#### Option A: Using Git (Recommended)
```bash
git clone <repository-url>
cd auto-ui
```

#### Option B: Download ZIP File
1. Download the project ZIP file
2. Extract to your desired directory
3. Open terminal/command prompt in the extracted folder

### Step 2: Install Dependencies

#### Backend Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### Step 3: Verify Installation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Verify all dependencies are installed
npm list --depth=0
```

## Running the System

### Method 1: Using VS Code (Recommended)

#### Step 1: Open in VS Code
1. Open VS Code
2. Go to `File` → `Open Folder`
3. Select the project folder (`auto-ui`)
4. Wait for VS Code to load the project

#### Step 2: Open Terminal in VS Code
1. Press `Ctrl + `` (backtick) or go to `Terminal` → `New Terminal`
2. Ensure the terminal is in the project root directory

#### Step 3: Start the Development Server
```bash
npm run dev
```

#### Step 4: Access the Application
- **Frontend**: Open http://localhost:3000 in your browser
- **Backend API**: Running on http://localhost:5000

### Method 2: Using Command Prompt/Terminal

#### Step 1: Navigate to Project Directory
```bash
cd path/to/auto-ui
```

#### Step 2: Start the Development Server
```bash
npm run dev
```

#### Step 3: Access the Application
- Open your web browser
- Navigate to http://localhost:3000

### Method 3: Running Backend and Frontend Separately

#### Start Backend Only
```bash
npm run server
```

#### Start Frontend Only (in a new terminal)
```bash
npm run client
```

## System Access

### Default Login Credentials

#### Admin Access
- **Username**: admin@uniosun.edu.ng
- **Password**: admin123
- **Role**: Administrator

#### Member Access
- **Username**: member@uniosun.edu.ng
- **Password**: member123
- **Role**: Member

### Accessing Different Dashboards

#### Admin Dashboard
1. Login with admin credentials
2. Access full system management features
3. Navigate through tabs: Overview, Members, Loan Applications, etc.

#### Member Dashboard
1. Login with member credentials
2. Access personal dashboard features
3. View personal information, apply for loans, request withdrawals

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port Already in Use
**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Kill all Node.js processes
taskkill /f /im node.exe

# Or find and kill specific process
netstat -ano | findstr :5000
taskkill /f /im <PID>
```

#### Issue 2: Frontend Compilation Errors
**Error**: ESLint errors or compilation failures

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart development server
npm run dev
```

#### Issue 3: Module Not Found Errors
**Error**: `Cannot find module 'xyz'`

**Solution**:
```bash
# Reinstall all dependencies
npm install

# Check if all dependencies are in package.json
npm list --depth=0
```

#### Issue 4: Browser Access Issues
**Problem**: Cannot access localhost:3000

**Solution**:
1. Check if both servers are running
2. Verify firewall settings
3. Try accessing http://127.0.0.1:3000 instead
4. Check browser console for errors

### Development Commands

#### Available Scripts
```bash
# Start both backend and frontend
npm run dev

# Start only backend server
npm run server

# Start only frontend
npm run client

# Build for production
npm run build

# Run tests
npm test
```

#### Stopping the Application
- Press `Ctrl + C` in the terminal to stop the development server
- Or close the terminal window

## File Structure

```
auto-ui/
├── client/                 # React frontend
│   ├── public/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/
│   ├── middleware/
│   ├── data/
│   └── index.js
├── package.json
└── README.md
```

## Configuration

### Environment Variables
The system uses default configurations. For production deployment, consider setting:

```bash
# Backend configuration
PORT=5000
NODE_ENV=development

# Frontend configuration
REACT_APP_API_URL=http://localhost:5000
```

### Database
The system currently uses in-memory data storage. For production, consider implementing:
- MongoDB
- PostgreSQL
- MySQL

## Security Considerations

### Development Environment
- Default passwords are used for testing
- No SSL/TLS encryption
- In-memory data storage

### Production Deployment
- Change all default passwords
- Implement proper authentication
- Use HTTPS/SSL certificates
- Implement database security
- Set up proper firewall rules

## Support and Maintenance

### Regular Maintenance
1. **Update Dependencies**: Regularly update npm packages
2. **Backup Data**: Implement regular data backups
3. **Monitor Logs**: Check server logs for errors
4. **Security Updates**: Keep system updated

### Getting Help
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check terminal output for server errors
4. Verify all dependencies are installed correctly

## System Features

### Admin Features
- Member management (add, edit, delete)
- Loan application processing
- Withdrawal request management
- Monthly deductions management
- Financial reporting (PDF/Excel)
- System statistics and analytics

### Member Features
- Personal dashboard
- Loan applications
- Withdrawal requests
- Monthly slip generation
- Personal financial overview

### Reporting Features
- Monthly reports
- Payroll reports
- Cumulative savings reports
- Loan reports
- Withdrawal request reports
- Bank payroll reports

## Performance Optimization

### Development
- Use development mode for faster builds
- Enable hot reloading for quick development
- Monitor memory usage during development

### Production
- Build optimized production version
- Implement caching strategies
- Use CDN for static assets
- Optimize database queries

## Conclusion

This system provides a comprehensive solution for managing cooperative society operations. Follow the installation and running instructions carefully to ensure proper system operation. For any issues, refer to the troubleshooting section or contact system administrators.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**System**: UNIOSUN Islamic CICS Cooperative Society Management System 