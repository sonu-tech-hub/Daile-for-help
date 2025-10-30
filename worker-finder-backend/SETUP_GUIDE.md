# Worker Finder Backend - Setup Guide

This guide will walk you through setting up the Worker Finder backend application from scratch.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **MySQL** (v8.0 or higher)
   - Download from: https://dev.mysql.com/downloads/
   - Verify installation: `mysql --version`

3. **npm** or **yarn** (comes with Node.js)
   - Verify: `npm --version`

4. **Cloudinary Account** (Free Tier)
   - Sign up at: https://cloudinary.com/users/register/free

## 🚀 Step-by-Step Setup

### Step 1: Install Node.js Dependencies

Navigate to the project directory and install dependencies:

```bash
cd worker-finder-backend
npm install
```

This will install all required packages including:
- express
- mysql2
- bcryptjs
- jsonwebtoken
- cloudinary
- multer
- and more...

### Step 2: Set Up MySQL Database

#### Option A: Using MySQL Command Line

1. Open MySQL command line:
```bash
mysql -u root -p
```

2. Create a new database user (optional but recommended):
```sql
CREATE USER 'worker_finder_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON *.* TO 'worker_finder_user'@'localhost';
FLUSH PRIVILEGES;
```

3. Exit MySQL:
```sql
EXIT;
```

#### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your local MySQL instance
3. The database will be created automatically by our init script

### Step 3: Configure Cloudinary

1. **Sign up for Cloudinary** (if you haven't already):
   - Go to: https://cloudinary.com/users/register/free
   - Complete the registration

2. **Get your credentials**:
   - After logging in, go to Dashboard
   - You'll see:
     - Cloud Name
     - API Key
     - API Secret
   - Copy these values for the next step

### Step 4: Configure Environment Variables

1. **Copy the example environment file**:
```bash
cp .env.example .env
```

2. **Edit the .env file** with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root                    # or 'worker_finder_user'
DB_PASSWORD=your_mysql_password # Your MySQL password
DB_NAME=worker_finder_db
DB_PORT=3306

# JWT Secret Keys (CHANGE THESE!)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long_12345
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_characters_long_67890
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=30d

# Cloudinary Configuration (from Step 3)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Email Configuration (Dummy for now)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Application Configuration
APP_NAME=Worker Finder
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Commission & Pricing (adjust as needed)
PLATFORM_COMMISSION=18
TRUST_SAFETY_FEE=7
REFERRAL_BONUS=100

# Location Configuration
DEFAULT_SEARCH_RADIUS_KM=25
MAX_SEARCH_RADIUS_KM=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important Security Notes:**
- ⚠️ **Never commit .env file to git**
- ⚠️ Change JWT secrets to long, random strings in production
- ⚠️ Use strong database passwords

### Step 5: Initialize the Database

Run the database initialization script:

```bash
npm run init-db
```

You should see output like:
```
📦 Initializing database...
✅ Database created/verified
✅ Users table created
✅ Worker Profiles table created
✅ Seeker Profiles table created
... (more tables)
✅ Default categories inserted
🎉 Database initialization completed successfully!
```

This script will:
- Create the database if it doesn't exist
- Create all necessary tables
- Set up proper indexes and relationships
- Insert default service categories

### Step 6: Start the Server

#### Development Mode (with auto-reload):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

You should see:
```
============================================================
🚀 Worker Finder Backend API
============================================================
📡 Server running on: http://localhost:5000
🌍 Environment: development
📊 Database: worker_finder_db
☁️  Cloudinary: ✅ Configured
============================================================
📚 API Endpoints:
   - Health Check: GET /health
   - Authentication: /api/auth/*
   - Workers: /api/workers/*
   - Seekers: /api/seekers/*
   ... (more endpoints)
============================================================
```

### Step 7: Test the Installation

#### Test 1: Health Check
Open your browser or use curl:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Worker Finder API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

#### Test 2: Database Connection
The server logs should show:
```
✅ Database connected successfully
```

#### Test 3: Get Categories
```bash
curl http://localhost:5000/api/categories
```

Should return list of default categories.

## 🧪 Testing with Postman

### Import Collection (Optional)

If you're using Postman, you can create a collection with these example requests:

1. **Register Worker**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body (JSON):
   ```json
   {
     "email": "worker@example.com",
     "mobile": "9876543210",
     "password": "password123",
     "user_type": "worker"
   }
   ```

2. **Verify OTP** (use OTP from console/response)
   - Method: POST
   - URL: `http://localhost:5000/api/auth/verify-otp`
   - Body (JSON):
   ```json
   {
     "mobile": "9876543210",
     "otp": "123456"
   }
   ```

3. **Login**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
   ```json
   {
     "login": "worker@example.com",
     "password": "password123"
   }
   ```

4. **Update Worker Profile** (requires token)
   - Method: PUT
   - URL: `http://localhost:5000/api/workers/profile`
   - Headers:
     - `Authorization: Bearer <your_token>`
   - Body (JSON):
   ```json
   {
     "full_name": "John Doe",
     "profession": "Plumber",
     "experience_years": 5,
     "hourly_rate": 500,
     "city": "Delhi",
     "latitude": 28.6139,
     "longitude": 77.2090
   }
   ```

## 🔧 Troubleshooting

### Issue 1: Cannot Connect to MySQL

**Error:** `Access denied for user 'root'@'localhost'`

**Solutions:**
1. Check your MySQL password in `.env`
2. Reset MySQL root password:
```bash
# On Mac/Linux
sudo mysql_secure_installation

# On Windows
mysqladmin -u root password newpassword
```

### Issue 2: Database Not Created

**Error:** `ER_BAD_DB_ERROR: Unknown database 'worker_finder_db'`

**Solution:**
Run the initialization script again:
```bash
npm run init-db
```

### Issue 3: Cloudinary Upload Fails

**Error:** `Cloudinary upload failed`

**Solutions:**
1. Verify your Cloudinary credentials in `.env`
2. Check if cloud name contains spaces (should not)
3. Ensure API key and secret are correct
4. Test credentials at https://cloudinary.com/console

### Issue 4: Port Already in Use

**Error:** `Port 5000 is already in use`

**Solutions:**
1. Change PORT in `.env` file:
```env
PORT=3000
```

2. Or kill the process using port 5000:
```bash
# On Mac/Linux
lsof -ti:5000 | xargs kill

# On Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue 5: Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
Delete node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 6: OTP Not Showing

**Note:** OTP is only shown in development mode. Check:
1. `NODE_ENV=development` in `.env`
2. Check console logs for OTP
3. Response will contain OTP in development mode

## 📱 Testing Location-Based Search

To test location-based worker search:

1. Register and login as a worker
2. Update profile with location:
   - Delhi: `latitude: 28.6139, longitude: 77.2090`
   - Mumbai: `latitude: 19.0760, longitude: 72.8777`
   - Bangalore: `latitude: 12.9716, longitude: 77.5946`

3. Register as a seeker
4. Search for workers:
```bash
curl "http://localhost:5000/api/workers/search?latitude=28.6139&longitude=77.2090&radius=25"
```

## 🔐 Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Update JWT secrets to long random strings
- [ ] Enable SSL/HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable logging
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security headers

## 📚 Next Steps

1. ✅ **Read API Documentation:** Check `API_DOCUMENTATION.md`
2. ✅ **Explore Features:** Test all endpoints
3. ✅ **Customize:** Modify categories, commission rates, etc.
4. ✅ **Integrate Frontend:** Connect with your frontend application
5. ✅ **Deploy:** Follow deployment guide for production

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review error logs in the console
3. Check MySQL error logs
4. Verify all environment variables
5. Ensure all dependencies are installed

## 🎉 Success!

If you've reached this point and the server is running, congratulations! 🎊

Your Worker Finder Backend API is now ready for development.

Test it by visiting: http://localhost:5000

Happy coding! 🚀
