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


# 🧪 Job System - Complete Testing Guide

## Overview
This document provides step-by-step testing for the complete job/hiring workflow.

## Test Flow Overview
```
1. Seeker creates job posting (open or direct hire)
2. Workers apply for the job
3. Seeker reviews applications
4. Seeker accepts one application
5. Worker starts job (in_progress)
6. Worker completes job
7. Both parties can now review each other
```

---

## Prerequisites

- Server running at `http://localhost:5000`
- Two registered accounts:
  - **Seeker account** (user_type: seeker)
  - **Worker account** (user_type: worker)
- Both accounts verified and logged in
- Save tokens for both accounts

---

## Test Suite

### ✅ TEST 1: Create Open Job (Seeker)
<!-- --------------------------------------- -->
<!---------------------------------------------->
**Endpoint:** `POST /api/jobs`  
**Authorization:** Bearer {seeker_token}

**Request Body:**
```json
{
  "title": "Need Plumber for Kitchen Sink Repair",
  "description": "Kitchen sink is leaking. Need urgent repair. Should complete within 2 hours.",
  "category_id": 1,
  "budget": 1500,
  "location": "Connaught Place, Delhi",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "scheduled_date": "2024-12-25T10:00:00"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Job posted successfully",
  "data": {
    "job_id": 1,
    "status": "open",
    "commission_details": {
      "amount": 1500,
      "commission": 270,
      "trustFee": 105,
      "netAmount": 1125
    }
  }
}
```

**✓ Pass Criteria:**
- Status code 201
- Job ID returned
- Status is "open"
- Commission calculated correctly

---

### ✅ TEST 2: Create Direct Hire Job (Seeker)

**Endpoint:** `POST /api/jobs`  
**Authorization:** Bearer {seeker_token}

**Request Body:**
```json
{
  "title": "Electrical Wiring for New Room",
  "description": "Need to install electrical points in newly constructed room",
  "category_id": 2,
  "budget": 3000,
  "worker_id": 5,
  "location": "South Delhi",
  "latitude": 28.5355,
  "longitude": 77.3910,
  "scheduled_date": "2024-12-26T09:00:00"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Job created and assigned to worker",
  "data": {
    "job_id": 2,
    "status": "assigned",
    "commission_details": {...}
  }
}
```

**✓ Pass Criteria:**
- Job directly assigned to worker
- Worker receives notification
- Status is "assigned" (not "open")

---

### ✅ TEST 3: View All Open Jobs (Worker)

**Endpoint:** `GET /api/jobs?status=open`  
**Authorization:** Not required (public endpoint)

**Query Parameters:**
- `status=open`
- `latitude=28.6139` (optional)
- `longitude=77.2090` (optional)
- `radius=25` (optional)
- `category_id=1` (optional)

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Need Plumber for Kitchen Sink Repair",
        "description": "...",
        "budget": 1500,
        "status": "open",
        "location": "Connaught Place, Delhi",
        "distance": 2.5,
        "seeker_name": "Jane Smith",
        "category_name": "Plumber",
        ...
      }
    ],
    "pagination": {...}
  }
}
```

**✓ Pass Criteria:**
- Only open jobs returned
- Distance calculated if location provided
- Sorted by distance (nearest first)

---

### ✅ TEST 4: Worker Applies for Job

**Endpoint:** `POST /api/jobs/1/apply`  
**Authorization:** Bearer {worker_token}

**Request Body:**
```json
{
  "proposal_message": "Hello! I am an experienced plumber with 5+ years of experience. I have fixed similar kitchen sink issues many times. I can complete this job within 2 hours as required. I have all necessary tools.",
  "quoted_price": 1400
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "application_id": 1
  }
}
```

**✓ Pass Criteria:**
- Application created
- Seeker receives notification
- Cannot apply twice for same job

---

### ✅ TEST 5: Multiple Workers Apply

Repeat TEST 4 with different worker accounts:

**Worker 2:** quoted_price: 1500  
**Worker 3:** quoted_price: 1300  
**Worker 4:** quoted_price: 1450

**✓ Pass Criteria:**
- All applications accepted
- Each worker can only apply once

---

### ✅ TEST 6: Seeker Views Applications

**Endpoint:** `GET /api/jobs/1/applications`  
**Authorization:** Bearer {seeker_token}

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "job_id": 1,
      "worker_id": 5,
      "worker_name": "John Doe",
      "worker_photo": "https://...",
      "profession": "Plumber",
      "experience_years": 5.5,
      "average_rating": 4.8,
      "total_jobs_completed": 45,
      "proposal_message": "Hello! I am an experienced...",
      "quoted_price": 1400,
      "status": "pending",
      "created_at": "2024-01-15 10:30:00"
    },
    ...
  ]
}
```

**✓ Pass Criteria:**
- All applications shown
- Worker details included
- Sorted by application date

---

### ✅ TEST 7: Seeker Accepts Application

**Endpoint:** `PUT /api/jobs/applications/1/accept`  
**Authorization:** Bearer {seeker_token}

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Worker assigned successfully",
  "data": {
    "job_id": 1,
    "worker_id": 5
  }
}
```

**✓ Pass Criteria:**
- Job status changes to "assigned"
- Worker assigned to job
- Other applications automatically rejected
- Accepted worker receives notification
- Rejected workers receive notifications

---

### ✅ TEST 8: Verify Job Assignment

**Endpoint:** `GET /api/jobs/1`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "assigned",
    "worker_id": 5,
    "worker_name": "John Doe",
    "seeker_name": "Jane Smith",
    ...
  }
}
```

**✓ Pass Criteria:**
- Status is "assigned"
- Worker details visible
- Budget updated to quoted price

---

### ✅ TEST 9: Worker Starts Job

**Endpoint:** `PUT /api/jobs/1/status`  
**Authorization:** Bearer {worker_token}

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Job status updated to in_progress",
  "data": {
    "job_id": 1,
    "status": "in_progress"
  }
}
```

**✓ Pass Criteria:**
- Status changes to "in_progress"
- Seeker receives notification
- Cannot change to invalid status

---

### ✅ TEST 10: Worker Completes Job

**Endpoint:** `PUT /api/jobs/1/status`  
**Authorization:** Bearer {worker_token}

**Request Body:**
```json
{
  "status": "completed",
  "completion_notes": "Successfully fixed the kitchen sink leak. Replaced old gasket and tightened all connections. Tested for 30 minutes - no leaks."
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Job status updated to completed",
  "data": {
    "job_id": 1,
    "status": "completed"
  }
}
```

**✓ Pass Criteria:**
- Status changes to "completed"
- `completion_date` set
- `payment_status` set to "pending"
- Worker's `total_jobs_completed` incremented
- Worker's `total_earnings` updated
- Seeker's `total_amount_spent` updated
- Both parties receive notification

---

### ✅ TEST 11: Verify Job Completion Stats

**Endpoint:** `GET /api/workers/dashboard/stats`  
**Authorization:** Bearer {worker_token}

**✓ Pass Criteria:**
- `completed_jobs` count increased
- `total_earnings` updated
- Job appears in completed list

**Endpoint:** `GET /api/seekers/dashboard/stats`  
**Authorization:** Bearer {seeker_token}

**✓ Pass Criteria:**
- `completed_jobs` count increased
- `total_amount_spent` updated

---

### ✅ TEST 12: Seeker Reviews Worker (NOW POSSIBLE!)

**Endpoint:** `POST /api/reviews`  

```

**✓ Pass Criteria:**
- Review created successfully
- Worker's `average_rating` updated
- Can only review after job completion
- Can only review once per job

---

### ✅ TEST 13: Worker Reviews Seeker (TWO-WAY!)

**Endpoint:** `POST /api/reviews`  
**Authorization:** Bearer {worker_token}

**Request Body:**
```json
{
  "job_id": 1,
  "reviewee_id": 3,
  "rating": 5,
  "review_text": "Great client! Clear instructions and prompt payment. Easy to work with.",
  "punctuality_rating": 5,
  "quality_rating": 5,
  "behavior_rating": 5
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review_id": 2
  }
}
```

**✓ Pass Criteria:**
- Review created successfully
- Seeker's `average_rating` updated
- Both reviews now exist for same job

---

### ✅ TEST 14: Get My Jobs (Worker)

**Endpoint:** `GET /api/jobs/my/jobs`  
**Authorization:** Bearer {worker_token}

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Need Plumber for Kitchen Sink Repair",
        "status": "completed",
        "budget": 1400,
        "seeker_name": "Jane Smith",
        ...
      },
      {
        "id": 2,
        "status": "assigned",
        ...
      }
    ],
    "pagination": {...}
  }
}
```

**✓ Pass Criteria:**
- All worker's jobs shown
- Filterable by status
- Pagination works

---

### ✅ TEST 15: Get My Jobs (Seeker)

**Endpoint:** `GET /api/jobs/my/jobs`  
**Authorization:** Bearer {seeker_token}

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Need Plumber for Kitchen Sink Repair",
        "status": "completed",
        "worker_name": "John Doe",
        ...
      }
    ],
    "pagination": {...}
  }
}
```

**✓ Pass Criteria:**
- All seeker's jobs shown
- Can filter by status

---

### ✅ TEST 16: Cancel Job

**Endpoint:** `PUT /api/jobs/1/cancel`  
**Authorization:** Bearer {seeker_token} or {worker_token}

**Request Body:**
```json
{
  "cancellation_reason": "Unable to proceed due to unavailability"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

**✓ Pass Criteria:**
- Status changes to "cancelled"
- Other party receives notification
- Cannot cancel completed jobs

---

### ✅ TEST 17: Error Cases

#### Test 17.1: Review Without Job Completion
**Endpoint:** `POST /api/reviews`  
**Expected:** 400 - "Job not completed yet"

#### Test 17.2: Apply for Assigned Job
**Endpoint:** `POST /api/jobs/2/apply`  
**Expected:** 404 - "Job not found or not available"

#### Test 17.3: Double Application
**Endpoint:** `POST /api/jobs/1/apply` (apply again)  
**Expected:** 400 - "You have already applied for this job"

#### Test 17.4: Invalid Status Transition
**Endpoint:** `PUT /api/jobs/1/status`  
**Body:** `{"status": "in_progress"}` (from "open")  
**Expected:** 400 - "Cannot change status..."

#### Test 17.5: Unauthorized Access
**Endpoint:** `GET /api/jobs/1/applications`  
**Authorization:** Worker token (not seeker)  
**Expected:** 403 - "Unauthorized access"

---

## Test Summary Checklist

### Job Creation
- [ ] Seeker can create open job
- [ ] Seeker can create direct hire job
- [ ] Commission calculated correctly
- [ ] Location saved properly

### Job Application
- [ ] Worker can view open jobs
- [ ] Worker can apply for jobs
- [ ] Cannot apply twice
- [ ] Seeker receives notification

### Application Management
- [ ] Seeker can view all applications
- [ ] Seeker can accept application
- [ ] Job assigned to worker
- [ ] Other applications rejected
- [ ] Notifications sent

### Job Progress
- [ ] Worker can start job (in_progress)
- [ ] Worker can complete job
- [ ] Stats updated correctly
- [ ] Payment status set

### Review System
- [ ] Can only review completed jobs
- [ ] Seeker can review worker
- [ ] Worker can review seeker
- [ ] Ratings calculated correctly
- [ ] Cannot review twice

### My Jobs
- [ ] Worker sees their jobs
- [ ] Seeker sees their jobs
- [ ] Filtering works
- [ ] Pagination works

### Job Cancellation
- [ ] Either party can cancel
- [ ] Cannot cancel completed
- [ ] Notifications sent

### Error Handling
- [ ] Proper error messages
- [ ] Status validations
- [ ] Authorization checks
- [ ] Duplicate prevention

---

## Testing Tools

### Using cURL

```bash
# Set variables
SEEKER_TOKEN="your_seeker_token_here"
WORKER_TOKEN="your_worker_token_here"
BASE_URL="http://localhost:5000/api"

# Create job
curl -X POST $BASE_URL/jobs \
  -H "Authorization: Bearer $SEEKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Need Plumber",
    "description": "Kitchen sink repair needed urgently",
    "budget": 1500,
    "category_id": 1
  }'

# Apply for job
curl -X POST $BASE_URL/jobs/1/apply \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_message": "I can do this job professionally",
    "quoted_price": 1400
  }'
```

### Using Postman

Import the updated collection (see POSTMAN_COLLECTION_JOBS.json)

---

## Success Criteria

All tests must pass for production readiness:

✅ **Functional Tests**: All 17 test scenarios pass  
✅ **Error Handling**: All error cases handled properly  
✅ **Authorization**: Proper access control  
✅ **Data Integrity**: Stats and relationships correct  
✅ **Notifications**: All parties notified appropriately  
✅ **Review System**: Only after job completion  

---

## 🎉 Testing Complete!

When all tests pass, you can confirm:
- ✅ Complete job workflow working
- ✅ Review system properly gated
- ✅ Commission calculations accurate
- ✅ Two-way rating system functional
- ✅ Ready for frontend integration

---

**Next Step**: If all tests pass, I'll provide the final code files!
