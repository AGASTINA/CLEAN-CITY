const bcrypt = require('bcryptjs');
const { getById, getAll, createDoc, updateDoc, deleteDoc, COLLECTIONS, toDate } = require('../services/firestoreService');
const admin = require('../config/firestore');

require("dotenv").config();

const maduraiWards = [
  {
    wardNumber: 1,
    name: "SS Colony",
    area: 2.4,
    population: 12500,
    boundaries: {
      type: "Polygon",
      coordinates: [[
        [78.1198, 9.9252],
        [78.1298, 9.9252],
        [78.1298, 9.9352],
        [78.1198, 9.9352],
        [78.1198, 9.9252]
      ]]
    }
  },
  {
    wardNumber: 2,
    name: "Anna Main Road",
    area: 3.1,
    population: 15800,
    boundaries: {
      type: "Polygon",
      coordinates: [[
        [78.1298, 9.9252],
        [78.1398, 9.9252],
        [78.1398, 9.9352],
        [78.1298, 9.9352],
        [78.1298, 9.9252]
      ]]
    }
  },
  {
    wardNumber: 3,
    name: "Meenakshi Amman Temple Area",
    area: 1.8,
    population: 22000,
    boundaries: {
      type: "Polygon",
      coordinates: [[
        [78.1169, 9.9195],
        [78.1269, 9.9195],
        [78.1269, 9.9295],
        [78.1169, 9.9295],
        [78.1169, 9.9195]
      ]]
    }
  },
  {
    wardNumber: 4,
    name: "Goripalayam",
    area: 2.9,
    population: 18200,
    boundaries: {
      type: "Polygon",
      coordinates: [[
        [78.1069, 9.9195],
        [78.1169, 9.9195],
        [78.1169, 9.9295],
        [78.1069, 9.9295],
        [78.1069, 9.9195]
      ]]
    }
  },
  {
    wardNumber: 5,
    name: "Alagar Kovil Road",
    area: 4.2,
    population: 14500,
    boundaries: {
      type: "Polygon",
      coordinates: [[
        [78.0969, 9.9195],
        [78.1069, 9.9195],
        [78.1069, 9.9295],
        [78.0969, 9.9295],
        [78.0969, 9.9195]
      ]]
    }
  }
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

    // Create Ward Officers
    const wardOfficers = [];
    const hashedOfficerPassword = await bcrypt.hash('Officer@2024', 10);
    
    for (let i = 0; i < 5; i++) {
      const officerId = generateId('USR');
      const officer = await createDoc(COLLECTIONS.users, {
        id: officerId,
        name: `Ward Officer ${i + 1}`,
        email: `officer${i + 1}@maduraiswachh.gov.in`,
        password: hashedOfficerPassword,
        phoneNumber: `+9198765432${12 + i}`,
        role: 'ward-officer',
        wardNumber: i + 1,
        officerMetrics: {
          assignedReports: 0,
          resolvedReports: 0,
          averageResolutionTime: 0,
          efficiencyRating: 4.5
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
    
    for (let i = 0; i < 20; i++) {
      const citizenId = generateId('USR');
      const citizen = await createDoc(COLLECTIONS.users, {
        id: citizenId,
        name: `Citizen ${i + 1}`,
        email: `citizen${i + 1}@example.com`,
        password: hashedCitizenPassword,
        phoneNumber: `+9198765${40000 + i}`,
        role: 'citizen',
        wardNumber: (i % 5) + 1,
        participationScore: Math.floor(Math.random() * 50) + 30,
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
      
      // Convert boundaries to JSON string for Firestore compatibility
      const boundariesJSON = JSON.stringify(wardData.boundaries);
      
      const ward = await createDoc(COLLECTIONS.wards, {
        id: wardId,
        wardNumber: wardData.wardNumber,
        name: wardData.name,
        area: wardData.area,
        population: wardData.population,
        boundaries: boundariesJSON,  // Store as JSON string
        cleanlinessIndex: 75 + Math.random() * 20,
        cleanlinessHistory: JSON.stringify([  // Store as JSON string
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            value: 70 + Math.random() * 20
          },
          {
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            value: 68 + Math.random() * 20
          }
        ]),
        totalReports: Math.floor(Math.random() * 50) + 20,
        resolvedReports: Math.floor(Math.random() * 30) + 10,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      wards.push(ward);
    }

    console.log(`🏛️ Created ${wards.length} wards`);

    // Create Sample Waste Reports
    const wasteTypes = ['plastic', 'organic', 'e-waste', 'biomedical', 'construction', 'mixed'];
    const statuses = ['reported', 'verified', 'assigned', 'in-progress', 'resolved'];
    
    const reports = [];
    for (let i = 0; i < 50; i++) {
      const wardIndex = i % 5;
      const ward = wards[wardIndex];
      const citizen = citizens[i % citizens.length];
      
      // Generate random location within ward boundaries
      const wardBoundaries = JSON.parse(ward.boundaries);
      const baseCoords = wardBoundaries.coordinates[0][0];
      const randomLng = baseCoords[0] + (Math.random() * 0.008);
      const randomLat = baseCoords[1] + (Math.random() * 0.008);
      
      const reportId = generateId('WR');
      const report = await createDoc(COLLECTIONS.reports, {
        id: reportId,
        citizen: citizen.id,
        description: `Waste accumulation at location ${i + 1}`,
        location: {
          type: 'Point',
          coordinates: [randomLng, randomLat]
        },
        address: `Street ${i + 1}, Ward ${ward.wardNumber}`,
        wardNumber: ward.wardNumber,
        wasteType: wasteTypes[Math.floor(Math.random() * wasteTypes.length)],
        severityScore: Math.ceil(Math.random() * 5),
        estimatedQuantity: Math.floor(Math.random() * 500) + 50,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        images: [`https://storage.googleapis.com/madurai-waste/report-${i + 1}.jpg`],
        aiClassification: {
          wasteType: wasteTypes[Math.floor(Math.random() * wasteTypes.length)],
          confidence: 0.75 + Math.random() * 0.24,
          isIllegalDumping: Math.random() > 0.7,
          recommendedAction: 'Immediate collection required'
        },
        circularEconomyMetrics: {
          recyclabilityScore: Math.random() * 100,
          potentialRevenue: Math.floor(Math.random() * 5000) + 500,
          environmentalImpact: Math.random() * 100
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      reports.push(report);
    }

    console.log(`📋 Created ${reports.length} waste reports`);

    // Create Sample Policy Recommendations
    const priorities = ['critical', 'high', 'medium', 'low'];
    
    const policies = [];
    for (let i = 0; i < 10; i++) {
      const policyId = generateId('POL');
      const policy = await createDoc(COLLECTIONS.policies, {
        id: policyId,
        wardNumber: (i % 5) + 1,
        title: `Infrastructure Improvement Plan ${i + 1}`,
        description: `Detailed policy recommendation for ward ${(i % 5) + 1} based on AI analysis`,
        aiInsights: {
          wasteTypes: wasteTypes.slice(0, 3),
          rootCause: 'Inadequate bin placement and collection frequency',
          predictedImpact: `${50 + Math.random() * 40}% improvement in cleanliness`,
          budgetEstimate: Math.floor(Math.random() * 500000) + 100000,
          recommendations: [
            'Install 50 additional smart bins',
            'Increase collection frequency to twice daily',
            'Deploy AI-powered monitoring cameras'
          ]
        },
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: i < 3 ? 'generated' : i < 6 ? 'under-review' : 'approved',
        generatedBy: adminUser.id,
        reviewedBy: i >= 3 ? supervisor.id : null,
        createdAt: new Date(),
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
    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SEEDING COMPLETED');
    console.log('='.repeat(60));
    console.log(`\n👤 USERS:`);
    console.log(`   • Admin: admin@maduraiswachh.gov.in / Admin@2024`);
    console.log(`   • Supervisor: supervisor@maduraiswachh.gov.in / Super@2024`);
    console.log(`   • Ward Officers: officer1-5@maduraiswachh.gov.in / Officer@2024`);
    console.log(`   • Citizens: citizen1-20@example.com / Citizen@2024`);
    console.log(`\n🏛️ WARDS: ${wards.length} wards created`);
    console.log(`📋 REPORTS: ${reports.length} waste reports`);
    console.log(`📜 POLICIES: ${policies.length} policy recommendations`);
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Ready to start the server!');
    console.log('   Run: cd backend && npm start');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

seedDatabase();
