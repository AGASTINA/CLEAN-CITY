const express = require('express');
const router = express.Router();
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const geminiService = require('../services/geminiService');
const { protect, authorize } = require('../middleware/auth');

// Helper function for geospatial calculations
function getDistanceKm(coords1, coords2) {
  const R = 6371; // Earth radius in km
  const dLat = (coords2[1] - coords1[1]) * Math.PI / 180;
  const dLon = (coords2[0] - coords1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1[1] * Math.PI / 180) * Math.cos(coords2[1] * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper function to calculate policy priority
function calculatePriority(policy) {
  let priority = 50; // Base priority
  
  // Severity impact
  const severityWeights = { low: 0, medium: 20, high: 40, critical: 60 };
  priority += severityWeights[policy.context?.severity] || 0;
  
  // Incident count impact
  const incidentCount = policy.context?.incidentCount || 0;
  if (incidentCount > 100) priority += 30;
  else if (incidentCount > 50) priority += 20;
  else if (incidentCount > 20) priority += 10;
  
  // Budget priority impact
  if (policy.recommendations?.budgetPriority === 'high') priority += 15;
  else if (policy.recommendations?.budgetPriority === 'medium') priority += 5;
  
  return Math.min(100, priority);
}

// @route   POST /api/policy/generate
// @desc    Generate AI policy recommendation
// @access  Protected (officers+)
router.post('/generate', protect, authorize('ward-officer', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { wardNumber, locationCoordinates, timeframe = 30 } = req.body;

    if (!wardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ward number is required'
      });
    }

    // Get incident data
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    // Fetch all reports and filter
    const allReports = await getAll(COLLECTIONS.reports);
    
    let incidents = allReports.filter(report => {
      const reportDate = toDate(report.reportedAt);
      const matchesWard = report.location?.wardNumber === parseInt(wardNumber);
      const matchesDate = reportDate && reportDate >= startDate;
      return matchesWard && matchesDate;
    });

    // If specific location provided, find nearby incidents (within 1km)
    if (locationCoordinates && locationCoordinates.length === 2) {
      incidents = incidents.filter(report => {
        if (!report.location?.coordinates || report.location.coordinates.length !== 2) {
          return false;
        }
        const distance = getDistanceKm(locationCoordinates, report.location.coordinates);
        return distance <= 1; // 1km radius
      });
    }

    if (incidents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No incidents found for analysis'
      });
    }

    // Prepare data for Gemini
    const wasteTypes = [...new Set(incidents.map(i => i.classification.wasteType))];
    
    const severityPattern = {
      low: incidents.filter(i => i.classification.severityScore <= 2).length,
      medium: incidents.filter(i => i.classification.severityScore === 3).length,
      high: incidents.filter(i => i.classification.severityScore === 4).length,
      critical: incidents.filter(i => i.classification.severityScore === 5).length
    };

    const incidentData = {
      location: incidents[0].location.address || `Ward ${wardNumber}`,
      wardNumber,
      incidentCount: incidents.length,
      timeframe: `Last ${timeframe} days`,
      wasteTypes,
      severityPattern
    };

    // Generate AI recommendation
    const startTime = Date.now();
    const aiRecommendation = await geminiService.generatePolicyRecommendation(incidentData);
    const processingTime = Date.now() - startTime;

    // Determine severity based on incident count and patterns
    let severity = 'medium';
    if (incidents.length > 50 || severityPattern.critical > 5) {
      severity = 'critical';
    } else if (incidents.length > 30 || severityPattern.high > 10) {
      severity = 'high';
    } else if (incidents.length < 10) {
      severity = 'low';
    }

    // Create policy recommendation
    const policyId = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const policyData = {
      id: policyId,
      wardNumber,
      location: locationCoordinates ? {
        type: 'Point',
        coordinates: locationCoordinates,
        address: incidents[0]?.location?.address,
        specificArea: incidents[0]?.location?.landmark
      } : null,
      context: {
        incidentCount: incidents.length,
        timeframe: `Last ${timeframe} days`,
        severity,
        wasteTypes,
        patterns: Object.keys(severityPattern).map(key => ({
          type: key,
          description: `${severityPattern[key]} incidents`,
          frequency: `${Math.round((severityPattern[key] / incidents.length) * 100)}%`
        }))
      },
      recommendations: {
        rootCause: aiRecommendation.rootCause?.primary,
        infrastructure: aiRecommendation.infrastructure || [],
        enforcement: aiRecommendation.enforcement?.actions?.map(action => ({
          action,
          schedule: aiRecommendation.enforcement?.schedule,
          resources: aiRecommendation.enforcement?.resources?.join(', ')
        })) || [],
        awareness: aiRecommendation.awareness?.campaigns?.map(campaign => ({
          campaign,
          targetAudience: aiRecommendation.awareness?.targetAudience?.join(', '),
          channel: aiRecommendation.awareness?.channels?.join(', '),
          duration: aiRecommendation.awareness?.duration
        })) || [],
        budgetPriority: aiRecommendation.budgetPriority,
        estimatedImpact: aiRecommendation.estimatedImpact
      },
      aiMetadata: {
        modelUsed: 'gemini-1.5-pro',
        generatedAt: new Date(),
        confidence: 0.85,
        dataPointsAnalyzed: incidents.length,
        processingTime,
        geminiResponse: aiRecommendation
      },
      relatedReports: incidents.map(i => i.id),
      status: {
        current: 'pending',
        history: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate priority
    policyData.priority = calculatePriority(policyData);

    const policyRec = await createDoc(COLLECTIONS.policies, policyData);

    res.status(201).json({
      success: true,
      message: 'Policy recommendation generated successfully',
      data: policyRec
    });

  } catch (error) {
    console.error('Generate Policy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating policy recommendation',
      error: error.message
    });
  }
});

// @route   GET /api/policy
// @desc    Get all policy recommendations
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { wardNumber, status, priority, page = 1, limit = 20 } = req.query;

    // Fetch all policies
    let recommendations = await getAll(COLLECTIONS.policies);

    // Apply filters
    if (wardNumber) {
      recommendations = recommendations.filter(p => p.wardNumber === parseInt(wardNumber));
    }
    if (status) {
      recommendations = recommendations.filter(p => p.status?.current === status);
    }
    if (priority) {
      recommendations = recommendations.filter(p => (p.priority || 0) >= parseInt(priority));
    }

    // Sort by priority (descending) and createdAt (descending)
    recommendations.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      const aDate = toDate(a.createdAt) || new Date(0);
      const bDate = toDate(b.createdAt) || new Date(0);
      return bDate - aDate;
    });

    const total = recommendations.length;
    const skip = (page - 1) * limit;

    // Apply pagination
    recommendations = recommendations.slice(skip, skip + parseInt(limit));

    // Note: Firestore doesn't support populate, so user references remain as IDs
    // Frontend should fetch user details separately if needed

    res.json({
      success: true,
      data: recommendations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total
      }
    });

  } catch (error) {
    console.error('Get Policies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching policy recommendations',
      error: error.message
    });
  }
});

// @route   GET /api/policy/:id
// @desc    Get single policy recommendation
// @access  Protected
router.get('/:id', protect, async (req, res) => {
  try {
    const policy = await getById(COLLECTIONS.policies, req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy recommendation not found'
      });
    }

    // Note: Firestore doesn't support populate
    // Frontend should fetch relatedReports and user details separately if needed

    res.json({
      success: true,
      data: policy
    });

  } catch (error) {
    console.error('Get Policy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching policy recommendation',
      error: error.message
    });
  }
});

// @route   PATCH /api/policy/:id/review
// @desc    Review policy recommendation
// @access  Protected (supervisor/admin only)
router.patch('/:id/review', protect, authorize('supervisor', 'admin'), async (req, res) => {
  try {
    const { decision, feedback, modifications } = req.body;

    if (!['approved', 'rejected', 'needs-revision'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision value'
      });
    }

    const policy = await getById(COLLECTIONS.policies, req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy recommendation not found'
      });
    }

    const statusValue = decision === 'approved' ? 'approved' : 
                        decision === 'rejected' ? 'rejected' : 'under-review';

    const updatedPolicy = {
      review: {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        decision,
        feedback,
        modifications
      },
      status: {
        current: statusValue,
        history: [
          ...(policy.status?.history || []),
          {
            status: statusValue,
            timestamp: new Date(),
            updatedBy: req.user.id,
            notes: feedback
          }
        ]
      },
      updatedAt: new Date()
    };

    await updateDoc(COLLECTIONS.policies, req.params.id, updatedPolicy);

    // Fetch updated policy
    const result = await getById(COLLECTIONS.policies, req.params.id);

    res.json({
      success: true,
      message: `Policy ${decision} successfully`,
      data: result
    });

  } catch (error) {
    console.error('Review Policy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing policy',
      error: error.message
    });
  }
});

// @route   PATCH /api/policy/:id/implement
// @desc    Mark policy for implementation
// @access  Protected (admin only)
router.patch('/:id/implement', protect, authorize('admin'), async (req, res) => {
  try {
    const { assignedTo, expectedCompletionDate, budgetAllocated } = req.body;

    const policy = await getById(COLLECTIONS.policies, req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy recommendation not found'
      });
    }

    if (policy.status?.current !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Policy must be approved before implementation'
      });
    }

    const updatedPolicy = {
      implementation: {
        approvedBy: req.user.id,
        approvedAt: new Date(),
        startDate: new Date(),
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
        assignedTo,
        progress: 0,
        budgetAllocated,
        budgetSpent: 0,
        milestonesCompleted: []
      },
      status: {
        current: 'implemented',
        history: [
          ...(policy.status?.history || []),
          {
            status: 'implemented',
            timestamp: new Date(),
            updatedBy: req.user.id,
            notes: 'Policy approved for implementation'
          }
        ]
      },
      updatedAt: new Date()
    };

    await updateDoc(COLLECTIONS.policies, req.params.id, updatedPolicy);

    // Fetch updated policy
    const result = await getById(COLLECTIONS.policies, req.params.id);

    res.json({
      success: true,
      message: 'Policy marked for implementation',
      data: result
    });

  } catch (error) {
    console.error('Implement Policy Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error implementing policy',
      error: error.message
    });
  }
});

// @route   PATCH /api/policy/:id/progress
// @desc    Update implementation progress
// @access  Protected
router.patch('/:id/progress', protect, authorize('ward-officer', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { progress, milestone, budgetSpent } = req.body;

    const policy = await getById(COLLECTIONS.policies, req.params.id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy recommendation not found'
      });
    }

    const updatedImplementation = {
      ...policy.implementation,
      progress: progress !== undefined 
        ? Math.min(100, Math.max(0, progress)) 
        : policy.implementation?.progress || 0,
      budgetSpent: budgetSpent !== undefined 
        ? budgetSpent 
        : policy.implementation?.budgetSpent || 0,
      milestonesCompleted: milestone
        ? [
            ...(policy.implementation?.milestonesCompleted || []),
            {
              milestone,
              completedAt: new Date()
            }
          ]
        : policy.implementation?.milestonesCompleted || []
    };

    // If completed
    if (updatedImplementation.progress === 100) {
      updatedImplementation.actualCompletionDate = new Date();
    }

    const updatedPolicy = {
      implementation: updatedImplementation,
      status: updatedImplementation.progress === 100 
        ? {
            current: 'monitored',
            history: policy.status?.history || []
          }
        : policy.status,
      updatedAt: new Date()
    };

    await updateDoc(COLLECTIONS.policies, req.params.id, updatedPolicy);

    // Fetch updated policy
    const result = await getById(COLLECTIONS.policies, req.params.id);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
});

module.exports = router;
