const cron = require('node-cron');
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const geminiService = require('../services/geminiService');

// Update cleanliness index for all wards (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily cleanliness index update...');
  
  try {
    const wards = await getAll(COLLECTIONS.wards);
    const allReports = await getAll(COLLECTIONS.reports);
    
    const updates = wards.map(async (ward) => {
      // Get reports from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const reports = allReports.filter(r => 
        r.location?.wardNumber === ward.wardNumber &&
        toDate(r.reportedAt) >= thirtyDaysAgo
      );

      if (reports.length === 0) {
        return updateDoc(COLLECTIONS.wards, ward.id, {
          'cleanlinessIndex.current': 100
        });
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

      const currentScore = Math.round(score * 10) / 10;
      
      // Add to history
      const history = ward.cleanlinessIndex?.history || [];
      history.push({
        score: currentScore,
        timestamp: new Date(),
        factors: {
          reportFrequency,
          resolutionSpeed,
          severityFactor,
          resolutionRate
        }
      });

      // Keep only last 90 days of history
      const trimmedHistory = history.length > 90 ? history.slice(-90) : history;

      return updateDoc(COLLECTIONS.wards, ward.id, {
        'cleanlinessIndex.current': currentScore,
        'cleanlinessIndex.history': trimmedHistory
      });
    });

    await Promise.all(updates);
    
    console.log(`✅ Updated cleanliness index for ${wards.length} wards`);
  } catch (error) {
    console.error('❌ Cleanliness index update error:', error);
  }
});

// Predict overflow for high-risk wards (every 6 hours)
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Running overflow prediction...');
  
  try {
    const allWards = await getAll(COLLECTIONS.wards);
    const wards = allWards.filter(w => w.activeReports?.total > 10);
    
    const allReports = await getAll(COLLECTIONS.reports);
    
    const updates = wards.map(async (ward) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const reports = allReports.filter(r =>
        r.location?.wardNumber === ward.wardNumber &&
        toDate(r.reportedAt) >= sevenDaysAgo
      );
      
      if (reports.length > 5) {
        const severityDistribution = {
          low: reports.filter(r => (r.classification?.severityScore || 0) <= 2).length,
          medium: reports.filter(r => (r.classification?.severityScore || 0) === 3).length,
          high: reports.filter(r => (r.classification?.severityScore || 0) === 4).length,
          critical: reports.filter(r => (r.classification?.severityScore || 0) === 5).length
        };
        
        const dailyReports = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          dailyReports[date] = 0;
        }
        reports.forEach(r => {
          const reportDate = toDate(r.reportedAt);
          if (reportDate) {
            const date = reportDate.toISOString().split('T')[0];
            if (dailyReports[date] !== undefined) dailyReports[date]++;
          }
        });
        
        const wardData = {
          wardNumber: ward.wardNumber,
          activeReports: ward.activeReports?.total || 0,
          severityDistribution,
          avgResponseTime: ward.performance?.averageResponseTime || 30,
          weeklyTrend: dailyReports,
          cleanlinessIndex: ward.cleanlinessIndex?.current || 0,
          binCapacity: ward.infrastructure?.bins?.capacity || 100
        };
        
        try {
          const prediction = await geminiService.predictOverflow(wardData);
          
          return updateDoc(COLLECTIONS.wards, ward.id, {
            'overflowRisk.currentLevel': prediction.urgencyLevel,
            'overflowRisk.probability': prediction.overflowProbability,
            'overflowRisk.estimatedOverflowTime': prediction.estimatedTimeToOverflow ? 
              new Date(Date.now() + prediction.estimatedTimeToOverflow * 60 * 60 * 1000) : null,
            'overflowRisk.predictedAt': new Date()
          });
        } catch (aiError) {
          console.error(`AI prediction failed for ward ${ward.wardNumber}:`, aiError.message);
          return null;
        }
      }
    });
    
    await Promise.all(updates.filter(u => u !== null && u !== undefined));
    
    console.log(`✅ Overflow prediction completed for ${wards.length} wards`);
  } catch (error) {
    console.error('❌ Overflow prediction error:', error);
  }
});

// Update citizen participation scores (daily at midnight)
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Updating citizen participation scores...');
  
  try {
    const allUsers = await getAll(COLLECTIONS.users);
    const citizens = allUsers.filter(u => 
      u.role === 'citizen' &&
      (u.citizenMetrics?.reportsSubmitted || 0) > 0
    );
    
    const updates = citizens.map(async (citizen) => {
      const verified = citizen.citizenMetrics?.reportsVerified || 0;
      const total = citizen.citizenMetrics?.reportsSubmitted || 0;
      
      if (total === 0) {
        return updateDoc(COLLECTIONS.users, citizen.id, {
          'citizenMetrics.participationScore': 0
        });
      }

      const verificationRate = (verified / total) * 5;
      const activityBonus = Math.min(total / 20, 3);
      const score = Math.min(verificationRate + activityBonus + 2, 10);
      
      const participationScore = Math.round(score * 10) / 10;

      return updateDoc(COLLECTIONS.users, citizen.id, {
        'citizenMetrics.participationScore': participationScore
      });
    });

    await Promise.all(updates);
    
    console.log(`✅ Updated participation scores for ${citizens.length} citizens`);
  } catch (error) {
    console.error('❌ Participation score update error:', error);
  }
});

// Update officer efficiency ratings (daily at 1 AM)
cron.schedule('0 1 * * *', async () => {
  console.log('🔄 Updating officer efficiency ratings...');
  
  try {
    const allUsers = await getAll(COLLECTIONS.users);
    const officers = allUsers.filter(u => 
      u.role === 'ward-officer' &&
      (u.officerMetrics?.tasksAssigned || 0) > 0
    );
    
    const updates = officers.map(async (officer) => {
      const completed = officer.officerMetrics?.tasksCompleted || 0;
      const assigned = officer.officerMetrics?.tasksAssigned || 0;
      
      if (assigned === 0) {
        return updateDoc(COLLECTIONS.users, officer.id, {
          'officerMetrics.efficiency': 0
        });
      }

      const efficiency = Math.round((completed / assigned) * 100);

      return updateDoc(COLLECTIONS.users, officer.id, {
        'officerMetrics.efficiency': efficiency
      });
    });

    await Promise.all(updates);
    
    console.log(`✅ Updated efficiency ratings for ${officers.length} officers`);
  } catch (error) {
    console.error('❌ Officer efficiency update error:', error);
  }
});

// Auto-resolve stale reports (daily at 3 AM)
cron.schedule('0 3 * * *', async () => {
  console.log('🔄 Checking for stale reports...');
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const allReports = await getAll(COLLECTIONS.reports);
    const staleReports = allReports.filter(r =>
      ['reported', 'verified', 'assigned'].includes(r.status?.current) &&
      toDate(r.reportedAt) < thirtyDaysAgo
    );
    
    const updates = staleReports.map(async (report) => {
      const statusHistory = report.status?.history || [];
      statusHistory.push({
        status: 'rejected',
        timestamp: new Date(),
        notes: 'Auto-closed due to inactivity after 30 days'
      });

      return updateDoc(COLLECTIONS.reports, report.id, {
        'status.current': 'rejected',
        'status.history': statusHistory
      });
    });

    await Promise.all(updates);
    
    console.log(`✅ Auto-closed ${staleReports.length} stale reports`);
  } catch (error) {
    console.error('❌ Stale report cleanup error:', error);
  }
});

// Send daily summary reports (daily at 8 AM)
cron.schedule('0 8 * * *', async () => {
  console.log('📊 Generating daily summary reports...');
  
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allReports = await getAll(COLLECTIONS.reports);
    
    const summary = {
      reportsReceived: allReports.filter(r => {
        const reportDate = toDate(r.reportedAt);
        return reportDate && reportDate >= yesterday && reportDate < today;
      }).length,
      reportsResolved: allReports.filter(r => {
        const resolvedDate = toDate(r.resolution?.resolvedAt);
        return resolvedDate && resolvedDate >= yesterday && resolvedDate < today;
      }).length,
      activeReports: allReports.filter(r => r.status?.current !== 'resolved').length
    };
    
    console.log('📊 Daily Summary:', summary);
    // Here you would send emails/notifications to admin users
    
  } catch (error) {
    console.error('❌ Daily summary error:', error);
  }
});

console.log('⏰ Cron jobs initialized');

module.exports = {};
