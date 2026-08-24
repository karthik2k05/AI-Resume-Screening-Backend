# 🚀 Resume Screening Backend

Backend API for the **AI Resume Screening Application**.

This backend provides authentication, HR operations, resume upload and screening, job postings, candidate applications, analytics, notifications, subscriptions, support chat, and related services.

---

# 📑 Table of Contents

- 🛠️ Tech Stack
- 📁 Project Structure
- 📋 Prerequisites
- ⚙️ Backend Setup
- 🔐 Environment Variables
- 🗄️ Database Setup
- 🔎 Database Queries
- 🧩 Database Schema
- 🌐 API Structure
- 🔑 Authentication APIs
- 👨‍💼 HR APIs
- 💼 Job Posting APIs
- 📦 Other API Modules
- 📄 File Uploads
- 💬 Socket.IO
- ▶️ Running the Backend
- 🧪 API Testing
- 📊 k6 Load Testing
- 👥 k6 Virtual Users
- 📈 k6 Metrics
- 🧪 Testing Approach
- 📈 Scaling Approach
- ⚡ Performance Optimization
- 🔒 Security
- 🚀 Production Considerations
- 🔄 Development Workflow
- 🌿 Git Branch
- 🗂️ Database Schema File
- ⚡ Quick Setup
- 📝 Notes
- 👩‍💻 Contribution
- 📌 Summary

---

# 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **PostgreSQL**
- **Socket.IO**
- **JWT Authentication**
- **Firebase Authentication**
- **Axios**
- **Multer / File Upload Handling**
- **AI / Resume Processing Services**
- **k6** for API and load testing

---

# 📁 Project Structure

```text
resume-screening-backend/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   ├── adminController.js
│   ├── candidateController.js
│   ├── hrController.js
│   ├── jobPostingController.js
│   └── ...
│
├── middleware/
│   └── authMiddleware.js
│
├── routes/
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   ├── candidateRoutes.js
│   ├── hrRoutes.js
│   ├── hrResumeRoutes.js
│   ├── hrResumeUploadRoutes.js
│   ├── jobPostingRoutes.js
│   └── ...
│
├── services/
│   └── ...
│
├── k6-tests/
│   ├── hr-login.js
│   ├── hr-resume-screening.js
│   └── job-creation.js
│
├── database/
│   └── schema.sql
│
├── uploads/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

# 📋 Prerequisites

Install the following before running the backend:

- Node.js
- npm
- PostgreSQL
- pgAdmin 4 (optional)
- k6 (for load testing)

---

# ⚙️ Backend Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
```

Navigate to the backend directory:

```bash
cd resume-screening-backend
```

## 2. Install Dependencies

```bash
npm install
```

---

# 🔐 Environment Variables

Create a `.env` file in the backend root directory.

Example:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=finalized_render_database
DB_USER=postgres
DB_PASSWORD=your_postgresql_password

JWT_SECRET=your_jwt_secret
```

Add any other environment variables required by the project.

## ⚠️ Important

Do **not** commit `.env` to GitHub.

Add the following to `.gitignore`:

```gitignore
.env
node_modules/
uploads/
```

---

# 🗄️ Database Setup

The backend uses **PostgreSQL**.

## Database Name

```text
finalized_render_database
```

The project contains the database schema at:

```text
database/schema.sql
```

The schema file contains the database structure required by the backend, including tables, relationships, constraints, and other database objects.

## 1. Create the Database

```sql
CREATE DATABASE finalized_render_database;
```

## 2. Apply the Database Schema

Using PostgreSQL command line:

```bash
psql -U postgres -d finalized_render_database -f database/schema.sql
```

The schema can also be executed through **pgAdmin 4**.

---

# 🔎 Database Queries

## View All Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## View Table Columns

```sql
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

## View Data From a Table

```sql
SELECT *
FROM table_name
LIMIT 10;
```

Replace `table_name` with the required table name.

## Count Records

```sql
SELECT COUNT(*)
FROM table_name;
```

## Check PostgreSQL Version

```sql
SELECT version();
```

## View Table Structure

Using PostgreSQL:

```sql
\d table_name
```

Replace `table_name` with the required table name.

---

# 🧩 Database Schema

The database supports the major application modules.

### 👤 Authentication

Stores user and authentication-related information.

### 👨‍💼 HR

Stores HR-related information and HR operations.

### 📄 Resumes

Stores uploaded resume information and resume screening results.

### 💼 Job Postings

Stores jobs created by HR/Admin users.

### 📝 Applications

Stores candidate applications for job postings.

### 🔔 Notifications

Stores application and system notifications.

### 💳 Subscriptions

Stores subscription and usage-related information.

### 💬 Support

Stores candidate/Admin support chat messages.

### 🔑 Login History

Stores login-related history where applicable.

The complete database definitions are available in:

```text
database/schema.sql
```

---

# 🌐 API Structure

The backend follows a modular architecture:

```text
Client
   ↓
Express Route
   ↓
Authentication Middleware
   ↓
Controller
   ↓
Service / Database
   ↓
PostgreSQL
   ↓
API Response
```

Routes handle incoming requests, middleware handles authentication where required, controllers handle application logic, and PostgreSQL stores persistent data.

---

# 🔑 Authentication APIs

Authentication routes are available under:

```text
/api/auth
```

## Register

```http
POST /api/auth/register
```

## Login

```http
POST /api/auth/login
```

## Firebase Login

```http
POST /api/auth/firebase-login
```

## Google Login

```http
POST /api/auth/google-login
```

## Forgot Password

```http
POST /api/auth/forgot-password
```

## JWT Authentication

Protected APIs require a valid JWT token.

The token is sent using:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

# 👨‍💼 HR APIs

HR functionality is available under:

```text
/api/hr
```

The HR module supports:

- HR dashboard operations
- Resume management
- Resume uploads
- Resume screening
- Candidate-related HR operations

Protected HR endpoints require a valid JWT token.

---

# 💼 Job Posting APIs

Job posting routes are registered under:

```text
/api/admin/job-postings
```

## Create Job

```http
POST /api/admin/job-postings/
```

## Get Job Postings

```http
GET /api/admin/job-postings/
```

## Update Job Status

```http
PATCH /api/admin/job-postings/:id/status
```

## Update Job

```http
PUT /api/admin/job-postings/:id
```

## Delete Job

```http
DELETE /api/admin/job-postings/:id
```

These APIs support:

- Creating job postings
- Viewing job postings
- Updating job information
- Activating/deactivating job postings
- Deleting job postings

All protected job posting routes use authentication middleware.

---

# 📦 Other API Modules

The backend also provides routes for:

```text
/api/admin
/api/candidate
/api/support
/api/search
/api/settings
/api/subscription
/api/notifications
```

Each module is separated into routes and controllers to keep the backend modular and maintainable.

---

# 📄 File Uploads

Uploaded files are stored under:

```text
uploads/
```

The backend exposes uploaded files through:

```text
/uploads
```

Resume upload requests use:

```text
multipart/form-data
```

Example form field:

```text
resumes: <PDF file>
```

---

# 💬 Socket.IO

Socket.IO is used for real-time communication.

The backend supports:

- Candidate support chat
- Admin support chat
- Candidate notifications
- Admin notifications
- Chat room management
- Chat closing events

## Candidate → Admin

```text
Candidate
    ↓
Socket.IO
    ↓
Admin Room
```

## Admin → Candidate

```text
Admin
    ↓
Socket.IO
    ↓
Candidate Room
```

---

# ▶️ Running the Backend

Start the backend using:

```bash
npm start
```

For development, if the project has a development script:

```bash
npm run dev
```

The default server port is:

```text
5000
```

Backend URL:

```text
http://localhost:5000
```

---

# ✅ Verify the Backend

Open:

```text
http://localhost:5000
```

Expected response:

```text
AI Resume Screening Backend Running...
```

---

# 🧪 API Testing

API endpoints can be tested using:

- **Postman**
- **Frontend application**
- **Browser** for applicable GET endpoints
- **k6** for load testing

## Testing Protected APIs

Before testing a protected API:

1. Start the backend.
2. Login using a valid account.
3. Obtain the JWT token.
4. Add the token to the request header.

Example:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

# 📊 k6 Load Testing

**k6** is used to test API performance and behavior under concurrent users.

Test scripts are stored in:

```text
k6-tests/
```

Example:

```text
k6-tests/
├── hr-login.js
├── hr-resume-screening.js
└── job-creation.js
```

## ▶️ Run HR Login Test

If k6 is installed at:

```text
C:\Program Files\k6\k6.exe
```

Run:

```powershell
& "C:\Program Files\k6\k6.exe" run .\k6-tests\hr-login.js
```

## ▶️ Run Resume Screening Test

```powershell
& "C:\Program Files\k6\k6.exe" run .\k6-tests\hr-resume-screening.js
```

## ▶️ Run Job Creation Test

```powershell
& "C:\Program Files\k6\k6.exe" run .\k6-tests\job-creation.js
```

---

# 👥 k6 Virtual Users

Example configuration:

```javascript
export const options = {
  vus: 5,
  duration: "1m",
};
```

Where:

- **VUs** = Virtual Users
- **Duration** = Test duration

Recommended testing levels:

```text
1 VU    → Basic functionality check
5 VUs   → Small concurrent load
10 VUs  → Higher concurrent load
25+ VUs → Stress/load testing
```

The number of virtual users should be increased gradually.

---

# 📈 k6 Metrics

Important k6 metrics include:

## Checks

Shows whether application-level assertions passed.

Example:

```text
checks_succeeded: 100%
```

A value of `100%` means all configured checks passed.

## HTTP Request Duration

Measures API response time.

Important values include:

```text
avg
med
p(90)
p(95)
max
```

## HTTP Request Failed

Shows the percentage of failed HTTP requests.

Example:

```text
http_req_failed: 0.00%
```

## HTTP Requests

Shows the total number of HTTP requests generated during the test.

## Virtual Users

Shows the number of active virtual users during the test.

---

# 🧪 Testing Approach

Testing should be performed progressively.

## 1. Functional Testing

Start with one user and verify individual APIs.

Examples:

- HR login
- Resume upload
- Resume screening
- Job creation
- Job listing

### Goal

Verify that each API performs the expected operation.

---

## 2. Concurrent Load Testing

Increase virtual users gradually:

```text
1 VU
   ↓
5 VUs
   ↓
10 VUs
   ↓
25 VUs
   ↓
50 VUs
```

Monitor:

- Response time
- Error rate
- Throughput
- CPU usage
- Memory usage
- Database performance

---

## 3. Sustained Load Testing

Run the application under a stable load for an extended period.

Example:

```text
10 VUs
10 minutes
```

Check for:

- Performance degradation
- Memory leaks
- Database connection issues
- Increasing response times
- Request failures

---

## 4. Stress Testing

Gradually increase the number of virtual users until the system starts showing significant performance degradation.

The purpose is to identify:

- Application capacity
- Performance bottlenecks
- Database limitations
- API limitations

---

# 📈 Scaling Approach

The following approaches can be considered as application traffic and data volume increase.

## 1. Backend Scaling

Multiple backend instances can run behind a load balancer.

```text
                 Load Balancer
                /      |      \
               /       |       \
        Backend 1  Backend 2  Backend 3
               \       |       /
                \      |      /
                 PostgreSQL
```

This distributes incoming requests across multiple backend instances.

---

## 2. Database Scaling

PostgreSQL performance can be improved using:

- Proper indexing
- Query optimization
- Connection pooling
- Pagination
- Slow query monitoring
- Read replicas for read-heavy workloads

---

## 3. Caching

A caching layer such as Redis can be introduced for frequently accessed data.

Potential use cases:

- Job listings
- Dashboard statistics
- Search results
- Frequently accessed configuration

---

## 4. File Storage Scaling

For larger deployments, uploaded resumes can be moved from local storage to object storage.

Example:

```text
Client
  ↓
Backend
  ↓
Object Storage
  ↓
Resume Processing
```

This reduces storage pressure on backend servers.

---

## 5. Background Processing

Resume processing can be moved to background workers when processing volume increases.

Example:

```text
Resume Upload
      ↓
Message Queue
      ↓
Worker
      ↓
AI Resume Processing
      ↓
Database
      ↓
Result Available
```

This prevents long-running processing from blocking API requests.

---

# ⚡ Performance Optimization

Potential optimization areas include:

- Database indexing
- Query optimization
- Pagination
- Connection pooling
- Caching
- Asynchronous processing
- Background jobs for resume processing
- Object storage
- Horizontal backend scaling

---

# 🔒 Security

The following security practices should be followed:

- Do not commit `.env`
- Do not expose JWT secrets
- Do not expose Firebase service account credentials
- Validate uploaded files
- Restrict upload file types
- Validate API input
- Use authentication middleware for protected routes
- Use HTTPS in production
- Configure CORS appropriately
- Use secure password hashing
- Avoid exposing database credentials
- Add rate limiting for production APIs

---

# 🚀 Production Considerations

Before production deployment:

- Configure production environment variables
- Use HTTPS
- Configure production CORS
- Use a managed PostgreSQL database
- Configure database backups
- Use object storage for uploaded resumes
- Add application monitoring
- Add centralized logging
- Configure rate limiting
- Run load and stress tests
- Monitor database performance
- Use multiple backend instances when required

---

# 🔄 Development Workflow

Recommended workflow:

```text
1. Develop Feature
       ↓
2. Test API Locally
       ↓
3. Test Frontend Integration
       ↓
4. Run k6 Tests
       ↓
5. Verify Database Changes
       ↓
6. Review Code
       ↓
7. Commit Changes
       ↓
8. Push to Feature Branch
```

---

# 🌿 Git Branch

Backend development branch:

```text
divya-backend-work
```

Frontend development branch:

```text
divya-frontend
```

Changes should be tested before merging into the main branch.

---

# 🗂️ Database Schema File

The database structure is maintained in:

```text
database/schema.sql
```

When database structure changes, update the schema file so that a new developer can recreate the required database structure.

---

# ⚡ Quick Setup

## 1. Clone Repository

```bash
git clone <repository-url>
```

## 2. Enter Backend Directory

```bash
cd resume-screening-backend
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create the `.env` file and add:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=finalized_render_database
DB_USER=postgres
DB_PASSWORD=your_postgresql_password

JWT_SECRET=your_jwt_secret
```

## 5. Create Database

```sql
CREATE DATABASE finalized_render_database;
```

## 6. Apply Database Schema

```bash
psql -U postgres -d finalized_render_database -f database/schema.sql
```

## 7. Start Backend

```bash
npm start
```

## 8. Verify Backend

Open:

```text
http://localhost:5000
```

Expected response:

```text
AI Resume Screening Backend Running...
```

---

# 📝 Notes

- `database/schema.sql` contains the database structure.
- `.env` must not be committed to the repository.
- Protected APIs require a valid JWT token.
- k6 tests should preferably be run against a development/test environment.
- Load should be increased gradually while monitoring API and database performance.
- Redis, background workers, object storage, and load balancers are proposed scaling options for future growth and are not assumed to be currently implemented.

---

# 👩‍💻 Contribution

Before pushing changes:

```bash
git status
```

Add the changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Update backend documentation and database schema"
```

Push to the backend branch:

```bash
git push origin divya-backend-work
```

---

# 📌 Summary

The backend is organized using modular routes, controllers, middleware, services, and database integration.

PostgreSQL is used for persistent data storage, with the database structure maintained in:

```text
database/schema.sql
```

k6 is used for:

- API functional checks
- Concurrent load testing
- Sustained load testing
- Stress testing

The application can be scaled further through:

- Backend horizontal scaling
- PostgreSQL optimization
- Connection pooling
- Caching
- Background processing
- Object storage
- Monitoring
- Logging

---

# ✅ Backend Documentation Complete

The README provides information for:

- Backend setup
- Environment configuration
- PostgreSQL database setup
- Database schema
- Database queries
- API structure
- Authentication
- HR functionality
- Job postings
- File uploads
- Socket.IO
- API testing
- k6 testing
- Testing strategy
- Scaling strategy
- Security
- Production considerations
- Development workflow
