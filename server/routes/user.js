const express = require('express');
const { authenticateToken, requireUser } = require('../middleware/auth');
const { User, Loan, LoanApplication, WithdrawalRequest } = require('../models');

const router = express.Router();

// Utility function to calculate dynamic column widths based on content
function calculateColumnWidths(headers, data, maxWidth = 800, minWidth = 60) {
  const columnWidths = [];
  const padding = 20; // Extra space for padding
  
  // Calculate maximum content length for each column
  headers.forEach((header, colIndex) => {
    let maxLength = header.length;
    
    // Check all data rows for this column
    data.forEach(row => {
      const cellValue = row[colIndex] || '';
      const cellLength = cellValue.toString().length;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    
    // Calculate width based on character length (approximate)
    // Assuming each character is roughly 8-10 points wide
    let calculatedWidth = Math.max(maxLength * 8, minWidth);
    
    // Cap at maximum width
    calculatedWidth = Math.min(calculatedWidth, maxWidth);
    
    columnWidths.push(calculatedWidth);
  });
  
  // Adjust widths to fit within page width
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const availableWidth = 800; // Approximate page width minus margins
  
  if (totalWidth > availableWidth) {
    const scaleFactor = availableWidth / totalWidth;
    columnWidths.forEach((width, index) => {
      columnWidths[index] = Math.max(width * scaleFactor, minWidth);
    });
  }
  
  return columnWidths;
}

// Utility function to create table with dynamic column widths
function createDynamicTable(doc, headers, data, startY, rowHeight = 25) {
  const columnWidths = calculateColumnWidths(headers, data);
  const startX = 50;
  
  // Calculate x positions for each column
  const xPositions = [];
  let currentX = startX;
  columnWidths.forEach(width => {
    xPositions.push(currentX);
    currentX += width;
  });

  let y = startY;
  const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const headerHeight = rowHeight;

  // Draw header row
  headers.forEach((header, index) => {
    const x = xPositions[index];
    const width = columnWidths[index];
    doc.rect(x, y, width, headerHeight).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(header, x + 5, y + 8, {
      width: width - 10,
      align: 'left',
      ellipsis: true
    });
  });
  y += headerHeight;

  // Draw data rows
  data.forEach((row, rowIndex) => {
    // Check for page overflow
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      // Redraw header on new page
      headers.forEach((header, index) => {
        const x = xPositions[index];
        const width = columnWidths[index];
        doc.rect(x, y, width, headerHeight).stroke();
        doc.fontSize(10).font('Helvetica-Bold').text(header, x + 5, y + 8, {
          width: width - 10,
          align: 'left',
          ellipsis: true
        });
      });
      y += headerHeight;
    }
    row.forEach((cell, colIndex) => {
      const x = xPositions[colIndex];
      const width = columnWidths[colIndex];
      doc.rect(x, y, width, rowHeight).stroke();
      doc.fontSize(9).font('Helvetica').text(cell || '', x + 5, y + 8, {
        width: width - 10,
        align: 'left',
        ellipsis: true
      });
    });
    y += rowHeight;
  });
  return { columnWidths, xPositions, totalWidth: xPositions[xPositions.length - 1] + columnWidths[columnWidths.length - 1] - startX };
}

// Apply authentication middleware to all user routes
router.use(authenticateToken);
router.use(requireUser);

// Get user dashboard data with optional month/year filtering
router.get('/dashboard', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const { month, year } = req.query;
    
    // Parse month and year if provided
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;
    
    // Validate month/year if both are provided
    if ((targetMonth && !targetYear) || (!targetMonth && targetYear)) {
      return res.status(400).json({ 
        error: 'Both month and year must be provided together',
        example: '?month=7&year=2025'
      });
    }
    
    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    // Get user data for specific month/year or current data
    const user = await User.findByMemberId(memberId, targetMonth, targetYear);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found',
        message: 'The requested user could not be found' 
      });
    }

    // Get cumulative data separately for comparison
    const cumulatives = await User.getUserCumulatives(memberId);
    
    // Get active loans for this user
    const activeLoans = await Loan.findActiveByUserId(user.id);

    // Calculate total monthly deduction
    const totalMonthlyDeduction = Object.values(user.deductions || {}).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);

    const dashboardData = {
      user: {
        id: user.id,
        memberId: user.memberId,
        firstName: user.firstName,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        bankName: user.bankName,
        accountNumber: user.accountNumber,
        accountHolderName: user.accountHolderName
      },
      context: {
        filtered: !!(targetMonth && targetYear),
        month: targetMonth,
        year: targetYear,
        monthName: targetMonth ? new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long' }) : null,
        period: targetMonth && targetYear ? `${targetMonth}/${targetYear}` : 'Current'
      },
      // Top-level savings property for backward compatibility
      savings: {
        monthlySavings: user.deductions.regularSavings,
        cumulativeSavings: user.cumulativeSavings,
        specialSavingsBalance: user.specialSavingsBalance,
        monthlySpecialSavings: user.deductions.specialSavings
      },
      // Top-level shares and investment for backward compatibility
      shares: {
        monthlyShares: user.deductions.shares,
        cumulativeShares: user.cumulativeShares
      },
      investment: {
        monthlyInvestment: user.deductions.investment,
        cumulativeInvestment: user.cumulativeInvestment
      },
      monthly: {
        savings: {
          monthlySavings: user.deductions.regularSavings,
          monthlySpecialSavings: user.deductions.specialSavings,
          shares: user.deductions.shares,
          investment: user.deductions.investment,
          loanRepayment: user.deductions.loanRepayment,
          overDeduction: user.deductions.overDeduction,
          underDeduction: user.deductions.underDeduction,
          ileyaLoan: user.deductions.ileyaLoan,
          business: user.deductions.business,
          total: totalMonthlyDeduction
        }
      },
      cumulative: {
        savings: {
          cumulativeSavings: user.cumulativeSavings,
          specialSavingsBalance: user.specialSavingsBalance,
          cumulativeShares: user.cumulativeShares,
          cumulativeInvestment: user.cumulativeInvestment
        },
        fromMonthlyData: cumulatives ? {
          totalRegularSavings: parseFloat(cumulatives.total_regular_savings || 0),
          totalSpecialSavings: parseFloat(cumulatives.total_special_savings || 0),
          totalShares: parseFloat(cumulatives.total_shares || 0),
          totalInvestment: parseFloat(cumulatives.total_investment || 0),
          totalLoanRepayment: parseFloat(cumulatives.total_loan_repayment || 0),
          monthsRecorded: parseInt(cumulatives.months_recorded || 0)
        } : null
      },
      loans: {
        activeLoans,
        totalActiveLoans: activeLoans.length,
        totalLoanBalance: activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0)
      },
      deductions: {
        ...user.deductions,
        total: totalMonthlyDeduction
      }
    };

    res.json({
      success: true,
      data: {
        dashboard: dashboardData,
        // Also include direct fields for backward compatibility
        savings: {
          monthlySavings: user.deductions.regularSavings,
          cumulativeSavings: user.cumulativeSavings,
          specialSavingsBalance: user.specialSavingsBalance,
          monthlySpecialSavings: user.deductions.specialSavings
        },
        loans: dashboardData.loans,
        totalMonthlyDeduction: dashboardData.deductions.total
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get dashboard data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get monthly deduction slip with optional month/year filtering
router.get('/monthly-slip', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const { month, year } = req.query;
    
    // Parse month and year if provided
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;
    
    // Validate month/year if both are provided
    if ((targetMonth && !targetYear) || (!targetMonth && targetYear)) {
      return res.status(400).json({ 
        error: 'Both month and year must be provided together',
        example: '?month=7&year=2025'
      });
    }
    
    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    const user = await User.findByMemberId(memberId, targetMonth, targetYear);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter out zero-value deductions
    const nonZeroDeductions = Object.entries(user.deductions || {})
      .filter(([key, value]) => value > 0)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    const totalDeduction = Object.values(user.deductions || {}).reduce((sum, amount) => sum + amount, 0);

    // Determine the period display
    const periodDisplay = targetMonth && targetYear 
      ? new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const slip = {
      memberName: `${user.firstName} ${user.surname}`,
      memberId: user.memberId,
      staffId: user.memberId,
      month: periodDisplay,
      deductions: nonZeroDeductions,
      totalDeduction,
      cumulativeSavings: user.cumulativeSavings,
      cumulativeShares: user.cumulativeShares,
      cumulativeInvestment: user.cumulativeInvestment,
      context: {
        filtered: !!(targetMonth && targetYear),
        month: targetMonth,
        year: targetYear,
        monthName: targetMonth ? new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long' }) : null,
        period: targetMonth && targetYear ? `${targetMonth}/${targetYear}` : 'Current'
      }
    };

    res.json({ 
      success: true, 
      data: { slip } 
    });

  } catch (error) {
    console.error('Get monthly slip error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get monthly slip',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get monthly slip PDF with optional month/year filtering
router.get('/monthly-slip/pdf', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const { month, year } = req.query;
    
    // Parse month and year if provided
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;
    
    // Validate month/year if both are provided
    if ((targetMonth && !targetYear) || (!targetMonth && targetYear)) {
      return res.status(400).json({ 
        error: 'Both month and year must be provided together',
        example: '?month=7&year=2025'
      });
    }
    
    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    const user = await User.findByMemberId(memberId, targetMonth, targetYear);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    // Generate filename with month/year if specified
    const dateString = targetMonth && targetYear 
      ? `${targetYear}-${targetMonth.toString().padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];
    
    res.setHeader('Content-Disposition', `attachment; filename="monthly_slip_${user.memberId}_${dateString}.pdf"`);
    
    doc.pipe(res);

    // Simple header
    doc.fontSize(20).font('Helvetica-Bold').text('UNIOSUN Islamic CICS Cooperative Society', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica').text('Monthly Deduction Slip', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Member information
    doc.fontSize(14).font('Helvetica-Bold').text('Member Information');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Name: ${user.firstName} ${user.surname}`);
    doc.fontSize(12).font('Helvetica').text(`Member ID: ${user.memberId}`);
    // Determine the period display for PDF
    const pdfPeriodDisplay = targetMonth && targetYear 
      ? new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    doc.fontSize(12).font('Helvetica').text(`Month: ${pdfPeriodDisplay}`);
    doc.moveDown(2);

    // Deductions table
    doc.fontSize(14).font('Helvetica-Bold').text('Monthly Deductions');
    doc.moveDown(0.5);

    const deductions = user.deductions || {};
    const nonZeroDeductions = Object.entries(deductions).filter(([key, value]) => value > 0);
    
    // Table with dynamic column widths
    const tableStartY = doc.y;
    const headers = ['Deduction Type', 'Amount (₦)'];
    const tableData = nonZeroDeductions.map(([key, value]) => {
      const deductionName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      return [deductionName, value.toLocaleString()];
    });
    
    // Add total row
    const totalDeduction = Object.values(deductions).reduce((sum, amount) => sum + amount, 0);
    tableData.push(['Total Deduction', `₦${totalDeduction.toLocaleString()}`]);
    
    createDynamicTable(doc, headers, tableData, tableStartY, 25);
    
    doc.moveDown(2);

    // Cumulative balances table
    doc.fontSize(14).font('Helvetica-Bold').text('Cumulative Balances');
    doc.moveDown(0.5);
    
    const cumulativeTableStartY = doc.y;
    const cumulativeRowHeight = 25;
    
    const cumulativeHeaders = ['Balance Type', 'Amount (₦)'];
    const cumulativeData = [
      ['Cumulative Savings', `₦${user.cumulativeSavings.toLocaleString()}`],
      ['Cumulative Shares', `₦${user.cumulativeShares.toLocaleString()}`],
      ['Cumulative Investment', `₦${user.cumulativeInvestment.toLocaleString()}`],
      ['Special Savings Balance', `₦${user.specialSavingsBalance.toLocaleString()}`]
    ];
    
    createDynamicTable(doc, cumulativeHeaders, cumulativeData, cumulativeTableStartY, 25);

    // Footer
    doc.fontSize(10).font('Helvetica').text('This is an official document of UNIOSUN Islamic CICS Cooperative Society', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('For inquiries, contact the administration office', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Get monthly slip PDF error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get monthly slip PDF',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Apply for loan with enhanced eligibility checking
router.post('/loans/apply', async (req, res) => {
  try {
    const { amount, duration, purpose, loanCategory = 'standard' } = req.body;
    const memberId = req.user.memberId || req.user.id;

    if (!amount || !duration) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        message: 'Loan amount and duration are required to submit a loan application.',
        details: {
          missingFields: [],
          hint: 'Please provide both the loan amount and repayment duration.'
        }
      });
    }
    
    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing loan amount',
        message: 'Please specify the loan amount you wish to borrow.',
        hint: 'Enter the amount in Nigerian Naira (₦)'
      });
    }
    
    if (!duration) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing loan duration',
        message: 'Please specify how many months you want to repay the loan over.',
        hint: 'Duration should be in months (e.g., 12 for 1 year)'
      });
    }

    const user = await User.findByMemberId(memberId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const amountNum = parseFloat(amount);
    const durationNum = parseInt(duration);
    if (isNaN(amountNum) || isNaN(durationNum) || amountNum <= 0 || durationNum <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid input values',
        message: 'Amount and duration must be valid positive numbers.',
        details: {
          amount: isNaN(amountNum) ? 'Invalid amount format' : amountNum <= 0 ? 'Amount must be greater than 0' : 'Valid',
          duration: isNaN(durationNum) ? 'Invalid duration format' : durationNum <= 0 ? 'Duration must be greater than 0' : 'Valid'
        },
        hint: 'Please enter valid numbers for both amount and duration.'
      });
    }

    // Map loan categories to standardized values
    const categoryMap = {
      'ileya': 'ileya',
      'regular': 'regular',
      'business': 'business'
    };
    const finalCategory = categoryMap[loanCategory] || loanCategory || 'regular';

    const loanApplicationData = {
      memberId: user.memberId,
      amount: amountNum,
      duration: durationNum,
      purpose: purpose || 'General',
      loanCategory: finalCategory
    };

    // Create loan application
    const newApplication = await LoanApplication.create(loanApplicationData);

    res.json({
      message: 'Loan application submitted successfully',
      application: newApplication,
      applicationId: newApplication.applicationId
    });

  } catch (error) {
    console.error('Loan application error:', error);
    
    // Return eligibility-specific errors to user
    if (error.message.includes('exceeds') || 
        error.message.includes('below') || 
        error.message.includes('membership') ||
        error.message.includes('active loan')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to submit loan application' });
  }
});

// Get special savings balance info
router.get('/special-savings/balance', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const user = await User.findByMemberId(memberId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = user.specialSavingsBalance || 0;
    const minimumWithdrawal = 100; // ₦100 minimum

    res.json({
      memberId: user.memberId,
      memberName: `${user.firstName} ${user.surname}`,
      specialSavingsBalance: currentBalance,
      formattedBalance: `₦${currentBalance.toLocaleString()}`,
      minimumWithdrawal: minimumWithdrawal,
      canWithdraw: currentBalance >= minimumWithdrawal,
      maxWithdrawable: Math.max(0, currentBalance),
      balanceInfo: {
        available: currentBalance,
        minimum: minimumWithdrawal,
        withdrawable: currentBalance >= minimumWithdrawal ? currentBalance : 0
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance information' });
  }
});

// Request special savings withdrawal with balance validation
router.post('/special-savings/withdraw-request', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const memberId = req.user.memberId || req.user.id;

    if (!amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing withdrawal amount',
        message: 'Please specify how much money you want to withdraw from your special savings account.',
        hint: 'Enter the amount in Nigerian Naira (₦)'
      });
    }

    const user = await User.findByMemberId(memberId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const withdrawalAmountNum = parseFloat(amount);
    if (isNaN(withdrawalAmountNum) || withdrawalAmountNum <= 0) {
      return res.status(400).json({ error: 'Amount must be a valid positive number' });
    }

    // Check if user has sufficient special savings balance
    const currentBalance = user.specialSavingsBalance || 0;
    
    if (withdrawalAmountNum > currentBalance) {
      return res.status(400).json({
        error: 'Insufficient special savings balance',
        details: `You don't have sufficient special savings balance for this withdrawal.`,
        currentBalance: currentBalance,
        requestedAmount: withdrawalAmountNum,
        shortfall: withdrawalAmountNum - currentBalance,
        message: `Your current special savings balance is ₦${currentBalance.toLocaleString()}. You cannot withdraw ₦${withdrawalAmountNum.toLocaleString()} as it exceeds your available balance by ₦${(withdrawalAmountNum - currentBalance).toLocaleString()}.`,
        suggestion: `Please reduce your withdrawal amount to ₦${currentBalance.toLocaleString()} or less.`
      });
    }

    // Minimum withdrawal validation (optional - you can adjust this amount)
    const minimumWithdrawal = 100; // ₦100 minimum
    if (withdrawalAmountNum < minimumWithdrawal) {
      return res.status(400).json({
        error: 'Withdrawal amount too small',
        message: `Minimum withdrawal amount is ₦${minimumWithdrawal.toLocaleString()}`,
        minimumAmount: minimumWithdrawal
      });
    }

    const withdrawalRequestData = {
      memberId: user.memberId,
      amount: withdrawalAmountNum,
      reason: reason || 'Personal use'
    };

    const newRequest = await WithdrawalRequest.create(withdrawalRequestData);

    res.json({
      message: 'Withdrawal request submitted successfully',
      request: newRequest,
      requestId: newRequest.requestId || newRequest.id,
      balanceInfo: {
        currentBalance: currentBalance,
        withdrawalAmount: withdrawalAmountNum,
        remainingBalance: currentBalance - withdrawalAmountNum
      }
    });

  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ error: 'Failed to submit withdrawal request' });
  }
});

// Get loan applications
router.get('/loans/applications', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const user = await User.findByMemberId(memberId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const applications = await LoanApplication.findByUserId(user.id);

    res.json({ applications });

  } catch (error) {
    console.error('Get loan applications error:', error);
    res.status(500).json({ error: 'Failed to get loan applications' });
  }
});

// Get withdrawal requests
router.get('/special-savings/withdrawal-requests', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const user = await User.findByMemberId(memberId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const requests = await WithdrawalRequest.findByUserId(user.id);

    res.json({ requests });

  } catch (error) {
    console.error('Get withdrawal requests error:', error);
    res.status(500).json({ error: 'Failed to get withdrawal requests' });
  }
});

// Get loan history
router.get('/loans/history', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const user = await User.findByMemberId(memberId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loanHistory = await Loan.findByUserId(user.id);

    res.json({ loanHistory });

  } catch (error) {
    console.error('Get loan history error:', error);
    res.status(500).json({ error: 'Failed to get loan history' });
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mock transaction history - in a real system, this would come from a transactions table
    const transactions = [
      {
        id: 'TXN001',
        type: 'savings',
        amount: 5000,
        description: 'Monthly Regular Savings',
        date: new Date('2024-01-15'),
        status: 'completed'
      },
      {
        id: 'TXN002',
        type: 'shares',
        amount: 3000,
        description: 'Monthly Shares Contribution',
        date: new Date('2024-01-15'),
        status: 'completed'
      },
      {
        id: 'TXN003',
        type: 'investment',
        amount: 1500,
        description: 'Monthly Investment',
        date: new Date('2024-01-15'),
        status: 'completed'
      },
      {
        id: 'TXN004',
        type: 'special_savings',
        amount: 2000,
        description: 'Monthly Special Savings',
        date: new Date('2024-01-15'),
        status: 'completed'
      },
      {
        id: 'TXN005',
        type: 'loan_repayment',
        amount: 0,
        description: 'Loan Repayment (No active loans)',
        date: new Date('2024-01-15'),
        status: 'completed'
      }
    ];

    res.json({ transactions });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
    return;
  }
});

// Get account monitoring data
router.get('/account-monitoring', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const monitoringData = {
      overDeductions: user.deductions.overDeduction,
      underDeductions: user.deductions.underDeduction,
      totalSavings: user.cumulativeSavings + user.cumulativeShares + user.cumulativeInvestment,
      specialSavingsBalance: user.specialSavingsBalance,
      activeLoans: user.loans.filter(loan => loan.status === 'active').length,
      pendingApplications: (user.loanApplications || []).filter(app => app.status === 'pending').length,
      pendingWithdrawals: (user.withdrawalRequests || []).filter(req => req.status === 'pending').length
    };

    res.json({ monitoring: monitoringData });

  } catch (error) {
    console.error('Get account monitoring error:', error);
    res.status(500).json({ error: 'Failed to get account monitoring data' });
    return;
  }
});

// Get cumulative reports
router.get('/cumulative-reports', async (req, res) => {
  try {
    const memberId = req.user.memberId || req.user.id;
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;

    if ((targetMonth && !targetYear) || (!targetMonth && targetYear)) {
      return res.status(400).json({ error: 'Both month and year must be provided together', example: '?month=7&year=2025' });
    }

    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    const user = await User.findByMemberId(memberId, targetMonth, targetYear);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's loans and withdrawal requests
    const userLoans = await Loan.findByUserId(user.id);
    const withdrawalRequests = await WithdrawalRequest.findByUserId(user.id);

    const isMonthly = !!(targetMonth && targetYear);
    // Calculate reports
    const reports = {
      context: { filtered: isMonthly, month: targetMonth, year: targetYear },
      savings: isMonthly ? {
        total: (user.deductions?.regularSavings || 0) + (user.deductions?.specialSavings || 0) + (user.deductions?.shares || 0) + (user.deductions?.investment || 0),
        regular: user.deductions?.regularSavings || 0,
        special: user.deductions?.specialSavings || 0,
        shares: user.deductions?.shares || 0,
        investment: user.deductions?.investment || 0
      } : {
        total: user.cumulativeSavings + user.cumulativeShares + user.cumulativeInvestment,
        regular: user.cumulativeSavings,
        special: user.specialSavingsBalance,
        shares: user.cumulativeShares,
        investment: user.cumulativeInvestment
      },
      loans: {
        totalBorrowed: userLoans.reduce((sum, loan) => sum + loan.amount, 0),
        totalRepaid: userLoans.reduce((sum, loan) => sum + (loan.amount - loan.remainingBalance), 0),
        outstanding: userLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0),
        activeLoans: userLoans.filter(loan => loan.status === 'active')
      },
      specialSavings: {
        currentBalance: user.specialSavingsBalance,
        totalDeposits: user.specialSavingsBalance + (withdrawalRequests?.reduce((sum, req) => sum + req.amount, 0) || 0),
        totalWithdrawals: withdrawalRequests?.reduce((sum, req) => sum + req.amount, 0) || 0
      }
    };

    res.json({ success: true, data: { reports } });

  } catch (error) {
    console.error('Get cumulative reports error:', error);
    res.status(500).json({ error: 'Failed to get cumulative reports' });
  }
});

// Download cumulative report
router.get('/cumulative-reports/:type/:format', async (req, res) => {
  try {
    const { type, format } = req.params;
    const { month, year } = req.query;
    const memberId = req.user.memberId || req.user.id;
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;

    if ((targetMonth && !targetYear) || (!targetMonth && targetYear)) {
      return res.status(400).json({ error: 'Both month and year must be provided together', example: '?month=7&year=2025' });
    }

    if (targetMonth && (targetMonth < 1 || targetMonth > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    const user = await User.findByMemberId(memberId, targetMonth, targetYear);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate report data based on type
    let reportData = {};
    let filename = '';

    const isMonthly = !!(targetMonth && targetYear);
      const dateSuffix = isMonthly
        ? `${targetYear}-${targetMonth.toString().padStart(2, '0')}`
        : 'all';
      const periodDisplay = isMonthly
        ? new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'All Time';
    switch (type) {
      case 'savings':
        reportData = {
          memberName: `${user.firstName} ${user.surname}`,
          memberId: user.memberId,
            reportType: isMonthly ? 'Monthly Savings Report' : 'Cumulative Savings Report',
            generatedOn: new Date().toLocaleDateString(),
            period: periodDisplay,
          data: isMonthly ? {
            totalSavings: (user.deductions?.regularSavings || 0) + (user.deductions?.specialSavings || 0) + (user.deductions?.shares || 0) + (user.deductions?.investment || 0),
            regularSavings: user.deductions?.regularSavings || 0,
            specialSavings: user.deductions?.specialSavings || 0,
            shares: user.deductions?.shares || 0,
            investment: user.deductions?.investment || 0
          } : {
            totalSavings: user.cumulativeSavings + user.cumulativeShares + user.cumulativeInvestment,
            regularSavings: user.cumulativeSavings,
            specialSavings: user.specialSavingsBalance,
            shares: user.cumulativeShares,
            investment: user.cumulativeInvestment
          }
        };
          filename = `savings_report_${user.memberId}_${dateSuffix}`;
        break;

      case 'loans':
        const totalBorrowed = user.loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalRepaid = user.loans.reduce((sum, loan) => sum + (loan.amount - loan.remainingBalance), 0);
        const outstanding = user.loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
        
        reportData = {
          memberName: `${user.firstName} ${user.surname}`,
          memberId: user.memberId,
            reportType: isMonthly ? 'Monthly Loans Snapshot' : 'Cumulative Loans Report',
            generatedOn: new Date().toLocaleDateString(),
            period: periodDisplay,
          data: {
            totalBorrowed,
            totalRepaid,
            outstanding,
            activeLoans: user.loans.filter(loan => loan.status === 'active')
          }
        };
          filename = `loans_report_${user.memberId}_${dateSuffix}`;
        break;

      case 'special-savings':
        const totalWithdrawals = user.withdrawalRequests?.reduce((sum, req) => sum + req.amount, 0) || 0;
        const totalDeposits = user.specialSavingsBalance + totalWithdrawals;
        
        reportData = {
          memberName: `${user.firstName} ${user.surname}`,
          memberId: user.memberId,
            reportType: isMonthly ? 'Monthly Special Savings Snapshot' : 'Special Savings Report',
            generatedOn: new Date().toLocaleDateString(),
            period: periodDisplay,
          data: {
            currentBalance: user.specialSavingsBalance,
            totalDeposits,
            totalWithdrawals
          }
        };
          filename = `special_savings_report_${user.memberId}_${dateSuffix}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Generate file based on format
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      
      doc.pipe(res);

      // Simple header
      doc.fontSize(20).font('Helvetica-Bold').text('UNIOSUN Islamic CICS Cooperative Society', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text(reportData.reportType, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Report Period: ${reportData.period}`, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Generated on: ${reportData.generatedOn}`, { align: 'center' });
      doc.moveDown(2);

      // Member information
      doc.fontSize(14).font('Helvetica-Bold').text('Member Information');
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Name: ${reportData.memberName}`);
      doc.fontSize(12).font('Helvetica').text(`Member ID: ${reportData.memberId}`);
      doc.fontSize(12).font('Helvetica').text(`Report Period: ${reportData.period}`);
      doc.moveDown(2);

      // Report data
      doc.fontSize(14).font('Helvetica-Bold').text('Report Summary');
      doc.moveDown(0.5);

      // Create simple table based on type
      if (type === 'savings') {
        const tableStartY = doc.y;
        const rowHeight = 25;
        const col1Width = 300;
        const col2Width = 200;
        
        // Header row
        doc.rect(50, tableStartY, col1Width, rowHeight).stroke();
        doc.rect(350, tableStartY, col2Width, rowHeight).stroke();
        doc.fontSize(12).font('Helvetica-Bold').text('Description', 60, tableStartY + 8);
        doc.fontSize(12).font('Helvetica-Bold').text('Amount', 360, tableStartY + 8);
        
        const savingsData = [
          ['Total Savings', `₦${reportData.data.totalSavings.toLocaleString()}`],
          ['Regular Savings', `₦${reportData.data.regularSavings.toLocaleString()}`],
          ['Special Savings', `₦${reportData.data.specialSavings.toLocaleString()}`],
          ['Shares', `₦${reportData.data.shares.toLocaleString()}`],
          ['Investment', `₦${reportData.data.investment.toLocaleString()}`]
        ];
        
        savingsData.forEach((row, index) => {
          const y = tableStartY + (rowHeight * (index + 1));
          doc.rect(50, y, col1Width, rowHeight).stroke();
          doc.rect(350, y, col2Width, rowHeight).stroke();
          doc.fontSize(10).font('Helvetica').text(row[0], 60, y + 8);
          doc.fontSize(10).font('Helvetica').text(row[1], 360, y + 8);
        });
      } else if (type === 'deductions') {
        const tableStartY = doc.y;
        const rowHeight = 25;
        const col1Width = 300;
        const col2Width = 200;
        
        // Header row
        doc.rect(50, tableStartY, col1Width, rowHeight).stroke();
        doc.rect(350, tableStartY, col2Width, rowHeight).stroke();
        doc.fontSize(12).font('Helvetica-Bold').text('Deduction Type', 60, tableStartY + 8);
        doc.fontSize(12).font('Helvetica-Bold').text('Amount', 360, tableStartY + 8);
        
        const deductionsData = Object.entries(reportData.data).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          `₦${value.toLocaleString()}`
        ]);
        
        deductionsData.forEach((row, index) => {
          const y = tableStartY + (rowHeight * (index + 1));
          doc.rect(50, y, col1Width, rowHeight).stroke();
          doc.rect(350, y, col2Width, rowHeight).stroke();
          doc.fontSize(10).font('Helvetica').text(row[0], 60, y + 8);
          doc.fontSize(10).font('Helvetica').text(row[1], 360, y + 8);
        });
      } else if (type === 'loans') {
        const tableStartY = doc.y;
        const rowHeight = 25;
        const col1Width = 200;
        const col2Width = 150;
        const col3Width = 150;
        const col4Width = 150;
        
        // Header row
        doc.rect(50, tableStartY, col1Width, rowHeight).stroke();
        doc.rect(250, tableStartY, col2Width, rowHeight).stroke();
        doc.rect(400, tableStartY, col3Width, rowHeight).stroke();
        doc.rect(550, tableStartY, col4Width, rowHeight).stroke();
        doc.fontSize(12).font('Helvetica-Bold').text('Loan Type', 60, tableStartY + 8);
        doc.fontSize(12).font('Helvetica-Bold').text('Amount', 260, tableStartY + 8);
        doc.fontSize(12).font('Helvetica-Bold').text('Status', 410, tableStartY + 8);
        doc.fontSize(12).font('Helvetica-Bold').text('Date Applied', 560, tableStartY + 8);
        
        const loansData = [
          [reportData.data.loanType || 'N/A', `₦${reportData.data.loanAmount ? reportData.data.loanAmount.toLocaleString() : '0'}`, reportData.data.loanStatus || 'N/A', reportData.data.loanDateApplied || 'N/A']
        ];
        
        loansData.forEach((row, index) => {
          const y = tableStartY + (rowHeight * (index + 1));
          doc.rect(50, y, col1Width, rowHeight).stroke();
          doc.rect(250, y, col2Width, rowHeight).stroke();
          doc.rect(400, y, col3Width, rowHeight).stroke();
          doc.rect(550, y, col4Width, rowHeight).stroke();
          doc.fontSize(10).font('Helvetica').text(row[0], 60, y + 8);
          doc.fontSize(10).font('Helvetica').text(row[1], 260, y + 8);
          doc.fontSize(10).font('Helvetica').text(row[2], 410, y + 8);
          doc.fontSize(10).font('Helvetica').text(row[3], 560, y + 8);
        });
      }
      
      doc.moveDown(3);
      
      // Footer
      doc.fontSize(10).font('Helvetica').text('This is an official document of UNIOSUN Islamic CICS Cooperative Society', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('For inquiries, contact the administration office', { align: 'center' });

      doc.end();
    } else if (format === 'xlsx') {
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      
      // Convert report data to worksheet format
      let worksheetData = [];
      if (type === 'savings') {
        worksheetData = [
          { 'Metric': 'Total Savings', 'Amount': reportData.data.totalSavings },
          { 'Metric': 'Regular Savings', 'Amount': reportData.data.regularSavings },
          { 'Metric': 'Special Savings', 'Amount': reportData.data.specialSavings },
          { 'Metric': 'Shares', 'Amount': reportData.data.shares },
          { 'Metric': 'Investment', 'Amount': reportData.data.investment }
        ];
      } else if (type === 'loans') {
        worksheetData = [
          { 'Metric': 'Total Borrowed', 'Amount': reportData.data.totalBorrowed },
          { 'Metric': 'Total Repaid', 'Amount': reportData.data.totalRepaid },
          { 'Metric': 'Outstanding', 'Amount': reportData.data.outstanding },
          { 'Metric': 'Active Loans', 'Count': reportData.data.activeLoans.length }
        ];
      } else if (type === 'special-savings') {
        worksheetData = [
          { 'Metric': 'Current Balance', 'Amount': reportData.data.currentBalance },
          { 'Metric': 'Total Deposits', 'Amount': reportData.data.totalDeposits },
          { 'Metric': 'Total Withdrawals', 'Amount': reportData.data.totalWithdrawals }
        ];
      }
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

  } catch (error) {
    console.error('Download cumulative report error:', error);
    res.status(500).json({ error: 'Failed to download report' });
    return;
  }
});



module.exports = router; 