const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAll, COLLECTIONS } = require('../services/firestoreService');

// Load mock data for fallback
let mockData = {};
try {
  const mockDataPath = path.join(__dirname, '../data/mockData.json');
  if (fs.existsSync(mockDataPath)) {
    mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
  }
} catch (error) {
  console.warn('⚠️ Mock data file not found, will use Firestore only');
}

// Generate mock intelligence dashboard data
function generateMockDashboardData() {
  const wards = mockData.wards || [];
  const reports = mockData.reports || [];
  
  const criticalReports = reports.filter(r => r.severityScore >= 4).length;
  const highReports = reports.filter(r => r.severityScore >= 3 && r.severityScore < 4).length;
  const activeReports = reports.filter(r => r.status !== 'resolved').length;
  
  return {
    success: true,
    data: {
      alerts: {
        total: activeReports,
        critical: criticalReports,
        high: highReports,
        list: reports.map(r => ({
          wardNumber: r.wardNumber,
          wardName: wards.find(w => w.wardNumber === r.wardNumber)?.name || `Ward ${r.wardNumber}`,
          type: 'waste_report',
          severity: r.severityScore / 5,
          message: r.address,
          timestamp: r.createdAt
        }))
      },
      trucks: {
        active: Math.floor(Math.random() * 4) + 2,
        total: 8
      },
      predictions: {
        averageOverflowRisk: 45 + Math.random() * 20,
        highRiskWards: Math.floor(Math.random() * 3) + 1
      },
      wards: wards.length,
      source: 'mock'
    }
  };
}

// @route   GET /api/intelligence/dashboard
// @desc    Get unified dashboard data
// @access  Public
router.get('/dashboard', async (req, res) => {
  try {
    const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');
    const allWards = await getAll(COLLECTIONS.wards || 'wards');
    const allTrucks = await getAll(COLLECTIONS.trucks || 'trucks');

    // Calculate alerts
    const criticalReports = allReports.filter(r => r.severity >= 0.8).length;
    const highReports = allReports.filter(r => r.severity >= 0.6 && r.severity < 0.8).length;
    const activeReports = allReports.filter(r => r.status !== 'resolved').length;

    // Calculate predictions
    const avgOverflowRisk = allWards.length > 0 
      ? allWards.reduce((sum, w) => sum + (w.overflowRisk || 0), 0) / allWards.length 
      : 35;
    const highRiskWards = allWards.filter(w => (w.overflowRisk || 0) > 60).length;

    // Truck status
    const activeTrucks = allTrucks.filter(t => t.status === 'active').length;

    res.json({
      success: true,
      data: {
        alerts: {
          total: activeReports,
          critical: criticalReports,
          high: highReports,
          list: allReports.slice(0, 10).map(r => ({
            wardNumber: r.wardNumber || 1,
            wardName: r.wardName || 'Unknown Ward',
            type: r.type || 'waste_report',
            severity: r.severity || 0.5,
            message: r.description || 'Alert generated',
            timestamp: r.createdAt
          }))
        },
        trucks: {
          active: activeTrucks,
          total: allTrucks.length
        },
        predictions: {
          averageOverflowRisk: Math.round(avgOverflowRisk),
          highRiskWards: highRiskWards
        },
        wards: allWards.length
      }
    });
  } catch (error) {
    console.error('Intelligence Dashboard Error:', error);
    
    // Fallback to mock data
    const mockData = generateMockDashboardData();
    console.log('📊 Serving mock dashboard data...');
    res.json(mockData);
  }
});
    // @route   GET /api/intelligence/report/download
    // @desc    Generate and download PDF report
    // @access  Public
    router.get('/report/download', async (req, res) => {
      try {
        const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');
        const allWards = await getAll(COLLECTIONS.wards || 'wards');

        const totalReports = allReports.length;
        const resolvedReports = allReports.filter(r => r.status === 'resolved').length;
        const activeReports = allReports.filter(r => r.status !== 'resolved').length;
        const illegalDumps = allReports.filter(r => r.illegalDumping).length;

        // Generate CSV format for easy downloading
        let csvContent = 'Report,Count\n';
        csvContent += `Total Reports,${totalReports}\n`;
        csvContent += `Resolved,${resolvedReports}\n`;
        csvContent += `Active,${activeReports}\n`;
        csvContent += `Illegal Dumps,${illegalDumps}\n`;
        csvContent += `\nWard Summary\n`;
        csvContent += 'Ward,Waste Amount,Cleanliness Index\n';
    
        allWards.forEach(w => {
          csvContent += `${w.name || 'Ward'},${w.wasteAmount || 0},${w.cleanlinessIndex || 75}\n`;
        });

        // Send as download
        res.setHeader('Content-Disposition', 'attachment; filename="governance-report-' + Date.now() + '.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
      } catch (error) {
        console.error('Report Download Error:', error);
        // Send default report
        res.setHeader('Content-Disposition', 'attachment; filename="governance-report.csv"');
        res.setHeader('Content-Type', 'text/csv');
        res.send('Report,Count\nTotal Reports,150\nResolved,120\nActive,30\nIllegal Dumps,8');
      }
    });

function generateCircularData() {
  const reports = mockData.reports || [];
  const totalReports = reports.length;
  const recycledWeight = totalReports * 120; // Mock: avg 120kg per report
  const totalValue = totalReports * 8500; // Mock: avg ₹8500 value
  const jobsCreated = Math.floor(totalReports * 0.35);
  const co2Saved = recycledWeight * 2.5;
  const waterSaved = recycledWeight * 15;
  const energySaved = recycledWeight * 8;

  const wasteBreakdown = [
    { type: 'Plastic', weight: recycledWeight * 0.35, value: recycledWeight * 0.35 * 25 },
    { type: 'Organic', weight: recycledWeight * 0.40, value: recycledWeight * 0.40 * 22 },
    { type: 'Metal', weight: recycledWeight * 0.15, value: recycledWeight * 0.15 * 35 },
    { type: 'E-Waste', weight: recycledWeight * 0.10, value: recycledWeight * 0.10 * 45 }
  ];

  return {
    success: true,
    data: {
      totalValue: totalValue,
      jobsCount: jobsCreated,
      wasteKgs: recycledWeight,
      breakdown: wasteBreakdown,
      environmental: {
        co2Saved: co2Saved,
        waterSaved: waterSaved,
        energySaved: energySaved
      },
      source: 'mock'
    }
  };
}

function generateDetectionData() {
  const reports = mockData.reports || [];
  const totalClassifications = reports.length;
  const illegalDetections = reports.filter(r => r.wasteType === 'e-waste' || r.wasteType === 'plastic').length;
  const avgConfidence = 89.5;

  return {
    success: true,
    data: {
      totalClassifications: totalClassifications,
      illegalDetections: illegalDetections,
      averageConfidence: avgConfidence,
      detectionHistory: reports.map((r, idx) => ({
        id: r.id,
        wardName: mockData.wards.find(w => w.wardNumber === r.wardNumber)?.name || `Ward ${r.wardNumber}`,
        timestamp: r.createdAt,
        wasteType: r.wasteType,
        confidence: 85 + Math.random() * 15,
        isIllegalDumping: ['e-waste', 'plastic'].includes(r.wasteType)
      })),
      source: 'mock'
    }
  };
}

function generatePredictionsData() {
  const wards = mockData.wards || [];
  const predictions = wards.map(w => ({
    wardId: w.id,
    wardName: w.name,
    currentLoad: 50 + Math.random() * 100,
    binCapacity: 300,
    overflowProbability: Math.floor(30 + Math.random() * 50),
    hoursToOverflow: 24 + Math.random() * 48,
    urgencyLevel: w.cleanlinessIndex < 80 ? 'CRITICAL' : w.cleanlinessIndex < 85 ? 'HIGH' : 'MEDIUM'
  }));

  return {
    success: true,
    data: predictions,
    source: 'mock'
  };
}

function generateAlertsData() {
  const reports = mockData.reports || [];
  const activeReports = reports.filter(r => r.status !== 'resolved');
  
  const alerts = activeReports.map((r, idx) => ({
    id: r.id,
    wardName: mockData.wards.find(w => w.wardNumber === r.wardNumber)?.name || `Ward ${r.wardNumber}`,
    wardNumber: r.wardNumber,
    severity: (r.severityScore || 3) / 5,
    type: r.wasteType === 'construction' ? 'waste_overflow' : 'illegal_dumping',
    assignedTruck: `TN-58-MR-${4000 + idx}`,
    createdAt: r.createdAt
  }));

  return {
    success: true,
    data: {
      alerts: alerts,
      total: alerts.length
    },
    source: 'mock'
  };
}

function generatePolicyData() {
  const policies = mockData.policies || [];
  const wards = mockData.wards || [];

  const recommendations = policies.map(p => {
    const ward = wards.find(w => w.wardNumber === p.wardNumber);
    const cleanlinessIndex = ward?.cleanlinessIndex || 85;
    
    return {
      wardId: p.wardNumber,
      ward: ward?.name || `Ward ${p.wardNumber}`,
      infrastructure: cleanlinessIndex < 80 ? 'CCTV Network' : 'Smart Bins',
      budget: `₹${p.budgetEstimate}`,
      impact: cleanlinessIndex < 80 ? '78% reduction in violations' : '45% efficiency improvement',
      priority: p.priority,
      status: p.status
    };
  });

  return {
    success: true,
    data: recommendations,
    source: 'mock'
  };
}

// @route   GET /api/intelligence/circular
// @desc    Get circular economy data
// @access  Public
router.get('/circular', async (req, res) => {
  try {
    const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');

    const recycledWeight = allReports.reduce((sum, r) => sum + (r.recyclableWeight || 0), 0);
    const totalValue = allReports.reduce((sum, r) => sum + (r.circularRevenue || 0), 0);
    const jobsCreated = allReports.length > 0 ? Math.floor(allReports.length * 0.3) : 0;
    const co2Saved = recycledWeight * 2.5;
    const waterSaved = recycledWeight * 15;
    const energySaved = recycledWeight * 8;

    const wasteBreakdown = [
      { type: 'Plastic', weight: recycledWeight * 0.35, value: recycledWeight * 0.35 * 25 },
      { type: 'Organic', weight: recycledWeight * 0.40, value: recycledWeight * 0.40 * 22 },
      { type: 'Metal', weight: recycledWeight * 0.15, value: recycledWeight * 0.15 * 35 },
      { type: 'E-Waste', weight: recycledWeight * 0.10, value: recycledWeight * 0.10 * 45 }
    ];

    res.json({
      success: true,
      data: {
        totalValue: totalValue || 45000,
        jobsCount: jobsCreated || 12,
        wasteKgs: recycledWeight || 2400,
        breakdown: wasteBreakdown,
        environmental: {
          co2Saved: co2Saved || 6000,
          waterSaved: waterSaved || 36000,
          energySaved: energySaved || 19200
        }
      }
    });
  } catch (error) {
    console.error('Circular Intelligence Error:', error);
    const mockData = generateCircularData();
    res.json(mockData);
  }
});

// @route   GET /api/intelligence/detection
// @desc    Get waste detection data
// @access  Public
router.get('/detection', async (req, res) => {
  try {
    const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');

    const totalClassifications = allReports.length;
    const illegalDetections = allReports.filter(r => r.illegalDumping).length;
    const avgConfidence = allReports.length > 0
      ? allReports.reduce((sum, r) => sum + (r.classification?.confidence || 85), 0) / allReports.length
      : 89.5;

    res.json({
      success: true,
      data: {
        totalClassifications: totalClassifications || 742,
        illegalDetections: illegalDetections || 12,
        averageConfidence: avgConfidence || 89.5,
        detectionHistory: allReports.slice(0, 5).map((r, idx) => ({
          id: idx + 1,
          wardName: r.wardName || `Ward ${idx + 1}`,
          timestamp: r.createdAt,
          wasteType: r.classification?.wasteType || 'Mixed',
          confidence: r.classification?.confidence || 85,
          isIllegalDumping: r.illegalDumping || false
        }))
      }
    });
  } catch (error) {
    console.error('Detection Intelligence Error:', error);
    const mockData = generateDetectionData();
    res.json(mockData);
  }
});

// @route   GET /api/intelligence/predictions
// @desc    Get overflow predictions
// @access  Public
router.get('/predictions', async (req, res) => {
  try {
    const allWards = await getAll(COLLECTIONS.wards || 'wards');

    const predictions = allWards.map(w => ({
      wardId: w.id,
      wardName: w.name || `Ward ${w.id}`,
      currentLoad: w.wasteAmount || 75,
      binCapacity: 300,
      overflowProbability: w.overflowRisk || 45,
      hoursToOverflow: 24 + Math.random() * 48,
      urgencyLevel: (w.overflowRisk || 45) > 70 ? 'CRITICAL' : (w.overflowRisk || 45) > 40 ? 'HIGH' : 'MEDIUM'
    }));

    res.json({
      success: true,
      data: predictions.length > 0 ? predictions : [
        { wardId: 1, wardName: 'Ward 1', currentLoad: 75, binCapacity: 300, overflowProbability: 45, hoursToOverflow: 48, urgencyLevel: 'MEDIUM' },
        { wardId: 2, wardName: 'Ward 2', currentLoad: 85, binCapacity: 300, overflowProbability: 65, hoursToOverflow: 36, urgencyLevel: 'HIGH' }
      ]
    });
  } catch (error) {
    console.error('Predictions Intelligence Error:', error);
    const mockData = generatePredictionsData();
    res.json(mockData);
  }
});

// @route   GET /api/intelligence/alerts
// @desc    Get active alerts with truck assignments
// @access  Public
router.get('/alerts', async (req, res) => {
  try {
    const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');
    const allTrucks = await getAll(COLLECTIONS.trucks || 'trucks');

    const alerts = allReports
      .filter(r => r.status !== 'resolved')
      .slice(0, 10)
      .map((r, idx) => ({
        id: r.id,
        wardName: r.wardName || `Ward ${idx + 1}`,
        wardNumber: r.wardNumber || idx + 1,
        severity: r.severity || 0.6,
        type: r.type || 'waste_overflow',
        assignedTruck: allTrucks[idx % allTrucks.length]?.name || `TN-58-MR-${4000 + idx}`,
        createdAt: r.createdAt
      }));

    res.json({
      success: true,
      data: {
        alerts: alerts.length > 0 ? alerts : [
          { id: 1, wardName: 'Ward 1', wardNumber: 1, severity: 0.8, type: 'illegal_dumping', assignedTruck: 'TN-58-MR-4012', createdAt: new Date() }
        ]
      }
    });
  } catch (error) {
    console.error('Alerts Intelligence Error:', error);
    const mockData = generateAlertsData();
    res.json(mockData);
  }
});

// @route   GET /api/intelligence/policy
// @desc    Get policy recommendations
// @access  Public
router.get('/policy', async (req, res) => {
  try {
    const allReports = await getAll(COLLECTIONS.wasteReports || 'wasteReports');

    const illegalCount = allReports.filter(r => r.illegalDumping).length;
    const overflowCount = allReports.filter(r => r.severity >= 0.8).length;

    const recommendations = [
      {
        ward: 'Ward 1',
        infrastructure: illegalCount > 5 ? 'CCTV Network' : 'Smart Bins',
        budget: illegalCount > 5 ? '₹5,80,000' : '₹2,40,000',
        impact: illegalCount > 5 ? '78% reduction in illegal dumping' : '45% efficiency improvement',
        priority: 'High'
      },
      {
        ward: 'Ward 2',
        infrastructure: overflowCount > 3 ? 'Smart Bins' : 'Compost Units',
        budget: overflowCount > 3 ? '₹2,40,000' : '₹3,20,000',
        impact: overflowCount > 3 ? '45% capacity improvement' : '34% landfill reduction',
        priority: 'Medium'
      }
    ];

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Policy Intelligence Error:', error);
    const mockData = generatePolicyData();
    res.json(mockData);
  }
});

module.exports = router;
