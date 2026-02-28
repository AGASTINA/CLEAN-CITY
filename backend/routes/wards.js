const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const geminiService = require('../services/geminiService');
const { protect, authorize } = require('../middleware/auth');
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');

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

// @route   GET /api/wards
// @desc    Get all wards
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Check if mock data is available and use it immediately (faster response)
    if (mockData.wards && mockData.wards.length > 0) {
      const { zone, sortBy = 'wardNumber' } = req.query;
      let wards = mockData.wards;

      // Filter by zone if provided
      if (zone) {
        wards = wards.filter(w => w.zone === zone);
      }

      // Sort wards
      if (sortBy) {
        wards.sort((a, b) => {
          if (sortBy === 'wardNumber') return a.wardNumber - b.wardNumber;
          if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
          return 0;
        });
      }

      console.log('📊 Serving mock wards data...');
      return res.json({
        success: true,
        data: wards,
        count: wards.length,
        source: 'mock'
      });
    }

    // Try to get from Firestore if mock data not available
    const { zone, sortBy = 'wardNumber' } = req.query;
    let wards = await getAll(COLLECTIONS.wards);

    // Filter by zone if provided
    if (zone) {
      wards = wards.filter(w => w.zone === zone);
    }

    // Sort wards
    if (sortBy) {
      wards.sort((a, b) => {
        if (sortBy === 'wardNumber') return a.wardNumber - b.wardNumber;
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
    }

    // Populate staff data (fetch users for ward officers and supervisors)
    const allUsers = await getAll(COLLECTIONS.users);
    const usersById = {};
    allUsers.forEach(u => { usersById[u.id] = u; });

    wards = wards.map(ward => {
      const wardOfficer = ward.staff?.wardOfficer ? usersById[ward.staff.wardOfficer] : null;
      const supervisors = (ward.staff?.supervisors || [])
        .map(id => usersById[id])
        .filter(Boolean);

      return {
        ...ward,
        staff: {
          ...ward.staff,
          wardOfficer: wardOfficer ? { id: wardOfficer.id, name: wardOfficer.name, phone: wardOfficer.phone, email: wardOfficer.email } : null,
          supervisors: supervisors.map(s => ({ id: s.id, name: s.name, phone: s.phone }))
        }
      };
    });

    res.json({
      success: true,
      data: wards,
      count: wards.length
    });

  } catch (error) {
    console.error('Get Wards Error:', error);
    
    // Fallback to mock data if Firestore is unavailable
    if (mockData.wards && mockData.wards.length > 0) {
      console.log('📊 Serving mock wards data (from fallback)...');
      return res.json({
        success: true,
        data: mockData.wards,
        count: mockData.wards.length,
        source: 'mock'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching wards',
      error: error.message
    });
  }
});

// @route   GET /api/wards/:wardNumber
// @desc    Get single ward details
// @access  Public
router.get('/:wardNumber', async (req, res) => {
  try {
    const wards = await getAll(COLLECTIONS.wards);
    const ward = wards.find(w => w.wardNumber === parseInt(req.params.wardNumber));

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Populate staff data
    const allUsers = await getAll(COLLECTIONS.users);
    const usersById = {};
    allUsers.forEach(u => { usersById[u.id] = u; });

    const wardOfficer = ward.staff?.wardOfficer ? usersById[ward.staff.wardOfficer] : null;
    const supervisors = (ward.staff?.supervisors || [])
      .map(id => usersById[id])
      .filter(Boolean);

    const populatedWard = {
      ...ward,
      staff: {
        ...ward.staff,
        wardOfficer: wardOfficer ? { id: wardOfficer.id, name: wardOfficer.name, phone: wardOfficer.phone, email: wardOfficer.email } : null,
        supervisors: supervisors.map(s => ({ id: s.id, name: s.name, phone: s.phone, email: s.email }))
      }
    };

    res.json({
      success: true,
      data: populatedWard
    });

  } catch (error) {
    console.error('Get Ward Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ward',
      error: error.message
    });
  }
});

// @route   GET /api/wards/:wardNumber/reports
// @desc    Get all reports for a ward
// @access  Protected
router.get('/:wardNumber/reports', protect, async (req, res) => {
  try {
    const { status, fromDate, toDate } = req.query;
    const wardNumber = parseInt(req.params.wardNumber);

    let reports = await getAll(COLLECTIONS.reports);

    // Filter by ward
    reports = reports.filter(r => r.location?.wardNumber === wardNumber);

    // Filter by status
    if (status) {
      reports = reports.filter(r => r.status?.current === status);
    }

    // Filter by date range
    if (fromDate) {
      const fromDateObj = new Date(fromDate);
      reports = reports.filter(r => new Date(r.reportedAt) >= fromDateObj);
    }
    if (toDate) {
      const toDateObj = new Date(toDate);
      reports = reports.filter(r => new Date(r.reportedAt) <= toDateObj);
    }

    // Sort by most recent first
    reports.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('Get Ward Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ward reports',
      error: error.message
    });
  }
});

// @route   GET /api/wards/:wardNumber/heatmap
// @desc    Get heatmap data for ward
// @access  Public
router.get('/:wardNumber/heatmap', async (req, res) => {
  try {
    const wardNumber = parseInt(req.params.wardNumber);

    let reports = await getAll(COLLECTIONS.reports);

    // Filter by ward and exclude resolved
    reports = reports.filter(r => 
      r.location?.wardNumber === wardNumber && 
      r.status?.current !== 'resolved'
    );

    // Map to hotspot data
    const hotspots = reports.map(report => ({
      coordinates: report.location?.coordinates,
      severity: report.classification?.severityScore,
      wasteType: report.classification?.wasteType,
      priority: report.priority,
      reportedAt: report.reportedAt
    }));

    res.json({
      success: true,
      data: {
        wardNumber,
        hotspots,
        count: hotspots.length
      }
    });

  } catch (error) {
    console.error('Get Heatmap Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching heatmap data',
      error: error.message
    });
  }
});

// @route   POST /api/wards/:wardNumber/predict-overflow
// @desc    Predict overflow for ward
// @access  Protected
router.post('/:wardNumber/predict-overflow', protect, authorize('ward-officer', 'supervisor', 'admin'), async (req, res) => {
  try {
    const wardNumber = parseInt(req.params.wardNumber);

    const wards = await getAll(COLLECTIONS.wards);
    const ward = wards.find(w => w.wardNumber === wardNumber);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Get last 7 days data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let reports = await getAll(COLLECTIONS.reports);
    reports = reports.filter(r => 
      r.location?.wardNumber === wardNumber && 
      new Date(r.reportedAt) >= sevenDaysAgo
    );

    // Prepare data for Gemini
    const severityDistribution = {
      low: reports.filter(r => r.classification?.severityScore <= 2).length,
      medium: reports.filter(r => r.classification?.severityScore === 3).length,
      high: reports.filter(r => r.classification?.severityScore === 4).length,
      critical: reports.filter(r => r.classification?.severityScore === 5).length
    };

    const dailyReports = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyReports[date] = 0;
    }
    reports.forEach(r => {
      const date = new Date(r.reportedAt).toISOString().split('T')[0];
      if (dailyReports[date] !== undefined) dailyReports[date]++;
    });

    const wardData = {
      wardNumber,
      activeReports: ward.activeReports?.total || 0,
      severityDistribution,
      avgResponseTime: ward.performance?.averageResponseTime || 30,
      weeklyTrend: dailyReports,
      cleanlinessIndex: ward.cleanlinessIndex?.current || 0,
      binCapacity: ward.infrastructure?.bins?.capacity || 100
    };

    // Get AI prediction
    const prediction = await geminiService.predictOverflow(wardData);

    // Update ward with prediction
    const updatedWard = await updateDoc(COLLECTIONS.wards, ward.id, {
      overflowRisk: {
        currentLevel: prediction.urgencyLevel,
        probability: prediction.overflowProbability,
        estimatedOverflowTime: prediction.estimatedTimeToOverflow ? 
          new Date(Date.now() + prediction.estimatedTimeToOverflow * 60 * 60 * 1000) : null,
        predictedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        ward: wardNumber,
        prediction,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Predict Overflow Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting overflow',
      error: error.message
    });
  }
});

// Helper function to calculate cleanliness index
async function calculateCleanlinessIndex(ward) {
  // Get reports from last 30 days  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  let reports = await getAll(COLLECTIONS.reports);
  reports = reports.filter(r => 
    r.location?.wardNumber === ward.wardNumber && 
    new Date(r.reportedAt) >= thirtyDaysAgo
  );

  if (reports.length === 0) {
    return 100;
  }

  // Factor 1: Report Frequency (inverse - fewer reports = cleaner)
  const reportsPerDay = reports.length / 30;
  const reportFrequency = Math.max(0, 100 - (reportsPerDay * 5));

  // Factor 2: Resolution Speed
  const resolvedReports = reports.filter(r => r.status?.current === 'resolved');
  const avgResponseTime = resolvedReports.reduce((sum, r) => {
    return sum + (r.responseTime || 0);
  }, 0) / (resolvedReports.length || 1);
  const resolutionSpeed = Math.max(0, 100 - (avgResponseTime / 2));

  // Factor 3: Severity of issues
  const avgSeverity = reports.reduce((sum, r) => sum + (r.classification?.severityScore || 0), 0) / reports.length;
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

  return {
    score: Math.round(score * 10) / 10,
    factors: {
      reportFrequency,
      resolutionSpeed,
      severityFactor,
      resolutionRate
    }
  };
}

// @route   PATCH /api/wards/:wardNumber/cleanliness-index
// @desc    Recalculate cleanliness index
// @access  Protected
router.patch('/:wardNumber/cleanliness-index', protect, authorize('ward-officer', 'supervisor', 'admin'), async (req, res) => {
  try {
    const wardNumber = parseInt(req.params.wardNumber);

    const wards = await getAll(COLLECTIONS.wards);
    const ward = wards.find(w => w.wardNumber === wardNumber);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    const cleanlinessData = await calculateCleanlinessIndex(ward);
    
    // Update ward with new cleanliness index
    const cleanlinessIndex = {
      current: cleanlinessData.score,
      history: [
        ...(ward.cleanlinessIndex?.history || []),
        {
          score: cleanlinessData.score,
          timestamp: new Date(),
          factors: cleanlinessData.factors
        }
      ]
    };

    // Keep only last 90 days of history
    if (cleanlinessIndex.history.length > 90) {
      cleanlinessIndex.history = cleanlinessIndex.history.slice(-90);
    }

    await updateDoc(COLLECTIONS.wards, ward.id, { cleanlinessIndex });

    res.json({
      success: true,
      message: 'Cleanliness index updated',
      data: {
        wardNumber,
        cleanlinessIndex: cleanlinessData.score,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Update Cleanliness Index Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cleanliness index',
      error: error.message
    });
  }
});

// @route   GET /api/wards/leaderboard/clean
// @desc    Get clean ward leaderboard
// @access  Public
router.get('/leaderboard/clean', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    let wards = await getAll(COLLECTIONS.wards);

    // Sort by cleanliness index (descending)
    wards.sort((a, b) => (b.cleanlinessIndex?.current || 0) - (a.cleanlinessIndex?.current || 0));

    // Limit results
    wards = wards.slice(0, parseInt(limit));

    // Add ranks
    const leaderboard = wards.map((ward, index) => ({
      rank: index + 1,
      wardNumber: ward.wardNumber,
      name: ward.name,
      zone: ward.zone,
      score: ward.cleanlinessIndex?.current || 0,
      trend: ward.cleanlinessIndex?.weeklyTrend
    }));

    res.json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    console.error('Get Leaderboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message
    });
  }
});

module.exports = router;
