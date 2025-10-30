# ⚡ Quick Start Guide - Worker Finder Backend

Get started in **5 minutes**!

## 🎯 Prerequisites
- Node.js 16+ installed
- MySQL 8+ running
- Cloudinary account (free)

## 🚀 Installation (5 Steps)

### 1️⃣ Install Dependencies
```bash
cd worker-finder-backend
npm install
```

### 2️⃣ Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and set:
```env
# Database
DB_PASSWORD=your_mysql_password
DB_NAME=worker_finder_db

# Cloudinary (from cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Secrets (change these!)
JWT_SECRET=change_this_to_long_random_string_min_32_chars
JWT_REFRESH_SECRET=change_this_to_another_long_random_string
```

### 3️⃣ Initialize Database
```bash
npm run init-db
```

### 4️⃣ Start Server
```bash
npm run dev
```

### 5️⃣ Test
Visit: http://localhost:5000/health

You should see:
```json
{
  "success": true,
  "message": "Worker Finder API is running"
}
```

## ✅ You're Ready!

Server is running at: **http://localhost:5000**

## 🧪 Quick Test Flow

### 1. Register a Worker
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "mobile": "9876543210",
    "password": "test123",
    "user_type": "worker"
  }'
```

**Copy the OTP from console output**

### 2. Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "otp": "YOUR_OTP_HERE"
  }'
```

**Copy the token from response**

### 3. Update Profile
```bash
curl -X PUT http://localhost:5000/api/workers/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "profession": "Plumber",
    "experience_years": 5,
    "city": "Delhi",
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### 4. Search Workers
```bash
curl "http://localhost:5000/api/workers/search?latitude=28.6139&longitude=77.2090&radius=25"
```

## 📚 What's Next?

1. **API Documentation**: See `API_DOCUMENTATION.md`
2. **Detailed Setup**: See `SETUP_GUIDE.md`
3. **Full README**: See `README.md`
4. **Postman Collection**: Import `POSTMAN_COLLECTION.json`

## 🔧 Common Issues

**Issue**: Database connection failed
**Fix**: Check MySQL is running and password in `.env` is correct

**Issue**: Cloudinary upload fails  
**Fix**: Verify credentials at cloudinary.com/console

**Issue**: Port 5000 in use
**Fix**: Change `PORT=3000` in `.env`

## 📝 Important Files

```
worker-finder-backend/
├── .env                    ← Your configuration
├── server.js               ← Main server file
├── package.json            ← Dependencies
├── README.md               ← Full documentation
├── SETUP_GUIDE.md          ← Detailed setup
├── API_DOCUMENTATION.md    ← All API endpoints
└── src/
    ├── config/             ← Database, Cloudinary
    ├── controllers/        ← Business logic
    ├── routes/             ← API routes
    └── middleware/         ← Auth, validation
```

## 🎉 Success!

If you see the server running, congratulations! 🎊

You now have a **fully functional backend** with:
- ✅ User authentication
- ✅ Location-based search
- ✅ File uploads
- ✅ Review system
- ✅ Messaging
- ✅ And much more!

---

**Need Help?** Check the detailed guides or review error logs in console.

**Happy Coding!** 🚀
