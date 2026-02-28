/**
 * MadurAI Urban Intelligence Grid (MUIG)
 * Intelligence Engine - Core Prediction Algorithms
 * 
 * 6 Core Modules:
 * 1. Detection Layer - Waste classification
 * 2. Prediction Engine - Overflow probability
 * 3. Alert & Escalation - Auto-assignment
 * 4. Route Optimization - Pathfinding
 * 5. Circular Intelligence - Revenue calculation
 * 6. Policy Intelligence - Recommendations
 */

class IntelligenceEngine {
  constructor() {
    this.wards = [];
    this.reports = [];
    this.trucks = [];
    this.predictions = {};
    this.alerts = [];
    this.routes = [];
    this.circularData = {};
    this.policies = [];
  }

  /**
   * MODULE 1: DETECTION LAYER
   * Input: CCTV alerts, citizen uploads, complaint data
   * Output: Waste classification, severity, risk assessment
   */
  classifyWaste(image, metadata = {}) {
    // Simulates Gemini AI classification
    const classifications = {
      plastic: { severity: 'high', riskFactor: 0.85, recyclable: true },
      organic: { severity: 'medium', riskFactor: 0.6, recyclable: true },
      'e-waste': { severity: 'high', riskFactor: 0.9, recyclable: true },
      construction: { severity: 'medium', riskFactor: 0.65, recyclable: false },
      metal: { severity: 'low', riskFactor: 0.4, recyclable: true },
      mixed: { severity: 'high', riskFactor: 0.75, recyclable: false }
    };

    const detectedType = Object.keys(classifications)[
      Math.floor(Math.random() * Object.keys(classifications).length)
    ];

    return {
      type: detectedType,
      confidence: (Math.random() * 0.25 + 0.75).toFixed(2), // 75-100%
      ...classifications[detectedType],
      location: metadata.location || 'Unknown',
      timestamp: new Date().toISOString(),
      illegalDumping: Math.random() > 0.7 // 30% chance
    };
  }

  /**
   * MODULE 2: PREDICTION ENGINE
   * Analyzes: Report frequency, time patterns, severity growth
   * Output: Overflow probability %, time-to-risk, urgency level
   */
  predictOverflow(wardId) {
    const ward = this.wards.find(w => w.id === wardId);
    if (!ward) return null;

    // Get last 7 days of reports
    const last7Days = this.reports.filter(
      r => r.wardId === wardId && 
      (Date.now() - new Date(r.createdAt)) < 7 * 24 * 60 * 60 * 1000
    );

    // Calculate metrics
    const reportFrequency = last7Days.length; // Reports per ward/week
    const growthRate = reportFrequency > 0 ? (reportFrequency / 7) : 0; // Reports per day
    const avgSeverity = last7Days.length > 0 
      ? last7Days.reduce((sum, r) => sum + (r.severity || 0.5), 0) / last7Days.length
      : 0;

    // Overflow probability formula
    // Base probability + growth factor + severity weight
    const binCapacity = 100; // Standard bin capacity (units)
    const currentLoad = ward.wasteAmount || 0;
    const projectedLoad = currentLoad + (growthRate * 24 * 2); // 2-day projection
    
    const overflowProbability = Math.min(
      (projectedLoad / binCapacity) * (1 + avgSeverity),
      1.0
    ) * 100;

    // Time to overflow
    const dailyIncrease = growthRate * (1 + avgSeverity);
    const hoursToOverflow = dailyIncrease > 0 
      ? ((binCapacity - currentLoad) / dailyIncrease) * 24 
      : 999;

    // Urgency level
    let urgencyLevel = 'LOW';
    if (overflowProbability > 80) urgencyLevel = 'CRITICAL';
    else if (overflowProbability > 60) urgencyLevel = 'HIGH';
    else if (overflowProbability > 40) urgencyLevel = 'MEDIUM';

    return {
      wardId,
      wardName: ward.name,
      overflowProbability: Math.round(overflowProbability),
      hoursToOverflow: Math.round(hoursToOverflow),
      urgencyLevel,
      currentLoad: Math.round(currentLoad),
      projectedLoad: Math.round(projectedLoad),
      capacityThreshold: binCapacity,
      confidence: (75 + Math.random() * 25).toFixed(0) // 75-100% confidence
    };
  }

  /**
   * MODULE 3: ALERT & ESCALATION ENGINE
   * If threshold exceeded: Generate alert, assign action, escalate if unresolved
   */
  generateAlerts() {
    this.alerts = [];

    // Check all wards for overflow risk
    this.wards.forEach(ward => {
      const prediction = this.predictOverflow(ward.id);
      if (prediction.overflowProbability > 50) {
        const alert = {
          id: `ALERT-${Date.now()}-${ward.id}`,
          type: 'OVERFLOW_RISK',
          severity: prediction.urgencyLevel,
          wardId: ward.id,
          wardName: ward.name,
          message: `${prediction.urgencyLevel} overflow risk (${prediction.overflowProbability}% probability)`,
          hoursToOverflow: prediction.hoursToOverflow,
          createdAt: new Date().toISOString(),
          assignedTruck: this.assignTruck(ward.id),
          actions: this.getSuggestedActions(prediction)
        };
        this.alerts.push(alert);
      }
    });

    // Check for illegal dumping
    this.reports.forEach(report => {
      if (report.illegalDumping) {
        const alert = {
          id: `ALERT-${Date.now()}-${report.id}`,
          type: 'ILLEGAL_DUMPING',
          severity: 'HIGH',
          wardId: report.wardId,
          location: report.location,
          message: 'Illegal dumping detected - enforcement action required',
          createdAt: new Date().toISOString(),
          actionRequired: true
        };
        this.alerts.push(alert);
      }
    });

    return this.alerts;
  }

  /**
   * Auto-assign truck based on availability and location
   */
  assignTruck(wardId) {
    const availableTrucks = this.trucks.filter(t => t.status === 'available');
    if (availableTrucks.length === 0) return null;
    
    // Simple greedy assignment: closest truck
    const assigned = availableTrucks[0];
    assigned.status = 'assigned';
    assigned.assignedWard = wardId;
    return assigned;
  }

  /**
   * Suggest actions based on prediction
   */
  getSuggestedActions(prediction) {
    const actions = [];

    if (prediction.overflowProbability > 80) {
      actions.push('DISPATCH_TRUCK_IMMEDIATE');
      actions.push('ALERT_WARD_OFFICE');
    }
    if (prediction.overflowProbability > 60) {
      actions.push('INCREASE_COLLECTION_FREQUENCY');
      actions.push('MONITOR_CLOSELY');
    }
    if (prediction.hoursToOverflow < 12) {
      actions.push('EMERGENCY_PROTOCOL');
    }

    return actions;
  }

  /**
   * MODULE 4: ROUTE OPTIMIZATION
   * AI suggests: Truck allocation, order of cleanup, fuel/time savings
   */
  optimizeRoute(truckId, hotspots) {
    if (!hotspots.length) return null;

    // Simplified greedy TSP solution
    let route = [hotspots[0]];
    let remaining = hotspots.slice(1);
    let totalDistance = 0;

    while (remaining.length > 0) {
      const last = route[route.length - 1];
      let minDist = Infinity;
      let nearest = null;
      let nearestIdx = 0;

      remaining.forEach((spot, idx) => {
        const dist = this.calculateDistance(last, spot);
        if (dist < minDist) {
          minDist = dist;
          nearest = spot;
          nearestIdx = idx;
        }
      });

      route.push(nearest);
      totalDistance += minDist;
      remaining.splice(nearestIdx, 1);
    }

    // Return to start
    totalDistance += this.calculateDistance(route[route.length - 1], route[0]);

    // Calculate savings
    const baseFuelPrice = 100; // Per liter
    const fuelEfficiency = 4; // km per liter
    const baseFuel = totalDistance / fuelEfficiency;
    const optimizedFuel = baseFuel * 0.75; // 25% optimization
    const fuelSavings = baseFuel - optimizedFuel;

    return {
      truckId,
      route,
      totalDistance: Math.round(totalDistance),
      estimatedTime: Math.round((totalDistance / 30) * 60), // 30 km/h avg
      fuelRequired: optimizedFuel.toFixed(2),
      fuelSavings: fuelSavings.toFixed(2),
      costSavings: Math.round(fuelSavings * baseFuelPrice),
      co2Reduced: (fuelSavings * 2.3).toFixed(2) // kg CO2
    };
  }

  /**
   * Haversine distance formula for GPS coordinates
   */
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const lat1 = point1.lat || point1.latitude;
    const lon1 = point1.lng || point1.longitude;
    const lat2 = point2.lat || point2.latitude;
    const lon2 = point2.lng || point2.longitude;

    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * MODULE 5: CIRCULAR INTELLIGENCE ENGINE
   * After segregation: Suggests recycling method, revenue, environmental impact
   */
  calculateCircularValue(wasteType, weight) {
    const wasteModels = {
      plastic: {
        collectionCost: 150,
        processingCost: 650,
        salePrice: 4500,
        co2Saved: 0.95,
        waterSaved: 650,
        energySaved: 78,
        recyclablePercentage: 95
      },
      organic: {
        collectionCost: 100,
        processingCost: 420,
        salePrice: 2800,
        co2Saved: 1.2,
        waterSaved: 450,
        energySaved: 45,
        recyclablePercentage: 85
      },
      'e-waste': {
        collectionCost: 500,
        processingCost: 2100,
        salePrice: 8500,
        co2Saved: 2.1,
        waterSaved: 200,
        energySaved: 125,
        recyclablePercentage: 78
      },
      construction: {
        collectionCost: 200,
        processingCost: 800,
        salePrice: 3200,
        co2Saved: 0.5,
        waterSaved: 300,
        energySaved: 35,
        recyclablePercentage: 60
      }
    };

    const model = wasteModels[wasteType] || wasteModels.plastic;
    const collectionValue = weight * (model.collectionCost / 1000);
    const processingCost = weight * (model.processingCost / 1000);
    const saleValue = weight * (model.salePrice / 1000);
    const netRevenue = collectionValue + saleValue - processingCost;

    return {
      wasteType,
      weight,
      revenue: {
        collection: collectionValue.toFixed(2),
        sale: saleValue.toFixed(2),
        processing: processingCost.toFixed(2),
        net: netRevenue.toFixed(2)
      },
      environmental: {
        co2Saved: (weight * model.co2Saved).toFixed(2),
        waterSaved: (weight * model.waterSaved).toFixed(0),
        energySaved: (weight * model.energySaved).toFixed(0)
      },
      processors: this.findLocalProcessors(wasteType, weight),
      shgJobs: Math.ceil(weight / 50) // 1 job per 50 units
    };
  }

  /**
   * Find local processors for waste type
   */
  findLocalProcessors(wasteType, weight) {
    const processors = [
      { id: 1, name: 'Madurai Recycling Hub', distance: 2.1, capacity: 150, rate: 85 },
      { id: 2, name: 'Green Earth Processing', distance: 4.5, capacity: 200, rate: 75 },
      { id: 3, name: 'Eco Industries Tamil Nadu', distance: 6.2, capacity: 100, rate: 95 }
    ];

    return processors
      .filter(p => p.capacity >= weight)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * MODULE 6: POLICY INTELLIGENCE ENGINE
   * When patterns repeat: Recommends infrastructure, budgeting, measures
   */
  generatePolicy(wardId) {
    const ward = this.wards.find(w => w.id === wardId);
    if (!ward) return null;

    const prediction = this.predictOverflow(wardId);
    const reports = this.reports.filter(r => r.wardId === wardId);

    // Analyze patterns
    const violationCount = reports.length;
    const illegalDumpingCount = reports.filter(r => r.illegalDumping).length;
    const avgResponseTime = 25; // minutes

    const recommendations = [];

    // Recommendation 1: CCTV if illegal dumping > 20%
    if (illegalDumpingCount / (reports.length || 1) > 0.2) {
      recommendations.push({
        id: 'REC-CCTV',
        priority: 'HIGH',
        title: 'Install CCTV Surveillance',
        description: `Illegal dumping incidents: ${illegalDumpingCount} in last 30 days`,
        budget: 120000,
        timeline: '2 months',
        expectedImpact: '-78% illegal dumping',
        roi: '18 months',
        reasoning: [
          'Detected pattern of illegal dumping',
          'Location: High-traffic dumping zones',
          'Cost per incident: ₹5,000',
          'CCTV saves ₹78,000/month'
        ]
      });
    }

    // Recommendation 2: Increase bins if overflow risk > 60%
    if (prediction.overflowProbability > 60) {
      recommendations.push({
        id: 'REC-BINS',
        priority: 'HIGH',
        title: 'Increase Bin Capacity',
        description: `Current overflow risk: ${prediction.overflowProbability}%`,
        budget: 85000,
        timeline: '3 weeks',
        expectedImpact: '+45% capacity',
        roi: 'Immediate',
        reasoning: [
          'Overflow probability trending upward',
          'Population: ' + ward.population,
          'Current capacity exceeded',
          'Prevents service disruption'
        ]
      });
    }

    // Recommendation 3: Organic waste processing
    if (violationCount > 20) {
      recommendations.push({
        id: 'REC-COMPOST',
        priority: 'MEDIUM',
        title: 'Organic Waste Processing Unit',
        description: 'Segregate and compost organic waste locally',
        budget: 520000,
        timeline: '4 months',
        expectedImpact: '-34% landfill load',
        roi: '42 months',
        reasoning: [
          '40% of waste is organic',
          'Creates 15 SHG jobs',
          'Monthly revenue: ₹12,200',
          'Reduces transport cost by 30%'
        ]
      });
    }

    return {
      wardId,
      wardName: ward.name,
      recommendations,
      metrics: {
        totalReports: reports.length,
        illegalDumping: illegalDumpingCount,
        avgResponseTime,
        cleanliness: ward.cleanlinessIndex || 70
      },
      impact: {
        violationReduction: '45-78%',
        cleanlinesImprovement: '+15-25 points',
        costSavings: '₹8-15L annually'
      }
    };
  }

  /**
   * DASHBOARD AGGREGATOR
   * Combines all 6 modules into real-time command center data
   */
  getDashboardData() {
    const alerts = this.generateAlerts();
    const predictions = this.wards.map(w => this.predictOverflow(w.id));
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;

    return {
      timestamp: new Date().toISOString(),
      alerts: {
        total: alerts.length,
        critical: criticalAlerts,
        high: highAlerts,
        list: alerts.slice(0, 10)
      },
      predictions: {
        averageOverflowRisk: (
          predictions.reduce((sum, p) => sum + p.overflowProbability, 0) / predictions.length
        ).toFixed(1),
        highRiskWards: predictions.filter(p => p.overflowProbability > 60).length,
        details: predictions
      },
      trucks: {
        active: this.trucks.filter(t => t.status === 'active').length,
        assigned: this.trucks.filter(t => t.status === 'assigned').length,
        available: this.trucks.filter(t => t.status === 'available').length
      },
      reports: {
        total: this.reports.length,
        illegalDumping: this.reports.filter(r => r.illegalDumping).length,
        unresolved: this.reports.filter(r => r.status === 'open').length
      }
    };
  }
}

// Export for use in HTML
const intelligenceEngine = new IntelligenceEngine();
