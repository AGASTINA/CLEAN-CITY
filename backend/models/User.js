const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => `USR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },

  // Personal Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please provide valid Indian phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },

  // Role & Permissions
  role: {
    type: String,
    enum: ['citizen', 'ward-officer', 'supervisor', 'admin', 'enforcement'],
    default: 'citizen'
  },
  permissions: [{
    type: String,
    enum: ['view-reports', 'create-reports', 'verify-reports', 'assign-tasks', 'view-analytics', 'manage-users', 'generate-reports', 'policy-access']
  }],

  // Location/Ward Assignment
  assignedWards: [{
    type: Number,
    min: 1,
    max: 100
  }],
  zone: String,

  // Profile
  avatar: String,
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    wardNumber: Number
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  
  // Citizen Engagement Metrics
  citizenMetrics: {
    reportsSubmitted: {
      type: Number,
      default: 0
    },
    reportsVerified: {
      type: Number,
      default: 0
    },
    participationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 10
    },
    badges: [{
      name: String,
      earnedAt: Date,
      icon: String
    }],
    rank: String,
    points: {
      type: Number,
      default: 0
    }
  },

  // Officer Performance Metrics
  officerMetrics: {
    tasksAssigned: {
      type: Number,
      default: 0
    },
    tasksCompleted: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number, // in minutes
    efficiency: Number, // percentage
    ratingsReceived: [{
      rating: Number,
      comment: String,
      ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      ratedAt: Date
    }],
    averageRating: {
      type: Number,
      min: 0,
      max: 5
    }
  },

  // Notification Preferences
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['instant', 'daily', 'weekly'],
      default: 'instant'
    }
  },

  // Firebase Token for Push Notifications
  fcmTokens: [String],

  // Activity Tracking
  lastLogin: Date,
  lastActive: Date,
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    device: String
  }],

  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  createdAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update participation score
userSchema.methods.updateParticipationScore = function() {
  const verified = this.citizenMetrics.reportsVerified;
  const total = this.citizenMetrics.reportsSubmitted;
  
  if (total === 0) {
    this.citizenMetrics.participationScore = 0;
    return;
  }

  const verificationRate = (verified / total) * 5;
  const activityBonus = Math.min(total / 20, 3);
  const score = Math.min(verificationRate + activityBonus + 2, 10);
  
  this.citizenMetrics.participationScore = Math.round(score * 10) / 10;
};

// Update officer efficiency
userSchema.methods.updateOfficerEfficiency = function() {
  const completed = this.officerMetrics.tasksCompleted;
  const assigned = this.officerMetrics.tasksAssigned;
  
  if (assigned === 0) {
    this.officerMetrics.efficiency = 0;
    return;
  }

  this.officerMetrics.efficiency = Math.round((completed / assigned) * 100);
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'assignedWards': 1 });

module.exports = mongoose.model('User', userSchema);
