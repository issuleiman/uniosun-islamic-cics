const jwt = require('jsonwebtoken');
const { User, Loan, LoanApplication, WithdrawalRequest } = require('../models');



const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource. Your access token is missing.',
      hint: 'Log in to your account to receive an access token.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'Your access token is invalid or has expired. Please log in again to get a new token.',
        hint: 'Log out and log back in to refresh your session.'
      });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required',
      message: 'This resource is restricted to administrators only. Your account does not have the required permissions.',
      hint: 'Contact your system administrator if you believe you should have access to this feature.'
    });
  }
  next();
};

const requireUser = (req, res, next) => {
  if (!req.user || (req.user.role !== 'user' && req.user.role !== 'admin')) {
    return res.status(403).json({ 
      success: false,
      error: 'User access required',
      message: 'This resource is restricted to registered users only. Your account does not have the required permissions.',
      hint: 'Contact your system administrator if you believe you should have access to this feature.'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUser
}; 