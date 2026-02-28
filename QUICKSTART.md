# Quick Start Guide - Madurai Swachh AI Platform

## 🚀 5-Minute Setup

### Prerequisites
- Node.js 18+ installed
- Google Cloud/Firebase account

### Step 1: Firebase Project (2 minutes)

1. Go to https://console.firebase.google.com/
2. Click **"Add Project"** → Name it `madurai-swachh` → Continue
3. Disable Google Analytics (optional) → Create Project
4. Click **"Build"** in left sidebar → **"Firestore Database"** → **"Create database"**
5. Choose **"Start in test mode"** → Select region (e.g., `asia-south1`) → Enable

### Step 2: Service Account Key (1 minute)

1. In Firebase Console, click ⚙️ (Settings) → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"** → Confirm
4. Save downloaded JSON file as `serviceAccountKey.json` in `backend/` folder

### Step 3: Get Gemini API Key (1 minute)

1. Go to https://makersuite.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key

### Step 4: Configure & Run (1 minute)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Edit .env file - update these 2 lines:
# FIREBASE_PROJECT_ID=your-firebase-project-id    (from Firebase Console)
# GEMINI_API_KEY=your_gemini_api_key              (from step 3)

# Seed database with test data
npm run seed

# Start server
npm run dev
```

### Step 5: Test It! (30 seconds)

Open browser to http://localhost:5000/api/health

You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-...",
  "database": "firestore"
}
```

---

## 🎯 What's Working

### Backend (localhost:5000)
- ✅ REST API (40+ endpoints)
- ✅ Firestore database
- ✅ JWT authentication
- ✅ Google Gemini AI integration
- ✅ Socket.IO real-time updates
- ✅ Image upload with Multer
- ✅ Scheduled cron jobs

### Frontend
Open `index.html` in browser or use Live Server:
- ✅ 11 sections (Hero, Real-time Map, AI Console, etc.)
- ✅ Glassmorphism design with animations
- ✅ Particle effects
- ✅ Responsive design

---

## 🧪 Test API Endpoints

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test@123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@maduraiswachh.gov.in",
    "password": "Admin@123"
  }'
```
(Copy the `token` from response)

### Get All Wards
```bash
curl http://localhost:5000/api/wards
```

### Get Waste Reports
```bash
curl http://localhost:5000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Waste Report
```bash
curl -X POST http://localhost:5000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "wardNumber": 1,
      "coordinates": [78.1234, 9.9876],
      "address": "123 Main St",
      "landmark": "Near Park"
    },
    "description": "Large plastic accumulation"
  }'
```

---

## 👥 Test Users (Created by Seed Script)

| Role | Email | Password | Ward |
|------|-------|----------|------|
| Admin | admin@maduraiswachh.gov.in | Admin@123 | All |
| Supervisor | supervisor@maduraiswachh.gov.in | Super@123 | All |
| Ward Officer | officer1@maduraiswachh.gov.in | Officer@123 | 1 |
| Ward Officer | officer2@maduraiswachh.gov.in | Officer@123 | 2 |
| Citizen | citizen1@gmail.com | Citizen@123 | - |

---

## 📁 Project Structure

```
Clean City/
├── index.html              # Frontend main page
├── styles.css             # Glassmorphism styling
├── script.js              # Frontend JavaScript
├── api-integration.js     # API client + Socket.IO
│
└── backend/
    ├── server.js          # Express + Socket.IO server
    ├── package.json       # Dependencies
    ├── .env              # Environment config (YOU MUST UPDATE THIS)
    │
    ├── config/
    │   └── firestore.js   # Firebase Admin initialization
    │
    ├── services/
    │   ├── firestoreService.js  # Database abstraction layer
    │   └── geminiService.js     # AI integration
    │
    ├── routes/            # API endpoints (6 files)
    │   ├── auth.js        # Authentication
    │   ├── reports.js     # Waste reports CRUD
    │   ├── wards.js       # Ward management
    │   ├── dashboard.js   # Dashboard analytics
    │   ├── policy.js      # AI policy recommendations
    │   └── analytics.js   # Advanced analytics
    │
    ├── middleware/
    │   └── auth.js        # JWT verification
    │
    ├── models/            # Firestore schema reference (not used, kept for documentation)
    │
    ├── jobs/
    │   └── scheduledTasks.js  # 6 cron jobs
    │
    ├── scripts/
    │   └── seedDatabase.js    # Database seeding
    │
    ├── uploads/           # Image storage (created automatically)
    │
    └── FIRESTORE_SETUP.md     # Detailed setup guide
```

---

## 🔧 Common Issues & Fixes

### "Could not load the default credentials"
**Fix:** Ensure `serviceAccountKey.json` exists in `backend/` folder

### "GEMINI_API_KEY is not set"
**Fix:** Update `backend/.env` with your Gemini API key from https://makersuite.google.com/app/apikey

### "Port 5000 already in use"
**Fix:** Change `PORT=5000` to `PORT=3001` in `.env` OR stop other process using port 5000

### No data in API responses
**Fix:** Run `npm run seed` in backend folder

### CORS errors in browser
**Fix:** Update `ALLOWED_ORIGINS` in `.env` or use same domain for frontend and backend

---

## 📊 Firestore Collections

After seeding, you'll have:
- **users:** 27 users (admins, officers, citizens)
- **wards:** 5 wards (North, South, East, West, Central)
- **wasteReports:** 50 sample reports
- **policyRecommendations:** 10 AI policy suggestions

View them in Firebase Console → Firestore Database

---

## 🎨 Frontend Features

Open `index.html` to see:
1. **Hero Section** - Animated title with stats
2. **Real-time Waste Map** - Interactive ward visualization
3. **AI Control Console** - Gemini AI predictions
4. **Ward Heatmap** - Color-coded cleanliness
5. **Live Incident Stream** - Recent reports with priority
6. **Circular Economy** - Environmental impact metrics
7. **Officer Leaderboard** - Top performers
8. **Time Series Analytics** - Trend charts
9. **Policy Recommendations** - AI suggestions
10. **Network Graph** - Stakeholder connections
11. **Quantum Insights** - Advanced predictions

---

## 🚢 Deployment

### Local Development
```bash
cd backend
npm run dev
```
Then open `index.html` in browser

### Production (Google Cloud Run)
```bash
# Build
docker build -t gcr.io/PROJECT_ID/madurai-swachh .

# Deploy
gcloud run deploy madurai-swachh \
  --image gcr.io/PROJECT_ID/madurai-swachh \
  --platform managed \
  --region asia-south1 \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id,GEMINI_API_KEY=your-key
```

---

## 📚 Documentation

- **Full Setup:** See `backend/FIRESTORE_SETUP.md`
- **Migration Details:** See `backend/MIGRATION_SUMMARY.md`
- **API Docs:** See route files for endpoint documentation

---

## 🎉 You're Ready!

Your government-grade AI waste management platform is up and running! 

**Next steps:**
1. Explore the API with Postman or curl
2. Open frontend in browser to see the UI
3. Check Firestore Console to view data
4. Customize styling and features as needed

**Need help?** Check the detailed guides:
- `backend/FIRESTORE_SETUP.md` - Comprehensive setup guide
- `backend/MIGRATION_SUMMARY.md` - Technical migration details
