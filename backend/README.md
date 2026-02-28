# MADURAI SWACHH AI GRID - Backend API

## Complete Backend System with MongoDB, Gemini AI, and Real-time Features

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  (Web App, Mobile App, IoT Devices, CCTV Systems)          │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   API GATEWAY (Express)                      │
│  Authentication • Rate Limiting • CORS • Logging            │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Reports  │ │  Wards   │ │  Policy  │ │Analytics │      │
│  │  API     │ │   API    │ │   API    │ │   API    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  AI INTELLIGENCE LAYER                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │         GEMINI AI SERVICE                        │      │
│  │  • Waste Classification                          │      │
│  │  • Overflow Prediction                           │      │
│  │  • Route Optimization                            │      │
│  │  • Circular Economy Advisory                     │      │
│  │  • Policy Recommendations                        │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                   DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   MongoDB    │  │    Redis     │  │  Firebase    │     │
│  │  (Primary)   │  │  (Caching)   │  │(Real-time)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Collections

#### 1. **WasteReport**
Primary collection for waste incident reporting

**Fields:**
- `reportId` - Unique identifier (WR-timestamp-random)
- `location` - GeoJSON Point with coordinates, address, ward
- `classification` - AI-generated waste type, severity, risk level
- `images` - Array of uploaded images with metadata
- `reporter` - User info, type (citizen/officer/cctv/iot)
- `status` - Current status + history tracking
- `assignedTo` - Team/officer/truck assignment
- `verification` - Verification details
- `resolution` - Resolution info with before/after images
- `circularEconomy` - Revenue potential, recycling data
- `aiAnalysis` - Gemini response and processing metadata
- `priority` - Auto-calculated priority level
- `overflowPrediction` - AI prediction data

**Indexes:**
- 2dsphere on location.coordinates (geospatial queries)
- reportedAt (time-series queries)
- wardNumber (ward-specific queries)
- status.current (filtering)
- classification.wasteType (analytics)

#### 2. **User**
User management and authentication

**Fields:**
- `userId` - Unique identifier
- `name`, `email`, `phone`, `password` (bcrypt hashed)
- `role` - citizen/ward-officer/supervisor/admin/enforcement
- `permissions` - Array of permission strings
- `assignedWards` - For officers/supervisors
- `citizenMetrics` - Reports submitted, verified, participation score, badges
- `officerMetrics` - Tasks completed, efficiency, ratings
- `notifications` - Preference settings
- `fcmTokens` - Push notification tokens

**Methods:**
- `matchPassword()` - Compare entered password
- `updateParticipationScore()` - Calculate citizen engagement
- `updateOfficerEfficiency()` - Calculate officer performance

#### 3. **Ward**
Ward-level statistics and management

**Fields:**
- `wardNumber` - 1-100
- `name`, `zone` (north/south/east/west/central)
- `boundaries` - GeoJSON Polygon
- `demographics` - Population, households, area
- `cleanlinessIndex` - Current score + history
- `activeReports` - Summary by status and severity
- `overflowRisk` - AI prediction with hotspots
- `infrastructure` - Bins, CCTV cameras, vehicles
- `staff` - Assigned officers and supervisors
- `performance` - Response time, resolution rate, satisfaction
- `circularMetrics` - Waste segregated, recycling rate, revenue
- `budget` - Allocated, spent, efficiency

**Methods:**
- `calculateCleanlinessIndex()` - Complex scoring algorithm

#### 4. **PolicyRecommendation**
AI-generated governance recommendations

**Fields:**
- `recommendationId` - Unique identifier
- `wardNumber`, `location`
- `context` - Incident analysis data
- `recommendations` - Root cause, infrastructure, enforcement, awareness
- `aiMetadata` - Gemini response and confidence
- `status` - generated/under-review/approved/rejected/implemented
- `review` - Review decision and feedback
- `implementation` - Progress tracking, budget, milestones
- `impact` - Measured outcomes

**Methods:**
- `calculatePriority()` - Auto-prioritize based on severity and impact

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login user | Public |
| GET | `/me` | Get current user | Protected |
| PUT | `/profile` | Update profile | Protected |
| PUT | `/password` | Change password | Protected |
| POST | `/fcm-token` | Save FCM token | Protected |

### Reports (`/api/reports`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/` | Create new report (with image upload) | Public/Protected |
| GET | `/` | Get all reports (filterable) | Protected |
| GET | `/:id` | Get single report | Protected |
| PATCH | `/:id/status` | Update report status | Officers+ |
| PATCH | `/:id/assign` | Assign to officer/team | Supervisors+ |
| PATCH | `/:id/resolve` | Mark as resolved | Officers+ |
| GET | `/nearby/:lat/:lng` | Get nearby reports | Public |

### Wards (`/api/wards`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all wards | Public |
| GET | `/:wardNumber` | Get ward details | Public |
| GET | `/:wardNumber/reports` | Get ward reports | Protected |
| GET | `/:wardNumber/heatmap` | Get heatmap data | Public |
| POST | `/:wardNumber/predict-overflow` | AI overflow prediction | Officers+ |
| PATCH | `/:wardNumber/cleanliness-index` | Recalculate index | Officers+ |
| GET | `/leaderboard/clean` | Clean ward leaderboard | Public |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/overview` | Dashboard overview stats | Protected |
| GET | `/trends` | Trend data for charts | Protected |
| GET | `/performance` | Officer/ward performance | Supervisors+ |
| GET | `/circular-economy` | Circular economy metrics | Protected |
| GET | `/alerts` | Active alerts | Protected |

### Policy (`/api/policy`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/generate` | Generate AI recommendation | Officers+ |
| GET | `/` | Get all policies | Protected |
| GET | `/:id` | Get single policy | Protected |
| PATCH | `/:id/review` | Review policy | Supervisors+ |
| PATCH | `/:id/implement` | Mark for implementation | Admin |
| PATCH | `/:id/progress` | Update progress | Officers+ |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/summary` | Comprehensive summary | Protected |
| GET | `/ward-comparison` | Compare wards | Supervisors+ |
| GET | `/citizen-engagement` | Engagement metrics | Supervisors+ |
| GET | `/prediction-accuracy` | AI accuracy evaluation | Admin |

---

## 🤖 Gemini AI Integration

### 5 Core AI Functions

#### 1. **Waste Classification**
- **Input:** Image buffer + location context
- **Output:** Waste type, severity (1-5), volume, risk level, illegal dumping detection, hazard level, confidence
- **Use Case:** Automatic classification on report submission

#### 2. **Overflow Prediction**
- **Input:** Ward data (reports, trends, capacity)
- **Output:** Overflow probability %, estimated time, urgency level, immediate actions, preventive strategy
- **Use Case:** Proactive resource allocation

#### 3. **Route Optimization**
- **Input:** Array of hotspots with coordinates and severity
- **Output:** Optimal route order, truck allocation, fuel/time savings, workforce distribution
- **Use Case:** Daily cleaning route planning

#### 4. **Circular Economy Advisory**
- **Input:** Waste type, quantity, location
- **Output:** Recycling method, local processor recommendations, revenue potential, environmental impact, employment opportunities, feasibility score
- **Use Case:** Convert waste to economic opportunity

#### 5. **Policy Recommendation Engine**
- **Input:** Incident patterns, location, timeframe
- **Output:** Root cause analysis, infrastructure needs, enforcement strategy, awareness campaigns, budget priority, expected impact
- **Use Case:** Data-driven governance decisions

---

## 🔐 Security Features

- **JWT Authentication** - Token-based auth with 7-day expiry
- **Password Hashing** - bcrypt with salt rounds
- **Role-Based Access Control (RBAC)** - 5 roles with granular permissions
- **Input Validation** - Joi schema validation
- **Rate Limiting** - Prevent API abuse
- **CORS** - Configurable allowed origins
- **SQL Injection Protection** - Mongoose ORM prevents injection
- **XSS Protection** - Input sanitization

---

## ⚡ Real-time Features (Socket.IO)

- **Ward Subscription** - Clients join ward-specific rooms
- **Live Report Updates** - Instant notification on new reports
- **Status Changes** - Real-time status update broadcasts
- **Dashboard Metrics** - Live metric updates
- **Alert Notifications** - Critical incident alerts

---

## ⏰ Scheduled Tasks (Cron Jobs)

| Schedule | Task | Description |
|----------|------|-------------|
| Daily 2 AM | Cleanliness Index Update | Recalculate all wards |
| Every 6h | Overflow Prediction | Predict high-risk wards |
| Daily 12 AM | Citizen Scores | Update participation scores |
| Daily 1 AM | Officer Efficiency | Calculate efficiency ratings |
| Daily 3 AM | Stale Reports | Auto-close 30+ day old reports |
| Daily 8 AM | Daily Summary | Generate summary reports |

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:
```env
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLOUD_API_KEY=your_gemini_api_key
JWT_SECRET=your_secret_key
```

### 3. Start Server
```bash
# Development
npm run dev

# Production
npm start
```

### 4. Health Check
```
GET http://localhost:5000/health
```

---

## 📈 Performance Optimizations

- **Database Indexing** - Geospatial, time-series, and field indexes
- **Query Optimization** - Aggregation pipelines for analytics
- **Caching Strategy** - Redis for frequently accessed data
- **Image Optimization** - Sharp for image processing
- **Pagination** - Default 20 items per page
- **Lazy Loading** - Load images on demand
- **Connection Pooling** - MongoDB connection pool

---

## 🧪 Testing

```bash
npm test
```

Test coverage includes:
- Authentication flows
- Report CRUD operations
- AI service integration
- Ward calculations
- Analytics aggregations

---

## 📊 Deployment Checklist

✅ MongoDB Atlas cluster configured
✅ Google Cloud API keys activated
✅ Environment variables set
✅ Firebase Admin SDK initialized
✅ AWS S3 bucket for image storage
✅ Redis cache configured
✅ SSL certificates installed
✅ CORS origins whitelisted
✅ Rate limiting configured
✅ Logging and monitoring setup
✅ Backup strategy implemented

---

## 🔗 Integration Points

### External Services
- **Google Cloud Vision API** - Image analysis
- **Gemini AI** - Natural language processing
- **Firebase** - Real-time database and push notifications
- **AWS S3** - Image storage
- **Google Maps API** - Geocoding and routing
- **SMTP** - Email notifications

### IoT Integration
- Smart bin sensors → POST `/api/reports`
- CCTV systems → POST `/api/reports` (reporterType: 'cctv')
- Waste collection trucks → GPS tracking integration

---

## 📱 Mobile App Integration

The API is fully compatible with:
- React Native
- Flutter
- Native Android/iOS

**Required Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 🎯 Key Metrics Tracked

- **Response Time** - Average time to resolve reports
- **Cleanliness Index** - Ward-level cleanliness score (0-100)
- **Citizen Participation** - Active citizens, reports submitted
- **Officer Efficiency** - Task completion rate
- **Circular Economy** - Revenue generated, CO2 reduced
- **Overflow Risk** - Predictive risk assessment
- **Resolution Rate** - Percentage of resolved reports

---

## 🛠 Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Cache:** Redis
- **Real-time:** Socket.IO
- **AI:** Google Gemini AI
- **Auth:** JWT + bcrypt
- **File Upload:** Multer
- **Validation:** Joi
- **Scheduling:** node-cron
- **Image Processing:** Sharp

---

## 📞 Support & Documentation

For integration support:
- API Documentation: `/api/docs` (Swagger)
- Postman Collection: Available
- Technical Support: tech@maduraiswachh.gov.in

---

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Last Updated:** February 2026

**Powered by:** Gemini AI + Google Cloud Infrastructure
