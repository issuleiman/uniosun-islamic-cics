const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  // Generate Excel report
  async generateExcelReport(data, reportType, period) {
    const worksheet = this.workbook.addWorksheet(reportType);
    
    // Add header
    worksheet.addRow([`${reportType} Report`]);
    worksheet.addRow([`Period: ${period}`]);
    worksheet.addRow([]);
    
    // Add data based on report type
    switch (reportType) {
      case 'Monthly Deduction':
        this.addDeductionData(worksheet, data);
        break;
      case 'Monthly Payroll':
        this.addPayrollData(worksheet, data);
        break;
      case 'Monthly Savings':
        this.addSavingsData(worksheet, data);
        break;
      case 'Monthly Loan':
        this.addLoanData(worksheet, data);
        break;
      case 'Monthly Withdrawal':
        this.addWithdrawalData(worksheet, data);
        break;
      case 'General System':
        this.addSystemData(worksheet, data);
        break;
      case 'Cumulative Deduction':
        this.addCumulativeDeductionData(worksheet, data);
        break;
      case 'Cumulative Payroll':
        this.addCumulativePayrollData(worksheet, data);
        break;
      case 'Cumulative Savings':
        this.addCumulativeSavingsData(worksheet, data);
        break;
      case 'Cumulative Loan':
        this.addCumulativeLoanData(worksheet, data);
        break;
      case 'Cumulative Withdrawal':
        this.addCumulativeWithdrawalData(worksheet, data);
        break;
    }
    
    // Style the worksheet
    this.styleWorksheet(worksheet);
    
    return this.workbook;
  }

  // Generate PDF report
  generatePDFReport(data, reportType, period) {
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
    
    // Add header
    doc.fontSize(16).text(`${reportType} Report`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Period: ${period}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    
    // Add data based on report type
    switch (reportType) {
      case 'Monthly Deduction':
        this.addDeductionDataPDF(doc, data);
        break;
      case 'Monthly Payroll':
        this.addPayrollDataPDF(doc, data);
        break;
      case 'Monthly Savings':
        this.addSavingsDataPDF(doc, data);
        break;
      case 'Monthly Loan':
        this.addLoanDataPDF(doc, data);
        break;
      case 'Monthly Withdrawal':
        this.addWithdrawalDataPDF(doc, data);
        break;
      case 'General System':
        this.addSystemDataPDF(doc, data);
        break;
      case 'Cumulative Deduction':
        this.addCumulativeDeductionDataPDF(doc, data);
        break;
      case 'Cumulative Payroll':
        this.addCumulativePayrollDataPDF(doc, data);
        break;
      case 'Cumulative Savings':
        this.addCumulativeSavingsDataPDF(doc, data);
        break;
      case 'Cumulative Loan':
        this.addCumulativeLoanDataPDF(doc, data);
        break;
      case 'Cumulative Withdrawal':
        this.addCumulativeWithdrawalDataPDF(doc, data);
        break;
    }
    
    return doc;
  }

  // Add deduction data to Excel
  addDeductionData(worksheet, data) {
    worksheet.addRow(['Member ID', 'Member Name', 'Regular Savings', 'Special Savings', 'Shares', 'Investment', 'Loan Repayment', 'Over Deduction', 'Under Deduction', 'Total']);
    
    data.forEach(member => {
      const total = (member.regularSavings || 0) + (member.specialSavings || 0) + (member.shares || 0) + 
                   (member.investment || 0) + (member.loanRepayment || 0) + (member.overDeduction || 0) + 
                   (member.underDeduction || 0);
      
      worksheet.addRow([
        member.memberId,
        `${member.firstName} ${member.surname}`,
        member.regularSavings || 0,
        member.specialSavings || 0,
        member.shares || 0,
        member.investment || 0,
        member.loanRepayment || 0,
        member.overDeduction || 0,
        member.underDeduction || 0,
        total
      ]);
    });
  }

  // Add deduction data to PDF
  addDeductionDataPDF(doc, data) {
    const headers = ['Member ID', 'Name', 'Regular', 'Special', 'Shares', 'Investment', 'Loan Repay', 'Total'];
    const tableData = data.map(member => {
      const total = (member.regularSavings || 0) + (member.specialSavings || 0) + (member.shares || 0) + 
                   (member.investment || 0) + (member.loanRepayment || 0);
      
      return [
        member.memberId,
        `${member.firstName} ${member.surname}`,
        (member.regularSavings || 0).toString(),
        (member.specialSavings || 0).toString(),
        (member.shares || 0).toString(),
        (member.investment || 0).toString(),
        (member.loanRepayment || 0).toString(),
        total.toString()
      ];
    });

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'Monthly Deduction Report',
      colWidth: 90,
      rowHeight: 12
    });
  }

  // Add payroll data to Excel
  addPayrollData(worksheet, data) {
    worksheet.addRow(['Member ID', 'Member Name', 'Basic Salary', 'Allowances', 'Deductions', 'Net Pay']);
    
    data.forEach(member => {
      const netPay = (member.basicSalary || 0) + (member.allowances || 0) - (member.deductions || 0);
      
      worksheet.addRow([
        member.memberId,
        `${member.firstName} ${member.surname}`,
        member.basicSalary || 0,
        member.allowances || 0,
        member.deductions || 0,
        netPay
      ]);
    });
  }

  // Add payroll data to PDF
  addPayrollDataPDF(doc, data) {
    const headers = ['Member ID', 'Name', 'Basic Salary', 'Allowances', 'Deductions', 'Net Pay'];
    const tableData = data.map(member => {
      const netPay = (member.basicSalary || 0) + (member.allowances || 0) - (member.deductions || 0);
      
      return [
        member.memberId,
        `${member.firstName} ${member.surname}`,
        (member.basicSalary || 0).toString(),
        (member.allowances || 0).toString(),
        (member.deductions || 0).toString(),
        netPay.toString()
      ];
    });

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'Monthly Payroll Report',
      colWidth: 100,
      rowHeight: 12
    });
  }

  // Add savings data to Excel
  addSavingsData(worksheet, data) {
    worksheet.addRow(['Member ID', 'Member Name', 'Regular Savings', 'Special Savings', 'Shares', 'Investment', 'Total Savings']);
    
    data.forEach(member => {
      const totalSavings = (member.regularSavings || 0) + (member.specialSavings || 0) + 
                          (member.shares || 0) + (member.investment || 0);
      
      worksheet.addRow([
        member.memberId,
        `${member.firstName} ${member.surname}`,
        member.regularSavings || 0,
        member.specialSavings || 0,
        member.shares || 0,
        member.investment || 0,
        totalSavings
      ]);
    });
  }

  // Add savings data to PDF
  addSavingsDataPDF(doc, data) {
    const headers = ['Member ID', 'Name', 'Regular', 'Special', 'Shares', 'Investment', 'Total'];
    const tableData = data.map(member => {
      const totalSavings = (member.regularSavings || 0) + (member.specialSavings || 0) + 
                          (member.shares || 0) + (member.investment || 0);
      
      return [
        member.memberId,
        `${member.firstName} ${member.surname}`,
        (member.regularSavings || 0).toString(),
        (member.specialSavings || 0).toString(),
        (member.shares || 0).toString(),
        (member.investment || 0).toString(),
        totalSavings.toString()
      ];
    });

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'Monthly Savings Report',
      colWidth: 100,
      rowHeight: 12
    });
  }

  // Add loan data to Excel
  addLoanData(worksheet, data) {
    worksheet.addRow(['Loan ID', 'Member ID', 'Member Name', 'Amount', 'Monthly Payment', 'Remaining Balance', 'Status', 'Created Date']);
    
    data.forEach(loan => {
      worksheet.addRow([
        loan.id,
        loan.memberId,
        loan.memberName,
        loan.amount,
        loan.monthlyPayment,
        loan.remainingBalance,
        loan.status,
        new Date(loan.createdAt).toLocaleDateString()
      ]);
    });
  }

  // Add loan data to PDF
  addLoanDataPDF(doc, data) {
    const headers = ['Loan ID', 'Member', 'Amount', 'Monthly Pay', 'Balance', 'Status'];
    const tableData = data.map(loan => [
      loan.id,
      loan.memberName,
      loan.amount.toString(),
      loan.monthlyPayment.toString(),
      loan.remainingBalance.toString(),
      loan.status
    ]);

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'Monthly Loan Report',
      colWidth: 100,
      rowHeight: 12
    });
  }

  // Add withdrawal data to Excel
  addWithdrawalData(worksheet, data) {
    worksheet.addRow(['Request ID', 'Member ID', 'Member Name', 'Amount', 'Reason', 'Status', 'Created Date']);
    
    data.forEach(request => {
      worksheet.addRow([
        request.id,
        request.memberId,
        request.memberName,
        request.amount,
        request.reason,
        request.status,
        new Date(request.createdAt).toLocaleDateString()
      ]);
    });
  }

  // Add withdrawal data to PDF
  addWithdrawalDataPDF(doc, data) {
    const headers = ['Request ID', 'Member', 'Amount', 'Reason', 'Status'];
    const tableData = data.map(request => [
      request.id,
      request.memberName,
      request.amount.toString(),
      request.reason,
      request.status
    ]);

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'Monthly Withdrawal Report',
      colWidth: 120,
      rowHeight: 12
    });
  }

  // Add system data to Excel
  addSystemData(worksheet, data) {
    worksheet.addRow(['Category', 'Count', 'Total Amount']);
    
    Object.entries(data.summary).forEach(([category, value]) => {
      worksheet.addRow([category, value.count || 0, value.amount || 0]);
    });
  }

  // Add system data to PDF
  addSystemDataPDF(doc, data) {
    const headers = ['Category', 'Count', 'Total Amount'];
    const tableData = Object.entries(data.summary).map(([category, value]) => [
      category,
      (value.count || 0).toString(),
      (value.amount || 0).toString()
    ]);

    this.createOptimizedPDFTable(doc, headers, tableData, {
      title: 'General System Report',
      colWidth: 150,
      rowHeight: 12
    });
  }

  // Cumulative report methods (similar structure but with yearly totals)
  addCumulativeDeductionData(worksheet, data) {
    worksheet.addRow(['Member ID', 'Member Name', 'Total Regular Savings', 'Total Special Savings', 'Total Shares', 'Total Investment', 'Total Loan Repayment', 'Yearly Total']);
    
    data.forEach(member => {
      const yearlyTotal = (member.totalRegularSavings || 0) + (member.totalSpecialSavings || 0) + 
                         (member.totalShares || 0) + (member.totalInvestment || 0) + (member.totalLoanRepayment || 0);
      
      worksheet.addRow([
        member.memberId,
        `${member.firstName} ${member.surname}`,
        member.totalRegularSavings || 0,
        member.totalSpecialSavings || 0,
        member.totalShares || 0,
        member.totalInvestment || 0,
        member.totalLoanRepayment || 0,
        yearlyTotal
      ]);
    });
  }

  addCumulativeDeductionDataPDF(doc, data) {
    doc.fontSize(14).text('Cumulative Deduction Report', { align: 'center' });
    doc.moveDown();
    
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidth = 100;
    
    doc.fontSize(10);
    doc.text('Member ID', tableLeft, tableTop);
    doc.text('Name', tableLeft + colWidth, tableTop);
    doc.text('Total Regular', tableLeft + colWidth * 2, tableTop);
    doc.text('Total Special', tableLeft + colWidth * 3, tableTop);
    doc.text('Total Shares', tableLeft + colWidth * 4, tableTop);
    doc.text('Total Investment', tableLeft + colWidth * 5, tableTop);
    doc.text('Yearly Total', tableLeft + colWidth * 6, tableTop);
    
    let yPos = tableTop + 20;
    
    data.forEach(member => {
      const yearlyTotal = (member.totalRegularSavings || 0) + (member.totalSpecialSavings || 0) + 
                         (member.totalShares || 0) + (member.totalInvestment || 0) + (member.totalLoanRepayment || 0);
      
      doc.text(member.memberId, tableLeft, yPos);
      doc.text(`${member.firstName} ${member.surname}`, tableLeft + colWidth, yPos);
      doc.text((member.totalRegularSavings || 0).toString(), tableLeft + colWidth * 2, yPos);
      doc.text((member.totalSpecialSavings || 0).toString(), tableLeft + colWidth * 3, yPos);
      doc.text((member.totalShares || 0).toString(), tableLeft + colWidth * 4, yPos);
      doc.text((member.totalInvestment || 0).toString(), tableLeft + colWidth * 5, yPos);
      doc.text(yearlyTotal.toString(), tableLeft + colWidth * 6, yPos);
      
      yPos += 15;
    });
  }

  // Add other cumulative methods (similar structure)
  addCumulativePayrollData(worksheet, data) {
    // Similar to payroll but with yearly totals
    this.addPayrollData(worksheet, data);
  }

  addCumulativePayrollDataPDF(doc, data) {
    // Similar to payroll but with yearly totals
    this.addPayrollDataPDF(doc, data);
  }

  addCumulativeSavingsData(worksheet, data) {
    // Similar to savings but with yearly totals
    this.addSavingsData(worksheet, data);
  }

  addCumulativeSavingsDataPDF(doc, data) {
    // Similar to savings but with yearly totals
    this.addSavingsDataPDF(doc, data);
  }

  addCumulativeLoanData(worksheet, data) {
    // Similar to loan but with yearly totals
    this.addLoanData(worksheet, data);
  }

  addCumulativeLoanDataPDF(doc, data) {
    // Similar to loan but with yearly totals
    this.addLoanDataPDF(doc, data);
  }

  addCumulativeWithdrawalData(worksheet, data) {
    // Similar to withdrawal but with yearly totals
    this.addWithdrawalData(worksheet, data);
  }

  addCumulativeWithdrawalDataPDF(doc, data) {
    // Similar to withdrawal but with yearly totals
    this.addWithdrawalDataPDF(doc, data);
  }

  // Style the Excel worksheet
  styleWorksheet(worksheet) {
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  // Generic optimized table method for PDF reports
  createOptimizedPDFTable(doc, headers, data, options = {}) {
    const {
      tableLeft = 30,
      colWidth = 90,
      rowHeight = 12,
      headerFontSize = 8,
      dataFontSize = 7,
      title = '',
      titleFontSize = 12
    } = options;

    if (title) {
      doc.fontSize(titleFontSize).text(title, { align: 'center' });
      doc.moveDown();
    }

    const tableTop = doc.y;
    let yPos = tableTop + 15;
    let pageNumber = 1;

    // Draw headers
    doc.fontSize(headerFontSize);
    headers.forEach((header, index) => {
      doc.text(header, tableLeft + (colWidth * index), tableTop);
    });

    // Draw data rows
    data.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (yPos > doc.page.height - 100) {
        doc.addPage();
        pageNumber++;
        yPos = doc.page.margins.top + 20;

        // Redraw headers on new page
        doc.fontSize(headerFontSize);
        headers.forEach((header, index) => {
          doc.text(header, tableLeft + (colWidth * index), yPos);
        });
        yPos += 15;
      }

      doc.fontSize(dataFontSize);
      row.forEach((cell, cellIndex) => {
        doc.text(cell || '', tableLeft + (colWidth * cellIndex), yPos);
      });

      yPos += rowHeight;
    });

    // Add page numbers
    doc.fontSize(8);
    doc.text(`Page ${pageNumber}`, doc.page.width - 100, doc.page.height - 30);
  }
}

module.exports = ReportGenerator; 