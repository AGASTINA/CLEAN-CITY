const mongoose = require('mongoose');

const policyRecommendationSchema = new mongoose.Schema({
  recommendationId: {
    type: String,
    required: true,
    unique: true,
    default: () => `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  },

  // Target Area
  wardNumber: {
    type: Number,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: [Number],
    address: String,
    specificArea: String
  },

  // Analysis Context
  context: {
    incidentCount: Number,
    timeframe: String, // e.g., "Last 30 days"
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    wasteTypes: [String],
    patterns: [{
      type: String,
      description: String,
      frequency: String
    }]
  },

  // AI-Generated Recommendations
  recommendations: {
    rootCause: {
      type: String,
      required: true
    },
    
    infrastructure: [{
      type: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      estimatedCost: Number,
      expectedImpact: String,
      timeline: String
    }],
    
    enforcement: [{
      action: String,
      target: String,
      schedule: String,
      resources: String
    }],
    
    awareness: [{
      campaign: String,
      targetAudience: String,
      channel: String,
      duration: String
    }],
    
    budgetPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true
    },
    
    estimatedImpact: {
      reductionInComplaints: Number, // percentage
      expectedROI: Number, // percentage
      timeToImplement: Number, // in days
      sustainabilityScore: Number // 0-10
    }
  },

  // AI Model Information
  aiMetadata: {
    modelUsed: String,
    generatedAt: Date,
    confidence: Number,
    dataPointsAnalyzed: Number,
    processingTime: Number,
    geminiResponse: mongoose.Schema.Types.Mixed
  },

  // Status Tracking
  status: {
    current: {
      type: String,
      enum: ['generated', 'under-review', 'approved', 'rejected', 'implemented', 'monitored'],
      default: 'generated'
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

  // Review & Approval
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'needs-revision']
    },
    feedback: String,
    modifications: String
  },

  // Implementation Tracking
  implementation: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    startDate: Date,
    expectedCompletionDate: Date,
    actualCompletionDate: Date,
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    milestonesCompleted: [{
      milestone: String,
      completedAt: Date
    }],
    budgetAllocated: Number,
    budgetSpent: Number
  },

  // Impact Measurement
  impact: {
    measuredAt: Date,
    actualReductionInComplaints: Number,
    actualROI: Number,
    citizenFeedback: {
      positive: Number,
      negative: Number,
      neutral: Number
    },
    sustainabilityMetrics: {
      wasteReduced: Number,
      co2Saved: Number,
      recyclingIncreased: Number
    },
    notes: String
  },

  // Priority & Urgency
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },

  // Tags for categorization
  tags: [String],

  // Related Reports
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteReport'
  }],

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date

}, {
  timestamps: true
});

// Indexes
policyRecommendationSchema.index({ wardNumber: 1 });
policyRecommendationSchema.index({ 'status.current': 1 });
policyRecommendationSchema.index({ priority: -1 });
policyRecommendationSchema.index({ createdAt: -1 });

// Calculate priority score
policyRecommendationSchema.methods.calculatePriority = function() {
  let score = 5;

  // Severity factor
  const severityWeight = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'critical': 4
  };
  score += severityWeight[this.context.severity] || 0;

  // Budget priority factor
  const budgetWeight = {
    'low': 0,
    'medium': 1,
    'high': 2,
    'urgent': 3
  };
  score += budgetWeight[this.recommendations.budgetPriority] || 0;

  // Expected impact factor
  if (this.recommendations.estimatedImpact.reductionInComplaints > 50) {
    score += 2;
  } else if (this.recommendations.estimatedImpact.reductionInComplaints > 30) {
    score += 1;
  }

  this.priority = Math.min(10, score);
};

module.exports = mongoose.model('PolicyRecommendation', policyRecommendationSchema);
