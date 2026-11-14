
# Sweety – Blood Glucose Tracker

A full-stack blood glucose monitoring web application developed for the Kenpath Junior Full Stack Developer – JavaScript & AI technical assignment.

## 1. Project Overview

Sweety allows users to securely record, manage, and review up to four blood glucose readings per day.

The application provides daily, month-to-date, and previous-month reports with interactive visualizations to help users understand their recorded glucose levels.

## 2. Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express.js
- REST API
- JWT Authentication
- bcrypt

### Database
- PostgreSQL

### Development Tools
- Visual Studio Code
- Git and GitHub
- npm

## 3. Features

### User Authentication

- Register using name, email, and password
- Secure login with registered credentials
- Password hashing using bcrypt
- JWT-based authentication
- Protected API endpoints
- User-specific glucose records
- Password reset functionality
- Logout confirmation

### Glucose Reading Management

- Add blood glucose readings
- View reading history
- Edit existing readings
- Delete readings
- Record measurement date and time
- Daily reading progress indicator

Four supported reading types:

1. Morning (fasting)
2. After breakfast
3. After lunch
4. After dinner

### Validation Rules

- Glucose value is required.
- Glucose value must be a whole number between 40 and 600 mg/dL.
- Only one reading per time slot per day is allowed.
- A maximum of four readings per day is allowed.
- Future measurement dates and times are not allowed.
- Measurement date and selected date must match.
- Invalid reading IDs are rejected.
- Clear validation messages are displayed to users.
- Validation is implemented at both frontend and backend levels, with database constraints for supported reading values and duplicate prevention.

## 4. Reports and Analytics

### Daily Report

Displays glucose readings for the selected date.

Includes:

- Total number of readings
- Highest glucose value
- Lowest glucose value
- Average glucose value rounded to one decimal place
- Individual readings with their time slots

### Month-to-Date Report

Displays readings from the first day of the selected month through the selected date.

Includes:

- Total number of readings
- Highest glucose value
- Lowest glucose value
- Average glucose value rounded to one decimal place

### Previous Month Report

Displays readings from the entire previous calendar month.

Includes:

- Total number of readings
- Highest glucose value
- Lowest glucose value
- Average glucose value rounded to one decimal place

All reports display a friendly empty-state message when no readings are available.

## 5. Additional Features

- Interactive glucose charts
- Daily reading progress tracking
- Activity tracker
- User profile management
- Avatar customization
- Password reset functionality
- Responsive user interface
- Success and error notifications
- Logout confirmation dialog

## 6. Project Architecture

The application follows a client-server architecture.

    React Frontend
          |
          | HTTP / REST API
          |
    Node.js + Express Backend
          |
          | Parameterized SQL Queries
          |
    PostgreSQL Database

JWT authentication is used to protect user-specific API endpoints.

## 7. Project Structure

    sweety-blood-glucose-tracker/
    |
    |-- backend/
    |   |-- middleware/
    |   |   |-- auth.js
    |   |-- routes/
    |   |   |-- authRoutes.js
    |   |   |-- readingRoutes.js
    |   |   |-- aiRoutes.js
    |   |-- db.js
    |   |-- server.js
    |   |-- schema.sql
    |   |-- seed.js
    |   |-- .env.example
    |   |-- package.json
    |   |-- package-lock.json
    |
    |-- frontend/
    |   |-- public/
    |   |-- src/
    |   |-- index.html
    |   |-- vite.config.js
    |   |-- package.json
    |   |-- package-lock.json
    |
    |-- .gitignore
    |-- README.md

## 8. Installation and Setup

### Prerequisites

Ensure the following software is installed:

- Node.js
- npm
- PostgreSQL
- Git

Visual Studio Code is recommended for local development.

### Step 1: Clone the Repository

```bash
git clone https://github.com/venkat7855/sweety-blood-glucose-tracker.git
cd sweety-blood-glucose-tracker
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the backend directory using the provided `.env.example` template.

For Windows Command Prompt:

```cmd
copy .env.example .env
```

For macOS or Linux:

```bash
cp .env.example .env
```

Update the `.env` file with your local PostgreSQL connection details, JWT secret, and other configuration values required by the template.

Generate a strong JWT secret before starting the application.

The actual `.env` file must not be committed to version control.

### Step 4: Set Up PostgreSQL Database

Open PostgreSQL using pgAdmin or the PostgreSQL command-line interface.

Create a database named `sweety`, or use another database name that matches your `.env` configuration.

```sql
CREATE DATABASE sweety;
```

Using pgAdmin:

1. Select the newly created database.
2. Open Query Tool.
3. Open the `backend/schema.sql` file.
4. Execute the SQL statements.

Alternatively, from the backend directory, run:

```bash
psql -U postgres -d sweety -f schema.sql
```

Replace `postgres` and `sweety` if your PostgreSQL username or database name is different.

The schema creates the required tables, relationships, constraints, and indexes.

### Step 5: Seed Demo Data

From the backend directory, run:

```bash
node seed.js
```

The seed script creates a demonstration user and sample glucose readings.

Demo credentials are provided in Section 10.

### Step 6: Start the Backend Server

From the backend directory, run:

```bash
node server.js
```

Backend URL:

http://localhost:5000

Health check endpoint:

http://localhost:5000/api/health

Keep the backend terminal running.

### Step 7: Start the Frontend

Open another terminal from the project root.

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

http://localhost:5173

Open the frontend URL in your browser.

Both frontend and backend servers must be running simultaneously.

## 9. Environment Variables

The `backend/.env.example` file contains the configuration variables required by the backend.

Configure the appropriate values for:

- PostgreSQL database connection
- Backend server configuration
- JWT authentication secret
- Additional service configuration listed in the template

For security reasons:

- Actual environment files are excluded from Git.
- Real database credentials must not be committed.
- JWT secrets must remain private.
- External service API keys must remain private.

## 10. Demo Account

After running the seed script, use the following credentials:

| Field | Value |
|-------|-------|
| Email | demo@sweety.com |
| Password | Demo@12345 |

The demo account contains sample historical glucose readings for testing the application and its reports.

Select dates containing the seeded readings to explore the reports.

These credentials are intended only for local demonstration and evaluation.

## 11. Database Design

### Users Table

Stores:

- User ID
- Name
- Email
- Password hash
- Avatar
- Password reset token hash
- Password reset token expiry
- Account creation timestamp

### Glucose Readings Table

Stores:

- Reading ID
- User ID
- Glucose level
- Reading date
- Time slot
- Reading type
- Measurement timestamp
- Record creation timestamp

### Database Constraints

- Primary keys for unique records
- Foreign key relationship between users and glucose readings
- Unique user email addresses
- Glucose range validation
- Restricted glucose reading time slots
- Unique user, date, and time slot combination
- Cascade deletion of readings associated with deleted users

A composite index on user ID and reading date improves reading lookup performance.

## 12. API Endpoints

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Check backend server status |

### Glucose Readings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/readings | Retrieve authenticated user's readings |
| POST | /api/readings | Create a glucose reading |
| PUT | /api/readings/:id | Update a glucose reading |
| DELETE | /api/readings/:id | Delete a glucose reading |

Glucose reading endpoints require JWT authentication.

The backend uses parameterized SQL queries and user-specific filtering to protect data access.

## 13. Testing

### JavaScript Syntax Check

From the project root:

```bash
node --check backend/routes/readingRoutes.js
```

### Manual Functional Testing

The following glucose reading tests were completed successfully in the local development environment:

| Test Case | Result |
|-----------|--------|
| Add valid glucose reading | Passed |
| Update existing glucose reading | Passed |
| Prevent duplicate time slots | Passed |
| Reject glucose values outside the allowed range | Passed |
| Prevent future measurement dates | Passed |
| Delete existing glucose reading | Passed |

Additional functionality available for manual evaluation:

- User registration and login
- Daily report
- Month-to-date report
- Previous-month report
- Empty-state messages
- Profile management
- Password reset
- Logout functionality
- Mobile responsiveness

### Automated Testing

An automated test suite is not included in the current submission.

Automated frontend tests, backend integration tests, and database validation tests are planned as future improvements.

## 14. Security and Reliability

- Password hashing using bcrypt
- JWT-based authentication
- Protected API endpoints
- User-specific database queries
- Parameterized SQL queries
- Backend input validation
- Database-level constraints
- PostgreSQL transaction handling
- Duplicate reading prevention
- Password reset token hashing
- Environment-based configuration

## 15. Screenshots and Demonstration

The application can be demonstrated locally using the installation instructions and demo account provided above.

The demonstration covers:

- User login
- Dashboard overview
- Glucose reading management
- Validation messages
- Daily and monthly reports
- Interactive glucose charts
- Profile management
- Responsive interface

## 16. Assumptions

- Each user has private glucose records.
- Glucose measurements are recorded in mg/dL.
- Each calendar day supports four predefined time slots.
- Only one reading per time slot per day is allowed.
- Dates are validated using the Asia/Kolkata timezone.
- Future measurement dates and times are not accepted.
- Reports are based on the selected calendar date.
- Average glucose values are displayed to one decimal place.
- The application is designed primarily for local development and technical evaluation.
- Demo credentials are for evaluation purposes only.

## 17. Future Improvements

With additional development time, the following improvements could be implemented:

- Automated frontend and backend testing
- Pagination and advanced filtering
- Docker-based deployment
- Redis caching
- Background job processing
- Email reminders and notifications
- Doctor and patient role-based access
- Exportable glucose reports
- Additional accessibility improvements
- Production deployment and monitoring
- Enhanced authentication security and rate limiting

## 18. Medical Disclaimer

Sweety is an educational demonstration application developed for a technical assignment.

It is intended to help users record and visualize blood glucose measurements.

It is not intended to diagnose medical conditions, recommend treatment, or replace professional medical advice.

## 19. Developer

**Venkatesh**

B.E. Computer Science and Engineering

GitHub: https://github.com/venkat7855

Project Repository:

https://github.com/venkat7855/sweety-blood-glucose-tracker

## 20. Assignment Details

| Field | Details |
|-------|---------|
| Company | Kenpath |
| Position | Junior Full Stack Developer – JavaScript & AI |
| Assignment | Sweety – Blood Glucose Tracker |
| Submission Deadline | 14 November 2026 |

---

Developed as part of the Kenpath technical assessment.
