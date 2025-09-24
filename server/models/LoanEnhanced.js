const { query, transaction } = require('../config/database');

class LoanEnhanced {
  // =====================================================
  // LOAN CALCULATION UTILITIES (NO INTEREST)
  // =====================================================
  
  /**
   * Calculate simple monthly payment (no interest)
   * @param {number} principal - Loan amount
   * @param {number} months - Loan duration in months
   * @returns {number} Monthly payment amount
   */
  static calculateMonthlyPayment(principal, months) {
    return Math.round((principal / months) * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Generate simple payment schedule (no interest)
   * @param {number} principal - Loan amount
   * @param {number} months - Duration in months
   * @param {Date} startDate - Loan start date
   * @returns {Array} Array of payment schedule objects
   */
  static generatePaymentSchedule(principal, months, startDate) {
    const monthlyPayment = this.calculateMonthlyPayment(principal, months);
    let remainingBalance = principal;
    const schedule = [];
    
    for (let i = 1; i <= months; i++) {
      let principalAmount = monthlyPayment;
      
      // Adjust last payment to clear any rounding differences
      if (i === months) {
        principalAmount = remainingBalance;
      }
      
      remainingBalance -= principalAmount;
      
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      schedule.push({
        installmentNumber: i,
        dueDate: dueDate,
        principalAmount: Math.round(principalAmount * 100) / 100,
        interestAmount: 0, // No interest
        totalPayment: Math.round(principalAmount * 100) / 100,
        remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
      });
    }
    
    return schedule;
  }
  
  // =====================================================
  // LOAN ELIGIBILITY CHECKING
  // =====================================================
  
  /**
   * Check loan eligibility based on policies and member status
   * @param {string} memberId - Member ID
   * @param {number} amount - Requested loan amount
   * @param {string} category - Loan category
   * @param {number} duration - Duration in months
   * @returns {Object} Eligibility result
   */
  static async checkEligibility(memberId, amount, category, duration) {
    try {
      // Get member information with savings
      const memberResult = await query(`
        SELECT u.*, u.created_at,
               COALESCE(md.regular_savings, 0) + COALESCE(md.special_savings, 0) as total_savings,
               EXTRACT(EPOCH FROM AGE(CURRENT_DATE, u.created_at)) / (30.44 * 24 * 3600) as membership_months
        FROM users u
        LEFT JOIN monthly_deductions md ON u.id = md.user_id
        WHERE u.member_id = $1
        ORDER BY md.created_at DESC LIMIT 1
      `, [memberId]);
      
      if (memberResult.rows.length === 0) {
        return {
          eligible: false,
          reason: 'Member not found',
          maxEligibleAmount: 0,
          requiredGuarantors: 0,
          savingsBalance: 0
        };
      }
      
      const member = memberResult.rows[0];
      
      // Get loan policy for the category
      const policyResult = await query(`
        SELECT * FROM loan_policies 
        WHERE loan_category = $1 AND is_active = true 
        LIMIT 1
      `, [category]);
      
      if (policyResult.rows.length === 0) {
        return {
          eligible: false,
          reason: 'Invalid loan category',
          maxEligibleAmount: 0,
          requiredGuarantors: 0,
          savingsBalance: member.total_savings
        };
      }
      
      const policy = policyResult.rows[0];
      
      // Check membership duration
      if (member.membership_months < policy.min_membership_months) {
        return {
          eligible: false,
          reason: `Minimum membership period of ${policy.min_membership_months} months required`,
          maxEligibleAmount: 0,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      // Check amount limits
      if (amount > policy.max_amount) {
        return {
          eligible: false,
          reason: `Amount exceeds maximum limit of ₦${policy.max_amount.toLocaleString()}`,
          maxEligibleAmount: policy.max_amount,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      if (amount < policy.min_amount) {
        return {
          eligible: false,
          reason: `Amount below minimum limit of ₦${policy.min_amount.toLocaleString()}`,
          maxEligibleAmount: policy.min_amount,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      // Check duration limits
      if (duration > policy.max_duration_months) {
        return {
          eligible: false,
          reason: `Duration exceeds maximum of ${policy.max_duration_months} months`,
          maxEligibleAmount: member.total_savings * policy.savings_multiplier,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      // Check savings multiplier eligibility
      const maxEligibleBySavings = member.total_savings * policy.savings_multiplier;
      if (amount > maxEligibleBySavings) {
        return {
          eligible: false,
          reason: `Amount exceeds ${policy.savings_multiplier}x your savings balance (₦${maxEligibleBySavings.toLocaleString()})`,
          maxEligibleAmount: maxEligibleBySavings,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      // Check existing active loans
      const activeLoanResult = await query(`
        SELECT COUNT(*) as count, COALESCE(SUM(remaining_balance), 0) as total_outstanding
        FROM loans l
        JOIN users u ON l.user_id = u.id
        WHERE u.member_id = $1 AND l.status = 'active'
      `, [memberId]);
      
      const { count: activeLoansCount, total_outstanding } = activeLoanResult.rows[0];
      
      // Limit to one active loan for now (can be modified per policy)
      if (activeLoansCount > 0) {
        return {
          eligible: false,
          reason: `Member has ${activeLoansCount} active loan(s) with ₦${parseFloat(total_outstanding).toLocaleString()} outstanding`,
          maxEligibleAmount: 0,
          requiredGuarantors: policy.min_guarantors,
          savingsBalance: member.total_savings,
          policy: policy
        };
      }
      
      // All checks passed
      return {
        eligible: true,
        reason: 'Eligible for loan',
        maxEligibleAmount: Math.min(policy.max_amount, maxEligibleBySavings),
        requiredGuarantors: policy.min_guarantors,
        savingsBalance: member.total_savings,
        policy: policy,
        membershipMonths: Math.floor(member.membership_months)
      };
      
    } catch (error) {
      console.error('Eligibility check error:', error);
      return {
        eligible: false,
        reason: 'Error checking eligibility',
        maxEligibleAmount: 0,
        requiredGuarantors: 0,
        savingsBalance: 0
      };
    }
  }
  
  // =====================================================
  // ENHANCED LOAN OPERATIONS
  // =====================================================
  
  /**
   * Create a new loan with proper calculations
   * @param {Object} loanData - Loan data including amount, duration, category, etc.
   * @returns {Object} Created loan
   */
  static async createLoanWithCalculations(loanData) {
    return await transaction(async (client) => {
      const { memberId, amount, duration, purpose, category = 'standard' } = loanData;
      
      // Get user ID
      const userResult = await client.query('SELECT id FROM users WHERE member_id = $1', [memberId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      const userId = userResult.rows[0].id;
      
      // Calculate monthly payment (no interest)
      const monthlyPayment = this.calculateMonthlyPayment(amount, duration);
      const startDate = new Date();
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setMonth(expectedEndDate.getMonth() + duration);
      
      const nextDueDate = new Date(startDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      
      // Create loan
      const loanId = `LOAN${Date.now()}`;
      const loanResult = await client.query(`
        INSERT INTO loans (
          loan_id, user_id, amount, duration_months, purpose, loan_type,
          status, monthly_payment, remaining_balance, start_date, 
          expected_end_date, next_due_date, loan_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        loanId, userId, amount, duration, purpose || 'General',
        `${category.charAt(0).toUpperCase() + category.slice(1)} Loan`,
        'active', monthlyPayment, amount, startDate, expectedEndDate, nextDueDate, category
      ]);
      
      const loan = loanResult.rows[0];
      
      // Generate and insert payment schedule (no interest)
      const schedule = this.generatePaymentSchedule(amount, duration, startDate);
      
      for (const installment of schedule) {
        await client.query(`
          INSERT INTO loan_schedule (
            loan_id, installment_number, due_date, principal_amount,
            interest_amount, total_payment, remaining_balance
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          loan.id, installment.installmentNumber, installment.dueDate,
          installment.principalAmount, 0,
          installment.totalPayment, installment.remainingBalance
        ]);
      }
      
      return await this.findByLoanId(loanId);
    });
  }
  
  /**
   * Get loan with complete amortization schedule
   * @param {string} loanId - Loan ID
   * @returns {Object} Loan with schedule
   */
  static async getLoanWithSchedule(loanId) {
    const loan = await this.findByLoanId(loanId);
    if (!loan) return null;
    
    const scheduleResult = await query(`
      SELECT * FROM loan_schedule 
      WHERE loan_id = (SELECT id FROM loans WHERE loan_id = $1)
      ORDER BY installment_number
    `, [loanId]);
    
    loan.amortizationSchedule = scheduleResult.rows.map(row => ({
      installmentNumber: row.installment_number,
      dueDate: row.due_date,
      principalAmount: parseFloat(row.principal_amount),
      interestAmount: 0,
      totalPayment: parseFloat(row.total_payment),
      remainingBalance: parseFloat(row.remaining_balance),
      paymentStatus: row.payment_status,
      paidDate: row.paid_date,
      paidAmount: parseFloat(row.paid_amount) || 0,
      latePenalty: parseFloat(row.late_penalty) || 0
    }));
    
    return loan;
  }
  
  // =====================================================
  // EXISTING METHODS (UPDATED)
  // =====================================================
  
  // Find loan by ID
  static async findByLoanId(loanId) {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE l.loan_id = $1
    `, [loanId]);
    
    if (result.rows.length === 0) return null;
    return this.formatLoan(result.rows[0]);
  }
  
  // Get all active loans
  static async findActive() {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoan(row));
  }
  
  // Enhanced loan formatting (no interest)
  static formatLoan(row) {
    return {
      id: row.loan_id,
      amount: parseFloat(row.amount),
      duration: row.duration_months,
      purpose: row.purpose,
      loanType: row.loan_type,
      status: row.status,
      monthlyPayment: parseFloat(row.monthly_payment),
      remainingBalance: parseFloat(row.remaining_balance),
      startDate: row.start_date,
      expectedEndDate: row.expected_end_date,
      nextDueDate: row.next_due_date,
      totalPaid: parseFloat(row.total_paid) || 0,
      latePaymentPenalty: parseFloat(row.late_payment_penalty) || 0,
      loanCategory: row.loan_category || 'standard',
      guarantorRequired: row.guarantor_required,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      // Member info
      memberName: row.first_name && row.surname ? `${row.first_name} ${row.surname}` : undefined,
      memberId: row.member_id,
      // Calculated fields
      amountPaidToDate: parseFloat(row.amount) - parseFloat(row.remaining_balance),
      progressPercentage: ((parseFloat(row.amount) - parseFloat(row.remaining_balance)) / parseFloat(row.amount)) * 100
    };
  }
}

module.exports = LoanEnhanced;