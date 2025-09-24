const { query, transaction } = require('../config/database');

class LoanApplicationEnhanced {
  // =====================================================
  // SIMPLIFIED LOAN APPLICATION OPERATIONS
  // =====================================================
  
  /**
   * Create new loan application
   * @param {Object} applicationData - Application data
   * @returns {Object} Created application
   */
  static async create(applicationData) {
    return await transaction(async (client) => {
      const { 
        memberId, amount, duration, purpose, loanCategory = 'standard'
      } = applicationData;
      
      // Get user's database ID
      const userResult = await client.query('SELECT id FROM users WHERE member_id = $1', [memberId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      const userId = userResult.rows[0].id;
      
      // Calculate monthly payment (simple calculation)
          const monthlyPayment = amount / duration;
      
      // Generate unique application ID
      const applicationId = `APP${Date.now()}`;
      
      // Create loan application
      const applicationResult = await client.query(`
        INSERT INTO loan_applications (
          application_id, user_id, amount, duration_months, purpose, 
          loan_type, monthly_payment, loan_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        applicationId, userId, amount, duration, purpose || 'General',
        `${loanCategory.charAt(0).toUpperCase() + loanCategory.slice(1)} Loan`,
        monthlyPayment, loanCategory
      ]);
      
      return await this.findById(applicationId);
    });
  }
  

  
  /**
   * Update application status
   * @param {string} applicationId - Application ID
   * @param {string} status - New status (approved/declined)
   * @returns {Object} Updated application
   */
  static async updateStatus(applicationId, status) {
    const result = await query(`
      UPDATE loan_applications SET
        status = $2,
        processed_at = CURRENT_TIMESTAMP
      WHERE application_id = $1
      RETURNING *
    `, [applicationId, status]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    return await this.findById(applicationId);
  }
  
  /**
   * Get all pending applications
   * @returns {Array} Array of pending applications
   */
  static async findPending() {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname, u.email
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.status = 'pending'
      ORDER BY la.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }

  /**
   * Get all applications
   * @returns {Array} Array of all applications
   */
  static async findAll() {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname, u.email
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      ORDER BY la.created_at DESC
    `);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }

  /**
   * Get applications by status
   * @param {string} status - Application status
   * @returns {Array} Array of applications with specified status
   */
  static async findByStatus(status) {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname, u.email
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.status = $1
      ORDER BY la.created_at DESC
    `, [status]);
    
    return result.rows.map(row => this.formatLoanApplication(row));
  }
  


  // Find application by ID
  static async findById(applicationId) {
    const result = await query(`
      SELECT la.*, u.member_id, u.first_name, u.surname, u.email
      FROM loan_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.application_id = $1
    `, [applicationId]);
    
    if (result.rows.length === 0) return null;
    return this.formatLoanApplication(result.rows[0]);
  }

  // Format loan application data
  static formatLoanApplication(row) {
    return {
      applicationId: row.application_id,
      amount: parseFloat(row.amount),
      duration: row.duration_months,
      purpose: row.purpose,
      loanType: row.loan_type,
      monthlyPayment: parseFloat(row.monthly_payment),
      
      loanCategory: row.loan_category || 'standard',
      status: row.status,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      // Member information
      memberName: row.first_name && row.surname ? `${row.first_name} ${row.surname}` : undefined,
      memberId: row.member_id,
      memberEmail: row.email,
      // Calculated fields
              totalInterest: 0,
      totalPayable: parseFloat(row.monthly_payment) * row.duration_months
    };
  }

  // Delete application
  static async delete(applicationId) {
    const result = await query(`
      DELETE FROM loan_applications WHERE application_id = $1 RETURNING id
    `, [applicationId]);

    return result.rows.length > 0;
  }
}

module.exports = LoanApplicationEnhanced;