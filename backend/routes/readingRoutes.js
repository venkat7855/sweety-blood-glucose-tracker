const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

router.use(auth);

const SLOTS = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];

const INDIA_TIME_ZONE = "Asia/Kolkata";

function getIndiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateReading(body) {
  const {
    glucose_level,
    reading_date,
    time_slot,
    measured_at,
  } = body || {};

  if (
    glucose_level === undefined ||
    glucose_level === null ||
    glucose_level === ""
  ) {
    return "Please enter a glucose value.";
  }

  if (
    typeof glucose_level !== "number" &&
    (
      typeof glucose_level !== "string" ||
      !/^\d+$/.test(glucose_level.trim())
    )
  ) {
    return "Please enter a whole number between 40 and 600 mg/dL.";
  }

  const glucose = Number(glucose_level);

  if (
    !Number.isInteger(glucose) ||
    glucose < 40 ||
    glucose > 600
  ) {
    return "Please enter a whole number between 40 and 600 mg/dL.";
  }

  if (!isValidDate(reading_date)) {
    return "Please enter a valid date.";
  }

  if (reading_date > getIndiaDate()) {
    return "Date cannot be in the future.";
  }

  if (!SLOTS.includes(time_slot)) {
    return "Please select a valid reading type.";
  }

  if (
    typeof measured_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      measured_at
    )
  ) {
    return "Please select a valid measurement date and time.";
  }

  if (!isValidDate(measured_at.slice(0, 10))) {
    return "Please select a valid measurement date and time.";
  }

  const measuredDate = new Date(measured_at);

  if (Number.isNaN(measuredDate.getTime())) {
    return "Please select a valid measurement date and time.";
  }

  if (measuredDate > new Date()) {
    return "Measurement time cannot be in the future.";
  }

  if (getIndiaDate(measuredDate) !== reading_date) {
    return "Measurement date and selected date must match.";
  }

  return null;
}

function validateId(id) {
  const numericId = Number(id);

  return (
    /^\d+$/.test(String(id)) &&
    Number.isSafeInteger(numericId) &&
    numericId > 0 &&
    numericId <= 2147483647
  );
}

function handleError(error, res) {
  if (error.code === "23505") {
    return res.status(409).json({
      error: "You already have a reading for this type and date.",
    });
  }

  console.error("Reading database error:", error);

  return res.status(500).json({
    error: "Unable to complete your request. Please try again.",
  });
}

const READING_COLUMNS = `
  id,
  glucose_level,
  TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
  time_slot,
  measured_at,
  created_at
`;

// GET - All readings for logged-in user
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${READING_COLUMNS}
       FROM glucose_readings
       WHERE user_id = $1
       ORDER BY measured_at DESC, id DESC`,
      [req.userId]
    );

    return res.json(result.rows);
  } catch (error) {
    return handleError(error, res);
  }
});

// POST - Add glucose reading
router.post("/", async (req, res) => {
  const validationError = validateReading(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const {
    glucose_level,
    reading_date,
    time_slot,
    measured_at,
  } = req.body;

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Serialize writes for this user.
    await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [req.userId]
    );

    const existing = await client.query(
      `SELECT time_slot
       FROM glucose_readings
       WHERE user_id = $1
       AND reading_date = $2`,
      [req.userId, reading_date]
    );

    if (
      existing.rows.some(
        (reading) => reading.time_slot === time_slot
      )
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        error:
          "This reading type is already recorded for the selected date.",
      });
    }

    if (existing.rowCount >= 4) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "You can record only 4 readings per day.",
      });
    }

    const result = await client.query(
      `INSERT INTO glucose_readings (
         user_id,
         glucose_level,
         reading_date,
         time_slot,
         reading_type,
         measured_at
       )
       VALUES ($1, $2, $3, $4, $4, $5::timestamptz)
       RETURNING ${READING_COLUMNS}`,
      [
        req.userId,
        Number(glucose_level),
        reading_date,
        time_slot,
        measured_at,
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Reading added successfully!",
      reading: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(console.error);
    }

    return handleError(error, res);
  } finally {
    if (client) client.release();
  }
});

// PUT - Update glucose reading
router.put("/:id", async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({
      error: "Invalid reading ID.",
    });
  }

  const validationError = validateReading(req.body);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
  }

  const {
    glucose_level,
    reading_date,
    time_slot,
    measured_at,
  } = req.body;

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Serialize writes for this user.
    await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [req.userId]
    );

    const existing = await client.query(
      `SELECT id
       FROM glucose_readings
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );

    if (!existing.rowCount) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Reading not found.",
      });
    }

    const duplicate = await client.query(
      `SELECT id
       FROM glucose_readings
       WHERE user_id = $1
       AND reading_date = $2
       AND time_slot = $3
       AND id <> $4`,
      [
        req.userId,
        reading_date,
        time_slot,
        req.params.id,
      ]
    );

    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        error:
          "This reading type is already recorded for the selected date.",
      });
    }

    const count = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM glucose_readings
       WHERE user_id = $1
       AND reading_date = $2
       AND id <> $3`,
      [req.userId, reading_date, req.params.id]
    );

    if (count.rows[0].total >= 4) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "You can record only 4 readings per day.",
      });
    }

    const result = await client.query(
      `UPDATE glucose_readings
       SET
         glucose_level = $1,
         reading_date = $2,
         time_slot = $3,
         reading_type = $3,
         measured_at = $4::timestamptz
       WHERE id = $5 AND user_id = $6
       RETURNING ${READING_COLUMNS}`,
      [
        Number(glucose_level),
        reading_date,
        time_slot,
        measured_at,
        req.params.id,
        req.userId,
      ]
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        error: "Reading not found.",
      });
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      message: "Reading updated successfully!",
      reading: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(console.error);
    }

    return handleError(error, res);
  } finally {
    if (client) client.release();
  }
});

// DELETE - Remove glucose reading
router.delete("/:id", async (req, res) => {
  if (!validateId(req.params.id)) {
    return res.status(400).json({
      error: "Invalid reading ID.",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM glucose_readings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Reading not found.",
      });
    }

    return res.json({
      message: "Reading deleted successfully!",
    });
  } catch (error) {
    return handleError(error, res);
  }
});

module.exports = router;