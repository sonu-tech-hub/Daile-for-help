# Worker Finder API - Complete Documentation

## 📌 Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Worker APIs](#worker-apis)
3. [Seeker APIs](#seeker-apis)
4. [Review APIs](#review-apis)
5. [Message APIs](#message-apis)
6. [Dispute APIs](#dispute-apis)
7. [Referral APIs](#referral-apis)
8. [Category APIs](#category-apis)
9. [Response Formats](#response-formats)
10. [Error Codes](#error-codes)

---

## Authentication APIs

### 1. Register User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "worker@example.com",
  "mobile": "9876543210",
  "password": "password123",
  "user_type": "worker",  // or "seeker"
  "referred_by": "ABC123"  // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify OTP sent to your mobile.",
  "data": {
    "userId": 1,
    "email": "worker@example.com",
    "mobile": "9876543210",
    "user_type": "worker",
    "referral_code": "WOR8A3F2B",
    "otp": "123456"  // only in development
  }
}
```

### 2. Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "identifier": "user@example.com",  // or mobile number
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "worker@example.com",
      "mobile": "9876543210",
      "user_type": "worker",
      "is_verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Resend OTP
**Endpoint:** `POST /api/auth/resend-otp`

**Request Body:**
```json
{
  "identifier": "user@example.com"  // or mobile number
}
```

### 4. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "login": "worker@example.com",  // or mobile number
  "password": "password123"
}
```

**Success Response (200):**
```json
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

### 5. Get Current User
**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

### 6. Change Password
**Endpoint:** `PUT /api/auth/change-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

---

## Worker APIs

### 1. Search Workers (Location-Based)
**Endpoint:** `GET /api/workers/search`

**Query Parameters:**
- `latitude` (optional): User's latitude
- `longitude` (optional): User's longitude
- `radius` (optional, default: 25): Search radius in km (1-100)
- `profession` (optional): Filter by profession
- `min_experience` (optional): Minimum experience in years
- `max_experience` (optional): Maximum experience in years
- `min_rating` (optional): Minimum rating (0-5)
- `city` (optional): Filter by city
- `availability_status` (optional): available, busy, offline
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Results per page

**Example Request:**
```
GET /api/workers/search?latitude=28.6139&longitude=77.2090&radius=25&profession=Plumber&min_rating=4&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "id": 1,
        "user_id": 5,
        "full_name": "John Doe",
        "profession": "Plumber",
        "experience_years": 5.5,
        "hourly_rate": 500,
        "average_rating": 4.8,
        "total_jobs_completed": 45,
        "profile_photo": "https://res.cloudinary.com/...",
        "city": "Delhi",
        "distance": 2.5,  // in km
        "skills": ["Pipe Fitting", "Drainage"],
        "certifications": [...],
        "availability_status": "available",
        "mobile": "9876543210",
        "whatsapp_number": "9876543210",
        "is_verified": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    },
    "filters": { ... }
  }
}
```

### 2. Get Worker Profile
**Endpoint:** `GET /api/workers/:workerId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 1,
      "user_id": 5,
      "full_name": "John Doe",
      "email": "john@example.com",
      "mobile": "9876543210",
      "whatsapp_number": "9876543210",
      "profile_photo": "https://...",
      "profession": "Plumber",
      "experience_years": 5.5,
      "hourly_rate": 500,
      "bio": "Experienced plumber...",
      "skills": ["Pipe Fitting", "Drainage"],
      "certifications": [...],
      "address": "123 Main St, Delhi",
      "city": "Delhi",
      "average_rating": 4.8,
      "total_jobs_completed": 45,
      "member_since": "2023-01-15"
    },
    "reviews": [...],
    "review_count": 35
  }
}
```

### 3. Update Worker Profile
**Endpoint:** `PUT /api/workers/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "full_name": "John Doe",
  "whatsapp_number": "9876543210",
  "profession": "Plumber",
  "experience_years": 5.5,
  "hourly_rate": 500,
  "bio": "Experienced plumber with 5+ years of expertise...",
  "skills": ["Pipe Fitting", "Drainage", "Water Heater Installation"],
  "certifications": [
    {
      "name": "Advanced Plumbing Certificate",
      "issuer": "National Plumbing Institute",
      "year": 2020
    }
  ],
  "address": "123 Main Street, Connaught Place",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "availability_status": "available"
}
```

### 4. Upload Profile Photo
**Endpoint:** `POST /api/workers/profile-photo`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `photo`: Image file (JPG, PNG, WebP, max 5MB)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile photo uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "public_id": "worker-finder/profiles/worker_5"
  }
}
```

### 5. Upload Verification Proof
**Endpoint:** `POST /api/workers/verification-proof`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `document`: Document file (JPG, PNG, PDF, max 5MB)

### 6. Get Worker Dashboard Stats
**Endpoint:** `GET /api/workers/dashboard/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
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
    "recent_reviews": [...]
  }
}
```

### 7. Update Availability
**Endpoint:** `PUT /api/workers/availability`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "availability_status": "available"  // available, busy, offline
}
```

---

## Seeker APIs

### 1. Get Seeker Profile
**Endpoint:** `GET /api/seekers/:seekerId`

### 2. Update Seeker Profile
**Endpoint:** `PUT /api/seekers/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "full_name": "Jane Smith",
  "address": "456 Park Avenue",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

### 3. Upload Profile Photo
**Endpoint:** `POST /api/seekers/profile-photo`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `photo`: Image file

### 4. Get Seeker Dashboard Stats
**Endpoint:** `GET /api/seekers/dashboard/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
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
    "favorite_workers": [...]
  }
}
```

### 5. Get Job History
**Endpoint:** `GET /api/seekers/jobs/history`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by job status
- `page` (optional): Page number
- `limit` (optional): Results per page

---

## Review APIs

### 1. Create Review
**Endpoint:** `POST /api/reviews`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `job_id`: Job ID (required)
- `reviewee_id`: User ID being reviewed (required)
- `rating`: Overall rating 1-5 (required)
- `review_text`: Review text (optional)
- `punctuality_rating`: Rating 1-5 (optional)
- `quality_rating`: Rating 1-5 (optional)
- `behavior_rating`: Rating 1-5 (optional)
- `photos`: Multiple image files (optional, max 5)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review_id": 10
  }
}
```

### 2. Get User Reviews
**Endpoint:** `GET /api/reviews/user/:userId`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Results per page

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "review_text": "Excellent work!",
        "punctuality_rating": 5,
        "quality_rating": 5,
        "behavior_rating": 5,
        "photos": ["https://..."],
        "reviewer_name": "Jane Smith",
        "created_at": "2024-01-15"
      }
    ],
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

### 3. Get Job Review
**Endpoint:** `GET /api/reviews/job/:jobId`

**Headers:**
```
Authorization: Bearer <token>
```

### 4. Mark Review as Helpful
**Endpoint:** `PUT /api/reviews/:reviewId/helpful`

**Headers:**
```
Authorization: Bearer <token>
```

---

## Message APIs

### 1. Send Message
**Endpoint:** `POST /api/messages`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `receiver_id`: Receiver user ID (required)
- `message_text`: Message text (required)
- `job_id`: Related job ID (optional)
- `media`: Media file (optional)

### 2. Get Conversation
**Endpoint:** `GET /api/messages/conversation/:otherUserId`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Results per page

### 3. Get All Conversations
**Endpoint:** `GET /api/messages/conversations`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
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

### 4. Get Unread Count
**Endpoint:** `GET /api/messages/unread-count`

**Headers:**
```
Authorization: Bearer <token>
```

### 5. Mark as Read
**Endpoint:** `PUT /api/messages/read/:otherUserId`

**Headers:**
```
Authorization: Bearer <token>
```

---

## Dispute APIs

### 1. Create Dispute
**Endpoint:** `POST /api/disputes`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `job_id`: Job ID (required)
- `against_user`: User ID dispute is against (required)
- `reason`: Reason for dispute (required, 10-500 chars)
- `description`: Detailed description (optional)
- `evidence`: Multiple files (optional, max 5)

### 2. Get User Disputes
**Endpoint:** `GET /api/disputes`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): open, under_review, resolved, closed
- `page` (optional): Page number
- `limit` (optional): Results per page

### 3. Get Dispute Details
**Endpoint:** `GET /api/disputes/:disputeId`

**Headers:**
```
Authorization: Bearer <token>
```

### 4. Update Dispute Status
**Endpoint:** `PUT /api/disputes/:disputeId/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "resolved",
  "resolution_notes": "Issue resolved in favor of worker"
}
```

---

## Referral APIs

### 1. Get Referral Info
**Endpoint:** `GET /api/referrals/info`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
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
    "recent_referrals": [...]
  }
}
```

### 2. Get All Referrals
**Endpoint:** `GET /api/referrals/list`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): pending, completed, cancelled
- `page` (optional): Page number
- `limit` (optional): Results per page

### 3. Validate Referral Code
**Endpoint:** `GET /api/referrals/validate/:referral_code`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Valid referral code",
  "data": {
    "referrer_name": "John Doe",
    "bonus_amount": 100
  }
}
```

---

## Category APIs

### 1. Get All Categories
**Endpoint:** `GET /api/categories`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Plumber",
      "description": "Water supply, drainage, and pipe fitting services",
      "icon": null,
      "worker_count": 150
    }
  ]
}
```

### 2. Get Popular Categories
**Endpoint:** `GET /api/categories/popular`

**Query Parameters:**
- `limit` (optional, default: 10): Number of categories

### 3. Get Category by ID
**Endpoint:** `GET /api/categories/:categoryId`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "category": { ... },
    "workers": [...]
  }
}
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad request / Validation error |
| 401 | Unauthorized / Invalid token |
| 403 | Forbidden / Access denied |
| 404 | Resource not found |
| 409 | Conflict / Duplicate entry |
| 429 | Too many requests (rate limit) |
| 500 | Internal server error |

---

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Response when exceeded:**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token expires in 24 hours by default. Use the refresh token to get a new access token.
