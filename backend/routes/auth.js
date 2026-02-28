const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { COLLECTIONS, getAll, getById, createDoc, updateDoc } = require('../services/firestoreService');
const { protect } = require('../middleware/auth');

const buildUserId = () => `USR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

const findUserByEmailOrPhone = async (email, phone) => {
  const users = await getAll(COLLECTIONS.users);
  return users.find(user => (email && user.email === email) || (phone && user.phone === phone)) || null;
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, address } = req.body;

    // Check if user exists
    const userExists = await findUserByEmailOrPhone(email, phone);

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone'
      });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createDoc(COLLECTIONS.users, {
      userId: buildUserId(),
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || 'citizen',
      address,
      permissions: [],
      assignedWards: [],
      isActive: true,
      isVerified: false,
      fcmTokens: [],
      lastLogin: null,
      lastActive: null,
      createdAt: new Date()
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validate
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password'
      });
    }

    // Find user
    const user = await findUserByEmailOrPhone(email, phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password || '');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await updateDoc(COLLECTIONS.users, user.id, { lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        assignedWards: user.assignedWards
      },
      token
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Protected
router.get('/me', protect, async (req, res) => {
  try {
    const user = await getById(COLLECTIONS.users, req.user.id);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Protected
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address, notifications } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phone) fieldsToUpdate.phone = phone;
    if (address) fieldsToUpdate.address = address;
    if (notifications) fieldsToUpdate.notifications = notifications;

    const user = await updateDoc(COLLECTIONS.users, req.user.id, fieldsToUpdate);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Protected
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const user = await getById(COLLECTIONS.users, req.user.id);

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password || '');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateDoc(COLLECTIONS.users, req.user.id, { password: hashedPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

// @route   POST /api/auth/fcm-token
// @desc    Save FCM token for push notifications
// @access  Protected
router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const user = await getById(COLLECTIONS.users, req.user.id);

    // Add token if not exists
    const updatedTokens = user.fcmTokens || [];
    if (!updatedTokens.includes(token)) {
      updatedTokens.push(token);
      await updateDoc(COLLECTIONS.users, req.user.id, { fcmTokens: updatedTokens });
    }

    res.json({
      success: true,
      message: 'FCM token saved successfully'
    });

  } catch (error) {
    console.error('Save FCM Token Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving FCM token',
      error: error.message
    });
  }
});

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

module.exports = router;
