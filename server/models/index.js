// Export all models for easy importing
const User = require('./User');
const Loan = require('./Loan');
const LoanApplication = require('./LoanApplication');
const WithdrawalRequest = require('./WithdrawalRequest');

module.exports = {
  User,
  Loan,
  LoanApplication,
  WithdrawalRequest
};