const { query, transaction } = require('../config/database');

class WithdrawalRequest {
  // Get all withdrawal requests
  static async findAll() {
    const result = await query(`
      SELECT wr.*, u.member_id, u.first_name, u.surname
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC
    `);
    
    return result.rows.map(row => this.formatWithdrawalRequest(row));
  }

  // Find request by ID
  static async findById(id) {
    const result = await query(`
      SELECT wr.*, u.member_id, u.first_name, u.surname
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.request_id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return this.formatWithdrawalRequest(result.rows[0]);
  }

  // Find requests by user ID
  static async findByUserId(userId) {
    const result = await query(`
      SELECT wr.*, u.member_id, u.first_name, u.surname
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE u.member_id = $1
      ORDER BY wr.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => this.formatWithdrawalRequest(row));
  }

  // Find pending requests
  static async findPending() {
    const result = await query(`
      SELECT wr.*, u.member_id, u.first_name, u.surname
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.status = 'pending'
      ORDER BY wr.created_at DESC
    `);
    
    return result.rows.map(row => this.formatWithdrawalRequest(row));
  }

  // Create new withdrawal request
  static async create(requestData) {
    // Generate unique request ID
    const requestId = `WDR${Date.now()}`;
    
    // Get user's database ID from member_id
    const userResult = await query('SELECT id FROM users WHERE member_id = $1', [requestData.memberId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    const userId = userResult.rows[0].id;

    const result = await query(`
      INSERT INTO withdrawal_requests (
        request_id, user_id, amount, withdrawal_type, reason
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      requestId,
      userId,
      requestData.amount,
      'special_savings', // Default withdrawal type
      requestData.reason || 'Personal use'
    ]);

    return await this.findById(requestId);
  }

  // Update request status (approve/decline)
  static async updateStatus(requestId, status, adminNotes) {
    return await transaction(async (client) => {
      // Get the request first
      const requestResult = await client.query(`
        SELECT wr.*, u.special_savings_balance 
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.request_id = $1
      `, [requestId]);

      if (requestResult.rows.length === 0) {
        throw new Error('Withdrawal request not found');
      }

      const request = requestResult.rows[0];

      // Update request status
      await client.query(`
        UPDATE withdrawal_requests SET
          status = $2,
          admin_notes = $3,
          processed_at = CURRENT_TIMESTAMP
        WHERE request_id = $1
      `, [requestId, status, adminNotes]);

      let newBalance = parseFloat(request.special_savings_balance);

      // If approved, deduct from special savings balance
      if (status === 'approved') {
        if (newBalance < parseFloat(request.amount)) {
          throw new Error('Insufficient special savings balance');
        }

        newBalance = newBalance - parseFloat(request.amount);

        // Update user's special savings balance
        await client.query(`
          UPDATE users SET
            special_savings_balance = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [request.user_id, newBalance]);
      }

      const updatedRequest = await this.findById(requestId);
      updatedRequest.newBalance = newBalance;
      return updatedRequest;
    });
  }

  // Delete request
  static async delete(id) {
    const result = await query(`
      DELETE FROM withdrawal_requests WHERE request_id = $1 RETURNING id
    `, [id]);

    return result.rows.length > 0;
  }

  // Direct withdrawal (admin action)
  static async processDirectWithdrawal(memberId, amount, reason) {
    return await transaction(async (client) => {
      // Get user
      const userResult = await client.query('SELECT * FROM users WHERE member_id = $1', [memberId]);
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      const user = userResult.rows[0];

      // Check balance
      if (parseFloat(user.special_savings_balance) < parseFloat(amount)) {
        throw new Error('Insufficient special savings balance');
      }

      // Deduct from balance
      const newBalance = parseFloat(user.special_savings_balance) - parseFloat(amount);
      await client.query(`
        UPDATE users SET
          special_savings_balance = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [user.id, newBalance]);

      // Create approved withdrawal record
      const requestId = `WDR${Date.now()}`;
      await client.query(`
        INSERT INTO withdrawal_requests (
          request_id, user_id, amount, withdrawal_type, reason, status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, 'approved', CURRENT_TIMESTAMP)
      `, [requestId, user.id, amount, 'special_savings', reason || 'Admin direct withdrawal']);

      return { newBalance, requestId };
    });
  }

  // Format withdrawal request data to match existing JSON structure
  static formatWithdrawalRequest(row) {
    return {
      id: row.request_id,
      amount: parseFloat(row.amount),
      reason: row.reason,
      status: row.status,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      // Include member info for admin views
      memberName: row.first_name && row.surname ? `${row.first_name} ${row.surname}` : undefined,
      memberId: row.member_id
    };
  }
}

module.exports = WithdrawalRequest;