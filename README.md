# 🌟 Madurai Swachh AI Grid - Predictive Waste Governance Platform

> **Government-grade intelligent waste management system powered by Google Gemini AI and Firestore**

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![Database](https://img.shields.io/badge/database-Firestore-orange)
![AI](https://img.shields.io/badge/AI-Gemini%201.5%20Pro-blue)
![License](https://img.shields.io/badge/license-ISC-lightgrey)

---

## 📖 Overview

A comprehensive **circular intelligence platform** that transforms municipal waste management through:
- 🤖 **Google Gemini AI** - Predictive overflow detection, waste classification, policy recommendations
- 🗺️ **Real-time Geospatial** - Live waste heatmaps and route optimization
- 📊 **Advanced Analytics** - Trend analysis, citizen engagement metrics, officer performance
- 🔄 **Circular Economy** - Material recovery tracking, CO₂ reduction calculations
- 💬 **Real-time Updates** - Socket.IO for live incident streaming
- 🎨 **Glassmorphism UI** - Modern, futuristic design with particle effects

---

## ✨ Key Features

### For Citizens
- 📸 Report waste incidents with photo upload
- 📍 Geolocation-based ward detection
- 📈 Track participation score
- 🏆 View leaderboard rankings

### For Ward Officers
- 📋 Assign tasks to cleanup teams
- 🚛 Track truck and resource allocation
- ⏱️ Monitor response times
- 📊 Ward-specific analytics

### For Supervisors & Admins
- 🌡️ Overflow risk predictions
- 🗺️ Multi-ward heatmaps
- 📑 AI-generated policy recommendations
- 📈 City-wide trend analysis
- 🎯 Performance benchmarking

### AI Capabilities (Gemini 1.5 Pro)
1. **Waste Classification** - Auto-categorize waste type and severity
2. **Overflow Prediction** - Forecast bin overflow with 48-hour horizon
3. **Route Optimization** - Suggest efficient cleanup sequences
4. **Circular Economy Analysis** - Calculate recycling potential
5. **Policy Recommendations** - Generate data-driven governance strategies

---

## 🚀 Quick Start

### Option 1: Lightning Setup (5 minutes)
See **[QUICKSTART.md](QUICKSTART.md)** for fastest setup path

### Option 2: Comprehensive Setup
See **[backend/FIRESTORE_SETUP.md](backend/FIRESTORE_SETUP.md)** for detailed guide

### Minimum Requirements
```bash
# 1. Create Firebase project at https://console.firebase.google.com/
# 2. Download service account key → save as backend/serviceAccountKey.json
# 3. Get Gemini API key from https://makersuite.google.com/app/apikey
# 4. Update backend/.env with your credentials
# 5. Run:
cd backend
npm install
npm run seed
npm run dev
```

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- HTML5, CSS3 (Glassmorphism), Vanilla JavaScript
- Canvas API (particle effects)
- Intersection Observer (scroll animations)
- Socket.IO Client (real-time updates)

**Backend:**
- Node.js 18+ with Express.js
- Google Cloud Firestore (NoSQL database)
- Firebase Admin SDK
- Socket.IO (WebSocket server)
- JWT authentication
- Multer + Sharp (image processing)
- Node-cron (scheduled tasks)

**AI Services:**
- Google Gemini 1.5 Pro (generative AI)
- Custom prompt engineering (5 specialized functions)

**Infrastructure:**
- Docker support (multi-container setup)
- Nginx reverse proxy
- Google Cloud Run ready

---

## 📊 Database Schema

### Firestore Collections
```
├── users (27 seeded)
│   └── USR-{timestamp}-{random}
│       ├── role: citizen | ward-officer | supervisor | admin
│       ├── participationScore, reportsSubmitted
│       └── assignedWards
│
├── wards (5 zones)
│   └── WRD-{wardNumber}
│       ├── cleanlinessIndex (AI-calculated)
│       ├── activeReports breakdown
│       ├── overflowRisk predictions
│       └── staff assignments
│
├── wasteReports (50 seeded)
│   └── WR-{timestamp}-{random}
│       ├── location (geospatial)
│       ├── classification (AI-analyzed)
│       ├── status workflow
│       ├── assignedTo team
│       └── circularEconomy metrics
│
└── policyRecommendations (10 seeded)
    └── POL-{timestamp}-{random}
        ├── incidentData analysis
        ├── AI recommendations
        ├── implementation tracking
        └── metrics (before/after)
```

---

## 🔗 API Endpoints

### Authentication (`/api/auth`)
```
POST   /register      - Create new user account
POST   /login         - Authenticate user
GET    /profile       - Get current user profile
PATCH  /profile       - Update user details
PATCH  /password      - Change password
```

### Waste Reports (`/api/reports`)
```
GET    /                    - List all reports (filtered)
POST   /                    - Create new report (with image)
GET    /:id                 - Get single report details
PATCH  /:id                 - Update report status
DELETE /:id                 - Delete report
POST   /:id/classify        - AI waste classification
PATCH  /:id/assign          - Assign to officer/team
PATCH  /:id/resolve         - Mark as resolved
POST   /:id/feedback        - Citizen feedback
GET    /nearby              - Geospatial query (within radius)
GET    /high-priority       - Urgent reports
```

### Wards (`/api/wards`)
```
GET    /                              - List all wards
GET    /:wardNumber                   - Ward details
GET    /:wardNumber/reports           - Reports in ward
GET    /:wardNumber/heatmap           - Hotspot data
POST   /:wardNumber/predict-overflow  - AI overflow prediction
PATCH  /:wardNumber/cleanliness-index - Recalculate score
GET    /leaderboard/clean             - Top clean wards
```

### Dashboard (`/api/dashboard`)
```
GET    /overview            - Key metrics summary
GET    /trends              - 30-day trend analysis
GET    /performance         - Officer & ward performance
GET    /circular-economy    - Environmental impact
GET    /alerts              - Active warnings
```

### Policy (`/api/policy`)
```
POST   /generate            - AI policy generation
GET    /                    - List policies
GET    /:id                 - Policy details
PATCH  /:id/review          - Supervisor review
PATCH  /:id/implement       - Start implementation
PATCH  /:id/progress        - Update progress
```

### Analytics (`/api/analytics`)
```
GET    /summary             - Comprehensive statistics
GET    /ward-comparison     - Multi-ward benchmarking
GET    /citizen-engagement  - Participation metrics
GET    /prediction-accuracy - AI model performance
```

---

## 🤖 AI Integration

### Gemini AI Functions

**1. Waste Classification**
```javascript
await geminiService.classifyWaste(imageUrl, description)
// → { wasteType, severityScore, confidence, aiAnalysis }
```

**2. Overflow Prediction**
```javascript
await geminiService.predictOverflow(wardData)
// → { overflowProbability, estimatedTimeToOverflow, urgencyLevel }
```

**3. Route Optimization**
```javascript
await geminiService.optimizeRoute(reports)
// → { optimizedSequence, estimatedTime, reasons }
```

**4. Circular Economy Analysis**
```javascript
await geminiService.analyzeCircularEconomy(reportData)
// → { recycledWeight, materialValue, co2Reduction }
```

**5. Policy Recommendations**
```javascript
await geminiService.generatePolicyRecommendation(incidentData)
// → { title, recommendations[], estimatedImpact }
```

---

## ⏱️ Scheduled Jobs

6 automated cron jobs run in background:

| Job | Schedule | Purpose |
|-----|----------|---------|
| Cleanliness Index | 2 AM daily | Recalculate ward scores |
| Overflow Prediction | Every 6 hours | Update risk levels |
| Citizen Scores | Midnight | Update participation metrics |
| Officer Efficiency | 1 AM | Calculate performance ratings |
| Auto-resolve Stale | 3 AM | Close 15-day-old pending reports |
| Daily Summary | 8 AM | Generate email digest |

---

## 🎨 Frontend Design

### Visual Features
- **Glassmorphism** - Frosted glass effect with backdrop blur
- **Particle System** - Animated background with 100 floating particles
- **Scroll Animations** - Intersection Observer for fade-in effects
- **Gradient Mesh** - Dynamic SVG backgrounds
- **Responsive Design** - Mobile-first approach

### 11 Interactive Sections
1. Hero with live statistics
2. Real-time waste map (Canvas)
3. AI Control Console
4. Ward Heatmap
5. Live Incident Stream
6. Circular Economy Metrics
7. Officer Leaderboard
8. Time Series Charts
9. Policy Recommendations
10. Network Graph
11. Quantum Insights Panel

---

## 📁 Project Structure

```
Clean City/
├── index.html                    # Main frontend page
├── styles.css                   # Glassmorphism + animations
├── script.js                    # UI interactions
├── api-integration.js           # API client + Socket.IO
├── QUICKSTART.md                # 5-minute setup guide
├── README.md                    # This file
│
└── backend/
    ├── server.js                # Express + Socket.IO server
    ├── package.json             # Dependencies
    ├── .env                     # Environment config (UPDATE THIS!)
    ├── .env.example             # Template
    ├── Dockerfile               # Container image
    ├── docker-compose.yml       # Multi-service orchestration
    ├── nginx.conf               # Reverse proxy config
    ├── FIRESTORE_SETUP.md       # Detailed setup guide
    ├── MIGRATION_SUMMARY.md     # MongoDB → Firestore details
    │
    ├── config/
    │   └── firestore.js         # Firebase Admin initialization
    │
    ├── services/
    │   ├── firestoreService.js  # Database abstraction layer
    │   └── geminiService.js     # Gemini AI integration
    │
    ├── routes/                  # 6 API route files
    │   ├── auth.js              # Authentication endpoints
    │   ├── reports.js           # Waste report CRUD + AI
    │   ├── wards.js             # Ward management
    │   ├── dashboard.js         # Dashboard analytics
    │   ├── policy.js            # Policy generation
    │   └── analytics.js         # Advanced analytics
    │
    ├── middleware/
    │   └── auth.js              # JWT verification + RBAC
    │
    ├── models/                  # Schema reference (not used, documentation)
    │   ├── User.js
    │   ├── Ward.js
    │   ├── WasteReport.js
    │   └── PolicyRecommendation.js
    │
    ├── jobs/
    │   └── scheduledTasks.js    # 6 cron jobs
    │
    ├── scripts/
    │   └── seedDatabase.js      # Database seeding with test data
    │
    └── uploads/                 # Image storage (auto-created)
```

---

## 🧪 Testing

### Test Users (Seeded)
| Email | Password | Role |
|-------|----------|------|
| admin@maduraiswachh.gov.in | Admin@123 | Admin |
| supervisor@maduraiswachh.gov.in | Super@123 | Supervisor |
| officer1@maduraiswachh.gov.in | Officer@123 | Ward Officer (Ward 1) |
| citizen1@gmail.com | Citizen@123 | Citizen |

### Sample Data
- **Users:** 1 admin, 1 supervisor, 5 ward officers, 20 citizens
- **Wards:** 5 (North, South, East, West, Central)
- **Reports:** 50 waste reports (various statuses)
- **Policies:** 10 AI-generated recommendations

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@maduraiswachh.gov.in","password":"Admin@123"}'

# Get all wards
curl http://localhost:5000/api/wards
```

---

## 🚢 Deployment

### Local Development
```bash
cd backend
npm run dev
# Server: http://localhost:5000
# Frontend: Open index.html in browser
```

### Docker (Production)
```bash
docker-compose up -d
# Creates 3 services: backend, nginx, (redis optional)
```

### Google Cloud Run
```bash
gcloud run deploy madurai-swachh \
  --source . \
  --platform managed \
  --region asia-south1 \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id,GEMINI_API_KEY=your-key
```

---

## 🔐 Security

- **Authentication:** JWT tokens (7-day expiry)
- **Authorization:** Role-based access control (RBAC)
- **Password:** bcrypt hashing (10 rounds)
- **Input Validation:** Joi schemas
- **Rate Limiting:** 100 requests per 15-min window
- **CORS:** Configurable allowed origins
- **Firestore Rules:** Production security ready (see FIRESTORE_SETUP.md)

---

## 📈 Performance

### Firestore Advantages
- Serverless auto-scaling
- Global CDN distribution
- Real-time sync capabilities
- Generous free tier (50K reads/day)

### Optimization Tips
1. Create composite indexes for complex queries
2. Use pagination (startAfter cursors)
3. Implement Redis cache for hot data
4. Batch writes for bulk operations
5. Use Cloud Functions for heavy computations

---

## 🐛 Troubleshooting

### Common Issues

**"Could not load default credentials"**
- Download service account key from Firebase Console
- Save as `backend/serviceAccountKey.json`
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path in `.env`

**"Gemini API key not set"**
- Get key from https://makersuite.google.com/app/apikey
- Update `GEMINI_API_KEY` in `.env`

**"Port 5000 already in use"**
- Change `PORT=5000` to another port in `.env`
- Or kill process: `npx kill-port 5000`

**No data in responses**
- Run `npm run seed` to populate database
- Check Firestore Console for data

---

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute setup |
| [backend/FIRESTORE_SETUP.md](backend/FIRESTORE_SETUP.md) | Comprehensive Firestore guide |
| [backend/MIGRATION_SUMMARY.md](backend/MIGRATION_SUMMARY.md) | Technical migration details |
| Route files (backend/routes/*.js) | API endpoint documentation |

---

## 🤝 Contributing

This is a government project template. To customize:
1. Update branding in `index.html` and `styles.css`
2. Modify ward data in `backend/scripts/seedDatabase.js`
3. Adjust AI prompts in `backend/services/geminiService.js`
4. Customize analytics in dashboard routes

---

## 📄 License

ISC License - Madurai Municipal Corporation

---

## 🙏 Acknowledgments

- **Google Gemini AI** - Predictive intelligence
- **Firebase/Firestore** - Scalable database
- **Socket.IO** - Real-time communication
- **Express.js** - Web framework
- **Sharp** - Image processing

---

## 📞 Support

For technical issues:
1. Check troubleshooting section above
2. Review setup guides in documentation
3. Verify environment variables in `.env`
4. Check Firestore Console for data integrity
5. Review server logs for error messages

---

**Built with ❤️ for sustainable waste management and circular economy**

🌍 Making cities cleaner through AI-powered governance
