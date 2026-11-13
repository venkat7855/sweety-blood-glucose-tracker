
# Sweety – Blood Glucose Tracker

A full-stack blood glucose monitoring web application built
for the Kenpath Junior Full Stack Developer – JavaScript & AI
technical assignment.

## 1. Project Overview

Sweety allows users to securely record, manage, and review
up to four blood glucose readings per day.

The application provides daily, month-to-date, and previous
month reports to help users understand their recorded
glucose levels.

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

## 3. Required Features

### User Authentication
- Register using name, email, and password
- Login with registered credentials
- Passwords hashed using bcrypt
- JWT-based authentication
- User-specific glucose records

### Glucose Reading Management
- Add readings
- View reading history
- Edit existing readings
- Delete readings
- Record the measurement date and time slot

Four supported time slots:

1. Morning (fasting)
2. After breakfast
3. After lunch
4. After dinner

### Validation Rules

- Glucose value is required
- Glucose value must be a whole number from 40 to 600 mg/dL
- Only one reading per time slot per day
- Maximum four readings per day
- Future measurement dates are not allowed
- Validation errors are displayed to the user

## 4. Reports

### Daily Report
Displays readings for the selected date.

Includes:
- Number of readings
- Highest glucose value
- Lowest glucose value
- Average glucose value (1 decimal place)
- Individual readings and their time slots

### Month-to-Date Report
Displays readings from the first day of the selected
month through the selected date.

### Previous Month Report
Displays readings from the entire previous calendar month.

All reports display a friendly message when no readings
are available.

## 5. Additional Features

- Interactive glucose chart
- Daily reading progress indicator
- Activity tracker
- Profile management
- Avatar customization
- Password reset functionality
- Responsive user interface
- Logout confirmation dialog

## 6. Project Structure

    Sweety – Blood Glucose Tracker/
    ├── backend/
    ├── frontend/
    ├── README.md
    └── .gitignore

## 7. Installation and Setup

### Prerequisites

- Node.js and npm
- PostgreSQL
- Git

### Clone the Repository

    git clone <YOUR_GITHUB_REPOSITORY_URL>
    cd <PROJECT_FOLDER>

### Backend Setup

    cd backend
    npm install

Create a `.env` file using the provided `.env.example`
template.

Configure the PostgreSQL connection and JWT secret.

Create the PostgreSQL database and apply the schema
according to the database setup instructions.

Start the backend using the script defined in
`backend/package.json`.

Backend URL:

    http://localhost:5000

### Frontend Setup

Open a second terminal:

    cd frontend
    npm install
    npm run dev

Frontend URL:

    http://localhost:5173

## 8. Environment Variables

The repository will include a `.env.example` file
containing the required environment variable names
without real credentials.

Never commit actual `.env` files, database passwords,
or JWT secrets.

## 9. Database Setup and Demo Data

A seed script will be provided to create a demonstration
user and sample glucose readings.

Database setup commands, seed instructions, and demo
credentials will be documented after verification.

## 10. Running Tests

Automated test commands and their results will be
documented once the test setup is verified.

Manual functional testing covers:
- Registration and login
- Adding valid glucose readings
- Editing and deleting readings
- Daily and monthly reports
- User profile updates
- Logout and login again
- Mobile responsiveness

## 11. Screenshots and Demo

Screenshots or a 2–3 minute demonstration recording
will be included with the submission.

The demo will show:
- User login
- Glucose reading CRUD operations
- Validation
- Daily and monthly reports
- Responsive interface

## 12. Notes

### Assumptions

- Each user has their own private glucose records.
- Each calendar day supports four predefined time slots.
- Glucose measurements are recorded in mg/dL.
- Duplicate time slots for the same date are not allowed.
- Reports are based on the selected calendar date.

### Improvements With More Time

- Automated frontend and backend tests
- Pagination for glucose history
- Docker-based deployment
- Email reminders
- Additional accessibility improvements
- Production deployment and monitoring

## 13. Medical Disclaimer

Sweety is an educational demonstration application
for recording blood glucose measurements.

It is not intended to diagnose medical conditions
or replace professional medical advice.

## 14. Developer

Venkatesh

B.E. Computer Science and Engineering

GitHub:
https://github.com/venkat7855

## 15. Assignment Details

Company: Kenpath

Position: Junior Full Stack Developer – JavaScript & AI

Assignment: Sweety – Blood Glucose Tracker

Submission Deadline: 14 November 2026
