const { query, transaction } = require('../config/database');
const LoanEnhanced = require('./LoanEnhanced');

class Loan extends LoanEnhanced {
  // Get all loans
  static async findAll() {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoan(row));
  }

  // Find loan by ID
  static async findById(id) {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return this.formatLoan(result.rows[0]);
  }

  // Find loan by loan_id
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

  // Find loans by user ID
  static async findByUserId(userId) {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE u.member_id = $1
      ORDER BY l.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => this.formatLoan(row));
  }

  // Find active loans by user ID
  static async findActiveByUserId(userId) {
    const result = await query(`
      SELECT l.*, u.member_id, u.first_name, u.surname
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE u.member_id = $1 AND l.status = 'active'
      ORDER BY l.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => this.formatLoan(row));
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

  // Create new loan
  static async create(loanData) {
    // Generate unique loan ID
    const loanId = `LOAN${Date.now()}`;
    
    // Get user's database ID from member_id
    const userResult = await query('SELECT id FROM users WHERE member_id = $1', [loanData.memberId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const userId = userResult.rows[0].id;

    const result = await query(`
      INSERT INTO loans (
        loan_id, user_id, amount, duration_months, purpose, loan_type,
        status, monthly_payment, remaining_balance, admin_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      loanId,
      userId,
      loanData.amount,
      loanData.duration,
      loanData.purpose || 'General',
      loanData.loanType || 'Regular Loan',
      'active',
      loanData.monthlyPayment || (loanData.amount / loanData.duration),
      loanData.amount, // Initial remaining balance equals loan amount
      loanData.adminNotes
    ]);

    return await this.findByLoanId(loanId);
  }

  // Update loan
  static async update(id, loanData) {
    const result = await query(`
      UPDATE loans SET
        amount = COALESCE($2, amount),
        duration_months = COALESCE($3, duration_months),
        purpose = COALESCE($4, purpose),
        loan_type = COALESCE($5, loan_type),
        status = COALESCE($6, status),
        monthly_payment = COALESCE($7, monthly_payment),
        remaining_balance = COALESCE($8, remaining_balance),
        admin_notes = COALESCE($9, admin_notes),
        completed_at = CASE WHEN $6 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE loan_id = $1
      RETURNING *
    `, [
      id,
      loanData.amount,
      loanData.duration,
      loanData.purpose,
      loanData.loanType,
      loanData.status,
      loanData.monthlyPayment,
      loanData.remainingBalance,
      loanData.adminNotes
    ]);

    if (result.rows.length === 0) return null;
    return await this.findByLoanId(id);
  }

  // Add payment to loan with proper monthly tracking
  static async addPayment(loanId, paymentData) {
    return await transaction(async (client) => {
      // Generate payment ID
      const paymentId = `REP${Date.now()}`;

      // Get loan with user info
      const loanResult = await client.query(`
        SELECT l.*, u.member_id 
        FROM loans l 
        JOIN users u ON l.user_id = u.id 
        WHERE l.loan_id = $1
      `, [loanId]);
      
      if (loanResult.rows.length === 0) {
        throw new Error('Loan not found');
      }
      const loan = loanResult.rows[0];

      // Add payment record
      await client.query(`
        INSERT INTO loan_payments (payment_id, loan_id, amount, payment_month, payment_year)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        paymentId,
        loan.id,
        paymentData.amount,
        paymentData.month,
        paymentData.year
      ]);

      // Update loan remaining balance
      const newBalance = Math.max(0, parseFloat(loan.remaining_balance) - parseFloat(paymentData.amount));
      const newStatus = newBalance <= 0 ? 'completed' : loan.status;

      await client.query(`
        UPDATE loans SET
          remaining_balance = $2,
          status = $3::VARCHAR(20),
          completed_at = CASE WHEN $3::VARCHAR(20) = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [loan.id, newBalance, String(newStatus)]);

      // Update monthly deductions for the specific month/year
      await this.updateMonthlyLoanRepayment(client, loan.member_id, paymentData.month, paymentData.year, paymentData.amount);

      return { paymentId, newBalance, status: newStatus };
    });
  }

  // Update monthly loan repayment in monthly_deductions table
  static async updateMonthlyLoanRepayment(client, memberId, month, year, amount) {
    // Get or create monthly deduction record
    const existingResult = await client.query(`
      SELECT md.id FROM monthly_deductions md
      JOIN users u ON md.user_id = u.id
      WHERE u.member_id = $1 AND md.month = $2 AND md.year = $3
    `, [memberId, month, year]);
    
    if (existingResult.rows.length > 0) {
      // Update existing record
      await client.query(`
        UPDATE monthly_deductions SET
          loan_repayment = loan_repayment + $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [existingResult.rows[0].id, amount]);
    } else {
      // Create new record
      const userResult = await client.query('SELECT id FROM users WHERE member_id = $1', [memberId]);
      if (userResult.rows.length > 0) {
        await client.query(`
          INSERT INTO monthly_deductions (user_id, month, year, loan_repayment)
          VALUES ($1, $2, $3, $4)
        `, [userResult.rows[0].id, month, year, amount]);
      }
    }
  }

  // Get loan payments
  static async getPayments(loanId) {
    const result = await query(`
      SELECT lp.* FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      WHERE l.loan_id = $1
      ORDER BY lp.payment_date DESC
    `, [loanId]);

    return result.rows.map(row => ({
      id: row.payment_id,
      amount: parseFloat(row.amount),
      date: row.payment_date,
      month: row.payment_month,
      year: row.payment_year
    }));
  }

  // Delete loan
  static async delete(id) {
    const result = await query(`
      DELETE FROM loans WHERE loan_id = $1 RETURNING id
    `, [id]);

    return result.rows.length > 0;
  }

  // Format loan data to match existing JSON structure
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
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      // Include member info for admin views
      memberName: row.first_name && row.surname ? `${row.first_name} ${row.surname}` : undefined,
      memberId: row.member_id,
      payments: [] // Will be populated separately when needed
    };
  }
}

module.exports = Loan;