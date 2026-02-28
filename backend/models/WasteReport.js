const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    default: () => `WR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },
  
  // Location Data
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: String,
    landmark: String,
    wardNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    zone: String
  },

  // Waste Classification (AI-generated)
  classification: {
    wasteType: {
      type: String,
      enum: ['plastic', 'organic', 'mixed', 'construction', 'medical', 'e-waste', 'hazardous', 'textile', 'unclassified'],
      required: true
    },
    subType: String,
    severityScore: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    estimatedVolume: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      required: true
    },
    isIllegalDumping: Boolean,
    environmentalHazardLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },

  // Media
  images: [{
    url: String,
    thumbnail: String,
    uploadedAt: Date,
    metadata: {
      size: Number,
      format: String,
      dimensions: {
        width: Number,
        height: Number
      }
    }
  }],

  // Reporter Information
  reporter: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['citizen', 'officer', 'cctv', 'iot-sensor', 'system'],
      required: true
    },
    isAnonymous: Boolean,
    contactNumber: String
  },

  // Status Tracking
  status: {
    current: {
      type: String,
      enum: ['reported', 'verified', 'assigned', 'in-progress', 'resolved', 'rejected'],
      default: 'reported'
    },
    history: [{
      status: String,
      timestamp: Date,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },

  // Assignment
  assignedTo: {
    team: String,
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    truckId: String,
    assignedAt: Date,
    expectedCompletionTime: Date
  },

  // Verification
  verification: {
    isVerified: Boolean,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    notes: String
  },

  // Resolution
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionTaken: String,
    beforeImages: [String],
    afterImages: [String],
    wasteCollected: {
      quantity: Number, // in kg
      unit: String
    }
  },

  // Circular Economy Data
  circularEconomy: {
    recyclablePercentage: Number,
    estimatedRevenue: Number, // in INR
    processingMethod: String,
    localProcessorRecommendation: String,
    environmentalImpact: {
      co2Reduction: Number, // in kg
      landfillDiversion: Number, // percentage
      waterSaved: Number // in liters
    },
    employmentPotential: Number
  },

  // AI Analysis
  aiAnalysis: {
    geminiResponse: mongoose.Schema.Types.Mixed,
    visionApiResponse: mongoose.Schema.Types.Mixed,
    processedAt: Date,
    processingTime: Number, // in ms
    modelVersion: String
  },

  // Priority & Urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  overflowPrediction: {
    probability: Number, // percentage
    estimatedTimeToOverflow: Number, // in hours
    urgencyLevel: String,
    predictedAt: Date
  },

  // Timestamps
  reportedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
wasteReportSchema.index({ 'location.coordinates': '2dsphere' });
wasteReportSchema.index({ reportedAt: -1 });
wasteReportSchema.index({ 'location.wardNumber': 1 });
wasteReportSchema.index({ 'status.current': 1 });
wasteReportSchema.index({ 'classification.wasteType': 1 });

// Virtual for response time
wasteReportSchema.virtual('responseTime').get(function() {
  if (this.resolution && this.resolution.resolvedAt) {
    return Math.floor((this.resolution.resolvedAt - this.reportedAt) / (1000 * 60)); // in minutes
  }
  return null;
});

// Pre-save middleware
wasteReportSchema.pre('save', function(next) {
  this.lastUpdatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WasteReport', wasteReportSchema);
