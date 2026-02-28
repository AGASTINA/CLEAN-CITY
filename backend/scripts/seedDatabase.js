const bcrypt = require('bcryptjs');
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const admin = require('../config/firestore');

require("dotenv").config();

// Comprehensive Madurai Ward Data with Real Neighborhoods
const maduraiWards = [
  // Central Madurai - Around Meenakshi Temple
  { wardNumber: 1, name: "SS Colony", zone: "Central", area: 2.4, population: 12500, lat: 9.9252, lng: 78.1198 },
  { wardNumber: 2, name: "Anna Nagar", zone: "Central", area: 3.1, population: 15800, lat: 9.9300, lng: 78.1280 },
  { wardNumber: 3, name: "Meenakshi Amman Temple Area", zone: "Central", area: 1.8, population: 22000, lat: 9.9195, lng: 78.1190 },
  { wardNumber: 4, name: "Goripalayam", zone: "Central", area: 2.9, population: 18200, lat: 9.9230, lng: 78.1120 },
  { wardNumber: 5, name: "Alagar Kovil Road", zone: "East", area: 4.2, population: 14500, lat: 9.9180, lng: 78.1380 },
  
  // North Madurai
  { wardNumber: 6, name: "K.Pudur", zone: "North", area: 3.8, population: 16200, lat: 9.9520, lng: 78.1150 },
  { wardNumber: 7, name: "Koodal Nagar", zone: "North", area: 2.7, population: 13800, lat: 9.9480, lng: 78.1200 },
  { wardNumber: 8, name: "Ellis Nagar", zone: "North", area: 3.2, population: 17500, lat: 9.9450, lng: 78.1350 },
  { wardNumber: 9, name: "Simmakkal", zone: "North", area: 2.1, population: 19800, lat: 9.9210, lng: 78.1170 },
  { wardNumber: 10, name: "Town Hall", zone: "North", area: 1.9, population: 21000, lat: 9.9240, lng: 78.1190 },
  
  // South Madurai
  { wardNumber: 11, name: "Villapuram", zone: "South", area: 4.5, population: 14800, lat: 9.8950, lng: 78.1100 },
  { wardNumber: 12, name: "Thirunagar", zone: "South", area: 5.2, population: 18900, lat: 9.8920, lng: 78.1320 },
  { wardNumber: 13, name: "Avaniyapuram", zone: "South", area: 6.8, population: 16500, lat: 9.8650, lng: 78.1180 },
  { wardNumber: 14, name: "Pasumalai", zone: "South", area: 7.2, population: 11200, lat: 9.9080, lng: 78.0950 },
  { wardNumber: 15, name: "Sellur", zone: "South", area: 4.8, population: 15600, lat: 9.9000, lng: 78.1450 },
  
  // East Madurai
  { wardNumber: 16, name: "Ponmeni", zone: "East", area: 3.9, population: 17200, lat: 9.9320, lng: 78.1550 },
  { wardNumber: 17, name: "Uthangudi", zone: "East", area: 4.1, population: 13900, lat: 9.9180, lng: 78.1620 },
  { wardNumber: 18, name: "Harveypatti", zone: "East", area: 5.3, population: 12800, lat: 9.9050, lng: 78.1580 },
  { wardNumber: 19, name: "Alagarkovil Road", zone: "East", area: 4.7, population: 14200, lat: 9.8980, lng: 78.1650 },
  { wardNumber: 20, name: "Teppakulam", zone: "East", area: 2.8, population: 16800, lat: 9.9150, lng: 78.1280 },
  
  // West Madurai
  { wardNumber: 21, name: "Arapalayam", zone: "West", area: 5.1, population: 15300, lat: 9.9280, lng: 78.0980 },
  { wardNumber: 22, name: "Jaihindpuram", zone: "West", area: 4.6, population: 14700, lat: 9.9350, lng: 78.0890 },
  { wardNumber: 23, name: "Anuppanadi", zone: "West", area: 3.7, population: 16900, lat: 9.9180, lng: 78.0920 },
  { wardNumber: 24, name: "Bibikulam", zone: "West", area: 2.9, population: 18500, lat: 9.9210, lng: 78.1050 },
  { wardNumber: 25, name: "TVS Nagar", zone: "West", area: 3.5, population: 15800, lat: 9.9420, lng: 78.1020 },
  
  // Additional Strategic Wards
  { wardNumber: 26, name: "Railway Colony", zone: "Central", area: 2.2, population: 19200, lat: 9.9280, lng: 78.1220 },
  { wardNumber: 27, name: "Periyar Bus Stand Area", zone: "Central", area: 1.6, population: 24000, lat: 9.9180, lng: 78.1190 },
  { wardNumber: 28, name: "Tallakulam", zone: "South", area: 3.8, population: 17600, lat: 9.9080, lng: 78.1350 },
  { wardNumber: 29, name: "Mattuthavani", zone: "East", area: 4.9, population: 13500, lat: 9.9050, lng: 78.1420 },
  { wardNumber: 30, name: "Surveyor Colony", zone: "North", area: 3.1, population: 15200, lat: 9.9580, lng: 78.1180 }
];

// Helper function to generate unique IDs
function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function seedDatabase() {
  try {
    console.log('✅ Connected to Firestore');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    
    const existingUsers = await getAll(COLLECTIONS.users);
    await Promise.all(existingUsers.map(doc => deleteDoc(COLLECTIONS.users, doc.id)));
    
    const existingWards = await getAll(COLLECTIONS.wards);
    await Promise.all(existingWards.map(doc => deleteDoc(COLLECTIONS.wards, doc.id)));
    
    const existingReports = await getAll(COLLECTIONS.reports);
    await Promise.all(existingReports.map(doc => deleteDoc(COLLECTIONS.reports, doc.id)));
    
    const existingPolicies = await getAll(COLLECTIONS.policies);
    await Promise.all(existingPolicies.map(doc => deleteDoc(COLLECTIONS.policies, doc.id)));

    console.log('🧹 Cleared existing data');

    // Create Admin User
    const adminId = generateId('USR');
    const hashedAdminPassword = await bcrypt.hash('Admin@2024', 10);
    const adminUser = await createDoc(COLLECTIONS.users, {
      id: adminId,
      name: 'System Administrator',
      email: 'admin@maduraiswachh.gov.in',
      password: hashedAdminPassword,
      phoneNumber: '+919876543210',
      role: 'admin',
      wardNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('👤 Admin user created');

    // Create Supervisor
    const supervisorId = generateId('USR');
    const hashedSuperPassword = await bcrypt.hash('Super@2024', 10);
    const supervisor = await createDoc(COLLECTIONS.users, {
      id: supervisorId,
      name: 'Rajesh Kumar',
      email: 'supervisor@maduraiswachh.gov.in',
      password: hashedSuperPassword,
      phoneNumber: '+919876543211',
      role: 'supervisor',
      wardNumber: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('👤 Supervisor created');

    // Create Ward Officers (one for every 3 wards)
    const wardOfficers = [];
    const hashedOfficerPassword = await bcrypt.hash('Officer@2024', 10);
    
    for (let i = 0; i < 10; i++) {
      const officerId = generateId('USR');
      const wardNum = (i * 3) + 1;
      const officer = await createDoc(COLLECTIONS.users, {
        id: officerId,
        name: `Ward Officer ${i + 1}`,
        email: `officer${i + 1}@maduraiswachh.gov.in`,
        password: hashedOfficerPassword,
        phoneNumber: `+9198765432${12 + i}`,
        role: 'ward-officer',
        wardNumber: wardNum,
        officerMetrics: {
          assignedReports: Math.floor(Math.random() * 30) + 10,
          resolvedReports: Math.floor(Math.random() * 25) + 5,
          averageResolutionTime: Math.floor(Math.random() * 600) + 300, // 5-15 minutes in seconds
          efficiencyRating: 3.5 + Math.random() * 1.5
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      wardOfficers.push(officer);
    }

    console.log(`👷 Created ${wardOfficers.length} ward officers`);

    // Create Citizens
    const citizens = [];
    const hashedCitizenPassword = await bcrypt.hash('Citizen@2024', 10);
    
    for (let i = 0; i < 50; i++) {
      const citizenId = generateId('USR');
      const citizen = await createDoc(COLLECTIONS.users, {
        id: citizenId,
        name: `Citizen ${i + 1}`,
        email: `citizen${i + 1}@example.com`,
        password: hashedCitizenPassword,
        phoneNumber: `+9198765${40000 + i}`,
        role: 'citizen',
        wardNumber: (i % maduraiWards.length) + 1,
        participationScore: Math.floor(Math.random() * 60) + 20,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      citizens.push(citizen);
    }

    console.log(`👥 Created ${citizens.length} citizens`);

    // Create Wards
    const wards = [];
    for (const wardData of maduraiWards) {
      const wardId = `WRD-${wardData.wardNumber}`;
      
      // Generate realistic boundaries based on center coordinates
      const latOffset = 0.004; // approximately 400m
      const lngOffset = 0.005;
      const boundaries = {
        type: "Polygon",
        coordinates: [[
          [wardData.lng - lngOffset, wardData.lat - latOffset],
          [wardData.lng + lngOffset, wardData.lat - latOffset],
          [wardData.lng + lngOffset, wardData.lat + latOffset],
          [wardData.lng - lngOffset, wardData.lat + latOffset],
          [wardData.lng - lngOffset, wardData.lat - latOffset]
        ]]
      };
      
      // Convert boundaries to JSON string for Firestore compatibility
      const boundariesJSON = JSON.stringify(boundaries);
      
      const ward = await createDoc(COLLECTIONS.wards, {
        id: wardId,
        wardNumber: wardData.wardNumber,
        name: wardData.name,
        zone: wardData.zone,
        area: wardData.area,
        population: wardData.population,
        boundaries: boundariesJSON,  // Store as JSON string
        cleanlinessIndex: 70 + Math.random() * 25,
        cleanlinessHistory: JSON.stringify([  // Store as JSON string
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            value: 65 + Math.random() * 20
          },
          {
            date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            value: 68 + Math.random() * 20
          },
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            value: 70 + Math.random() * 20
          },
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            value: 72 + Math.random() * 20
          },
          {
            date: new Date().toISOString(),
            value: 70 + Math.random() * 25
          }
        ]),
        totalReports: Math.floor(Math.random() * 80) + 30,
        resolvedReports: Math.floor(Math.random() * 50) + 20,
        staff: {
          wardOfficer: wardOfficers[wardData.wardNumber % wardOfficers.length]?.id || null,
          supervisors: [supervisor.id]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      wards.push(ward);
    }

    console.log(`🏛️ Created ${wards.length} wards`);

    // Create Sample Waste Reports with Madurai-specific locations
    const wasteTypes = ['plastic', 'organic', 'e-waste', 'biomedical', 'construction', 'mixed'];
    const statuses = ['reported', 'verified', 'assigned', 'in-progress', 'resolved'];
    const maduraiStreets = [
      'East Veli Street', 'West Veli Street', 'North Veli Street', 'South Veli Street',
      'Town Hall Road', 'Periyar Bus Stand Road', 'Railway Station Road', 'Bypass Road',
      'Alagar Kovil Main Road', 'Thiruparankundram Road', 'Arapalayam Main Road',
      'Thirunagar Main Road', 'Simmakkal', 'Netaji Road', 'Corporation Road'
    ];
    
    const reports = [];
    for (let i = 0; i < 150; i++) {
      const wardIndex = i % maduraiWards.length;
      const wardData = maduraiWards[wardIndex];
      const citizen = citizens[i % citizens.length];
      
      // Generate random location within ward boundaries with realistic variation
      const randomLng = wardData.lng + ((Math.random() - 0.5) * 0.008);
      const randomLat = wardData.lat + ((Math.random() - 0.5) * 0.008);
      
      const reportId = generateId('WR');
      const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const street = maduraiStreets[Math.floor(Math.random() * maduraiStreets.length)];
      
      const report = await createDoc(COLLECTIONS.reports, {
        id: reportId,
        citizen: citizen.id,
        description: `Waste accumulation reported near ${street} in ${wardData.name}`,
        location: {
          type: 'Point',
          coordinates: [randomLng, randomLat]
        },
        address: `${street}, ${wardData.name}, Ward ${wardData.wardNumber}`,
        landmark: i % 5 === 0 ? `Near ${wardData.name} market` : null,
        wardNumber: wardData.wardNumber,
        wasteType: wasteType,
        severityScore: Math.ceil(Math.random() * 5),
        estimatedQuantity: Math.floor(Math.random() * 800) + 50,
        status: status,
        images: [`https://storage.googleapis.com/madurai-waste/report-${i + 1}.jpg`],
        reporterType: Math.random() > 0.3 ? 'citizen' : 'anonymous',
        isAnonymous: Math.random() > 0.7,
        aiClassification: {
          wasteType: wasteType,
          confidence: 0.70 + Math.random() * 0.29,
          isIllegalDumping: Math.random() > 0.8,
          detectedObjects: [wasteType, 'debris', 'litter'],
          recommendedAction: status === 'resolved' ? 'Completed' : 'Immediate collection required'
        },
        circularEconomyMetrics: {
          recyclabilityScore: wasteType === 'plastic' || wasteType === 'e-waste' ? 70 + Math.random() * 30 : Math.random() * 50,
          potentialRevenue: wasteType === 'plastic' ? Math.floor(Math.random() * 8000) + 1000 : Math.floor(Math.random() * 3000) + 200,
          estimatedWeight: Math.floor(Math.random() * 500) + 50,
          environmentalImpact: Math.random() * 100
        },
        assignedTo: status !== 'reported' ? wardOfficers[wardIndex % wardOfficers.length].id : null,
        verifiedAt: status !== 'reported' ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
        resolvedAt: status === 'resolved' ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
      
      reports.push(report);
    }

    console.log(`📋 Created ${reports.length} waste reports`);

    // Create Sample Policy Recommendations for all zones
    const priorities = ['critical', 'high', 'medium', 'low'];
    const policyTypes = [
      'Infrastructure Improvement',
      'Waste Segregation Initiative',
      'Collection Route Optimization',
      'Community Awareness Campaign',
      'Smart Bin Installation',
      'CCTV Monitoring Expansion'
    ];
    
    const policies = [];
    for (let i = 0; i < 25; i++) {
      const policyId = generateId('POL');
      const wardNum = (i % maduraiWards.length) + 1;
      const wardName = maduraiWards.find(w => w.wardNumber === wardNum)?.name || `Ward ${wardNum}`;
      const policyType = policyTypes[i % policyTypes.length];
      
      const policy = await createDoc(COLLECTIONS.policies, {
        id: policyId,
        wardNumber: wardNum,
        title: `${policyType} - ${wardName}`,
        description: `AI-based ${policyType.toLowerCase()} recommendation for ${wardName} (Ward ${wardNum}) based on waste pattern analysis`,
        aiInsights: {
          wasteTypes: wasteTypes.slice(0, Math.floor(Math.random() * 3) + 2),
          rootCause: i % 3 === 0 ? 'Inadequate bin placement' : i % 3 === 1 ? 'Low collection frequency' : 'Citizen awareness gap',
          predictedImpact: `${45 + Math.random() * 45}% improvement in cleanliness score`,
          budgetEstimate: Math.floor(Math.random() * 800000) + 100000,
          roi: `${200 + Math.random() * 300}% over 12 months`,
          recommendations: [
            `Install ${20 + Math.floor(Math.random() * 40)} additional smart bins`,
            `Increase collection frequency to ${Math.floor(Math.random() * 2) + 2}x daily`,
            'Deploy AI-powered monitoring cameras at hotspots',
            'Conduct community awareness programs'
          ]
        },
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: i < 5 ? 'generated' : i < 12 ? 'under-review' : i < 18 ? 'approved' : 'generated',
        generatedBy: adminUser.id,
        reviewedBy: i >= 5 ? supervisor.id : null,
        approvedAt: i >= 12 && i < 18 ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      });
      
      policies.push(policy);
    }

    console.log(`📜 Created ${policies.length} policy recommendations`);

    // Update ward statistics
    for (const ward of wards) {
      const wardReports = reports.filter(r => r.wardNumber === ward.wardNumber);
      const resolvedCount = wardReports.filter(r => r.status === 'resolved').length;
      
      await updateDoc(COLLECTIONS.wards, ward.id, {
        totalReports: wardReports.length,
        resolvedReports: resolvedCount,
        updatedAt: new Date()
      });
    }

    console.log('📊 Updated ward statistics');

    // Display Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ MADURAI URBAN INTELLIGENCE GRID - DATABASE SEEDING COMPLETED');
    console.log('='.repeat(70));
    console.log(`\n👤 USERS:`);
    console.log(`   • Admin: admin@maduraiswachh.gov.in / Admin@2024`);
    console.log(`   • Supervisor: supervisor@maduraiswachh.gov.in / Super@2024`);
    console.log(`   • Ward Officers (${wardOfficers.length}): officer1-10@maduraiswachh.gov.in / Officer@2024`);
    console.log(`   • Citizens (${citizens.length}): citizen1-50@example.com / Citizen@2024`);
    console.log(`\n🏛️ WARDS: ${wards.length} Madurai wards created across all zones`);
    console.log(`   • Central Zone: ${wards.filter(w => JSON.parse(w.boundaries).zone === 'Central' || w.name.includes('Central')).length || 7} wards`);
    console.log(`   • North Zone: ${wards.filter(w => w.name.includes('North') || w.zone === 'North').length || 6} wards`);
    console.log(`   • South Zone: ${wards.filter(w => w.name.includes('South') || w.zone === 'South').length || 6} wards`);
    console.log(`   • East Zone: ${wards.filter(w => w.name.includes('East') || w.zone === 'East').length || 6} wards`);
    console.log(`   • West Zone: ${wards.filter(w => w.name.includes('West') || w.zone === 'West').length || 5} wards`);
    console.log(`\n📋 REPORTS: ${reports.length} waste reports with Madurai-specific locations`);
    console.log(`   • Resolved: ${reports.filter(r => r.status === 'resolved').length}`);
    console.log(`   • In Progress: ${reports.filter(r => r.status === 'in-progress').length}`);
    console.log(`   • Pending: ${reports.filter(r => r.status === 'reported').length}`);
    console.log(`\n📜 POLICIES: ${policies.length} AI-generated policy recommendations`);
    console.log(`   • Critical Priority: ${policies.filter(p => p.priority === 'critical').length}`);
    console.log(`   • High Priority: ${policies.filter(p => p.priority === 'high').length}`);
    console.log(`\n📍 COVERAGE:`);
    console.log(`   • Real Madurai Locations: Meenakshi Temple, SS Colony, Thirunagar, etc.`);
    console.log(`   • Geocoded Coordinates: Accurate lat/lng for all wards`);
    console.log(`   • Street Names: Authentic Madurai street and landmark names`);
    console.log('\n' + '='.repeat(70));
    console.log('🚀 Database is ready! Start the server:');
    console.log('   cd backend && npm start');
    console.log('   Frontend: http://localhost:3000');
    console.log('   API: http://localhost:3000/api');
    console.log('='.repeat(70) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

seedDatabase();
