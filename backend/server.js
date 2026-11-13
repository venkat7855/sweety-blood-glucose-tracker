
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

// Import API routes
const authRoutes = require("./routes/authRoutes");
const readingRoutes = require("./routes/readingRoutes");

const app = express();

const PORT = Number(process.env.PORT || 5000);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20kb" }));

// Authentication API
app.use("/api/auth", authRoutes);

// Glucose readings API
app.use("/api/readings", readingRoutes);

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Sweety Backend Running Successfully!",
    status: "online",
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        NOW() AS server_time,
        current_setting('TimeZone') AS database_timezone
    `);

    return res.json({
      status: "success",
      database: "connected",
      serverTime: result.rows[0].server_time,
      databaseTimezone: result.rows[0].database_timezone,
    });
  } catch (error) {
    console.error("Database error:", error.message);

    return res.status(503).json({
      status: "error",
      database: "disconnected",
    });
  }
});

// Handle malformed JSON requests
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Invalid JSON request body.",
    });
  }

  next(error);
});

// Handle unknown routes
app.use((req, res) => {
  return res.status(404).json({
    error: "API endpoint not found",
    path: req.originalUrl,
  });
});

// General error handler
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Internal server error.",
  });
});

// Start backend only after checking database connection
async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully!");

    app.listen(PORT, () => {
      console.log("================================");
      console.log(" SWEETY BACKEND STARTED");
      console.log("================================");
      console.log(`Server: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(`Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`Readings API: http://localhost:${PORT}/api/readings`);
      console.log("================================");
    });
  } catch (error) {
    console.error("Unable to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
