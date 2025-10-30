# Worker Finder Backend API

A complete RESTful API backend for a worker-finder marketplace platform built with Node.js, Express, MySQL, and Cloudinary.

## 🚀 Features

### Core Features
- ✅ **User Authentication** - Registration, OTP verification, Login with JWT
- ✅ **Dual User Types** - Workers and Service Seekers
- ✅ **Location-Based Search** - Find nearby workers using geolocation
- ✅ **Profile Management** - Complete CRUD operations for user profiles
- ✅ **Photo Upload** - Cloudinary integration for profile photos and documents
- ✅ **Two-Way Rating System** - Workers and seekers can rate each other
- ✅ **Review System** - Detailed reviews with photos and multiple rating categories
- ✅ **In-App Messaging** - Real-time messaging between users
- ✅ **Dispute Resolution** - Built-in system for handling disputes
- ✅ **Referral Program** - Complete referral tracking and rewards system
- ✅ **Category Management** - Organized service categories

### Advanced Features
- 📍 Geolocation-based worker discovery (Haversine formula)
- 🔍 Advanced filtering (profession, experience, rating, availability)
- ⭐ Dynamic rating calculation and aggregation
- 💰 Commission and trust fee calculation system
- 📊 Dashboard statistics for both workers and seekers
- 🔔 Notification system
- 📱 Multi-device support
- 🔒 Secure authentication with JWT tokens
- 📤 File upload with Cloudinary (free tier)
- ✉️ OTP-based verification (dummy implementation for development)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- Cloudinary account (free tier)
- npm or yarn

## 🛠️ Installation

### 1. Clone or navigate to the project directory

```bash
cd worker-finder-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=worker_finder_db
DB_PORT=3306

# JWT Secret Keys (change these!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production_min_32_chars
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=30d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Commission & Pricing
PLATFORM_COMMISSION=18
TRUST_SAFETY_FEE=7
REFERRAL_BONUS=100
```

### 4. Initialize the database

```bash
npm run init-db
```

This will create all necessary tables with proper indexes and relationships.

### 5. Start the server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "worker@example.com",
  "mobile": "9876543210",
  "password": "password123",
  "user_type": "worker",
  "referred_by": "ABC123XYZ" // optional
}

Response:
{
  "success": true,
  "message": "Registration successful. Please verify OTP sent to your mobile.",
  "data": {
    "userId": 1,
    "email": "worker@example.com",
    "mobile": "9876543210",
    "user_type": "worker",
    "referral_code": "WOR8A3F2B",
    "otp": "123456" // only in development mode
  }
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "login": "worker@example.com", // or mobile number
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "profile": { ... },
    "token": "...",
    "refreshToken": "..."
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "profile": { ... }
  }
}
```

### Worker Endpoints

#### Search Workers (Location-Based)
```http
GET /api/workers/search?latitude=28.6139&longitude=77.2090&radius=25&profession=Plumber&min_rating=4&page=1&limit=20

Response:
{
  "success": true,
  "data": {
    "workers": [
      {
        "id": 1,
        "full_name": "John Doe",
        "profession": "Plumber",
        "experience_years": 5,
        "average_rating": 4.8,
        "hourly_rate": 500,
        "distance": 2.5, // in km
        "skills": ["Pipe Fitting", "Drainage"],
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

#### Update Worker Profile
```http
PUT /api/workers/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "whatsapp_number": "9876543210",
  "profession": "Plumber",
  "experience_years": 5.5,
  "hourly_rate": 500,
  "bio": "Experienced plumber with 5+ years...",
  "skills": ["Pipe Fitting", "Drainage", "Water Heater"],
  "certifications": [
    {
      "name": "Advanced Plumbing Certificate",
      "issuer": "Plumbing Institute",
      "year": 2020
    }
  ],
  "address": "123 Main St, Delhi",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "availability_status": "available"
}
```

#### Upload Profile Photo
```http
POST /api/workers/profile-photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <file>

Response:
{
  "success": true,
  "message": "Profile photo uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/..."
  }
}
```

#### Get Worker Dashboard Stats
```http
GET /api/workers/dashboard/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "profile": { ... },
    "stats": {
      "total_jobs": 50,
      "completed_jobs": 45,
      "active_jobs": 2,
      "pending_jobs": 3,
      "monthly_earnings": "15000.00",
      "average_rating": 4.8,
      "total_earnings": "250000.00"
    },
    "recent_reviews": [ ... ]
  }
}
```

### Seeker Endpoints

#### Update Seeker Profile
```http
PUT /api/seekers/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Jane Smith",
  "address": "456 Park Avenue, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

#### Get Seeker Dashboard Stats
```http
GET /api/seekers/dashboard/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "profile": { ... },
    "stats": {
      "total_jobs": 20,
      "open_jobs": 2,
      "active_jobs": 1,
      "completed_jobs": 17,
      "monthly_spending": "5000.00",
      "total_amount_spent": "50000.00",
      "average_rating": 4.5
    },
    "favorite_workers": [ ... ]
  }
}
```

### Review Endpoints

#### Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: multipart/form-data

job_id: 5
reviewee_id: 2
rating: 5
review_text: "Excellent work! Very professional."
punctuality_rating: 5
quality_rating: 5
behavior_rating: 5
photos: <file1>, <file2>

Response:
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review_id": 10
  }
}
```

#### Get User Reviews
```http
GET /api/reviews/user/2?page=1&limit=20

Response:
{
  "success": true,
  "data": {
    "reviews": [ ... ],
    "stats": {
      "total": 45,
      "average_rating": "4.75",
      "rating_breakdown": {
        "five_star": 35,
        "four_star": 8,
        "three_star": 2,
        "two_star": 0,
        "one_star": 0
      }
    },
    "pagination": { ... }
  }
}
```

### Message Endpoints

#### Send Message
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiver_id": 5,
  "message_text": "Hi, are you available tomorrow?",
  "job_id": 10 // optional
}
```

#### Get Conversation
```http
GET /api/messages/conversation/5
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "sender_id": 2,
        "receiver_id": 5,
        "message_text": "Hi, are you available tomorrow?",
        "created_at": "2024-01-15 10:30:00",
        ...
      }
    ],
    "pagination": { ... }
  }
}
```

#### Get All Conversations
```http
GET /api/messages/conversations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "other_user_id": 5,
      "other_user_name": "John Doe",
      "other_user_photo": "https://...",
      "last_message": "Sounds good!",
      "last_message_time": "2024-01-15 10:30:00",
      "unread_count": 2
    }
  ]
}
```

### Dispute Endpoints

#### Create Dispute
```http
POST /api/disputes
Authorization: Bearer <token>
Content-Type: multipart/form-data

job_id: 5
against_user: 3
reason: "Work not completed as agreed"
description: "The worker did not complete the drainage work..."
evidence: <file1>, <file2>
```

### Referral Endpoints

#### Get Referral Info
```http
GET /api/referrals/info
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "referral_code": "WOR8A3F2B",
    "stats": {
      "total_referrals": 10,
      "completed_referrals": 8,
      "total_earnings": "800.00",
      "bonus_per_referral": 100
    },
    "recent_referrals": [ ... ]
  }
}
```

#### Validate Referral Code
```http
GET /api/referrals/validate/WOR8A3F2B

Response:
{
  "success": true,
  "message": "Valid referral code",
  "data": {
    "referrer_name": "John Doe",
    "bonus_amount": 100
  }
}
```

### Category Endpoints

#### Get All Categories
```http
GET /api/categories

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Plumber",
      "description": "Water supply, drainage, and pipe fitting services",
      "worker_count": 150
    },
    ...
  ]
}
```

## 🗂️ Project Structure

```
worker-finder-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # MySQL connection pool
│   │   ├── cloudinary.js        # Cloudinary configuration
│   │   └── initDatabase.js      # Database initialization script
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── workerController.js  # Worker operations
│   │   ├── seekerController.js  # Seeker operations
│   │   ├── reviewController.js  # Review system
│   │   ├── messageController.js # Messaging system
│   │   ├── disputeController.js # Dispute handling
│   │   ├── referralController.js # Referral system
│   │   └── categoryController.js # Category management
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── validation.js        # Input validation
│   │   └── errorHandler.js      # Error handling
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── workerRoutes.js
│   │   ├── seekerRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── disputeRoutes.js
│   │   ├── referralRoutes.js
│   │   └── categoryRoutes.js
│   └── utils/
│       └── helpers.js           # Utility functions
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── .gitignore
├── package.json
├── server.js                    # Main application file
└── README.md
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Request rate limiting
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- CORS configuration
- File upload validation

## 🌐 Database Schema

### Main Tables
- **users** - Master authentication table
- **worker_profiles** - Worker-specific data
- **seeker_profiles** - Seeker-specific data
- **categories** - Service categories
- **jobs** - Job postings and tracking
- **reviews** - Two-way rating system
- **messages** - In-app messaging
- **disputes** - Dispute resolution
- **referrals** - Referral tracking
- **payments** - Payment transactions
- **notifications** - User notifications
- **otps** - OTP verification
- **worker_availability** - Worker schedules

## 📊 Key Algorithms

### Location-Based Search (Haversine Formula)
The API uses the Haversine formula to calculate distances between coordinates and sort workers by proximity:

```javascript
const distance = 2 * R * asin(sqrt(
  sin²((lat2-lat1)/2) + cos(lat1) * cos(lat2) * sin²((lon2-lon1)/2)
))
```

### Commission Calculation
```javascript
Commission: 18% of job amount
Trust Fee: 7% of job amount
Net Amount: Amount - Commission - Trust Fee
```

## 🧪 Testing

Use tools like Postman or Thunder Client to test the APIs.

### Sample Test Flow:
1. Register a worker account
2. Verify OTP
3. Update worker profile
4. Upload profile photo
5. Register a seeker account
6. Search for workers near a location
7. View worker profile
8. Send message to worker
9. Create review
10. Check referral code

## 📝 Development Notes

### Dummy Implementations (For Development)
- **OTP System**: Console logs OTP, returns it in development mode
- **Email Service**: Console logs email content
- **Payment Gateway**: Structure ready, needs real integration
- **WhatsApp API**: Placeholder, needs Business API integration
- **Police Verification**: Placeholder for future API integration
- **Bank Verification**: Placeholder for future API integration

### Production Checklist
- [ ] Integrate real SMS gateway (Twilio, MSG91, etc.)
- [ ] Set up email service (SendGrid, AWS SES)
- [ ] Integrate payment gateway (Razorpay, Stripe)
- [ ] Add WhatsApp Business API
- [ ] Implement police verification API
- [ ] Add bank account verification
- [ ] Set up SSL certificate
- [ ] Configure production database
- [ ] Set up logging service
- [ ] Implement monitoring (New Relic, Datadog)
- [ ] Add CI/CD pipeline
- [ ] Set up backup system
- [ ] Configure CDN
- [ ] Implement caching (Redis)
- [ ] Add WebSocket for real-time features

## 🚀 Deployment

### Recommended Hosting Options
- **Backend**: AWS EC2, DigitalOcean, Heroku, Railway
- **Database**: AWS RDS, DigitalOcean Managed Database
- **File Storage**: Cloudinary (already configured)

### Environment Variables for Production
Make sure to update all environment variables with strong, unique values in production.

## 📞 Support

For issues or questions, please create an issue in the repository.

## 📄 License

MIT License

## 🎉 Credits

Built with ❤️ using Node.js, Express, MySQL, and Cloudinary.

---

**Happy Coding! 🚀**
