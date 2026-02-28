const express = require('express');
const router = express.Router();
const multer = require('multer');
const { COLLECTIONS, getAll, getById, createDoc, updateDoc, toDate } = require('../services/firestoreService');
const geminiService = require('../services/geminiService');
const { protect, authorize } = require('../middleware/auth');

const buildReportId = () => `WR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

const getDistanceKm = (coordA, coordB) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const [lng1, lat1] = coordA;
  const [lng2, lat2] = coordB;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   POST /api/reports
// @desc    Create new waste report
// @access  Public (citizen) / Protected (officers)
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      address,
      landmark,
      wardNumber,
      reporterType,
      contactNumber,
      isAnonymous
    } = req.body;

    // Validate required fields
    if (!latitude || !longitude || !wardNumber) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and ward number are required'
      });
    }

    // Get first image for AI analysis
    const imageBuffer = req.files && req.files[0] ? req.files[0].buffer : null;
    
    let classification = {
      wasteType: 'unclassified',
      severityScore: 3,
      estimatedVolume: 'medium',
      riskLevel: 'moderate',
      isIllegalDumping: false,
      environmentalHazardLevel: 5,
      aiConfidence: 0
    };

    let aiAnalysis = null;

    // If image provided, use Gemini AI for classification
    if (imageBuffer) {
      try {
        const startTime = Date.now();
        const geminiResult = await geminiService.classifyWaste(imageBuffer, { wardNumber });
        const processingTime = Date.now() - startTime;

        classification = {
          wasteType: geminiResult.wasteType,
          subType: geminiResult.subType,
          severityScore: geminiResult.severityScore,
          estimatedVolume: geminiResult.estimatedVolume,
          riskLevel: geminiResult.riskLevel,
          isIllegalDumping: geminiResult.isIllegalDumping,
          environmentalHazardLevel: geminiResult.environmentalHazardLevel,
          aiConfidence: geminiResult.confidence
        };

        aiAnalysis = {
          geminiResponse: geminiResult,
          processedAt: new Date(),
          processingTime,
          modelVersion: 'gemini-1.5-pro'
        };
      } catch (aiError) {
        console.error('AI Classification failed:', aiError);
        // Continue with default classification
      }
    }

    // Create waste report
    const report = await createDoc(COLLECTIONS.reports, {
      reportId: buildReportId(),
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address,
        landmark,
        wardNumber: parseInt(wardNumber)
      },
      classification,
      images: req.files ? req.files.map(file => ({
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        uploadedAt: new Date(),
        metadata: {
          size: file.size,
          format: file.mimetype
        }
      })) : [],
      reporter: {
        userId: req.user ? req.user.id : null,
        type: reporterType || 'citizen',
        isAnonymous: isAnonymous === 'true',
        contactNumber
      },
      status: {
        current: 'reported',
        history: [{
          status: 'reported',
          timestamp: new Date(),
          updatedBy: req.user ? req.user.id : null,
          notes: 'Initial report'
        }]
      },
      aiAnalysis,
      priority: classification.severityScore >= 4 ? 'urgent' : 
                classification.severityScore >= 3 ? 'high' : 'medium',
      reportedAt: new Date(),
      lastUpdatedAt: new Date()
    });

    // Update ward statistics
    await updateWardStats(wardNumber);

    res.status(201).json({
      success: true,
      message: 'Waste report created successfully',
      data: report
    });

  } catch (error) {
    console.error('Create Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating report',
      error: error.message
    });
  }
});

// @route   GET /api/reports
// @desc    Get all reports with filters
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const {
      wardNumber,
      status,
      wasteType,
      priority,
      fromDate,
      toDate: toDateParam,
      page = 1,
      limit = 20,
      sortBy = '-reportedAt'
    } = req.query;

    // Build query
    const query = {};

    if (wardNumber) query['location.wardNumber'] = parseInt(wardNumber);
    if (status) query['status.current'] = status;
    if (wasteType) query['classification.wasteType'] = wasteType;
    if (priority) query.priority = priority;
    
    if (fromDate || toDateParam) {
      query.reportedAt = {};
      if (fromDate) query.reportedAt.$gte = new Date(fromDate);
      if (toDateParam) query.reportedAt.$lte = new Date(toDateParam);
    }

    // If user is ward officer, filter by assigned wards
    if (req.user.role === 'ward-officer' && req.user.assignedWards.length > 0) {
      query['location.wardNumber'] = { $in: req.user.assignedWards };
    }

    const skip = (page - 1) * limit;

    let reports = await getAll(COLLECTIONS.reports);

    reports = reports.filter(report => {
      if (wardNumber && report.location?.wardNumber !== parseInt(wardNumber)) return false;
      if (status && report.status?.current !== status) return false;
      if (wasteType && report.classification?.wasteType !== wasteType) return false;
      if (priority && report.priority !== priority) return false;

      const reportedAt = toDate(report.reportedAt);
      if (fromDate && reportedAt < new Date(fromDate)) return false;
      if (toDateParam && reportedAt > new Date(toDateParam)) return false;
      return true;
    });

    if (req.user.role === 'ward-officer' && req.user.assignedWards?.length > 0) {
      reports = reports.filter(r => req.user.assignedWards.includes(r.location?.wardNumber));
    }

    const total = reports.length;

    const sortField = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
    const sortDir = sortBy.startsWith('-') ? -1 : 1;
    reports.sort((a, b) => {
      const valA = toDate(a[sortField]) || a[sortField] || 0;
      const valB = toDate(b[sortField]) || b[sortField] || 0;
      return (valA > valB ? 1 : -1) * sortDir;
    });

    const paginated = reports.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report by ID
// @access  Protected
router.get('/:id', protect, async (req, res) => {
  try {
    let report = await getById(COLLECTIONS.reports, req.params.id);
    if (!report) {
      const reports = await getAll(COLLECTIONS.reports);
      report = reports.find(r => r.reportId === req.params.id) || null;
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
});

// @route   PATCH /api/reports/:id/status
// @desc    Update report status
// @access  Protected (officers only)
router.patch('/:id/status', protect, authorize('ward-officer', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    const report = await getById(COLLECTIONS.reports, req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Add to status history
    const statusHistory = report.status?.history || [];
    statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user.id,
      notes
    });

    const updatedReport = await updateDoc(COLLECTIONS.reports, report.id, {
      status: {
        current: status,
        history: statusHistory
      },
      lastUpdatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
});

// @route   PATCH /api/reports/:id/assign
// @desc    Assign report to officer/team
// @access  Protected (supervisors/admin only)
router.patch('/:id/assign', protect, authorize('supervisor', 'admin'), async (req, res) => {
  try {
    const { officerId, team, truckId, expectedCompletionTime } = req.body;

    const existingReport = await getById(COLLECTIONS.reports, req.params.id);
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = await updateDoc(COLLECTIONS.reports, req.params.id, {
      assignedTo: {
        team,
        officerId,
        truckId,
        assignedAt: new Date(),
        expectedCompletionTime: expectedCompletionTime ? new Date(expectedCompletionTime) : null
      },
      status: {
        current: 'assigned',
        history: [
          ...(existingReport.status?.history || []),
          {
            status: 'assigned',
            timestamp: new Date(),
            updatedBy: req.user.id,
            notes: 'Assigned to officer'
          }
        ]
      },
      lastUpdatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Report assigned successfully',
      data: report
    });

  } catch (error) {
    console.error('Assign Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning report',
      error: error.message
    });
  }
});

// @route   PATCH /api/reports/:id/resolve
// @desc    Mark report as resolved
// @access  Protected (officers only)
router.patch('/:id/resolve', protect, authorize('ward-officer', 'supervisor', 'admin'), upload.array('afterImages', 3), async (req, res) => {
  try {
    const { actionTaken, wasteCollected } = req.body;

    const report = await getById(COLLECTIONS.reports, req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const updatedReport = await updateDoc(COLLECTIONS.reports, report.id, {
      resolution: {
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      actionTaken,
      afterImages: req.files ? req.files.map(file => 
        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      ) : [],
      wasteCollected: wasteCollected ? JSON.parse(wasteCollected) : null
    },
      status: {
        current: 'resolved',
        history: [...(report.status?.history || []), {
          status: 'resolved',
          timestamp: new Date(),
          updatedBy: req.user.id,
          notes: actionTaken || 'Resolved'
        }]
      },
      lastUpdatedAt: new Date()
    });

    // Update ward stats
    await updateWardStats(report.location.wardNumber);

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: updatedReport
    });

  } catch (error) {
    console.error('Resolve Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving report',
      error: error.message
    });
  }
});

// @route   GET /api/reports/nearby/:lat/:lng
// @desc    Get reports near location
// @access  Public
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 5; // km

    const reports = (await getAll(COLLECTIONS.reports))
      .filter(report => report.status?.current !== 'resolved')
      .filter(report => {
        if (!report.location?.coordinates) return false;
        const distance = getDistanceKm(report.location.coordinates, [parseFloat(lng), parseFloat(lat)]);
        return distance <= parseFloat(radius);
      })
      .slice(0, 50);

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('Get Nearby Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby reports',
      error: error.message
    });
  }
});

// Helper function to update ward statistics
async function updateWardStats(wardNumber) {
  try {
    const wards = await getAll(COLLECTIONS.wards);
    const ward = wards.find(w => w.wardNumber === parseInt(wardNumber));
    
    if (!ward) return;

    const reports = (await getAll(COLLECTIONS.reports)).filter(r =>
      r.location?.wardNumber === parseInt(wardNumber) && r.status?.current !== 'resolved'
    );

    // Update active reports
    const updatedWard = {
      ...ward,
      activeReports: {
        total: reports.length,
        byStatus: {
          reported: reports.filter(r => r.status?.current === 'reported').length,
          verified: reports.filter(r => r.status?.current === 'verified').length,
          assigned: reports.filter(r => r.status?.current === 'assigned').length,
          inProgress: reports.filter(r => r.status?.current === 'in-progress').length
        },
        bySeverity: {
          low: reports.filter(r => r.classification?.severityScore <= 2).length,
          medium: reports.filter(r => r.classification?.severityScore === 3).length,
          high: reports.filter(r => r.classification?.severityScore === 4).length,
          critical: reports.filter(r => r.classification?.severityScore === 5).length
        }
      },
      lastUpdated: new Date()
    };
    
    await updateDoc(COLLECTIONS.wards, ward.id, updatedWard);
  } catch (error) {
    console.error('Update Ward Stats Error:', error);
  }
}

// @route   POST /api/reports/classify-image
// @desc    Classify waste image using Gemini AI (Demo endpoint)
// @access  Public
router.post('/classify-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageBuffer = req.file.buffer;
    
    // Call Gemini AI service for classification
    const classification = await geminiService.classifyWaste(imageBuffer, {
      wardNumber: req.body.wardNumber || 1
    });

    res.json({
      success: true,
      classification,
      message: 'Image classified successfully'
    });

  } catch (error) {
    console.error('Image Classification Error:', error);
    
    // Return demo/fallback result if Gemini fails
    res.json({
      success: true,
      classification: {
        wasteType: 'mixed',
        confidence: 0.75,
        severityScore: 3,
        estimatedVolume: 'Medium',
        isIllegalDumping: false,
        riskLevel: 'Moderate',
        recommendedAction: 'Schedule collection within 24 hours',
        environmentalHazard: 'Moderate',
        note: 'Demo classification - Configure GEMINI_API_KEY for real AI analysis'
      },
      message: 'Using demo classification (Gemini AI not configured)'
    });
  }
});

module.exports = router;
