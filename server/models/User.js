const { query, transaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Get all users with optional month/year filtering
  static async findAll(month = null, year = null) {
    let whereClause = '';
    let params = [];
    
    if (month && year) {
      whereClause = 'AND md.month = $1 AND md.year = $2';
      params = [month, year];
    }
    
    const result = await query(`
      SELECT 
        u.*,
        md.regular_savings,
        md.special_savings,
        md.shares,
        md.investment,
        md.loan_repayment,
        md.over_deduction,
        md.under_deduction,
        md.ileya_loan,
        md.business,
        md.month,
        md.year
      FROM users u
      LEFT JOIN monthly_deductions md ON u.id = md.user_id ${whereClause}
      ORDER BY u.created_at
    `, params);
    
    return result.rows.map(row => this.formatUser(row));
  }

  // Find user by ID with optional month/year filtering
  static async findById(id, month = null, year = null) {
    let whereClause = 'WHERE u.id = $1';
    let params = [id];
    
    if (month && year) {
      whereClause += ' AND (md.month = $2 AND md.year = $3)';
      params.push(month, year);
    }
    
    const result = await query(`
      SELECT 
        u.*,
        md.regular_savings,
        md.special_savings,
        md.shares,
        md.investment,
        md.loan_repayment,
        md.over_deduction,
        md.under_deduction,
        md.ileya_loan,
        md.business,
        md.month,
        md.year
      FROM users u
      LEFT JOIN monthly_deductions md ON u.id = md.user_id
      ${whereClause}
    `, params);
    
    if (result.rows.length === 0) return null;
    return this.formatUser(result.rows[0]);
  }

  // Enhanced findByMemberId with strict monthly separation
  static async findByMemberId(memberId, month = null, year = null) {
    // First get the user basic info
    const userResult = await query(`
      SELECT * FROM users WHERE member_id = $1
    `, [memberId]);
    
    if (userResult.rows.length === 0) return null;
    
    const user = userResult.rows[0];
    
    // Get monthly deductions if month/year specified
    let monthlyData = null;
    if (month && year) {
      const monthlyResult = await query(`
        SELECT * FROM monthly_deductions 
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [user.id, month, year]);
      
      monthlyData = monthlyResult.rows[0] || {
        regular_savings: 0,
        special_savings: 0,
        shares: 0,
        investment: 0,
        loan_repayment: 0,
        over_deduction: 0,
        under_deduction: 0,
        ileya_loan: 0,
        business: 0,
        month: month,
        year: year
      };
    } else {
      // Get latest monthly data for general view (when no specific month requested)
      const monthlyResult = await query(`
        SELECT * FROM monthly_deductions 
        WHERE user_id = $1 
        ORDER BY year DESC, month DESC 
        LIMIT 1
      `, [user.id]);
      
      monthlyData = monthlyResult.rows[0] || {
        regular_savings: 0,
        special_savings: 0,
        shares: 0,
        investment: 0,
        loan_repayment: 0,
        over_deduction: 0,
        under_deduction: 0,
        ileya_loan: 0,
        business: 0,
        month: null,
        year: null
      };
    }
    
    return this.formatUserWithMonthlyData(user, monthlyData);
  }

  // Get user's monthly data for all months
  static async getUserMonthlyHistory(memberId) {
    const result = await query(`
      SELECT 
        u.member_id,
        u.first_name,
        u.surname,
        md.month,
        md.year,
        md.regular_savings,
        md.special_savings,
        md.shares,
        md.investment,
        md.loan_repayment,
        md.over_deduction,
        md.under_deduction,
        md.ileya_loan,
        md.business,
        (md.regular_savings + md.special_savings + md.shares + md.investment + 
         md.loan_repayment + md.over_deduction + md.ileya_loan + md.business + md.under_deduction) as total_deduction
      FROM users u
      LEFT JOIN monthly_deductions md ON u.id = md.user_id
      WHERE u.member_id = $1
      ORDER BY md.year DESC, md.month DESC
    `, [memberId]);
    
    return result.rows;
  }

  // Get or create monthly deduction record
  static async getOrCreateMonthlyDeduction(userId, month, year) {
    return await transaction(async (client) => {
      // Try to find existing record
      const existingResult = await client.query(`
        SELECT id FROM monthly_deductions
        WHERE user_id = $1 AND month = $2 AND year = $3
      `, [userId, month, year]);
      
      if (existingResult.rows.length > 0) {
        return existingResult.rows[0].id;
      }
      
      // Create new record
      const newResult = await client.query(`
        INSERT INTO monthly_deductions (user_id, month, year)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [userId, month, year]);
      
      return newResult.rows[0].id;
    });
  }

  // Update monthly deductions for specific month/year
  static async updateMonthlyDeductions(idOrMemberId, month, year, deductions) {
    return await transaction(async (client) => {
      // Find user
      let user;
      if (typeof idOrMemberId === 'string' && idOrMemberId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [idOrMemberId]);
        user = userResult.rows[0];
      } else {
        const userResult = await client.query('SELECT * FROM users WHERE member_id = $1', [idOrMemberId]);
        user = userResult.rows[0];
      }
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get or create monthly deduction record
      const deductionId = await this.getOrCreateMonthlyDeduction(user.id, month, year);
      
      // Update the monthly deduction record
      await client.query(`
        UPDATE monthly_deductions SET
          regular_savings = COALESCE($2, regular_savings),
          special_savings = COALESCE($3, special_savings),
          shares = COALESCE($4, shares),
          investment = COALESCE($5, investment),
          loan_repayment = COALESCE($6, loan_repayment),
          over_deduction = COALESCE($7, over_deduction),
          under_deduction = COALESCE($8, under_deduction),
          ileya_loan = COALESCE($9, ileya_loan),
          business = COALESCE($10, business),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [
        deductionId,
        deductions.regularSavings,
        deductions.specialSavings,
        deductions.shares,
        deductions.investment,
        deductions.loanRepayment,
        deductions.overDeduction,
        deductions.underDeduction,
        deductions.ileyaLoan,
        deductions.business
      ]);
      
      return await this.findByMemberId(user.member_id, month, year);
    });
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(`
      SELECT 
        u.*,
        md.regular_savings,
        md.special_savings,
        md.shares,
        md.investment,
        md.loan_repayment,
        md.over_deduction,
        md.under_deduction,
        md.ileya_loan,
        md.business
      FROM users u
      LEFT JOIN monthly_deductions md ON u.id = md.user_id
      WHERE u.email = $1
    `, [email]);
    
    if (result.rows.length === 0) return null;
    return this.formatUser(result.rows[0]);
  }



  // Get all members (non-admin users) with optional month/year filtering
  static async findMembers(month = null, year = null) {
    let sqlQuery = `
      SELECT 
        u.*,
        md.regular_savings,
        md.special_savings,
        md.shares,
        md.investment,
        md.loan_repayment,
        md.over_deduction,
        md.under_deduction,
        md.ileya_loan,
        md.business,
        md.month,
        md.year
      FROM users u
      LEFT JOIN (
        SELECT * FROM monthly_deductions 
        WHERE (month = $1 AND year = $2) OR ($1 IS NULL AND $2 IS NULL)
      ) md ON u.id = md.user_id
      WHERE u.role = 'user'
      ORDER BY u.created_at
    `;
    
    const params = month && year ? [month, year] : [null, null];
    
    const result = await query(sqlQuery, params);
    
    return result.rows.map(row => this.formatUser(row));
  }

  // Create new user
  static async create(userData) {
    return await transaction(async (client) => {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password || 'password', 10);
      
      // Insert user
      const userResult = await client.query(`
        INSERT INTO users (
          member_id, first_name, surname, email, phone, password_hash, role,
          bank_name, account_number, account_holder_name, is_first_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        userData.memberId,
        userData.firstName,
        userData.surname,
        userData.email,
        userData.phone,
        hashedPassword,
        userData.role || 'user',
        userData.bankName || '',
        userData.accountNumber || '',
        userData.accountHolderName || '',
        userData.isFirstLogin !== false
      ]);

      const user = userResult.rows[0];

      // Create default monthly deductions for current month
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const deductionResult = await client.query(`
        INSERT INTO monthly_deductions (
          user_id, month, year, regular_savings, special_savings, shares, investment,
          loan_repayment, over_deduction, under_deduction, ileya_loan, business
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        user.id,
        currentMonth,
        currentYear,
        userData.deductions?.regularSavings || 0,
        userData.deductions?.specialSavings || 0,
        userData.deductions?.shares || 0,
        userData.deductions?.investment || 0,
        userData.deductions?.loanRepayment || 0,
        userData.deductions?.overDeduction || 0,
        userData.deductions?.underDeduction || 0,
        userData.deductions?.ileyaLoan || 0,
        userData.deductions?.business || 0
      ]);

      // Get the complete user data with deductions using the transaction client
      const completeUserResult = await client.query(`
        SELECT 
          u.*,
          md.regular_savings,
          md.special_savings,
          md.shares,
          md.investment,
          md.loan_repayment,
          md.over_deduction,
          md.under_deduction,
          md.ileya_loan,
          md.business
        FROM users u
        LEFT JOIN monthly_deductions md ON u.id = md.user_id
        WHERE u.id = $1
      `, [user.id]);

      if (completeUserResult.rows.length === 0) {
        throw new Error('Failed to retrieve created user');
      }

      return this.formatUser(completeUserResult.rows[0]);
    });
  }

  // Update user by database UUID or member_id
  static async update(idOrMemberId, userData) {
    return await transaction(async (client) => {
      // First, get the user to find the actual database UUID
      let user;
      if (typeof idOrMemberId === 'string' && idOrMemberId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // It's a UUID, use it directly
        const result = await client.query('SELECT * FROM users WHERE id = $1', [idOrMemberId]);
        user = result.rows[0];
      } else {
        // It's a member_id, find by member_id
        const result = await client.query('SELECT * FROM users WHERE member_id = $1', [idOrMemberId]);
        user = result.rows[0];
      }

      if (!user) return null;

      // Update user basic info
      const userResult = await client.query(`
        UPDATE users SET
          first_name = COALESCE($2, first_name),
          surname = COALESCE($3, surname),
          email = COALESCE($4, email),
          phone = COALESCE($5, phone),
          bank_name = COALESCE($6, bank_name),
          account_number = COALESCE($7, account_number),
          account_holder_name = COALESCE($8, account_holder_name),
          is_first_login = COALESCE($9, is_first_login),
          cumulative_savings = COALESCE($10, cumulative_savings),
          cumulative_shares = COALESCE($11, cumulative_shares),
          cumulative_investment = COALESCE($12, cumulative_investment),
          special_savings_balance = COALESCE($13, special_savings_balance),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [
        user.id,
        userData.firstName,
        userData.surname,
        userData.email,
        userData.phone,
        userData.bankName,
        userData.accountNumber,
        userData.accountHolderName,
        userData.isFirstLogin,
        userData.cumulativeSavings,
        userData.cumulativeShares,
        userData.cumulativeInvestment,
        userData.specialSavingsBalance
      ]);

      if (userResult.rows.length === 0) return null;

      // Update deductions if provided
      if (userData.deductions) {
        await client.query(`
          UPDATE monthly_deductions SET
            regular_savings = COALESCE($2, regular_savings),
            special_savings = COALESCE($3, special_savings),
            shares = COALESCE($4, shares),
            investment = COALESCE($5, investment),
            loan_repayment = COALESCE($6, loan_repayment),
            over_deduction = COALESCE($7, over_deduction),
            under_deduction = COALESCE($8, under_deduction),
            ileya_loan = COALESCE($9, ileya_loan),
            business = COALESCE($10, business),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `, [
          user.id,
          userData.deductions.regularSavings,
          userData.deductions.specialSavings,
          userData.deductions.shares,
          userData.deductions.investment,
          userData.deductions.loanRepayment,
          userData.deductions.overDeduction,
          userData.deductions.underDeduction,
          userData.deductions.ileyaLoan,
          userData.deductions.business
        ]);
      }

      return await this.findByMemberId(user.member_id);
    });
  }

  // Update password
  static async updatePassword(idOrMemberId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Check if it's a UUID or member_id
    let whereClause, whereValue;
    if (typeof idOrMemberId === 'string' && idOrMemberId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's a UUID
      whereClause = 'id = $2';
      whereValue = idOrMemberId;
    } else {
      // It's a member_id
      whereClause = 'member_id = $2';
      whereValue = idOrMemberId;
    }
    
    const result = await query(`
      UPDATE users SET
        password_hash = $1,
        is_first_login = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${whereClause}
      RETURNING id
    `, [hashedPassword, whereValue]);

    return result.rows.length > 0;
  }

  // Delete user by database UUID or member_id
  static async delete(idOrMemberId) {
    let whereClause, paramValue;
    
    if (typeof idOrMemberId === 'string' && idOrMemberId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's a UUID
      whereClause = 'id = $1';
      paramValue = idOrMemberId;
    } else {
      // It's a member_id
      whereClause = 'member_id = $1';
      paramValue = idOrMemberId;
    }

    const result = await query(`
      DELETE FROM users WHERE ${whereClause} RETURNING id
    `, [paramValue]);

    return result.rows.length > 0;
  }

  // Verify password
  static async verifyPassword(user, password) {
    // Use password_hash field from database or password field for compatibility
    const hashedPassword = user.password_hash || user.password;
    return await bcrypt.compare(password, hashedPassword);
  }

  // Get cumulative totals for a user across all months
  static async getUserCumulatives(memberId) {
    const result = await query(`
      SELECT 
        u.member_id,
        u.cumulative_savings,
        u.cumulative_shares,
        u.cumulative_investment,
        u.special_savings_balance,
        COALESCE(SUM(md.regular_savings), 0) as total_regular_savings,
        COALESCE(SUM(md.special_savings), 0) as total_special_savings,
        COALESCE(SUM(md.shares), 0) as total_shares,
        COALESCE(SUM(md.investment), 0) as total_investment,
        COALESCE(SUM(md.loan_repayment), 0) as total_loan_repayment,
        COALESCE(SUM(md.over_deduction), 0) as total_over_deduction,
        COALESCE(SUM(md.under_deduction), 0) as total_under_deduction,
        COALESCE(SUM(md.ileya_loan), 0) as total_ileya_loan,
        COALESCE(SUM(md.business), 0) as total_business,
        COUNT(md.id) as months_recorded
      FROM users u
      LEFT JOIN monthly_deductions md ON u.id = md.user_id
      WHERE u.member_id = $1
      GROUP BY u.id, u.member_id, u.cumulative_savings, u.cumulative_shares, u.cumulative_investment, u.special_savings_balance
    `, [memberId]);
    
    return result.rows[0] || null;
  }

  // Enhanced formatUser with clear separation between cumulative and monthly data
  static formatUserWithMonthlyData(userRow, monthlyData = null) {
    const user = {
      id: userRow.member_id, // Keep using member_id as id for compatibility
      memberId: userRow.member_id,
      firstName: userRow.first_name,
      surname: userRow.surname,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role,
      password: userRow.password_hash,
      password_hash: userRow.password_hash, // Include both for compatibility
      bankName: userRow.bank_name,
      accountNumber: userRow.account_number,
      accountHolderName: userRow.account_holder_name,
      isFirstLogin: userRow.is_first_login,
      // Cumulative values (across all months) - never mixed with monthly data
      cumulativeSavings: parseFloat(userRow.cumulative_savings || 0),
      cumulativeShares: parseFloat(userRow.cumulative_shares || 0),
      cumulativeInvestment: parseFloat(userRow.cumulative_investment || 0),
      specialSavingsBalance: parseFloat(userRow.special_savings_balance || 0),
      createdAt: userRow.created_at,
      loans: [], // Will be populated separately when needed
      loanApplications: [], // Will be populated separately when needed
      withdrawalRequests: [] // Will be populated separately when needed
    };

    // Add monthly deduction data if provided
    if (monthlyData) {
      user.deductions = {
        regularSavings: parseFloat(monthlyData.regular_savings || 0),
        specialSavings: parseFloat(monthlyData.special_savings || 0),
        shares: parseFloat(monthlyData.shares || 0),
        investment: parseFloat(monthlyData.investment || 0),
        loanRepayment: parseFloat(monthlyData.loan_repayment || 0),
        overDeduction: parseFloat(monthlyData.over_deduction || 0),
        underDeduction: parseFloat(monthlyData.under_deduction || 0),
        ileyaLoan: parseFloat(monthlyData.ileya_loan || 0),
        business: parseFloat(monthlyData.business || 0),
        // Calculate total monthly deduction
        total: parseFloat(monthlyData.regular_savings || 0) + parseFloat(monthlyData.special_savings || 0) + 
               parseFloat(monthlyData.shares || 0) + parseFloat(monthlyData.investment || 0) + 
               parseFloat(monthlyData.loan_repayment || 0) + parseFloat(monthlyData.over_deduction || 0) + 
               parseFloat(monthlyData.ileya_loan || 0) + parseFloat(monthlyData.business || 0) + 
               parseFloat(monthlyData.under_deduction || 0)
      };
      
      // Add monthly context if available
      if (monthlyData.month && monthlyData.year) {
        user.monthlyContext = {
          month: parseInt(monthlyData.month),
          year: parseInt(monthlyData.year),
          monthName: new Date(monthlyData.year, monthlyData.month - 1).toLocaleDateString('en-US', { month: 'long' })
        };
      }
    } else {
      // No monthly data - return empty deductions (strict separation)
      user.deductions = {
        regularSavings: 0,
        specialSavings: 0,
        shares: 0,
        investment: 0,
        loanRepayment: 0,
        overDeduction: 0,
        underDeduction: 0,
        ileyaLoan: 0,
        business: 0,
        total: 0
      };
    }

    return user;
  }

  // Legacy formatUser for backward compatibility (uses latest monthly data)
  static formatUser(row) {
    const user = {
      id: row.member_id,
      memberId: row.member_id,
      firstName: row.first_name,
      surname: row.surname,
      email: row.email,
      phone: row.phone,
      role: row.role,
      password: row.password_hash,
      password_hash: row.password_hash,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountHolderName: row.account_holder_name,
      isFirstLogin: row.is_first_login,
      cumulativeSavings: parseFloat(row.cumulative_savings || 0),
      cumulativeShares: parseFloat(row.cumulative_shares || 0),
      cumulativeInvestment: parseFloat(row.cumulative_investment || 0),
      specialSavingsBalance: parseFloat(row.special_savings_balance || 0),
      createdAt: row.created_at,
      deductions: {
        regularSavings: parseFloat(row.regular_savings || 0),
        specialSavings: parseFloat(row.special_savings || 0),
        shares: parseFloat(row.shares || 0),
        investment: parseFloat(row.investment || 0),
        loanRepayment: parseFloat(row.loan_repayment || 0),
        overDeduction: parseFloat(row.over_deduction || 0),
        underDeduction: parseFloat(row.under_deduction || 0),
        ileyaLoan: parseFloat(row.ileya_loan || 0),
        business: parseFloat(row.business || 0),
        total: parseFloat(row.regular_savings || 0) + parseFloat(row.special_savings || 0) + 
               parseFloat(row.shares || 0) + parseFloat(row.investment || 0) + 
               parseFloat(row.loan_repayment || 0) + parseFloat(row.over_deduction || 0) + 
               parseFloat(row.ileya_loan || 0) + parseFloat(row.business || 0) + 
               parseFloat(row.under_deduction || 0)
      },
      loans: [],
      loanApplications: [],
      withdrawalRequests: []
    };

    if (row.month && row.year) {
      user.monthlyContext = {
        month: parseInt(row.month),
        year: parseInt(row.year),
        monthName: new Date(row.year, row.month - 1).toLocaleDateString('en-US', { month: 'long' })
      };
    }

    return user;
  }
}

module.exports = User;