const express = require('express');
const router = express.Router();
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview stats
// @access  Protected
router.get('/overview', protect, async (req, res) => {
  try {
    const { wardNumber } = req.query;

    // Get all reports
    const allReports = await getAll(COLLECTIONS.wasteReports);

    // Filter reports based on user role
    let filteredReports = allReports;
    if (wardNumber) {
      filteredReports = allReports.filter(r => r.location?.wardNumber === parseInt(wardNumber));
    } else if (req.user.role === 'ward-officer' && req.user.assignedWards?.length > 0) {
      filteredReports = allReports.filter(r => req.user.assignedWards.includes(r.location?.wardNumber));
    }

    // Total reports
    const totalReports = filteredReports.length;

    // Active reports (not resolved)
    const activeReports = filteredReports.filter(r => r.status?.current !== 'resolved').length;

    // Reports by status
    const reportsByStatusMap = filteredReports.reduce((acc, r) => {
      const status = r.status?.current || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Reports by waste type
    const reportsByTypeMap = filteredReports.reduce((acc, r) => {
      const type = r.classification?.wasteType || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Average response time
    const resolvedReports = filteredReports.filter(r => 
      r.status?.current === 'resolved' && r.resolution?.resolvedAt
    );

    const avgResponseTime = resolvedReports.length > 0 ?
      resolvedReports.reduce((sum, r) => {
        const resolvedAt = toDate(r.resolution.resolvedAt);
        const reportedAt = toDate(r.reportedAt);
        const diff = (resolvedAt - reportedAt) / (1000 * 60); // minutes
        return sum + diff;
      }, 0) / resolvedReports.length : 0;

    // Reports today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const reportsToday = filteredReports.filter(r => {
      const reportedAt = toDate(r.reportedAt);
      return reportedAt >= todayStart;
    }).length;

    // High priority reports
    const highPriorityReports = filteredReports.filter(r => 
      ['high', 'urgent'].includes(r.priority) && r.status?.current !== 'resolved'
    ).length;

    // Ward statistics (if admin/supervisor)
    let wardStats = null;
    if (['admin', 'supervisor'].includes(req.user.role)) {
      const wards = await getAll(COLLECTIONS.wards);
      
      wardStats = {
        totalWards: wards.length,
        averageCleanlinessIndex: wards.reduce((sum, w) => sum + (w.cleanlinessIndex?.current || 0), 0) / wards.length,
        wardsNeedingAttention: wards.filter(w => (w.cleanlinessIndex?.current || 0) < 70).length,
        overflowRiskWards: wards.filter(w => w.overflowRisk?.currentLevel === 'high').length
      };
    }

    res.json({
      success: true,
      data: {
        totalReports,
        activeReports,
        reportsToday,
        highPriorityReports,
        averageResponseTime: Math.round(avgResponseTime),
        resolutionRate: totalReports > 0 ? Math.round((resolvedReports.length / totalReports) * 100) : 0,
        reportsByStatus: reportsByStatusMap,
        reportsByType: reportsByTypeMap,
        wardStats
      }
    });

  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/trends
// @desc    Get trend data for charts
// @access  Protected
router.get('/trends', protect, async (req, res) => {
  try {
    const { days = 30, wardNumber } = req.query;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all reports and filter
    const allReports = await getAll(COLLECTIONS.wasteReports);
    let filteredReports = allReports.filter(r => {
      const reportedAt = toDate(r.reportedAt);
      return reportedAt >= startDate;
    });

    if (wardNumber) {
      filteredReports = filteredReports.filter(r => r.location?.wardNumber === parseInt(wardNumber));
    } else if (req.user.role === 'ward-officer' && req.user.assignedWards?.length > 0) {
      filteredReports = filteredReports.filter(r => req.user.assignedWards.includes(r.location?.wardNumber));
    }

    // Helper function to format date as YYYY-MM-DD
    const formatDate = (date) => {
      const d = toDate(date);
      return d.toISOString().split('T')[0];
    };

    // Daily reports
    const dailyReportsMap = filteredReports.reduce((acc, r) => {
      const dateKey = formatDate(r.reportedAt);
      if (!acc[dateKey]) {
        acc[dateKey] = { count: 0, totalSeverity: 0 };
      }
      acc[dateKey].count += 1;
      acc[dateKey].totalSeverity += r.classification?.severityScore || 0;
      return acc;
    }, {});

    const dailyReports = Object.entries(dailyReportsMap)
      .map(([date, data]) => ({
        _id: date,
        count: data.count,
        avgSeverity: data.count > 0 ? data.totalSeverity / data.count : 0
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Resolution trends
    const resolvedReports = filteredReports.filter(r => r.status?.current === 'resolved' && r.resolution?.resolvedAt);
    const resolutionTrendsMap = resolvedReports.reduce((acc, r) => {
      const dateKey = formatDate(r.resolution.resolvedAt);
      acc[dateKey] = (acc[dateKey] || 0) + 1;
      return acc;
    }, {});

    const resolutionTrends = Object.entries(resolutionTrendsMap)
      .map(([date, count]) => ({ _id: date, count }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Waste type trends
    const wasteTypeTrendsMap = filteredReports.reduce((acc, r) => {
      const dateKey = formatDate(r.reportedAt);
      const type = r.classification?.wasteType || 'unknown';
      const key = `${dateKey}|${type}`;
      if (!acc[key]) {
        acc[key] = { date: dateKey, type, count: 0 };
      }
      acc[key].count += 1;
      return acc;
    }, {});

    const wasteTypeTrends = Object.values(wasteTypeTrendsMap)
      .map(item => ({
        _id: { date: item.date, type: item.type },
        count: item.count
      }))
      .sort((a, b) => a._id.date.localeCompare(b._id.date));

    res.json({
      success: true,
      data: {
        dailyReports,
        resolutionTrends,
        wasteTypeTrends
      }
    });

  } catch (error) {
    console.error('Dashboard Trends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trends',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/performance
// @desc    Get performance metrics
// @access  Protected
router.get('/performance', protect, authorize('supervisor', 'admin'), async (req, res) => {
  try {
    // Officer performance
    const allUsers = await getAll(COLLECTIONS.users);
    const officers = allUsers.filter(u => u.role === 'ward-officer');

    const officerPerformance = officers.map(officer => ({
      officerId: officer.id,
      name: officer.name,
      wards: officer.assignedWards || [],
      tasksCompleted: officer.officerMetrics?.tasksCompleted || 0,
      efficiency: officer.officerMetrics?.efficiency || 0,
      averageResponseTime: officer.officerMetrics?.averageResponseTime || 0,
      rating: officer.officerMetrics?.averageRating || 0
    }));

    // Ward performance
    const wards = await getAll(COLLECTIONS.wards);
    const sortedWards = wards.sort((a, b) => 
      (b.cleanlinessIndex?.current || 0) - (a.cleanlinessIndex?.current || 0)
    );

    const wardPerformance = sortedWards.map(ward => ({
      wardNumber: ward.wardNumber,
      name: ward.name,
      cleanlinessIndex: ward.cleanlinessIndex?.current || 0,
      resolutionRate: ward.performance?.resolutionRate || 0,
      averageResponseTime: ward.performance?.averageResponseTime || 0,
      citizenSatisfaction: ward.performance?.citizenSatisfaction || 0
    }));

    // System-wide metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const allReports = await getAll(COLLECTIONS.wasteReports);
    const totalReportsResolved = allReports.filter(r => {
      if (r.status?.current !== 'resolved' || !r.resolution?.resolvedAt) return false;
      const resolvedAt = toDate(r.resolution.resolvedAt);
      return resolvedAt >= thirtyDaysAgo;
    }).length;

    const activeUsers = allUsers.filter(u => {
      if (!u.lastActive) return false;
      const lastActive = toDate(u.lastActive);
      return lastActive >= thirtyDaysAgo;
    }).length;

    const citizenParticipation = allUsers.filter(u => 
      u.role === 'citizen' && (u.citizenMetrics?.reportsSubmitted || 0) > 0
    ).length;

    const systemMetrics = {
      totalReportsResolved,
      averageCleanlinessIndex: wards.length > 0 ? 
        wards.reduce((sum, w) => sum + (w.cleanlinessIndex?.current || 0), 0) / wards.length : 0,
      activeUsers,
      citizenParticipation
    };

    res.json({
      success: true,
      data: {
        officerPerformance,
        wardPerformance,
        systemMetrics
      }
    });

  } catch (error) {
    console.error('Performance Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance metrics',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/circular-economy
// @desc    Get circular economy metrics
// @access  Protected
router.get('/circular-economy', protect, async (req, res) => {
  try {
    const { wardNumber } = req.query;

    // Get all reports and filter
    const allReports = await getAll(COLLECTIONS.wasteReports);
    let reports = allReports.filter(r => r.circularEconomy);
    
    if (wardNumber) {
      reports = reports.filter(r => r.location?.wardNumber === parseInt(wardNumber));
    }

    // Aggregate metrics
    const totalRevenue = reports.reduce((sum, r) => 
      sum + (r.circularEconomy.estimatedRevenue || 0), 0
    );

    const totalCO2Reduction = reports.reduce((sum, r) => 
      sum + (r.circularEconomy.environmentalImpact?.co2Reduction || 0), 0
    );

    const avgRecyclablePercentage = reports.length > 0 ?
      reports.reduce((sum, r) => sum + (r.circularEconomy.recyclablePercentage || 0), 0) / reports.length : 0;

    const totalEmployment = reports.reduce((sum, r) => 
      sum + (r.circularEconomy.employmentPotential || 0), 0
    );

    // By waste type
    const revenueByType = {};
    reports.forEach(r => {
      const type = r.classification.wasteType;
      if (!revenueByType[type]) {
        revenueByType[type] = {
          revenue: 0,
          count: 0,
          co2Reduction: 0
        };
      }
      revenueByType[type].revenue += r.circularEconomy.estimatedRevenue || 0;
      revenueByType[type].count += 1;
      revenueByType[type].co2Reduction += r.circularEconomy.environmentalImpact?.co2Reduction || 0;
    });

    res.json({
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue),
        totalCO2Reduction: Math.round(totalCO2Reduction),
        avgRecyclablePercentage: Math.round(avgRecyclablePercentage),
        totalEmployment,
        reportsAnalyzed: reports.length,
        revenueByType
      }
    });

  } catch (error) {
    console.error('Circular Economy Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching circular economy metrics',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Get active alerts and notifications
// @access  Protected
router.get('/alerts', protect, async (req, res) => {
  try {
    // Get all reports
    const allReports = await getAll(COLLECTIONS.wasteReports);
    let filteredReports = allReports;
    
    if (req.user.role === 'ward-officer' && req.user.assignedWards?.length > 0) {
      filteredReports = allReports.filter(r => 
        req.user.assignedWards.includes(r.location?.wardNumber)
      );
    }

    // Critical reports
    const criticalReports = filteredReports
      .filter(r => 
        r.priority === 'urgent' && 
        ['reported', 'verified'].includes(r.status?.current)
      )
      .sort((a, b) => toDate(b.reportedAt) - toDate(a.reportedAt))
      .slice(0, 10);

    // Overdue assignments
    const now = new Date();
    const overdueAssignments = filteredReports
      .filter(r => {
        if (!r.assignedTo?.expectedCompletionTime || r.status?.current === 'resolved') return false;
        const expectedTime = toDate(r.assignedTo.expectedCompletionTime);
        return expectedTime < now;
      })
      .slice(0, 10);

    // Ward overflow risks
    let overflowRisks = [];
    if (['admin', 'supervisor'].includes(req.user.role)) {
      const allWards = await getAll(COLLECTIONS.wards);
      overflowRisks = allWards.filter(w => 
        ['high', 'critical'].includes(w.overflowRisk?.currentLevel)
      );
    }

    // Pending policy recommendations
    const allPolicies = await getAll(COLLECTIONS.policyRecommendations);
    const pendingPolicies = allPolicies
      .filter(p => p.status?.current === 'generated' && (p.priority || 0) >= 7)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        criticalReports: criticalReports.map(r => ({
          id: r.id,
          reportId: r.reportId,
          location: r.location?.address || 'Unknown',
          severity: r.classification?.severityScore || 0,
          reportedAt: r.reportedAt
        })),
        overdueAssignments: overdueAssignments.map(r => {
          const expectedTime = toDate(r.assignedTo.expectedCompletionTime);
          return {
            id: r.id,
            reportId: r.reportId,
            expectedCompletion: r.assignedTo.expectedCompletionTime,
            daysOverdue: Math.floor((Date.now() - expectedTime) / (1000 * 60 * 60 * 24))
          };
        }),
        overflowRisks: overflowRisks.map(w => ({
          wardNumber: w.wardNumber,
          name: w.name,
          riskLevel: w.overflowRisk?.currentLevel || 'unknown',
          estimatedTime: w.overflowRisk?.estimatedOverflowTime
        })),
        pendingPolicies: pendingPolicies.map(p => ({
          id: p.id,
          wardNumber: p.wardNumber,
          priority: p.priority,
          createdAt: p.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Alerts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
});

module.exports = router;
