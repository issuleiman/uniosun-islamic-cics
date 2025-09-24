# UNIOSUN Islamic CICS Cooperative Society Management System# UNIOSUN Islamic CICS Cooperative Society Management System



A comprehensive Next.js-based web application for managing cooperative society operations, including member management, financial transactions, loan processing, and reporting.## System Overview



## 🚀 FeaturesThe UNIOSUN Islamic CICS Cooperative Society Management System is a comprehensive web-based application designed to manage cooperative society operations including member management, loan processing, withdrawal requests, monthly deductions, and financial reporting.



- **Member Management**: Complete member registration and profile management### Features

- **Financial Tracking**: Monthly deductions, savings, shares, and investments- **Member Management**: Add, edit, and manage society members

- **Loan Processing**: Loan applications, approvals, and payment tracking- **Loan Management**: Process loan applications and track repayments

- **Withdrawal System**: Special savings withdrawal requests and processing- **Withdrawal Requests**: Handle member withdrawal requests

- **Comprehensive Reporting**: Monthly and cumulative reports in PDF/Excel formats- **Monthly Deductions**: Manage monthly savings and deductions

- **Role-Based Access**: Admin and member dashboards with appropriate permissions- **Financial Reporting**: Generate PDF and Excel reports

- **Authentication**: Secure JWT-based authentication system- **Role-based Access**: Separate admin and member dashboards

- **Islamic Finance Compliance**: Sharia-compliant financial operations- **PDF Generation**: Dynamic table generation with proper formatting



## 🛠️ Technology Stack## System Requirements



- **Frontend**: Next.js 14 with App Router### Prerequisites

- **Backend**: Next.js API Routes- **Node.js** (version 16 or higher)

- **Database**: JSON file-based storage (lightweight alternative to SQL)- **npm** (Node Package Manager)

- **Authentication**: JWT (JSON Web Tokens)- **Git** (for cloning the repository)

- **Styling**: Tailwind CSS with custom design system- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

- **UI Components**: React with TypeScript

- **Icons**: Lucide React### Operating System Support

- **Charts**: Recharts for data visualization- Windows 10/11

- **File Generation**: PDFKit for PDFs, ExcelJS for Excel reports- macOS 10.15 or higher

- **Notifications**: React Hot Toast- Linux (Ubuntu 18.04+, CentOS 7+)



## 📁 Project Structure## Installation Guide



```### Step 1: Clone or Download the Project

auto-ui-5/

├── app/                    # Next.js App Router#### Option A: Using Git (Recommended)

│   ├── api/               # API routes```bash

│   │   ├── auth/          # Authentication endpointsgit clone <repository-url>

│   │   └── user/          # User-specific endpointscd auto-ui

│   ├── dashboard/         # Member dashboard pages```

│   ├── admin/            # Admin dashboard pages

│   ├── globals.css       # Global CSS with Tailwind#### Option B: Download ZIP File

│   ├── layout.tsx        # Root layout component1. Download the project ZIP file

│   └── page.tsx          # Home/login page2. Extract to your desired directory

├── lib/                  # Utility libraries3. Open terminal/command prompt in the extracted folder

│   ├── auth.ts          # Authentication utilities

│   └── data.ts          # Data management functions### Step 2: Install Dependencies

├── data/                 # JSON data files (replaces database)

│   ├── users.json#### Backend Dependencies

│   ├── monthly-deductions.json```bash

│   ├── loans.jsonnpm install

│   └── ...```

├── components/           # Reusable React components

└── package.json         # Dependencies and scripts#### Frontend Dependencies

``````bash

cd client

## 🚦 Getting Startednpm install

cd ..

### Prerequisites```



- Node.js 18+ ### Step 3: Verify Installation

- npm or yarn package manager```bash

# Check Node.js version

### Installationnode --version



1. **Clone the repository**# Check npm version

   ```bashnpm --version

   git clone https://github.com/issuleiman/uniosun-islamic-cics.git

   cd uniosun-islamic-cics# Verify all dependencies are installed

   ```npm list --depth=0

```

2. **Install dependencies**

   ```bash## Running the System

   npm install

   ```### Method 1: Using VS Code (Recommended)



3. **Set up environment variables**#### Step 1: Open in VS Code

   ```bash1. Open VS Code

   cp env.example .env.local2. Go to `File` → `Open Folder`

   ```3. Select the project folder (`auto-ui`)

   4. Wait for VS Code to load the project

   Edit `.env.local` with your configuration:

   ```#### Step 2: Open Terminal in VS Code

   JWT_SECRET=your-super-secret-jwt-key1. Press `Ctrl + `` (backtick) or go to `Terminal` → `New Terminal`

   NODE_ENV=development2. Ensure the terminal is in the project root directory

   ```

#### Step 3: Start the Development Server

4. **Start the development server**```bash

   ```bashnpm run dev

   npm run dev```

   ```

#### Step 4: Access the Application

5. **Open your browser**- **Frontend**: Open http://localhost:3000 in your browser

   Navigate to [http://localhost:3000](http://localhost:3000)- **Backend API**: Running on http://localhost:5000



### Default Login Credentials### Method 2: Using Command Prompt/Terminal



- **Admin Account**: #### Step 1: Navigate to Project Directory

  - Email/Member ID: `admin@cics.com````bash

  - Password: `password`cd path/to/auto-ui

```

- **Test Member Account**:

  - Member ID: `MEMBER001`#### Step 2: Start the Development Server

  - Password: `password````bash

npm run dev

## 🎯 Usage```



### For Members#### Step 3: Access the Application

- View personal financial summary and transaction history- Open your web browser

- Apply for loans and track application status- Navigate to http://localhost:3000

- Request special savings withdrawals

- Download monthly deduction slips and reports### Method 3: Running Backend and Frontend Separately

- Update personal information and change passwords

#### Start Backend Only

### For Administrators```bash

- Manage all members (add, edit, delete, view)npm run server

- Process loan applications (approve/decline)```

- Handle withdrawal requests

- Update monthly deductions and financial data#### Start Frontend Only (in a new terminal)

- Generate comprehensive reports (monthly/cumulative)```bash

- Monitor system statistics and member activitiesnpm run client

```

## 📊 Data Storage

## System Access

This application uses a JSON file-based storage system instead of a traditional SQL database:

### Default Login Credentials

- **Users**: Member information and authentication data

- **Monthly Deductions**: Monthly financial deduction records#### Admin Access

- **Loans**: Active and completed loan information- **Username**: admin@uniosun.edu.ng

- **Loan Applications**: Loan application requests and status- **Password**: admin123

- **Withdrawal Requests**: Special savings withdrawal requests- **Role**: Administrator

- **Loan Payments**: Payment history and tracking

#### Member Access

All data is stored in the `/data` directory as JSON files, making the application lightweight and easy to deploy without database setup requirements.- **Username**: member@uniosun.edu.ng

- **Password**: member123

## 🔐 Security Features- **Role**: Member



- **Password Hashing**: bcryptjs with salt rounds for secure password storage### Accessing Different Dashboards

- **JWT Authentication**: Stateless token-based authentication

- **Role-Based Access Control**: Separate admin and user permissions#### Admin Dashboard

- **Input Validation**: Comprehensive validation on all API endpoints1. Login with admin credentials

- **CORS Protection**: Cross-origin resource sharing controls2. Access full system management features

3. Navigate through tabs: Overview, Members, Loan Applications, etc.

## 📈 Reports Available

#### Member Dashboard

### Monthly Reports1. Login with member credentials

- Monthly Deduction Report2. Access personal dashboard features

- Monthly Payroll Report  3. View personal information, apply for loans, request withdrawals

- Monthly Savings Report

- Monthly Loan Report## Troubleshooting

- Monthly Withdrawal Report

- General System Report### Common Issues and Solutions



### Cumulative Reports#### Issue 1: Port Already in Use

- Cumulative Deduction Report**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

- Cumulative Payroll Report

- Cumulative Savings Report**Solution**:

- Cumulative Loan Report```bash

- Cumulative Withdrawal Report# Kill all Node.js processes

taskkill /f /im node.exe

All reports available in both PDF and Excel formats.

# Or find and kill specific process

## 🛠️ Developmentnetstat -ano | findstr :5000

taskkill /f /im <PID>

### Available Scripts```



- `npm run dev` - Start development server#### Issue 2: Frontend Compilation Errors

- `npm run build` - Build for production**Error**: ESLint errors or compilation failures

- `npm start` - Start production server

- `npm run lint` - Run ESLint**Solution**:

```bash

### Project Configuration# Clear npm cache

npm cache clean --force

- **TypeScript**: Full TypeScript support with strict mode

- **Tailwind CSS**: Utility-first CSS framework with custom theme# Reinstall dependencies

- **ESLint**: Code linting with Next.js recommended rulesrm -rf node_modules package-lock.json

- **PostCSS**: CSS processing with autoprefixernpm install



## 📱 Responsive Design# Restart development server

npm run dev

The application is fully responsive and works seamlessly on:```

- Desktop computers

- Tablets#### Issue 3: Module Not Found Errors

- Mobile devices**Error**: `Cannot find module 'xyz'`



## 🚀 Deployment**Solution**:

```bash

The application can be deployed to any platform that supports Next.js:# Reinstall all dependencies

npm install

### Vercel (Recommended)

1. Push your code to GitHub# Check if all dependencies are in package.json

2. Connect your repository to Vercelnpm list --depth=0

3. Deploy automatically```



### Other Platforms#### Issue 4: Browser Access Issues

- Netlify**Problem**: Cannot access localhost:3000

- Railway

- DigitalOcean App Platform**Solution**:

- AWS Amplify1. Check if both servers are running

- Self-hosted with PM22. Verify firewall settings

3. Try accessing http://127.0.0.1:3000 instead

### Build for Production4. Check browser console for errors



```bash### Development Commands

npm run build

npm start#### Available Scripts

``````bash

# Start both backend and frontend

## 📄 Licensenpm run dev



This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.# Start only backend server

npm run server

## 👥 Contributing

# Start only frontend

1. Fork the repositorynpm run client

2. Create a feature branch (`git checkout -b feature/amazing-feature`)

3. Commit your changes (`git commit -m 'Add some amazing feature'`)# Build for production

4. Push to the branch (`git push origin feature/amazing-feature`)npm run build

5. Open a Pull Request

# Run tests

## 🆘 Supportnpm test

```

For support, email support@uniosun-cics.com or create an issue in the GitHub repository.

#### Stopping the Application

## 🙏 Acknowledgments- Press `Ctrl + C` in the terminal to stop the development server

- Or close the terminal window

- UNIOSUN Islamic CICS for project requirements and specifications

- Next.js team for the excellent framework## File Structure

- Tailwind CSS for the utility-first CSS framework

- All contributors and maintainers```

auto-ui/

---├── client/                 # React frontend

│   ├── public/

**UNIOSUN Islamic CICS Cooperative Society Management System** - Built with ❤️ using Next.js│   │   ├── components/
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