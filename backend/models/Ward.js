const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  wardNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 100
  },
  
  name: {
    type: String,
    required: true
  },
  
  zone: {
    type: String,
    required: true,
    enum: ['north', 'south', 'east', 'west', 'central']
  },

  // Geographic Data
  boundaries: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // GeoJSON polygon format
      required: true
    }
  },

  // Ward Statistics
  demographics: {
    population: Number,
    households: Number,
    commercialEstablishments: Number,
    area: Number, // in sq km
    density: Number // per sq km
  },

  // Cleanliness Metrics
  cleanlinessIndex: {
    current: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    history: [{
      score: Number,
      timestamp: Date,
      factors: {
        reportFrequency: Number,
        resolutionSpeed: Number,
        citizenFeedback: Number,
        inspectionScore: Number
      }
    }],
    weeklyTrend: Number, // percentage change
    monthlyTrend: Number,
    rank: Number // among all wards
  },

  // Active Reports Summary
  activeReports: {
    total: {
      type: Number,
      default: 0
    },
    byStatus: {
      reported: { type: Number, default: 0 },
      verified: { type: Number, default: 0 },
      assigned: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 }
    },
    bySeverity: {
      low: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      critical: { type: Number, default: 0 }
    }
  },

  // Overflow Prediction
  overflowRisk: {
    currentLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    probability: Number, // percentage
    estimatedOverflowTime: Date,
    hotspots: [{
      location: {
        type: {
          type: String,
          enum: ['Point']
        },
        coordinates: [Number]
      },
      severity: Number,
      lastUpdated: Date
    }],
    predictedAt: Date
  },

  // Infrastructure
  infrastructure: {
    bins: {
      total: Number,
      smart: Number,
      regular: Number,
      capacity: Number // in cubic meters
    },
    cctvCameras: {
      total: Number,
      active: Number,
      locations: [{
        id: String,
        coordinates: [Number],
        status: String
      }]
    },
    vehicles: [{
      vehicleId: String,
      type: String,
      capacity: Number,
      status: String
    }]
  },

  // Personnel
  staff: {
    wardOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    supervisors: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    workers: Number,
    contractors: [String]
  },

  // Performance Metrics
  performance: {
    averageResponseTime: Number, // in minutes
    resolutionRate: Number, // percentage
    citizenSatisfaction: Number, // out of 5
    complaintVolume: Number, // per month
    repeatComplaints: Number // percentage
  },

  // Circular Economy Impact
  circularMetrics: {
    wasteSegregated: Number, // kg per month
    recyclingRate: Number, // percentage
    revenueGenerated: Number, // INR per month
    co2Reduced: Number, // kg per month
    employmentGenerated: Number
  },

  // Budget & Costs
  budget: {
    allocated: Number, // annual
    spent: Number,
    remaining: Number,
    efficiency: Number // percentage
  },

  // Contact Information
  contact: {
    office: String,
    emergency: String,
    email: String
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Indexes
wardSchema.index({ 'boundaries': '2dsphere' });
wardSchema.index({ wardNumber: 1 });
wardSchema.index({ zone: 1 });
wardSchema.index({ 'cleanlinessIndex.current': -1 });

// Calculate cleanliness index
wardSchema.methods.calculateCleanlinessIndex = async function() {
  const WasteReport = mongoose.model('WasteReport');
  
  // Get reports from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const reports = await WasteReport.find({
    'location.wardNumber': this.wardNumber,
    reportedAt: { $gte: thirtyDaysAgo }
  });

  if (reports.length === 0) {
    this.cleanlinessIndex.current = 100;
    return;
  }

  // Factor 1: Report Frequency (inverse - fewer reports = cleaner)
  const reportsPerDay = reports.length / 30;
  const reportFrequency = Math.max(0, 100 - (reportsPerDay * 5));

  // Factor 2: Resolution Speed
  const resolvedReports = reports.filter(r => r.status.current === 'resolved');
  const avgResponseTime = resolvedReports.reduce((sum, r) => {
    return sum + (r.responseTime || 0);
  }, 0) / (resolvedReports.length || 1);
  const resolutionSpeed = Math.max(0, 100 - (avgResponseTime / 2));

  // Factor 3: Severity of issues
  const avgSeverity = reports.reduce((sum, r) => sum + r.classification.severityScore, 0) / reports.length;
  const severityFactor = Math.max(0, 100 - (avgSeverity * 15));

  // Factor 4: Resolution rate
  const resolutionRate = (resolvedReports.length / reports.length) * 100;

  // Calculate weighted score
  const score = (
    reportFrequency * 0.25 +
    resolutionSpeed * 0.30 +
    severityFactor * 0.25 +
    resolutionRate * 0.20
  );

  this.cleanlinessIndex.current = Math.round(score * 10) / 10;
  
  // Add to history
  this.cleanlinessIndex.history.push({
    score: this.cleanlinessIndex.current,
    timestamp: new Date(),
    factors: {
      reportFrequency,
      resolutionSpeed,
      severityFactor,
      resolutionRate
    }
  });

  // Keep only last 90 days of history
  if (this.cleanlinessIndex.history.length > 90) {
    this.cleanlinessIndex.history = this.cleanlinessIndex.history.slice(-90);
  }
};

module.exports = mongoose.model('Ward', wardSchema);
