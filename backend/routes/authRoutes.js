
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

const RESET_EXPIRY_MINUTES = 15;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const ALLOWED_AVATARS = [
  "👤",
  "👨",
  "👩",
  "🧑",
  "🧑‍⚕️",
  "💪",
  "🏃",
  "🧘",
  "❤️",
  "🌿",
];

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ========================================
// REGISTER USER
// ========================================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      !isValidEmail(email.trim()) ||
      password.length < 8
    ) {
      return res.status(400).json({
        error:
          "Enter a valid name, email and password (minimum 8 characters).",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, avatar`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Registration successful",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      error: "Registration failed",
    });
  }
});

// ========================================
// LOGIN USER
// ========================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, avatar
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "👤",
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "Login failed",
    });
  }
});

// ========================================
// GET USER PROFILE
// ========================================

router.get("/profile", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, avatar
       FROM users
       WHERE id = $1`,
      [req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.json({
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      error: "Unable to load profile.",
    });
  }
});

// ========================================
// UPDATE USER PROFILE
// ========================================

router.put("/profile", auth, async (req, res) => {
  try {
    const body = req.body || {};

    const hasName = Object.prototype.hasOwnProperty.call(
      body,
      "name"
    );

    const hasAvatar = Object.prototype.hasOwnProperty.call(
      body,
      "avatar"
    );

    if (!hasName && !hasAvatar) {
      return res.status(400).json({
        error: "Provide a name or avatar to update.",
      });
    }

    let updatedName = null;
    let updatedAvatar = null;

    // Validate name only when changing it
    if (hasName) {
      if (
        typeof body.name !== "string" ||
        body.name.trim().length < 1 ||
        body.name.trim().length > 100
      ) {
        return res.status(400).json({
          error: "Name must contain 1 to 100 characters.",
        });
      }

      updatedName = body.name.trim();
    }

    // Validate avatar only when changing it
    if (hasAvatar) {
      if (
        typeof body.avatar !== "string" ||
        !ALLOWED_AVATARS.includes(body.avatar)
      ) {
        return res.status(400).json({
          error: "Please select a valid profile avatar.",
        });
      }

      updatedAvatar = body.avatar;
    }

    const result = await pool.query(
      `UPDATE users
       SET
         name = COALESCE($1, name),
         avatar = COALESCE($2, avatar)
       WHERE id = $3
       RETURNING id, name, email, avatar`,
      [updatedName, updatedAvatar, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.json({
      message: "Profile updated successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      error: "Unable to update profile.",
    });
  }
});

// ========================================
// FORGOT PASSWORD
// ========================================

router.post("/forgot-password", async (req, res) => {
  const genericMessage =
    "If this email is registered, password reset instructions will be provided.";

  try {
    const { email } = req.body || {};

    if (
      typeof email !== "string" ||
      !isValidEmail(email.trim())
    ) {
      return res.status(400).json({
        error: "Enter a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");

      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await pool.query(
        `UPDATE users
         SET reset_token_hash = $1,
             reset_token_expires_at =
               NOW() + INTERVAL '15 minutes'
         WHERE id = $2`,
        [tokenHash, user.id]
      );

      const resetLink =
        `${FRONTEND_URL}/reset-password?token=${resetToken}`;

      if (process.env.NODE_ENV !== "production") {
        console.log("\n================================");
        console.log("SWEETY PASSWORD RESET - DEVELOPMENT");
        console.log("Reset link:", resetLink);
        console.log(
          `Link expires in ${RESET_EXPIRY_MINUTES} minutes.`
        );
        console.log("================================\n");
      }

      // Production TODO:
      // Send the reset link using an email provider.
    }

    return res.json({
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      error: "Unable to process password reset request.",
    });
  }
});

// ========================================
// RESET PASSWORD
// ========================================

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body || {};

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token) ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return res.status(400).json({
      error: "Invalid reset token or password.",
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT id
       FROM users
       WHERE reset_token_hash = $1
         AND reset_token_expires_at > NOW()
       FOR UPDATE`,
      [tokenHash]
    );

    const user = result.rows[0];

    if (!user) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        error: "Reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `UPDATE users
       SET password_hash = $1,
           reset_token_hash = NULL,
           reset_token_expires_at = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      message: "Password updated successfully. Please sign in.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(console.error);
    }

    console.error("Reset password error:", error.message);

    return res.status(500).json({
      error: "Unable to reset password.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
