const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { User, Loan, LoanApplication, WithdrawalRequest } = require('../models');
const LoanEnhanced = require('../models/LoanEnhanced');
const { query } = require('../config/database');

const router = express.Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get members with STRICT month/year filtering (no mixing of data)
router.get('/members', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // For admin dashboard, month and year are REQUIRED for consistency
    if (!month || !year) {
      return res.status(400).json({ 
        error: 'Month and year parameters are required for admin member data',
        hint: 'Admin operations must specify exact month/year for data consistency'
      });
    }
    
    // Convert to integers and validate
    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);
    
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
    }
    
    const members = await User.findMembers(targetMonth, targetYear);
    const membersWithoutPasswords = members.map(({ password, password_hash, ...member }) => member);
    
    // Calculate totals ONLY for the specific month/year
    const totals = {
      totalMembers: members.length,
      totalSavings: 0,
      totalShares: 0,
      totalInvestment: 0,
      totalSpecialSavings: 0,
      totalLoanRepayment: 0,
      totalOverDeduction: 0,
      totalUnderDeduction: 0,
      totalIleyaLoan: 0,
      totalBusiness: 0,
      grandTotal: 0,
      membersWithData: 0
    };
    
    membersWithoutPasswords.forEach(member => {
      if (member.deductions && (member.monthlyContext?.month === targetMonth && member.monthlyContext?.year === targetYear)) {
        totals.totalSavings += member.deductions.regularSavings || 0;
        totals.totalShares += member.deductions.shares || 0;
        totals.totalInvestment += member.deductions.investment || 0;
        totals.totalSpecialSavings += member.deductions.specialSavings || 0;
        totals.totalLoanRepayment += member.deductions.loanRepayment || 0;
        totals.totalOverDeduction += member.deductions.overDeduction || 0;
        totals.totalUnderDeduction += member.deductions.underDeduction || 0;
        totals.totalIleyaLoan += member.deductions.ileyaLoan || 0;
        totals.totalBusiness += member.deductions.business || 0;
        totals.grandTotal += member.deductions.total || 0;
        if (member.deductions.total > 0) totals.membersWithData++;
      }
    });
    
    res.json({ 
      members: membersWithoutPasswords,
      totals,
      context: {
        period: `${new Date(targetYear, targetMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        month: targetMonth,
        year: targetYear,
        strictMonthlyBinding: true,
        dataScope: 'Monthly data only - no cumulative mixing'
      }
    });
  } catch (error) {
    console.error('[ERROR] Get members error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get members',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new member
router.post('/members', async (req, res) => {
  try {
    const {
      memberId,
      firstName,
      surname,
      email,
      phone,
      bankName,
      accountNumber,
      accountHolderName
    } = req.body;

    // Validate required fields
    if (!memberId || !firstName || !surname || !email || !phone) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if member ID already exists
    const existingMember = await User.findByMemberId(memberId);
    if (existingMember) {
      return res.status(400).json({ error: 'Member ID already exists' });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate temporary password
    const tempPassword = 'password'; // Using default password

    // Create new member
    const memberData = {
      memberId,
      firstName,
      surname,
      email,
      phone,
      role: 'user',
      password: tempPassword,
      bankName: bankName || '',
      accountNumber: accountNumber || '',
      accountHolderName: accountHolderName || '',
      isFirstLogin: true,
      cumulativeSavings: 0,
      cumulativeShares: 0,
      cumulativeInvestment: 0,
      specialSavingsBalance: 0,
      deductions: {
        regularSavings: 0,
        specialSavings: 0,
        shares: 0,
        investment: 0,
        loanRepayment: 0,
        overDeduction: 0,
        underDeduction: 0,
        ileyaLoan: 0,
        business: 0
      }
    };

    console.log('[INFO] Creating member with data:', { 
      memberId: memberData.memberId,
      firstName: memberData.firstName,
      email: memberData.email 
    });

    const newMember = await User.create(memberData);

    console.log('[INFO] Member creation result:', { 
      success: !!newMember,
      memberId: newMember?.memberId, 
      id: newMember?.id,
      type: typeof newMember
    });

    if (!newMember) {
      console.error('[ERROR] Member creation failed - newMember is null/undefined');
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create member - database operation returned null' 
      });
    }

    // Remove password from response
    const { password, password_hash, ...memberWithoutPassword } = newMember;

    const responseData = {
      success: true,
      message: 'Member created successfully',
      member: memberWithoutPassword,
      tempPassword
    };

    console.log('[INFO] Sending success response:', { 
      status: 201,
      success: responseData.success,
      message: responseData.message,
      memberCount: Object.keys(responseData.member || {}).length
    });

    res.status(201).json(responseData);

  } catch (error) {
    console.error('[ERROR] Create member error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to create member',
      details: error.message 
    });
  }
});

// Update member details
router.put('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const {
      firstName,
      surname,
      email,
      phone,
      bankName,
      accountNumber,
      accountHolderName
    } = req.body;

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update member details
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (surname) updateData.surname = surname;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName;

    const updatedMember = await User.update(member.id, updateData);

    // Remove password from response
    const { password, password_hash, ...memberWithoutPassword } = updatedMember;

    res.json({
      message: 'Member updated successfully',
      member: memberWithoutPassword
    });

  } catch (error) {
    console.error('[ERROR] Update member error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update member',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete member
router.delete('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check if member has active loans
    const activeLoans = await Loan.findActiveByUserId(member.id);
    if (activeLoans.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete member',
        message: `Cannot delete member "${member.firstName} ${member.surname}" because they have ${activeLoans.length} active loan(s). Please complete or cancel all loans before deleting this member.`,
        details: {
          memberName: `${member.firstName} ${member.surname}`,
          memberId: member.memberId,
          activeLoansCount: activeLoans.length,
          loans: activeLoans.map(loan => ({
            id: loan.id,
            amount: loan.amount,
            remainingBalance: loan.remainingBalance,
            purpose: loan.purpose
          }))
        }
      });
    }

    // Delete member (this will cascade delete related records due to foreign key constraints)
    const deleted = await User.delete(member.id);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete member' });
    }

    res.json({
      message: 'Member deleted successfully'
    });

  } catch (error) {
    console.error('[ERROR] Delete member error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete member',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update member deductions for specific month/year (STRICT binding required)
router.put('/members/:memberId/deductions', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { month, year, ...deductions } = req.body;

    // Month and year are REQUIRED - no defaults to prevent accidental updates
    if (!month || !year) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing date parameters',
        message: 'Month and year are required for member deduction updates to ensure data accuracy.',
        hint: 'Specify exact month/year to ensure data integrity and prevent accidental updates.',
        example: 'Provide month (1-12) and year (e.g., 2025)'
      });
    }

    // Validate month/year strictly
    if (month < 1 || month > 12) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid month value',
        message: 'Month must be between 1 and 12. Please provide a valid month number.',
        hint: 'Month 1 = January, Month 12 = December'
      });
    }
    
    if (year < 2020 || year > 2030) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid year value',
        message: 'Year must be between 2020 and 2030. Please provide a valid year.',
        hint: 'Enter a year within the supported range (e.g., 2025)'
      });
    }

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update monthly deductions for the SPECIFIC month/year only
    const updatedMember = await User.updateMonthlyDeductions(memberId, month, year, deductions);

    res.json({
      message: `Member deductions updated for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      member: updatedMember,
      period: {
        month: month,
        year: year,
        monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
      },
      strictMonthlyBinding: true
    });

  } catch (error) {
    console.error('[ERROR] Update member deductions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update member deductions',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get member's monthly history
router.get('/members/:memberId/monthly-history', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    const monthlyHistory = await User.getUserMonthlyHistory(memberId);
    const cumulatives = await User.getUserCumulatives(memberId);

    res.json({
      member: {
        memberId: member.memberId,
        firstName: member.firstName,
        surname: member.surname
      },
      monthlyHistory,
      cumulatives,
      summary: {
        totalMonths: monthlyHistory.length,
        averageMonthlyDeduction: monthlyHistory.length > 0 ? 
          monthlyHistory.reduce((sum, record) => sum + (record.total_deduction || 0), 0) / monthlyHistory.length : 0
      }
    });

  } catch (error) {
    console.error('[ERROR] Get monthly history error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get monthly history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get monthly report
router.get('/monthly-report', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Validate month/year
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    const members = await User.findMembers(targetMonth, targetYear);
    
    const report = members.map((member, index) => {
      const totalDeduction = member.deductions ? 
        Object.values(member.deductions).reduce((sum, amount) => sum + (amount || 0), 0) : 0;
      
      return {
        serialNumber: index + 1,
        memberName: `${member.firstName} ${member.surname}`,
        staffId: member.memberId,
        totalDeduction
      };
    });

    res.json({ report });

  } catch (error) {
    console.error('[ERROR] Generate monthly report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate monthly report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get payroll report
router.get('/payroll-report', async (req, res) => {
  try {
    const members = await User.findMembers();
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const payrollReport = {
      month: currentMonth,
      totalMembers: members.length,
      totalDeductions: 0,
      members: members.map((member, index) => {
        const totalDeduction = member.deductions ? 
          Object.values(member.deductions).reduce((sum, amount) => sum + (amount || 0), 0) : 0;
        return {
          serialNumber: index + 1,
          memberName: `${member.firstName} ${member.surname}`,
          memberId: member.memberId,
          bankName: member.bankName,
          accountNumber: member.accountNumber,
          accountHolderName: member.accountHolderName,
          deductions: member.deductions || {},
          totalDeduction
        };
      })
    };

    // Calculate total deductions
    payrollReport.totalDeductions = payrollReport.members.reduce((sum, member) => sum + member.totalDeduction, 0);

    res.json({ payrollReport });

  } catch (error) {
    console.error('[ERROR] Generate payroll report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate payroll report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get cumulative savings report
router.get('/cumulative-savings-report', async (req, res) => {
  try {
    const members = await User.findMembers();
    
    const cumulativeReport = {
      totalMembers: members.length,
      totalSavings: 0,
      totalShares: 0,
      totalInvestment: 0,
      totalSpecialSavings: 0,
      members: members.map((member, index) => {
        const totalSavings = (member.cumulativeSavings || 0) + (member.cumulativeShares || 0) + (member.cumulativeInvestment || 0);
        return {
          serialNumber: index + 1,
          memberName: `${member.firstName} ${member.surname}`,
          memberId: member.memberId,
          regularSavings: member.cumulativeSavings || 0,
          shares: member.cumulativeShares || 0,
          investment: member.cumulativeInvestment || 0,
          specialSavings: member.specialSavingsBalance || 0,
          totalSavings
        };
      })
    };

    // Calculate totals
    cumulativeReport.totalSavings = cumulativeReport.members.reduce((sum, member) => sum + member.regularSavings, 0);
    cumulativeReport.totalShares = cumulativeReport.members.reduce((sum, member) => sum + member.shares, 0);
    cumulativeReport.totalInvestment = cumulativeReport.members.reduce((sum, member) => sum + member.investment, 0);
    cumulativeReport.totalSpecialSavings = cumulativeReport.members.reduce((sum, member) => sum + member.specialSavings, 0);

    res.json({ cumulativeReport });

  } catch (error) {
    console.error('[ERROR] Generate cumulative savings report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate cumulative savings report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get loan report
router.get('/loan-report', async (req, res) => {
  try {
    const activeLoans = await Loan.findActive();
    
    const loanReport = {
      totalActiveLoans: activeLoans.length,
      totalLoanAmount: activeLoans.reduce((sum, loan) => sum + loan.amount, 0),
      totalRemainingBalance: activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0),
      members: []
    };

    // Group loans by member
    const memberLoansMap = {};
    activeLoans.forEach(loan => {
      if (!memberLoansMap[loan.memberId]) {
        memberLoansMap[loan.memberId] = {
          memberName: loan.memberName,
          memberId: loan.memberId,
          loans: []
        };
      }
      memberLoansMap[loan.memberId].loans.push({
        loanId: loan.id,
        amount: loan.amount,
        remainingBalance: loan.remainingBalance,
        monthlyPayment: loan.monthlyPayment,
        duration: loan.duration,
        purpose: loan.purpose,
        createdAt: loan.createdAt
      });
    });

    loanReport.members = Object.values(memberLoansMap);

    res.json({ loanReport });

  } catch (error) {
    console.error('[ERROR] Generate loan report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate loan report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Bulk update deductions for all members
router.post('/bulk-update-deductions', async (req, res) => {
  try {
    const { deductions } = req.body;
    
    if (!deductions || typeof deductions !== 'object') {
      return res.status(400).json({ 
        success: false,
        error: 'Missing deductions data',
        message: 'A deductions object containing the deduction amounts is required to update member deductions.',
        hint: 'Provide an object with deduction types and amounts (e.g., { regularSavings: 5000, shares: 2000 })'
      });
    }

    const members = await User.findMembers();
    let updatedCount = 0;

    // Update each member's deductions
    for (const member of members) {
      const updatedDeductions = { ...member.deductions, ...deductions };
      await User.update(member.memberId, { deductions: updatedDeductions });
      updatedCount++;
    }

    res.json({
      message: `Deductions updated for ${updatedCount} members successfully`,
      updatedCount
    });

  } catch (error) {
    console.error('[ERROR] Bulk update deductions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update deductions',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get deduction summary for specific month/year
router.get('/deduction-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // If month and year are provided, filter by them
    let members;
    if (month && year) {
      members = await User.findMembers(parseInt(month), parseInt(year));
    } else {
      members = await User.findMembers();
    }
    
    const summary = {
      totalMembers: members.length,
      deductionTypes: {
        regularSavings: 0,
        specialSavings: 0,
        shares: 0,
        investment: 0,
        loanRepayment: 0,
        overDeduction: 0,
        underDeduction: 0,
        ileyaLoan: 0,
        business: 0
      },
      totalMonthlyDeduction: 0,
      period: month && year ? {
        month: parseInt(month),
        year: parseInt(year),
        monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long' })
      } : null
    };

    members.forEach(member => {
      if (member.deductions) {
        Object.keys(member.deductions).forEach(key => {
          if (summary.deductionTypes[key] !== undefined) {
            summary.deductionTypes[key] += member.deductions[key] || 0;
          }
        });
      }
    });

    summary.totalMonthlyDeduction = Object.values(summary.deductionTypes).reduce((sum, amount) => sum + amount, 0);

    res.json({ summary });

  } catch (error) {
    console.error('[ERROR] Get deduction summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get deduction summary',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all loan applications
router.get('/loan-applications', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    
    let applications;
    if (status === 'all') {
      // Get all applications (pending, approved, declined)
      applications = await LoanApplication.findAll();
    } else if (status === 'pending') {
      // Get only pending applications
      applications = await LoanApplication.findPending();
    } else {
      // Get applications by specific status
      applications = await LoanApplication.findByStatus(status);
    }
    
    res.json({ applications });

  } catch (error) {
    console.error('[ERROR] Get loan applications error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get loan applications',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});




// Approve/decline loan application
router.put('/loan-applications/:applicationId', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or declined' });
    }

    // Find the application
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Loan application not found' });
    }

    // Update application status
    const updatedApplication = await LoanApplication.updateStatus(applicationId, status);

    res.json({
      message: `Loan application ${status} successfully`,
      application: updatedApplication
    });

  } catch (error) {
    console.error('[ERROR] Update loan application error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update loan application',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all withdrawal requests with member balance information
router.get('/withdrawal-requests', async (req, res) => {
  try {
    const allRequests = await WithdrawalRequest.findAll();
    
    // Enhance requests with member balance information
    const enhancedRequests = await Promise.all(allRequests.map(async (request) => {
      try {
        const member = await User.findByMemberId(request.memberId);
        return {
          ...request,
          memberBalance: member ? member.specialSavingsBalance : 0,
          canApprove: member ? member.specialSavingsBalance >= request.amount : false,
          memberName: member ? `${member.firstName} ${member.surname}` : 'Unknown Member',
          balanceInfo: member ? {
            current: member.specialSavingsBalance,
            requested: request.amount,
            remaining: Math.max(0, member.specialSavingsBalance - request.amount)
          } : null
        };
      } catch (error) {
        console.error(`[ERROR] Error getting member info for request ${request.id}:`, error);
        return {
          ...request,
          memberBalance: 0,
          canApprove: false,
          memberName: 'Unknown Member',
          balanceInfo: null
        };
      }
    }));
    
    res.json({ requests: enhancedRequests });

  } catch (error) {
    console.error('[ERROR] Get withdrawal requests error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get withdrawal requests',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Approve/decline withdrawal request
router.put('/withdrawal-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or declined' });
    }

    // Find the request
    const request = await WithdrawalRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Withdrawal request not found' });
    }

    // Get member's current balance for validation
    const member = await User.findByMemberId(request.memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Check balance before approval
    if (status === 'approved' && member.specialSavingsBalance < request.amount) {
      return res.status(400).json({
        error: 'Insufficient special savings balance',
        details: `Member's current balance: ₦${member.specialSavingsBalance.toLocaleString()}, Requested amount: ₦${request.amount.toLocaleString()}`,
        suggestion: 'You can either decline this request or ask the member to reduce the withdrawal amount.',
        currentBalance: member.specialSavingsBalance,
        requestedAmount: request.amount
      });
    }

    // Update request status (this also handles balance updates internally)
    const updatedRequest = await WithdrawalRequest.updateStatus(requestId, status, adminNotes);

    res.json({
      message: `Withdrawal request ${status} successfully`,
      request: updatedRequest,
      newBalance: updatedRequest.newBalance
    });

  } catch (error) {
    console.error('[ERROR] Update withdrawal request error:', error);
    
    // Provide specific error messages to help admins understand the issue
    if (error.message === 'Insufficient special savings balance') {
      return res.status(400).json({ 
        error: 'Insufficient special savings balance',
        details: 'The member does not have enough special savings balance for this withdrawal amount.',
        suggestion: 'You can either decline this request or contact the member to reduce the withdrawal amount.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update withdrawal request',
      details: error.message
    });
  }
});



// Update loan status
router.put('/loans/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['active', 'completed', 'defaulted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid loan status' });
    }

    // Find the loan
    const loan = await Loan.findByLoanId(loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Update loan status
    const updatedLoan = await Loan.update(loanId, {
      status,
      adminNotes
    });

    // Note: Loan completion no longer automatically updates deductions
    // Admin must manually update member deductions as needed

    res.json({
      message: 'Loan updated successfully',
      loan: updatedLoan
    });

  } catch (error) {
    console.error('[ERROR] Update loan error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update loan',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Special savings withdrawal approval
router.post('/special-savings/withdraw', async (req, res) => {
  try {
    const { memberId, amount, reason } = req.body;

    if (!memberId || !amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required information',
        message: 'Member ID and withdrawal amount are required to process a special savings withdrawal.',
        details: {
          missingFields: [],
          hint: 'Please provide both the member ID and the amount to withdraw.'
        }
      });
    }
    
    if (!memberId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing member ID',
        message: 'Please specify which member is making the withdrawal.',
        hint: 'Provide the member ID to identify the account holder.'
      });
    }
    
    if (!amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing withdrawal amount',
        message: 'Please specify how much money to withdraw from the special savings account.',
        hint: 'Enter the amount in Nigerian Naira (₦)'
      });
    }

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.specialSavingsBalance < amount) {
      return res.status(400).json({ error: 'Insufficient special savings balance' });
    }

    // Process withdrawal
    const newBalance = member.specialSavingsBalance - amount;
    await User.update(memberId, { specialSavingsBalance: newBalance });

    res.json({
      message: 'Withdrawal approved successfully',
      newBalance
    });

  } catch (error) {
    console.error('[ERROR] Special savings withdrawal error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process withdrawal',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});



// Bulk update book deductions (regular savings, shares, investment) for specific month/year
router.post('/book-deductions', async (req, res) => {
  try {
    const { regularSavings, shares, investment, month, year, deductions } = req.body;
    
    // Month and year are REQUIRED for strict monthly binding
    if (!month || !year) {
      return res.status(400).json({ 
        error: 'Month and year are required for monthly deduction updates' 
      });
    }
    
    // Check if we have deductions in the body or individual fields
    const hasDeductions = deductions || (regularSavings !== undefined || shares !== undefined || investment !== undefined);
    
    if (!hasDeductions) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing deduction information',
        message: 'At least one deduction type must be provided to update member deductions.',
        hint: 'Provide deduction amounts for regular savings, shares, investment, or use the deductions object.'
      });
    }

    // Validate month/year
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
    }

    const members = await User.findMembers();
    let updatedCount = 0;

    // Update each member's monthly deductions for the SPECIFIC month/year only
    for (const member of members) {
      const deductionUpdates = {};
      
      // Use deductions object if provided, otherwise use individual fields
      if (deductions) {
        Object.assign(deductionUpdates, deductions);
      } else {
        if (regularSavings !== undefined) deductionUpdates.regularSavings = regularSavings;
        if (shares !== undefined) deductionUpdates.shares = shares;
        if (investment !== undefined) deductionUpdates.investment = investment;
      }
      
      await User.updateMonthlyDeductions(member.memberId, month, year, deductionUpdates);
      updatedCount++;
    }

    res.json({
      message: `Book deductions updated for ${updatedCount} members for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      updatedCount,
      deductions: deductions || { regularSavings, shares, investment },
      period: {
        month: month,
        year: year,
        monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
      },
      strictMonthlyBinding: true
    });

  } catch (error) {
    console.error('[ERROR] Bulk update book deductions error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update book deductions',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update special savings for specific members for specific month/year
router.post('/special-savings/update', async (req, res) => {
  try {
    const { memberUpdates, month, year } = req.body;
    
    // Month and year are REQUIRED for strict monthly binding
    if (!month || !year) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing date parameters',
        message: 'Month and year are required for special savings updates to ensure data accuracy.',
        hint: 'Specify exact month/year to ensure data integrity and prevent accidental updates.',
        example: 'Provide month (1-12) and year (e.g., 2025)'
      });
    }
    
    if (!Array.isArray(memberUpdates)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid member updates format',
        message: 'Member updates must be provided as an array containing member information and amounts.',
        hint: 'Provide an array like: [{ memberId: "M001", amount: 5000 }, { memberId: "M002", amount: 3000 }]'
      });
    }

    // Validate month/year
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
    }

    let updatedCount = 0;
    let failedUpdates = [];

    // Update each member's monthly special savings deduction
    for (const update of memberUpdates) {
      const { memberId, amount } = update;
      
      if (memberId && amount !== undefined) {
        try {
          const member = await User.findByMemberId(memberId);
          if (member && member.role === 'user') {
            await User.updateMonthlyDeductions(memberId, month, year, { 
              specialSavings: amount 
            });
            updatedCount++;
          } else {
            failedUpdates.push({ memberId, reason: 'Member not found or not a user' });
          }
        } catch (error) {
          failedUpdates.push({ memberId, reason: error.message });
        }
      } else {
        failedUpdates.push({ memberId, reason: 'Invalid member ID or amount' });
      }
    }

    res.json({
      message: `Special savings updated for ${updatedCount} members for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      updatedCount,
      failedUpdates,
      period: {
        month: month,
        year: year,
        monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
      },
      strictMonthlyBinding: true
    });

  } catch (error) {
    console.error('[ERROR] Update special savings error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update special savings',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update over/under deductions for specific members for specific month/year
router.post('/deduction-anomalies/update', async (req, res) => {
  try {
    const { anomalies, month, year } = req.body;
    
    // Month and year are REQUIRED for strict monthly binding
    if (!month || !year) {
      return res.status(400).json({ 
        error: 'Month and year are required for deduction anomalies updates' 
      });
    }
    
    if (!Array.isArray(anomalies)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid anomalies format',
        message: 'Deduction anomalies must be provided as an array containing member information and anomaly details.',
        hint: 'Provide an array like: [{ memberId: "M001", type: "over", amount: 1000 }, { memberId: "M002", type: "under", amount: 500 }]'
      });
    }

    // Validate month/year
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2020 || year > 2030) {
      return res.status(400).json({ error: 'Year must be between 2020 and 2030' });
    }

    let updatedCount = 0;
    let failedUpdates = [];

    // Update each member's deduction anomalies for the SPECIFIC month/year only
    for (const anomaly of anomalies) {
      const { memberId, type, amount } = anomaly;
      
      if (memberId && type && amount !== undefined) {
        try {
          const deductionUpdates = {};
          
          if (type === 'over') {
            deductionUpdates.overDeduction = parseFloat(amount);
          } else if (type === 'under') {
            deductionUpdates.underDeduction = parseFloat(amount);
          }
          
          await User.updateMonthlyDeductions(memberId, month, year, deductionUpdates);
          updatedCount++;
        } catch (error) {
          failedUpdates.push({ memberId, error: error.message });
        }
      }
    }

    res.json({
      message: `Deduction anomalies updated for ${updatedCount} members for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      updatedCount,
      failedUpdates,
      period: {
        month: month,
        year: year,
        monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
      },
      strictMonthlyBinding: true
    });

  } catch (error) {
    console.error('[ERROR] Update deduction anomalies error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update deduction anomalies',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Bulk loan repayment update
router.post('/loan-repayment/update', async (req, res) => {
  try {
    const { memberId, repaymentAmount, month, year, loanId } = req.body;
    
    if (!memberId || !repaymentAmount || !month || !year) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required loan repayment information',
        message: 'Member ID, repayment amount, month, and year are all required to process a loan repayment.',
        details: {
          missingFields: [],
          hint: 'Please provide all required information to complete the loan repayment.'
        }
      });
    }
    
    if (!memberId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing member ID',
        message: 'Please specify which member is making the loan repayment.',
        hint: 'Provide the member ID to identify the account holder.'
      });
    }
    
    if (!repaymentAmount) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing repayment amount',
        message: 'Please specify how much money to pay towards the loan.',
        hint: 'Enter the amount in Nigerian Naira (₦)'
      });
    }
    
    if (!month) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing month',
        message: 'Please specify which month this repayment is for.',
        hint: 'Enter the month number (1-12)'
      });
    }
    
    if (!year) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing year',
        message: 'Please specify which year this repayment is for.',
        hint: 'Enter the year (e.g., 2025)'
      });
    }

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Find active loans for the member
    const activeLoans = await Loan.findActiveByUserId(member.id);
    if (activeLoans.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No active loans found',
        message: `Member "${member.firstName} ${member.surname}" does not have any active loans to process repayment for.`,
        details: {
          memberName: `${member.firstName} ${member.surname}`,
          memberId: member.memberId,
          suggestion: 'Only members with active loans can have repayments processed.'
        }
      });
    }

    // Select specific loan or first active loan
    let targetLoan = activeLoans[0];
    if (loanId) {
      const specificLoan = activeLoans.find(loan => loan.id === loanId);
      if (specificLoan) {
        targetLoan = specificLoan;
      }
    }

    // Add payment to loan (using the correct loan ID from formatLoan)
    const paymentResult = await Loan.addPayment(targetLoan.id, {
      amount: parseFloat(repaymentAmount),
      month: parseInt(month),
      year: parseInt(year)
    });

    // Note: Loan repayment deductions are now manual only
    // Admin must manually update member deductions as needed

    res.json({
      message: 'Loan repayment updated successfully',
      paymentId: paymentResult.paymentId,
      remainingBalance: paymentResult.newBalance,
      loanStatus: paymentResult.status,
      monthlyPayment: targetLoan.monthlyPayment,
      note: 'Loan repayment deductions are manual only - update member deductions as needed'
    });

  } catch (error) {
    console.error('[ERROR] Loan repayment update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update loan repayment',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Manual update loan repayment deduction for a member
router.post('/members/:memberId/loan-repayment-deduction', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { loanRepaymentAmount } = req.body;

    if (loanRepaymentAmount === undefined || loanRepaymentAmount < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid loan repayment amount',
        message: 'Please provide a valid loan repayment amount that is greater than or equal to zero.',
        hint: 'Enter the amount in Nigerian Naira (₦) - must be 0 or positive'
      });
    }

    const member = await User.findByMemberId(memberId);
    if (!member || member.role !== 'user') {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updatedDeductions = { 
      ...member.deductions, 
      loanRepayment: parseFloat(loanRepaymentAmount)
    };
    
    await User.update(memberId, { deductions: updatedDeductions });

    res.json({
      message: 'Loan repayment deduction updated successfully',
      previousAmount: member.deductions.loanRepayment || 0,
      newAmount: parseFloat(loanRepaymentAmount),
      member: {
        name: `${member.firstName} ${member.surname}`,
        memberId: member.memberId
      }
    });

  } catch (error) {
    console.error('[ERROR] Update loan repayment deduction error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update loan repayment deduction',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});



// Get members with active loans for repayment
router.get('/members-with-active-loans', async (req, res) => {
  try {
    const activeLoans = await Loan.findActive();
    
    // Group loans by member
    const memberLoansMap = {};
    activeLoans.forEach(loan => {
      if (!memberLoansMap[loan.memberId]) {
        memberLoansMap[loan.memberId] = {
          memberId: loan.memberId,
          memberName: loan.memberName,
          activeLoans: []
        };
      }
      memberLoansMap[loan.memberId].activeLoans.push({
        id: loan.id,
        amount: loan.amount,
        remainingBalance: loan.remainingBalance,
        monthlyPayment: loan.monthlyPayment,
        duration: loan.duration,
        purpose: loan.purpose,
        loanType: loan.loanType,
        createdAt: loan.createdAt
      });
    });

    const membersWithActiveLoans = Object.values(memberLoansMap);
    res.json({ members: membersWithActiveLoans });

  } catch (error) {
    console.error('[ERROR] Get members with active loans error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get members with active loans',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get loan policies
router.get('/loan-policies', async (req, res) => {
  try {
    const policies = [
      {
        id: 1,
        name: 'Standard Loan',
        minAmount: 50000,
        maxAmount: 500000,
        minDuration: 6,
        maxDuration: 36,
        interestRate: 15,
        requirements: ['Minimum 6 months membership', 'Good standing', 'No active loans']
      },
      {
        id: 2,
        name: 'Business Loan',
        minAmount: 100000,
        maxAmount: 1000000,
        minDuration: 12,
        maxDuration: 48,
        interestRate: 18,
        requirements: ['Minimum 12 months membership', 'Business plan required', 'Collateral may be needed']
      },
      {
        id: 3,
        name: 'Ileya Loan',
        minAmount: 25000,
        maxAmount: 200000,
        minDuration: 3,
        maxDuration: 12,
        interestRate: 12,
        requirements: ['Minimum 3 months membership', 'Festival purpose only', 'Quick approval']
      }
    ];

    res.json({ 
      success: true,
      data: { policies } 
    });

  } catch (error) {
    console.error('[ERROR] Get loan policies error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get loan policies',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get monthly reports
router.get('/reports/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const members = await User.findMembers();
    const loans = await Loan.findAll();
    const applications = await LoanApplication.findAll();
    const withdrawalRequests = await WithdrawalRequest.findAll();

    const monthlyReport = {
      period: `${currentMonth}/${currentYear}`,
      summary: {
        totalMembers: members.length,
        activeLoans: loans.filter(l => l.status === 'active').length,
        totalSavings: members.reduce((sum, m) => sum + (m.cumulativeSavings || 0), 0),
        totalShares: members.reduce((sum, m) => sum + (m.cumulativeShares || 0), 0),
        totalInvestment: members.reduce((sum, m) => sum + (m.cumulativeInvestment || 0), 0),
        totalSpecialSavings: members.reduce((sum, m) => sum + (m.specialSavingsBalance || 0), 0),
        newApplications: applications.filter(a => {
          const appDate = new Date(a.createdAt);
          return appDate.getMonth() + 1 === parseInt(currentMonth) && appDate.getFullYear() === parseInt(currentYear);
        }).length,
        withdrawalRequests: withdrawalRequests.filter(r => {
          const reqDate = new Date(r.createdAt);
          return reqDate.getMonth() + 1 === parseInt(currentMonth) && reqDate.getFullYear() === parseInt(currentYear);
        }).length
      }
    };

    res.json({ report: monthlyReport });

  } catch (error) {
    console.error('[ERROR] Get monthly reports error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get monthly reports',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});



module.exports = router; 