const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Mock intelligence data
let mockAlerts = [];
let mockPredictions = [];

// Initialize with sample data
function initializeMockData() {
  const wards = [
    { id: 1, name: 'SS Colony Ward 1', population: 12500, wasteAmount: 75, cleanlinessIndex: 72 },
    { id: 2, name: 'Anna Main Road', population: 15800, wasteAmount: 85, cleanlinessIndex: 68 },
    { id: 3, name: 'Meenakshi Temple Zone', population: 18200, wasteAmount: 92, cleanlinessIndex: 45 },
    { id: 4, name: 'KK Nagar Ward 7', population: 14100, wasteAmount: 71, cleanlinessIndex: 78 },
    { id: 5, name: 'Vilakkuthoon Ward', population: 11300, wasteAmount: 62, cleanlinessIndex: 82 }
  ];

  const reports = [
    { id: 1, wardId: 1, illegalDumping: false, severity: 0.6, createdAt: new Date(Date.now() - 3600000) },
    { id: 2, wardId: 2, illegalDumping: true, severity: 0.8, createdAt: new Date(Date.now() - 7200000) },
    { id: 3, wardId: 1, illegalDumping: false, severity: 0.5, createdAt: new Date(Date.now() - 10800000) },
    { id: 4, wardId: 3, illegalDumping: true, severity: 0.9, createdAt: new Date(Date.now() - 14400000) },
    { id: 5, wardId: 2, illegalDumping: true, severity: 0.7, createdAt: new Date(Date.now() - 21600000) }
  ];

  const trucks = [
    { id: 1, name: 'TN-58-MR-4012', status: 'active', assignedWard: 2 },
    { id: 2, name: 'TN-58-MR-4023', status: 'active', assignedWard: 3 },
    { id: 3, name: 'TN-58-MR-4087', status: 'available', assignedWard: null },
    { id: 4, name: 'TN-58-MR-4091', status: 'available', assignedWard: null }
  ];

  return { wards, reports, trucks };
}

const { wards, reports, trucks } = initializeMockData();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', backend: 'intelligence-mock', timestamp: new Date().toISOString() });
});

// API: Get all wards
app.get('/api/wards', (req, res) => {
  res.json({ success: true, data: wards });
});

// API: Get all reports
app.get('/api/reports', (req, res) => {
  res.json({ success: true, data: reports });
});

// API: Get all trucks
app.get('/api/trucks', (req, res) => {
  res.json({ success: true, data: trucks });
});

// API: Get intelligence dashboard data
app.get('/api/intelligence/dashboard', (req, res) => {
  const alerts = generateAlerts(wards, reports);
  const predictions = generatePredictions(wards, reports);
  
  res.json({
    success: true,
    data: {
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        list: alerts
      },
      predictions: {
        averageOverflowRisk: (Math.random() * 40 + 20).toFixed(1),
        highRiskWards: predictions.filter(p => p.overflowProbability > 50).length,
        list: predictions
      },
      trucks: {
        total: trucks.length,
        active: trucks.filter(t => t.status === 'active').length,
        available: trucks.filter(t => t.status === 'available').length
      },
      reports: {
        total: reports.length,
        critical: reports.filter(r => r.severity > 0.7).length
      }
    }
  });
});

// API: Overflow prediction for ward
app.get('/api/intelligence/predict/:wardId', (req, res) => {
  const ward = wards.find(w => w.id === parseInt(req.params.wardId));
  if (!ward) return res.status(404).json({ success: false, error: 'Ward not found' });

  const wardReports = reports.filter(r => r.wardId === ward.id);
  const avgSeverity = wardReports.length > 0 
    ? wardReports.reduce((sum, r) => sum + r.severity, 0) / wardReports.length 
    : 0.3;

  const overflowProbability = ((ward.wasteAmount / 100) * (1 + avgSeverity) * 100).toFixed(1);
  const hoursToOverflow = Math.max(4, 24 - (overflowProbability / 10));

  res.json({
    success: true,
    data: {
      wardId: ward.id,
      wardName: ward.name,
      overflowProbability: parseFloat(overflowProbability),
      hoursToOverflow: parseFloat(hoursToOverflow.toFixed(1)),
      currentLoad: ward.wasteAmount,
      projectedLoad: ward.wasteAmount * 1.3,
      capacity: 100,
      confidence: 85 + Math.random() * 15
    }
  });
});

// API: Get alerts
app.get('/api/intelligence/alerts', (req, res) => {
  const alerts = generateAlerts(wards, reports);
  res.json({ success: true, data: alerts });
});

// Helper: Generate alerts
function generateAlerts(wards, reports) {
  const alerts = [];
  wards.forEach(ward => {
    const wardReports = reports.filter(r => r.wardId === ward.id);
    const illegalCount = wardReports.filter(r => r.illegalDumping).length;
    
    if (illegalCount > 1) {
      alerts.push({
        id: `alert-${ward.id}-1`,
        wardId: ward.id,
        wardName: ward.name,
        type: 'ILLEGAL_DUMPING',
        severity: 'HIGH',
        message: `${illegalCount} illegal dumping incidents detected`,
        createdAt: new Date().toISOString()
      });
    }

    const avgSeverity = wardReports.length > 0 ? wardReports.reduce((s, r) => s + r.severity, 0) / wardReports.length : 0;
    const overflowRisk = (ward.wasteAmount / 100) * (1 + avgSeverity) * 100;
    
    if (overflowRisk > 70) {
      alerts.push({
        id: `alert-${ward.id}-2`,
        wardId: ward.id,
        wardName: ward.name,
        type: 'OVERFLOW_RISK',
        severity: 'CRITICAL',
        message: `Bin overflow risk at ${overflowRisk.toFixed(0)}%`,
        createdAt: new Date().toISOString()
      });
    }
  });

  return alerts;
}

// Helper: Generate predictions
function generatePredictions(wards, reports) {
  return wards.map(ward => {
    const wardReports = reports.filter(r => r.wardId === ward.id);
    const avgSeverity = wardReports.length > 0 
      ? wardReports.reduce((sum, r) => sum + r.severity, 0) / wardReports.length 
      : 0.3;

    const overflowProbability = ((ward.wasteAmount / 100) * (1 + avgSeverity) * 100);
    
    return {
      wardId: ward.id,
      wardName: ward.name,
      overflowProbability: parseFloat(overflowProbability.toFixed(1)),
      urgencyLevel: overflowProbability > 70 ? 'CRITICAL' : overflowProbability > 50 ? 'HIGH' : 'MEDIUM'
    };
  });
}

// Helper: Generate detection data
function generateDetectionData(reports) {
  const detections = reports.map((report, idx) => ({
    id: report.id,
    wardName: wards.find(w => w.id === report.wardId)?.name || 'Unknown',
    timestamp: report.createdAt,
    wasteType: ['Plastic', 'Organic', 'Metal', 'Glass', 'Hazardous'][idx % 5],
    confidence: 85 + Math.random() * 15,
    isIllegalDumping: report.illegalDumping,
    severity: report.severity
  }));

  const illegalCount = reports.filter(r => r.illegalDumping).length;
  const avgConfidence = reports.length > 0 
    ? (detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length).toFixed(1)
    : 95;

  return {
    totalClassifications: reports.length,
    illegalDetections: illegalCount,
    averageConfidence: parseFloat(avgConfidence),
    detectionHistory: detections.slice().reverse()
  };
}

// API: Get detection data
app.get('/api/intelligence/detection', (req, res) => {
  const detection = generateDetectionData(reports);
  res.json({ success: true, data: detection });
});

// API: Get all predictions for all wards
app.get('/api/intelligence/predictions', (req, res) => {
  const predictions = generatePredictions(wards, reports);
  res.json({ success: true, data: predictions });
});

// API: Get circular economy data
app.get('/api/intelligence/circular', (req, res) => {
  const wasteModels = {
    plastic: { salePrice: 25, processingCost: 0.7, collectionCost: 0.5 },
    organic: { salePrice: 22, processingCost: 0.4, collectionCost: 0.3 },
    metal: { salePrice: 35, processingCost: 1.2, collectionCost: 0.6 },
    glass: { salePrice: 20, processingCost: 0.6, collectionCost: 0.4 },
    hazardous: { salePrice: 40, processingCost: 2.5, collectionCost: 1.8 }
  };

  // Simulate waste distribution based on wards
  const wasteByType = {};
  Object.keys(wasteModels).forEach(type => {
    wasteByType[type] = Math.random() * 50 + 20; // 20-70kg per type
  });

  let totalValue = 0;
  let totalJobs = 0;
  let totalWeight = 0;
  const wasteData = [];

  Object.entries(wasteByType).forEach(([type, weight]) => {
    const model = wasteModels[type];
    const netValue = (model.salePrice * weight) - (model.processingCost * weight) - (model.collectionCost * weight);
    const jobs = Math.floor(weight / 50);
    
    totalValue += netValue;
    totalJobs += jobs;
    totalWeight += weight;
    
    wasteData.push({
      wasteType: type,
      weight: weight,
      salePrice: model.salePrice,
      collectionCost: model.collectionCost,
      processingCost: model.processingCost,
      netValue: netValue,
      jobs: jobs
    });
  });

  const co2Saved = totalWeight * 2.4;
  const waterSaved = totalWeight * 14;
  const energySaved = totalWeight * 7;

  res.json({
    success: true,
    data: {
      totalDailyValue: totalValue,
      totalJobs: totalJobs,
      totalWeight: totalWeight,
      wasteByType: wasteData,
      environmental: {
        co2Saved: co2Saved,
        waterSaved: waterSaved,
        energySaved: energySaved
      },
      shg: {
        jobsDaily: totalJobs,
        monthlyIncomePerJob: 500,
        monthlyTotalIncome: totalJobs * 30 * 500
      }
    }
  });
});

// API: Get policy recommendations
app.get('/api/intelligence/policy', (req, res) => {
  const policyRecommendations = wards.map(ward => {
    const wardReports = reports.filter(r => r.wardId === ward.id);
    const illegalRate = wardReports.length > 0 ? (wardReports.filter(r => r.illegalDumping).length / wardReports.length) * 100 : 0;
    const avgSeverity = wardReports.length > 0 ? wardReports.reduce((s, r) => s + r.severity, 0) / wardReports.length : 0;
    const overflowRisk = (ward.wasteAmount / 100) * (1 + avgSeverity) * 100;

    const recommendations = [];
    
    if (illegalRate > 20) {
      recommendations.push({
        title: 'Illegal Dumping Prevention System',
        wardId: ward.id,
        wardName: ward.name,
        priority: 'CRITICAL',
        budget: 800000,
        roi: '6-9 months',
        impact: '+30% cleanliness',
        description: 'Deploy AI-powered CCTV network with real-time alerts for illegal dumping activities.',
        reasoning: `Ward has ${illegalRate.toFixed(0)}% illegal dumping incidents. High-visibility enforcement and monitoring necessary.`
      });
    }
    
    if (overflowRisk > 60) {
      recommendations.push({
        title: 'Enhanced Bin Collection Frequency',
        wardId: ward.id,
        wardName: ward.name,
        priority: 'HIGH',
        budget: 300000,
        roi: 'Immediate',
        impact: '+15% service level',
        description: 'Increase bin collection from 3x to 5x weekly and add mobile compactor units.',
        reasoning: `Overflow risk at ${overflowRisk.toFixed(0)}%. Current capacity insufficient for demand patterns.`
      });
    }
    
    if (ward.cleanlinessIndex < 70) {
      recommendations.push({
        title: 'Community Cleanliness Initiative',
        wardId: ward.id,
        wardName: ward.name,
        priority: 'MEDIUM',
        budget: 250000,
        roi: '3-4 months',
        impact: '+20% community engagement',
        description: 'SHG-based street cleaning program with incentives and community participation.',
        reasoning: `Low cleanliness index (${ward.cleanlinessIndex}%). Community engagement is most effective long-term solution.`
      });
    }
    
    return { wardId: ward.id, wardName: ward.name, recommendations };
  });

  res.json({ success: true, data: policyRecommendations });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅ Intelligence Backend Running on http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔌 Dashboard API: http://localhost:${PORT}/api/intelligence/dashboard\n`);
});
