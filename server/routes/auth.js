const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, memberId, password } = req.body;

    if (!password || (!email && !memberId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing login credentials',
        message: 'Please provide both your email/member ID and password to log in.',
        hint: 'Enter your registered email address or member ID along with your password.'
      });
    }
    
    if (!password) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing password',
        message: 'Please enter your password to log in.',
        hint: 'Enter the password associated with your account.'
      });
    }
    
    if (!email && !memberId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing email or member ID',
        message: 'Please enter your email address or member ID to log in.',
        hint: 'Use the same email or member ID you used during registration.'
      });
    }

    // Try to find user by email first, then by memberId
    let user = null;
    if (email) {
      user = await User.findByEmail(email);
    } else if (memberId) {
      user = await User.findByMemberId(memberId);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await User.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        memberId: user.memberId,
        firstName: user.firstName,
        surname: user.surname
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password endpoint (supports both authenticated and first-time users)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, email, memberId: requestMemberId } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing password information',
        message: 'Please provide both your current password and new password to change your password.',
        hint: 'Enter your current password to verify your identity, then enter your desired new password.'
      });
    }
    
    if (!currentPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing current password',
        message: 'Please enter your current password to verify your identity.',
        hint: 'This is required for security reasons before changing your password.'
      });
    }
    
    if (!newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing new password',
        message: 'Please enter the new password you want to use.',
        hint: 'Choose a strong password that you will remember.'
      });
    }

    let user;
    
    // For authenticated users (already logged in) - they don't need email/memberId
    if (req.user) {
      const memberId = req.user.memberId || req.user.id;
      user = await User.findByMemberId(memberId);
      
      if (!user) {
        return res.status(404).json({ error: 'Authenticated user not found' });
      }
    }
    // For first-time users (not authenticated yet) - they need email OR memberId
    else {
      if (email) {
        user = await User.findByEmail(email);
      } else if (requestMemberId) {
        user = await User.findByMemberId(requestMemberId);
      } else {
        return res.status(400).json({ 
          success: false,
          error: 'Missing user identification',
          message: 'Please provide either your email address or member ID to change your password.',
          hint: 'This is required to identify your account for the password change process.'
        });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    // Verify current password
    const isValidPassword = await User.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await User.updatePassword(user.id, newPassword);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Use memberId as it's more stable than database id
    const memberId = req.user.memberId || req.user.id;
    
    if (!memberId) {
      return res.status(400).json({ error: 'User identifier not found' });
    }

    const user = await User.findByMemberId(memberId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, password_hash, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router; 