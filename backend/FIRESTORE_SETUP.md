# Firestore Setup Guide

## Overview
The backend has been migrated from MongoDB to Google Cloud Firestore. This guide will help you set up and run the application.

## Prerequisites
- Node.js 18+ (LTS recommended)
- Google Cloud Project with Firestore enabled
- Firebase project (can be same as GCP project)

## Step 1: Create Firebase/Firestore Project

### Option A: Using Firebase Console (Recommended for beginners)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `madurai-swachh-firebase`
4. Follow setup wizard
5. Go to "Build" > "Firestore Database"
6. Click "Create database"
7. Choose "Start in test mode" (or production mode for security)
8. Select region (closest to you, e.g., `asia-south1`)

### Option B: Using Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: `madurai-swachh-firebase`
3. Enable Firestore API
4. Navigate to Firestore in the console and initialize in Native mode

## Step 2: Generate Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download the JSON file
5. Save it as `serviceAccountKey.json` in the `backend/` folder
6. **IMPORTANT:** Add `serviceAccountKey.json` to `.gitignore` (already configured)

## Step 3: Configure Environment Variables

The `.env` file has been created with the following required variables:

```bash
# Required
FIREBASE_PROJECT_ID=madurai-swachh-firebase  # Change to your project ID
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
GEMINI_API_KEY=your_gemini_api_key_here  # Get from Google AI Studio

# Optional but recommended
JWT_SECRET=madurai_swachh_ai_grid_secret_key_2026_governance_platform
```

**Update these values:**
1. `FIREBASE_PROJECT_ID` - Your Firebase project ID (from Project Settings)
2. `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

All required packages including `firebase-admin` are already in package.json.

## Step 5: Seed Database (Optional but Recommended)

Populate Firestore with initial test data:

```bash
npm run seed
```

This creates:
- 5 wards (North, South, East, West, Central)
- 27 users (admins, supervisors, ward officers, citizens)
- 50 sample waste reports
- 10 AI policy recommendations

## Step 6: Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Step 7: Test API Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "firestore"
}
```

### Get All Wards
```bash
curl http://localhost:5000/api/wards
```

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Citizen",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test@123"
  }'
```

## Collections in Firestore

The application uses 4 main collections:

| Collection | Document ID Format | Purpose |
|------------|-------------------|---------|
| `users` | `USR-{timestamp}-{random}` | User accounts |
| `wards` | `WRD-{wardNumber}` | Ward boundaries & stats |
| `wasteReports` | `WR-{timestamp}-{random}` | Citizen waste reports |
| `policyRecommendations` | `POL-{timestamp}-{random}` | AI policy suggestions |

## Security Rules (Production)

For production deployment, update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Waste reports
    match /wasteReports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'supervisor', 'ward-officer']);
    }
    
    // Wards (read-only for non-admins)
    match /wards/{wardId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'supervisor'];
    }
    
    // Policies (admin/supervisor only)
    match /policyRecommendations/{policyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'supervisor', 'ward-officer'];
    }
  }
}
```

## Deployment to Google Cloud

### Cloud Run (Recommended)
1. Build Docker image:
```bash
docker build -t gcr.io/PROJECT_ID/madurai-swachh-backend .
```

2. Push to Container Registry:
```bash
docker push gcr.io/PROJECT_ID/madurai-swachh-backend
```

3. Deploy to Cloud Run:
```bash
gcloud run deploy madurai-swachh-backend \
  --image gcr.io/PROJECT_ID/madurai-swachh-backend \
  --platform managed \
  --region asia-south1 \
  --set-env-vars FIREBASE_PROJECT_ID=madurai-swachh-firebase \
  --set-env-vars GEMINI_API_KEY=your_gemini_api_key
```

**Note:** When deploying to Google Cloud, you don't need `GOOGLE_APPLICATION_CREDENTIALS` - it uses Application Default Credentials automatically.

## Troubleshooting

### Error: "Could not load the default credentials"
- Ensure `serviceAccountKey.json` exists in backend folder
- Check that `GOOGLE_APPLICATION_CREDENTIALS` path is correct in `.env`
- Verify the service account has "Firebase Admin SDK Administrator Service Agent" role

### Error: "Firestore project not found"
- Verify `FIREBASE_PROJECT_ID` matches your Firebase project ID exactly
- Ensure Firestore is initialized in the Firebase Console

### Error: "Permission denied"
- Check Firestore security rules
- Ensure service account has necessary IAM roles
- For local development, use test mode rules

### Server starts but no data
- Run `npm run seed` to populate initial data
- Check console logs for database connection status
- Verify all collections exist in Firestore console

## Migration from MongoDB

If you have existing MongoDB data:
1. Export data from MongoDB using `mongoexport`
2. Transform schema (remove `_id`, replace with custom IDs)
3. Import to Firestore using batch writes or the seed script as a template

## Performance Optimization

### Indexing
Firestore auto-indexes single fields. For complex queries, create composite indexes:
- Go to Firestore Console > Indexes tab
- The console will suggest indexes when queries fail
- Add recommended composite indexes

### Batch Operations
The codebase uses `Promise.all()` for parallel operations. For large datasets (>500 docs), consider:
- Pagination with `startAfter()` cursors
- Batch writes for bulk updates
- Scheduled Cloud Functions for heavy background jobs

## Monitoring

### Firebase Console
- **Usage tab:** Monitor read/write operations
- **Indexes tab:** Check index health
- **Rules tab:** Test security rules

### Cloud Logging
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

## Cost Optimization

Firestore pricing (as of 2024):
- **Reads:** $0.06 per 100K documents
- **Writes:** $0.18 per 100K documents
- **Storage:** $0.18 per GB/month

Tips:
- Cache frequently accessed data
- Use pagination to limit reads
- Avoid list operations on large collections
- Use TTL (Time To Live) for temporary data

## Support

For issues:
1. Check logs: `npm run dev` and observe console output
2. Verify Firestore data in Firebase Console
3. Test API endpoints with Postman or curl
4. Review error messages for missing environment variables

## Additional Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Google Cloud IAM Roles](https://cloud.google.com/iam/docs/understanding-roles)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
