const express = require('express');
const router = express.Router();
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/analytics/summary
// @desc    Get comprehensive analytics summary
// @access  Protected
router.get('/summary', protect, async (req, res) => {
  try {
    const { fromDate, toDate, wardNumber } = req.query;

    // Get all waste reports
    const allReports = await getAll(COLLECTIONS.WASTE_REPORTS);

    // Filter reports based on query params
    let filteredReports = allReports.filter(report => {
      let matches = true;

      // Date filtering
      if (fromDate && report.reportedAt) {
        const reportDate = toDate(report.reportedAt);
        if (reportDate < new Date(fromDate)) matches = false;
      }
      if (toDate && report.reportedAt) {
        const reportDate = toDate(report.reportedAt);
        if (reportDate > new Date(toDate)) matches = false;
      }

      // Ward filtering
      if (wardNumber && report.location?.wardNumber !== parseInt(wardNumber)) {
        matches = false;
      }

      return matches;
    });

    // Total waste collected
    const wasteCollectedReports = filteredReports.filter(r => 
      r.resolution?.wasteCollected?.quantity != null
    );
    const totalKg = wasteCollectedReports.reduce((sum, r) => 
      sum + (r.resolution?.wasteCollected?.quantity || 0), 0
    );

    // Waste by type
    const wasteByTypeGrouped = filteredReports.reduce((acc, report) => {
      const type = report.classification?.wasteType;
      if (!type) return acc;
      
      if (!acc[type]) {
        acc[type] = { _id: type, count: 0, severities: [] };
      }
      acc[type].count++;
      if (report.classification?.severityScore != null) {
        acc[type].severities.push(report.classification.severityScore);
      }
      return acc;
    }, {});

    const wasteByType = Object.values(wasteByTypeGrouped).map(g => ({
      _id: g._id,
      count: g.count,
      avgSeverity: g.severities.length > 0 
        ? g.severities.reduce((sum, s) => sum + s, 0) / g.severities.length
        : 0
    }));

    // Response time analysis
    const resolvedReports = filteredReports.filter(r => 
      r.status?.current === 'resolved' && 
      r.resolution?.resolvedAt != null &&
      r.reportedAt != null
    );

    const responseTimes = resolvedReports.map(r => {
      const resolvedAt = toDate(r.resolution.resolvedAt);
      const reportedAt = toDate(r.reportedAt);
      return (resolvedAt - reportedAt) / 60000; // Convert to minutes
    });

    const responseTimeData = responseTimes.length > 0 ? {
      avgResponseTime: responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes)
    } : {
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0
    };

    // Circular economy totals
    const circularEconomyReports = filteredReports.filter(r => 
      r.circularEconomy?.estimatedRevenue != null
    );

    const circularEconomyData = circularEconomyReports.length > 0 ? {
      totalRevenue: circularEconomyReports.reduce((sum, r) => 
        sum + (r.circularEconomy?.estimatedRevenue || 0), 0
      ),
      totalCO2Reduced: circularEconomyReports.reduce((sum, r) => 
        sum + (r.circularEconomy?.environmentalImpact?.co2Reduction || 0), 0
      ),
      avgRecyclingRate: circularEconomyReports.reduce((sum, r) => 
        sum + (r.circularEconomy?.recyclablePercentage || 0), 0
      ) / circularEconomyReports.length
    } : {
      totalRevenue: 0,
      totalCO2Reduced: 0,
      avgRecyclingRate: 0
    };

    // Hotspot analysis
    const unresolvedReports = filteredReports.filter(r => 
      r.status?.current !== 'resolved'
    );

    const hotspotsGrouped = unresolvedReports.reduce((acc, report) => {
      const wardNumber = report.location?.wardNumber;
      const area = report.location?.address;
      const key = `${wardNumber}-${area}`;
      
      if (!acc[key]) {
        acc[key] = {
          wardNumber,
          area,
          count: 0,
          severities: [],
          coordinates: report.location?.coordinates
        };
      }
      acc[key].count++;
      if (report.classification?.severityScore != null) {
        acc[key].severities.push(report.classification.severityScore);
      }
      return acc;
    }, {});

    const hotspots = Object.values(hotspotsGrouped)
      .map(h => ({
        wardNumber: h.wardNumber,
        area: h.area,
        incidentCount: h.count,
        avgSeverity: h.severities.length > 0 
          ? Math.round((h.severities.reduce((sum, s) => sum + s, 0) / h.severities.length) * 10) / 10
          : 0,
        coordinates: h.coordinates
      }))
      .sort((a, b) => b.incidentCount - a.incidentCount)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        totalWasteCollected: totalKg,
        wasteDistribution: wasteByType,
        responseTime: responseTimeData,
        circularEconomy: circularEconomyData,
        hotspots
      }
    });

  } catch (error) {
    console.error('Analytics Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics summary',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/ward-comparison
// @desc    Compare performance across wards
// @access  Protected
router.get('/ward-comparison', protect, authorize('supervisor', 'admin'), async (req, res) => {
  try {
    const wards = await getAll(COLLECTIONS.WARDS);

    const comparison = wards.map(ward => ({
      wardNumber: ward.wardNumber,
      name: ward.name,
      cleanlinessIndex: ward.cleanlinessIndex?.current || 0,
      activeReports: ward.activeReports?.total || 0,
      resolutionRate: ward.performance?.resolutionRate || 0,
      averageResponseTime: ward.performance?.averageResponseTime || 0,
      citizenSatisfaction: ward.performance?.citizenSatisfaction || 0,
      recyclingRate: ward.circularMetrics?.recyclingRate || 0,
      revenue: ward.circularMetrics?.revenueGenerated || 0
    }));

    // Calculate rankings
    const sortedByCleanness = [...comparison].sort((a, b) => b.cleanlinessIndex - a.cleanlinessIndex);
    const sortedByResolution = [...comparison].sort((a, b) => b.resolutionRate - a.resolutionRate);

    res.json({
      success: true,
      data: {
        wards: comparison,
        rankings: {
          byCleanlinessIndex: sortedByCleanness.map((w, i) => ({
            rank: i + 1,
            wardNumber: w.wardNumber,
            score: w.cleanlinessIndex
          })),
          byResolutionRate: sortedByResolution.map((w, i) => ({
            rank: i + 1,
            wardNumber: w.wardNumber,
            rate: w.resolutionRate
          }))
        }
      }
    });

  } catch (error) {
    console.error('Ward Comparison Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing wards',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/citizen-engagement
// @desc    Get citizen engagement metrics
// @access  Protected
router.get('/citizen-engagement', protect, authorize('supervisor', 'admin'), async (req, res) => {
  try {
    // Get all users and reports
    const allUsers = await getAll(COLLECTIONS.USERS);
    const allReports = await getAll(COLLECTIONS.WASTE_REPORTS);

    // Top contributors - filter citizens and sort by reports submitted
    const citizens = allUsers.filter(u => u.role === 'citizen');
    const topContributors = citizens
      .sort((a, b) => (b.citizenMetrics?.reportsSubmitted || 0) - (a.citizenMetrics?.reportsSubmitted || 0))
      .slice(0, 20)
      .map((c, i) => ({
        rank: i + 1,
        name: c.name,
        reportsSubmitted: c.citizenMetrics?.reportsSubmitted || 0,
        verificationRate: (c.citizenMetrics?.reportsSubmitted || 0) > 0 ?
          Math.round(((c.citizenMetrics?.reportsVerified || 0) / c.citizenMetrics.reportsSubmitted) * 100) : 0,
        participationScore: c.citizenMetrics?.participationScore || 0,
        badges: c.citizenMetrics?.badges?.length || 0
      }));

    // Engagement trends - last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentCitizenReports = allReports.filter(r => {
      if (r.reporter?.type !== 'citizen') return false;
      if (!r.reportedAt) return false;
      const reportDate = toDate(r.reportedAt);
      return reportDate >= thirtyDaysAgo;
    });

    // Group by date
    const engagementGrouped = recentCitizenReports.reduce((acc, report) => {
      const reportDate = toDate(report.reportedAt);
      const dateKey = reportDate.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = { _id: dateKey, citizenReports: 0 };
      }
      acc[dateKey].citizenReports++;
      return acc;
    }, {});

    const engagementTrends = Object.values(engagementGrouped)
      .sort((a, b) => a._id.localeCompare(b._id));

    // Participation by ward
    const participationGrouped = recentCitizenReports.reduce((acc, report) => {
      const wardNumber = report.location?.wardNumber;
      if (wardNumber == null) return acc;
      
      if (!acc[wardNumber]) {
        acc[wardNumber] = { _id: wardNumber, citizenReports: 0 };
      }
      acc[wardNumber].citizenReports++;
      return acc;
    }, {});

    const participationByWard = Object.values(participationGrouped)
      .sort((a, b) => b.citizenReports - a.citizenReports);

    // Average participation score
    const avgParticipationScore = {
      avgScore: citizens.length > 0
        ? citizens.reduce((sum, c) => sum + (c.citizenMetrics?.participationScore || 0), 0) / citizens.length
        : 0,
      totalCitizens: citizens.length,
      activeCitizens: citizens.filter(c => (c.citizenMetrics?.reportsSubmitted || 0) > 0).length
    };

    res.json({
      success: true,
      data: {
        topContributors,
        engagementTrends,
        participationByWard,
        summary: avgParticipationScore
      }
    });

  } catch (error) {
    console.error('Citizen Engagement Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching citizen engagement metrics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/prediction-accuracy
// @desc    Evaluate AI prediction accuracy
// @access  Protected
router.get('/prediction-accuracy', protect, authorize('admin'), async (req, res) => {
  try {
    // Get reports with AI predictions
    const allReports = await getAll(COLLECTIONS.WASTE_REPORTS);
    const reportsWithPredictions = allReports.filter(r => 
      r.aiAnalysis?.geminiResponse != null
    );

    const accuracy = {
      totalPredictions: reportsWithPredictions.length,
      highConfidence: reportsWithPredictions.filter(r => 
        (r.classification?.aiConfidence || 0) >= 0.8
      ).length,
      mediumConfidence: reportsWithPredictions.filter(r => {
        const conf = r.classification?.aiConfidence || 0;
        return conf >= 0.5 && conf < 0.8;
      }).length,
      lowConfidence: reportsWithPredictions.filter(r => 
        (r.classification?.aiConfidence || 0) < 0.5
      ).length,
      avgConfidence: reportsWithPredictions.length > 0
        ? reportsWithPredictions.reduce((sum, r) => 
            sum + (r.classification?.aiConfidence || 0), 0
          ) / reportsWithPredictions.length
        : 0
    };

    res.json({
      success: true,
      data: accuracy
    });

  } catch (error) {
    console.error('Prediction Accuracy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating prediction accuracy',
      error: error.message
    });
  }
});

module.exports = router;
