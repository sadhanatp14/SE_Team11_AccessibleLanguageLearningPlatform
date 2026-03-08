# Deployment Guide: Vercel + Railway

## Step 1: Prepare Your Repository

### 1.1 Commit all changes
```bash
cd /Users/sadhanatp/Desktop/Amrita\ /Semester\ VI/23CSE311/Case\ Study/SE_Team11_AccessibleLanguageLearningPlatform
git add .
git commit -m "Add deployment configuration for Vercel + Railway"
git push origin main
```

### 1.2 Verify files created:
- ✅ `vercel.json` - Vercel build configuration
- ✅ `Procfile` - Railway start command
- ✅ `.env.example` - Environment variables template
- ✅ `backend/server.js` - Updated CORS for production

---

## Step 2: Deploy Backend on Railway

### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Authorize Railway to access your repositories

### 2.2 Deploy Backend
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select your repository: `SE_Team11_AccessibleLanguageLearningPlatform`
3. Railway auto-detects your setup
4. Click **"Deploy"**

⚠️ **Important (Python TTS):** Railway’s default builder (Railpack) does not include a Python runtime. If you want `/api/tts/speak` to use the Python gTTS path in production, set the backend service builder to **Dockerfile**.

If your Railway service **Root Directory** is set to `backend/`, this repo includes `backend/Dockerfile` which installs:

- Node dependencies
- Python 3 + pip
- `gTTS` from `python_services/requirements.txt`

### 2.3 Configure Environment Variables in Railway
After deployment, go to **Variables** tab and add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/accessible-language-learning?retryWrites=true&w=majority
JWT_SECRET=<generate-a-strong-random-string>
NODE_ENV=production
FRONTEND_URL=https://your-project.vercel.app
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=<optional-model-name>
```

⚠️ **For MongoDB URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Get connection string and replace `username:password`

### 2.4 Get Your Backend URL
- In Railway dashboard, go to **Settings** → copy your **Railway URL**
- Example: `https://your-backend-production-xxxx.railway.app`
- Save this for Step 4

---

## Step 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### 3.2 Deploy Frontend
1. Click **"Add New Project"** → select your repository
2. Vercel auto-detects it's a React app
3. **Build Command:** `npm run build` (auto-filled)
4. **Output Directory:** `build` (auto-filled)
5. Click **"Deploy"**

### 3.3 Configure Frontend Environment Variables
After deployment, go to **Settings** → **Environment Variables**:

```
REACT_APP_API_URL=https://your-backend-production-xxxx.railway.app/api
```

Then **Redeploy** to apply the variable.

### 3.4 Get Your Frontend URL
- Your Vercel URL appears after deployment
- Example: `https://your-project.vercel.app`
- Update backend's `FRONTEND_URL` if needed

---

## Step 4: Update Backend CORS Configuration

1. Go to Railway dashboard
2. Go to **Variables** tab
3. Update `FRONTEND_URL` to your Vercel URL (if not already set)
4. Redeploy by clicking the **Deploy** button

---

## Step 5: Test Connectivity

### 5.1 Test Backend
```
https://your-backend-production-xxxx.railway.app/health
```
Should return:
```json
{"status": "OK", "message": "Server is running"}
```

### 5.2 Test Frontend
```
https://your-project.vercel.app
```
Should load without CORS errors.

### 5.3 Test Login
1. Open your deployed frontend
2. Create an account with pattern/password/fingerprint
3. Verify MongoDB stores user data
4. Log in to confirm JWT works

---

## Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` is correctly set in Railway
- Verify backend restart after variable changes
- Check browser console for exact error

### MongoDB Connection Failed
- Verify `MONGODB_URI` is correct (no typos)
- Check IP whitelist in MongoDB Atlas (add `0.0.0.0/0` for development)
- Test connection string locally first

### Build Fails on Vercel
- Check `package.json` has all dependencies
- Verify no `.env` file is committed (add to `.gitignore`)
- Check build logs for missing dependencies

### Python TTS Not Working
- Railway also supports Python services
- Create separate Python service in Railway dashboard
- Set `PYTHON_TTS_PORT` environment variable
- (Optional: migrate to external TTS API like Google Cloud TTS for simplicity)

---

## Monitoring & Maintenance

### Railway Dashboard
- View logs: **Logs** tab
- Monitor performance: **Metrics** tab
- Manage deployments: **Deployments** tab

### Vercel Dashboard
- View logs: **Deployments** tab
- Monitor analytics: **Analytics** tab
- Configure custom domain: **Domains** tab

### Local Development
```bash
# Frontend with backend URL
REACT_APP_API_URL=https://your-backend.railway.app npm start

# Backend with production DB
MONGODB_URI=... NODE_ENV=development npm run dev
```

---

## Next Steps

1. ✅ Create MongoDB Atlas account & get connection string
2. ✅ Deploy backend on Railway with environment variables
3. ✅ Deploy frontend on Vercel with API URL
4. ✅ Test all endpoints
5. ✅ Set up custom domain (optional)
6. ✅ Enable monitoring/logging

Your project is ready for production! 🚀
