const { query, transaction } = require('../config/database');
const LoanApplicationEnhanced = require('./LoanApplicationEnhanced');

class LoanApplication extends LoanApplicationEnhanced {
  // Get all loan applications
  static async findAll() {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      ORDER BY la.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }

  // Find application by ID
  static async findById(id) {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.application_id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return this.formatLoanApplication(result.rows[0]);
  }

  // Find applications by user ID
  static async findByUserId(userId) {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE u.member_id = $1
      ORDER BY la.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }

  // Find pending applications
  static async findPending() {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.status = 'pending'
      ORDER BY la.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }

  // Create new loan application
  static async create(applicationData) {
    // Generate unique application ID
    const applicationId = `APP${Date.now()}`;
    
    // Get user's database ID from member_id
    const userResult = await query('SELECT id FROM users WHERE member_id = $1', [applicationData.memberId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const userId = userResult.rows[0].id;

    const monthlyPayment = applicationData.amount / applicationData.duration;

    const result = await query(`
      INSERT INTO loan_applications (
        application_id, user_id, amount, duration_months, purpose, 
        loan_type, monthly_payment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      applicationId,
      userId,
      applicationData.amount,
      applicationData.duration,
      applicationData.purpose || 'General',
      applicationData.loanType || 'Regular Loan',
      monthlyPayment
    ]);

    return await this.findById(applicationId);
  }

  // Update application status (approve/decline)
  static async updateStatus(applicationId, status, adminNotes) {
    return await transaction(async (client) => {
      // Update application
      const result = await client.query(`
        UPDATE loan_applications SET
          status = $2,
          admin_notes = $3,
          processed_at = CURRENT_TIMESTAMP
        WHERE application_id = $1
        RETURNING *
      `, [applicationId, status, adminNotes]);

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      const application = result.rows[0];

      // If approved, create a loan (monthly deductions will be handled when payments are made)
      if (status === 'approved') {
        // Create loan
        const loanId = `LOAN${Date.now()}`;
        await client.query(`
          INSERT INTO loans (
            loan_id, user_id, amount, duration_months, purpose, loan_type,
            status, monthly_payment, remaining_balance
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        `, [
          loanId,
          application.user_id,
          application.amount,
          application.duration_months,
          application.purpose,
          application.loan_type,
          application.monthly_payment,
          application.amount
        ]);

        // Note: Monthly deductions will be updated when actual payments are recorded
        // This ensures proper month/year tracking of loan repayments
      }

      return await this.findById(applicationId);
    });
  }

  // Delete application
  static async delete(id) {
    const result = await query(`
      DELETE FROM loan_applications WHERE application_id = $1 RETURNING id
    `, [id]);

    return result.rows.length > 0;
  }

  // Format loan application data to match existing JSON structure
  static formatLoanApplication(row) {
    return {
      id: row.application_id,
      amount: parseFloat(row.amount),
      duration: row.duration_months,
      purpose: row.purpose,
      loanType: row.loan_type,
      status: row.status,
      monthlyPayment: parseFloat(row.monthly_payment),
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      // Include member info for admin views
      memberName: row.first_name && row.surname ? `${row.first_name} ${row.surname}` : undefined,
      memberId: row.member_id
    };
  }
}

module.exports = LoanApplication;