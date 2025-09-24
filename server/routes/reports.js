const express = require('express');
const router = express.Router();
const ReportGenerator = require('../utils/reports');
const User = require('../models/User');
const Loan = require('../models/Loan');
const LoanApplication = require('../models/LoanApplication');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Helper function to get month name
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1];
};

// Helper function to filter data by month and year
const filterByMonthYear = (data, month, year) => {
  return data.filter(item => {
    const itemDate = new Date(item.createdAt);
    return itemDate.getMonth() + 1 === parseInt(month) && 
           itemDate.getFullYear() === parseInt(year);
  });
};

// Helper function to aggregate yearly data
const aggregateYearlyData = (data, year) => {
  return data.filter(item => {
    const itemDate = new Date(item.createdAt);
    return itemDate.getFullYear() === parseInt(year);
  });
};

// Monthly Deduction Report
router.get('/monthly-deduction/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get members with their deduction data for the specified month
    const members = await User.findMembers(currentMonth, currentYear);
    
    // Filter members who have deduction records for the specified month
    const membersWithDeductions = members.filter(member => {
      // Check if member has deduction data for the specified month
      return member.deductions && (
        member.deductions.regularSavings !== undefined ||
        member.deductions.specialSavings !== undefined ||
        member.deductions.shares !== undefined ||
        member.deductions.investment !== undefined ||
        member.deductions.loanRepayment !== undefined
      );
    });

    const reportData = membersWithDeductions.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      regularSavings: member.deductions?.regularSavings || 0,
      specialSavings: member.deductions?.specialSavings || 0,
      shares: member.deductions?.shares || 0,
      investment: member.deductions?.investment || 0,
      loanRepayment: member.deductions?.loanRepayment || 0,
      overDeduction: member.deductions?.overDeduction || 0,
      underDeduction: member.deductions?.underDeduction || 0
    }));

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Monthly Deduction', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_deduction_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Monthly Deduction', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_deduction_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Monthly deduction report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly deduction report' });
  }
});

// Monthly Payroll Report
router.get('/monthly-payroll/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get members with payroll data for the specified month
    const members = await User.findMembers(currentMonth, currentYear);
    
    const reportData = members.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      basicSalary: member.basicSalary || 0,
      allowances: member.allowances || 0,
      deductions: member.deductions?.totalMonthlyDeduction || 0
    }));

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Monthly Payroll', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_payroll_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Monthly Payroll', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_payroll_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Monthly payroll report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly payroll report' });
  }
});

// Monthly Savings Report
router.get('/monthly-savings/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get members with savings data for the specified month
    const members = await User.findMembers(currentMonth, currentYear);
    
    const reportData = members.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      regularSavings: member.deductions?.regularSavings || 0,
      specialSavings: member.deductions?.specialSavings || 0,
      shares: member.deductions?.shares || 0,
      investment: member.deductions?.investment || 0
    }));

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Monthly Savings', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_savings_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Monthly Savings', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_savings_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Monthly savings report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly savings report' });
  }
});

// Monthly Loan Report
router.get('/monthly-loan/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get loans for the specified month
    const allLoans = await Loan.findAll();
    const monthlyLoans = filterByMonthYear(allLoans, currentMonth, currentYear);
    
    const reportData = monthlyLoans.map(loan => ({
      id: loan.id,
      memberId: loan.memberId,
      memberName: loan.memberName,
      amount: loan.amount,
      monthlyPayment: loan.monthlyPayment,
      remainingBalance: loan.remainingBalance,
      status: loan.status,
      createdAt: loan.createdAt
    }));

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Monthly Loan', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_loan_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Monthly Loan', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_loan_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Monthly loan report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly loan report' });
  }
});

// Monthly Withdrawal Report
router.get('/monthly-withdrawal/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get withdrawal requests for the specified month
    const allWithdrawals = await WithdrawalRequest.findAll();
    const monthlyWithdrawals = filterByMonthYear(allWithdrawals, currentMonth, currentYear);
    
    const reportData = monthlyWithdrawals.map(withdrawal => ({
      id: withdrawal.id,
      memberId: withdrawal.memberId,
      memberName: withdrawal.memberName,
      amount: withdrawal.amount,
      reason: withdrawal.reason,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt
    }));

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Monthly Withdrawal', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_withdrawal_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Monthly Withdrawal', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=monthly_withdrawal_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Monthly withdrawal report error:', error);
    res.status(500).json({ error: 'Failed to generate monthly withdrawal report' });
  }
});

// General System Report
router.get('/general-system/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { month, year } = req.query;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get all data for the specified month
    const members = await User.findMembers(currentMonth, currentYear);
    const loans = await Loan.findAll();
    const applications = await LoanApplication.findAll();
    const withdrawals = await WithdrawalRequest.findAll();

    const monthlyLoans = filterByMonthYear(loans, currentMonth, currentYear);
    const monthlyApplications = filterByMonthYear(applications, currentMonth, currentYear);
    const monthlyWithdrawals = filterByMonthYear(withdrawals, currentMonth, currentYear);

    const reportData = {
      summary: {
        'Total Members': { count: members.length, amount: 0 },
        'Active Loans': { count: loans.filter(l => l.status === 'active').length, amount: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.amount, 0) },
        'New Applications': { count: monthlyApplications.length, amount: 0 },
        'Withdrawal Requests': { count: monthlyWithdrawals.length, amount: monthlyWithdrawals.reduce((sum, w) => sum + w.amount, 0) },
        'Total Savings': { count: members.length, amount: members.reduce((sum, m) => sum + (m.cumulativeSavings || 0), 0) },
        'Total Shares': { count: members.length, amount: members.reduce((sum, m) => sum + (m.cumulativeShares || 0), 0) },
        'Total Investment': { count: members.length, amount: members.reduce((sum, m) => sum + (m.cumulativeInvestment || 0), 0) }
      }
    };

    const period = `${getMonthName(currentMonth)} ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'General System', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=general_system_${currentMonth}_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'General System', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=general_system_${currentMonth}_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('General system report error:', error);
    res.status(500).json({ error: 'Failed to generate general system report' });
  }
});

// Cumulative Deduction Report
router.get('/cumulative-deduction/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get members with cumulative deduction data for the specified year
    const members = await User.findMembers(null, currentYear);
    
    const reportData = members.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      totalRegularSavings: member.cumulativeSavings || 0,
      totalSpecialSavings: member.specialSavingsBalance || 0,
      totalShares: member.cumulativeShares || 0,
      totalInvestment: member.cumulativeInvestment || 0,
      totalLoanRepayment: member.deductions?.loanRepayment || 0
    }));

    const period = `Year ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Cumulative Deduction', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_deduction_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Cumulative Deduction', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_deduction_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Cumulative deduction report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative deduction report' });
  }
});

// Cumulative Payroll Report
router.get('/cumulative-payroll/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get members with cumulative payroll data for the specified year
    const members = await User.findMembers(null, currentYear);
    
    const reportData = members.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      basicSalary: member.basicSalary || 0,
      allowances: member.allowances || 0,
      deductions: member.deductions?.totalMonthlyDeduction || 0
    }));

    const period = `Year ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Cumulative Payroll', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_payroll_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Cumulative Payroll', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_payroll_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Cumulative payroll report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative payroll report' });
  }
});

// Cumulative Savings Report
router.get('/cumulative-savings/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get members with cumulative savings data for the specified year
    const members = await User.findMembers(null, currentYear);
    
    const reportData = members.map(member => ({
      memberId: member.memberId,
      firstName: member.firstName,
      surname: member.surname,
      regularSavings: member.cumulativeSavings || 0,
      specialSavings: member.specialSavingsBalance || 0,
      shares: member.cumulativeShares || 0,
      investment: member.cumulativeInvestment || 0
    }));

    const period = `Year ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Cumulative Savings', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_savings_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Cumulative Savings', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_savings_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Cumulative savings report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative savings report' });
  }
});

// Cumulative Loan Report
router.get('/cumulative-loan/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get loans for the specified year
    const allLoans = await Loan.findAll();
    const yearlyLoans = aggregateYearlyData(allLoans, currentYear);
    
    const reportData = yearlyLoans.map(loan => ({
      id: loan.id,
      memberId: loan.memberId,
      memberName: loan.memberName,
      amount: loan.amount,
      monthlyPayment: loan.monthlyPayment,
      remainingBalance: loan.remainingBalance,
      status: loan.status,
      createdAt: loan.createdAt
    }));

    const period = `Year ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Cumulative Loan', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_loan_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Cumulative Loan', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_loan_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Cumulative loan report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative loan report' });
  }
});

// Cumulative Withdrawal Report
router.get('/cumulative-withdrawal/:format', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get withdrawal requests for the specified year
    const allWithdrawals = await WithdrawalRequest.findAll();
    const yearlyWithdrawals = aggregateYearlyData(allWithdrawals, currentYear);
    
    const reportData = yearlyWithdrawals.map(withdrawal => ({
      id: withdrawal.id,
      memberId: withdrawal.memberId,
      memberName: withdrawal.memberName,
      amount: withdrawal.amount,
      reason: withdrawal.reason,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt
    }));

    const period = `Year ${currentYear}`;
    const reportGenerator = new ReportGenerator();

    if (format === 'excel') {
      const workbook = await reportGenerator.generateExcelReport(reportData, 'Cumulative Withdrawal', period);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_withdrawal_${currentYear}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const doc = reportGenerator.generatePDFReport(reportData, 'Cumulative Withdrawal', period);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cumulative_withdrawal_${currentYear}.pdf`);
      doc.pipe(res);
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use excel or pdf.' });
    }

  } catch (error) {
    console.error('Cumulative withdrawal report error:', error);
    res.status(500).json({ error: 'Failed to generate cumulative withdrawal report' });
  }
});

module.exports = router; 
