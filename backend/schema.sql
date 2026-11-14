
-- SWEETY - BLOOD GLUCOSE TRACKER
-- PostgreSQL Database Schema

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    reset_token_hash TEXT,
    reset_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Glucose readings table
CREATE TABLE IF NOT EXISTS glucose_readings (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    glucose_level INTEGER NOT NULL
        CHECK (glucose_level BETWEEN 40 AND 600),

    reading_date DATE NOT NULL,

    time_slot VARCHAR(30) NOT NULL
        CHECK (time_slot IN (
            'Morning (fasting)',
            'After breakfast',
            'After lunch',
            'After dinner'
        )),

    reading_type VARCHAR(30) NOT NULL,

    measured_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_user_date_slot
        UNIQUE (user_id, reading_date, time_slot)
);

-- 3. Improve reading lookup performance
CREATE INDEX IF NOT EXISTS idx_glucose_user_date
ON glucose_readings (user_id, reading_date);
