# Makefield Stroke Analysis - Mobile Backend API

A production-ready Node.js and Express backend architecture connected to MongoDB via Mongoose. Designed specifically for the **Makefield Stroke Analysis Mobile Application** with unified JSON responses, multi-method authentication (Google, Email, Phone), 4-digit OTP verification with 2-minute expiration and 1-minute resend cooldown, profile onboarding steps, and structured logging.

---

## 📱 Mobile Standard Response Format

Every API endpoint returns a standardized JSON structure suitable for mobile parsing:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Authentication successful",
  "data": { ... },
  "timestamp": "2026-11-02T13:00:29.873Z"
}
```

In case of error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Please wait 45 second(s) before requesting a new OTP code",
  "errors": [{ "waitSeconds": 45 }],
  "timestamp": "2026-11-02T13:00:29.873Z"
}
```

---

## 📁 Project Structure

```text
backend/
├── config/
│   ├── db.config.js             # Mongoose connection & lifecycle event logging
│   ├── env.config.js            # Environment variables configuration
│   └── logger.config.js         # Morgan HTTP logger configuration
├── constants/
│   ├── httpStatusCodes.js       # Standard HTTP status codes
│   └── responseMessages.js      # General API response messages
├── controllers/
│   ├── auth.controller.js       # Register, Send OTP, Verify OTP, Google Login
│   └── user.controller.js       # Profile management & Avatar upload
├── dist/                        # Build output (.gitkeep)
├── logs/                        # Application logs (combined.log, error.log)
├── middleware/
│   ├── auth.middleware.js       # JWT Bearer token authentication
│   ├── error.middleware.js      # Global error handler
│   ├── logger.middleware.js     # Morgan HTTP request logger
│   ├── notFound.middleware.js   # 404 Route Not Found handler
│   ├── upload.middleware.js     # Multer profile photo uploader
│   └── validator.middleware.js  # Joi schema validation middleware
├── models/
│   ├── otp.model.js             # 4-digit OTP model with MongoDB TTL index
│   └── user.model.js            # User profile model (matching all onboarding screens)
├── repositories/
│   ├── base.repository.js       # Generic reusable CRUD wrapper
│   ├── otp.repository.js        # Active OTP & cooldown queries
│   └── user.repository.js       # Email, phone, Google ID queries
├── routes/
│   ├── auth.routes.js           # /api/v1/auth routes
│   ├── index.js                 # API v1 router
│   └── user.routes.js           # /api/v1/users routes
├── scripts/
│   └── checkDb.js               # Database connection verification script
├── services/
│   ├── auth.service.js          # Authentication, OTP lifecycle, JWT logic
│   ├── mail.service.js          # SMTP Email service (Nodemailer)
│   ├── sms.service.js           # Mobile SMS service adapter
│   └── user.service.js          # User profile operations
├── src/                         # Source entry module
├── uploads/                     # Profile photo uploads directory
├── utils/
│   ├── apiError.js              # Standard custom error class
│   ├── apiResponse.js           # Standard API response formatter
│   ├── asyncHandler.js          # Promise error wrapper for Express routes
│   └── logger.js                # Winston logger (console + file transports)
├── validations/
│   ├── auth.validation.js       # Joi schemas for registration & OTP
│   └── user.validation.js       # Joi schemas for profile updates
├── .env                         # Environment variables
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore patterns
├── app.js                       # Express app setup & middleware configuration
├── package.json                 # Project dependencies & scripts
├── server.js                    # Server startup, MongoDB connection & graceful shutdown
└── tsconfig.json                # TypeScript & path alias configuration
```

---

## 🗄️ User Model Fields (From Mobile Onboarding Screens)

| Screen | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **Welcome** | `authProvider` | `String` | `'google'`, `'email'`, `'phone'` |
| **Welcome** | `googleId` | `String` | Unique Google user ID (if signed in via Google) |
| **Get started 1** | `profilePhoto` | `String` | URL/Path to face photo |
| **Get started 2** | `firstName` | `String` | First Name (e.g. Johnny) |
| **Get started 2** | `lastName` | `String` | Last Name (e.g. Doe) |
| **Get started 2** | `birthday` | `Date` | Birthday (e.g. 1985-05-14) |
| **Get started 3** | `email` | `String` | Email address (unique, indexed) |
| **Get started 3** | `phoneNumber` | `String` | Mobile number (unique, indexed) |
| **Get started 3** | `address` | `String` | Street address (e.g. 1459 street) |
| **Get started 3** | `city` | `String` | City name |
| **Get started 3** | `state` | `String` | State name |
| **Get started 3** | `zipCode` | `String` | Zipcode (e.g. 1234) |
| **System** | `isEmailVerified` | `Boolean` | True once email OTP is verified |
| **System** | `isPhoneVerified` | `Boolean` | True once phone OTP is verified |
| **System** | `isProfileComplete` | `Boolean` | True once required names are filled |
| **System** | `status` | `String` | `'active'`, `'pending'`, `'suspended'` |

---

## 🔐 Authentication & OTP Rules

1. **4-Digit OTP**: Generated dynamically using 4 numeric digits.
2. **2-Minute Expiration**: OTP records have an `expiresAt` timestamp set to 2 minutes (`120s`) from creation. MongoDB TTL automatically cleans up expired OTP documents.
3. **1-Minute Cooldown**: After an OTP is successfully dispatched, subsequent requests within 60 seconds are rejected with a cooldown error specifying remaining seconds.
4. **Invalidation**: Requesting a new OTP automatically invalidates previous unverified codes for that identifier.
5. **SMTP Email**: Configurable via `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). Logs to console during development when credentials are not configured.
6. **Mobile SMS**: Modular adapter in `sms.service.js` ready for Twilio / AWS SNS / any provider.

---

## 📡 API Reference

### 1. Unified Sign-in / Sign-up ("Continue with Email" or "Continue with Phone")
There is no separate create account screen. When the user enters their email or phone number:
- If the user is not registered, a new user record is automatically created in `pending` status (`isNewUser: true`).
- If the user is already registered, existing record is retrieved (`isNewUser: false`).
- A 4-digit OTP code is dispatched via Email/SMS (valid for 2 minutes, 1-minute resend cooldown).

- **URL**: `POST /api/v1/auth/send-otp`
- **Body**:
  ```json
  {
    "identifier": "johnny.doe@gmail.com",
    "type": "email"
  }
  ```
  *(or `type: "phone"` with `identifier: "+2432345038"`)*
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Verification OTP sent successfully",
    "data": {
      "identifier": "johnny.doe@gmail.com",
      "type": "email",
      "isNewUser": true,
      "otp": {
        "identifier": "johnny.doe@gmail.com",
        "type": "email",
        "purpose": "login",
        "expiresAt": "2026-11-03T10:25:44.819Z",
        "cooldownSeconds": 60,
        "validMinutes": 2
      }
    }
  }
  ```

### 2. Verify 4-Digit OTP & Screen Navigation Direction
- **URL**: `POST /api/v1/auth/verify-otp`
- **Body**:
  ```json
  {
    "identifier": "johnny.doe@gmail.com",
    "otp": "2154"
  }
  ```
- **Response**: `200 OK`
  - For **new / incomplete users**: `navigateTo: "get_started"`, `nextStep: "get_started_1"` (navigates through Get Started screens 1-4).
  - For **existing users**: `navigateTo: "home"`, `nextStep: "home"` (navigates directly to homepage).
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "OTP verified successfully. Please complete your profile.",
    "data": {
      "user": { ... },
      "accessToken": "eyJhbGciOi...",
      "isNewUser": true,
      "isProfileComplete": false,
      "navigateTo": "get_started",
      "nextStep": "get_started_1"
    }
  }
  ```

### 3. Resend OTP (1-minute cooldown)
- **URL**: `POST /api/v1/auth/resend-otp`
- **Body**:
  ```json
  {
    "identifier": "johnny.doe@gmail.com"
  }
  ```
- **Response**: `200 OK` (or `400 Bad Request` with `{ "waitSeconds": 45 }` if within 1-minute cooldown).

### 4. Continue with Google
- **URL**: `POST /api/v1/auth/google`
- **Body**:
  ```json
  {
    "googleId": "google-user-id-12345",
    "email": "johnny.google@gmail.com",
    "firstName": "Johnny",
    "lastName": "Doe",
    "profilePhoto": "https://lh3.googleusercontent.com/avatar.jpg"
  }
  ```
- **Response**: `200 OK` with `accessToken`, `isNewUser`, and `navigateTo` (`"home"` or `"get_started"`).
    "email": "johnny.google@gmail.com",
    "firstName": "Johnny",
    "lastName": "Doe",
    "profilePhoto": "https://lh3.googleusercontent.com/avatar.jpg"
  }
  ```
- **Response**: `200 OK` with active user and immediate JWT `accessToken`.

### 6. Get User Profile (Protected)
- **URL**: `GET /api/v1/users/profile`
- **Header**: `Authorization: Bearer <accessToken>`

### 7. Update User Profile (Protected)
- **URL**: `PUT /api/v1/users/profile`
- **Header**: `Authorization: Bearer <accessToken>`
- **Body**: Profile and contact fields from Get started screens (e.g. `firstName`, `lastName`, `birthday`, `phoneNumber`, `email`, `address`, `city`, `state`, `zipCode`).
- **Registration Identifier Protection**:
  - If the user registered with **Email** (`authProvider === 'email'`), the `email` field cannot be modified.
  - If the user registered with **Mobile Number** (`authProvider === 'phone'`), the `phoneNumber` field cannot be modified.
  - Secondary contact details can be added or updated (e.g. an email-registered user can set their phone number, and vice versa). Any attempt to alter the primary registered identifier returns a `400 Bad Request`.

### 8. Upload Profile Photo (Protected)
- **URL**: `POST /api/v1/users/profile/photo`
- **Header**: `Authorization: Bearer <accessToken>`
- **Content-Type**: `multipart/form-data`
- **Form Field**: `photo` (file: JPG, PNG, WEBP)


---

## ⛳ Putter Module (Get Started 4 & Connected Devices)

Manage multiple smart putter devices associated with a user's account. Supports **Bluetooth (BLE)** and **IP-based** devices.

### Putter Model Fields
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `name` | `String` | Putter Name (e.g. *Makefield Putter*) |
| `putterType` | `String` | Type of Putter (*Mallet*, *Blade*, *Mid-Mallet*, etc.) |
| `connectionType` | `String` | `'bluetooth'`, `'ip'`, or `'unknown'` |
| `macAddress` | `String` | Bluetooth MAC address (e.g. `AA:BB:CC:11:22:33`) |
| `bluetoothName`| `String` | Local BLE advertising name |
| `ipAddress` | `String` | Device IPv4 address (e.g. `192.168.1.150`) |
| `port` | `Number` | IP communication port (e.g. `8080`) |
| `isDefault` | `Boolean` | True for the user's primary selected putter |
| `connectionStatus` | `String` | `'connected'`, `'disconnected'`, `'pairing'` |
| `batteryLevel` | `Number` | Battery level percentage (0 - 100%) |
| `lastConnectedAt` | `Date` | Timestamp of most recent active connection |

### Putter Endpoints (Protected: `Authorization: Bearer <accessToken>`)
- `POST /api/v1/putters` — Add a new putter (auto-assigns `isDefault: true` on first club).
- `GET /api/v1/putters` — List all putters for the user (filters: `?connectionType=bluetooth`, `?search=mallet`).
- `GET /api/v1/putters/:id` — Get single putter details.
- `PUT /api/v1/putters/:id` — Update putter name and device settings.
- `DELETE /api/v1/putters/:id` — Delete putter (auto-promotes another putter to default if needed).
- `PATCH /api/v1/putters/:id/default` — Set as primary / default putter.
- `PATCH /api/v1/putters/:id/status` — Live sync connection status (`connected`/`disconnected`), battery percentage, and firmware version.


---

## 📊 Putter Records Module (Device Data Storage & History)

Stores device data collected from smart putters via **Bluetooth (BLE)** or **IP/WiFi** hardware.

### 📡 Clean Model Structure
The record API and database store:
- **`userId`**: Authenticated user ID (`ObjectId`)
- **`putterId`**: Connected putter device ID (`ObjectId`)
- **`data`**: Any JSON payload received directly from the putter device (`Mixed` JSON object)
- **`recordedAt`**: Timestamp of record collection (`Date`)

### Putter Record Endpoints (Protected: `Authorization: Bearer <accessToken>`)
- `POST /api/v1/putter-records` — Save device JSON data for a putter (`{ "putterId": "...", "data": { ... } }`).
- `POST /api/v1/putter-records/batch` — Bulk upload offline-buffered records.
- `GET /api/v1/putter-records` — Retrieve record history with pagination (`?page=1&limit=20`) and filters (`?putterId=...&fromDate=...&toDate=...`).
- `GET /api/v1/putter-records/summary` — Retrieve metrics summary and total records.
- `GET /api/v1/putter-records/:id` — Retrieve single record details.
- `DELETE /api/v1/putter-records/:id` — Delete a record.
