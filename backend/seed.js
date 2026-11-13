
const bcrypt = require("bcrypt");
const pool = require("./db");

const DEMO_EMAIL = "demo@sweety.com";
const DEMO_PASSWORD = "Demo@12345";

async function seedDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create or find demo user
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ["Sweety Demo User", DEMO_EMAIL, passwordHash]
    );

    const userId = userResult.rows[0].id;

    // Use past dates to avoid future-date validation issues
    const today = new Date();

    const slots = [
      { name: "Morning (fasting)", value: 95, hour: 7 },
      { name: "After breakfast", value: 132, hour: 10 },
      { name: "After lunch", value: 145, hour: 14 },
      { name: "After dinner", value: 125, hour: 20 },
    ];

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const date = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - dayOffset
        )
      );

      const dateString = date.toISOString().slice(0, 10);

      for (let index = 0; index < slots.length; index++) {
        const slot = slots[index];

        // India local time (UTC + 05:30)
        const measuredAt = new Date(
          `${dateString}T${String(slot.hour).padStart(2, "0")}:00:00+05:30`
        ).toISOString();

        await client.query(
          `INSERT INTO glucose_readings (
             user_id,
             glucose_level,
             reading_date,
             time_slot,
             reading_type,
             measured_at
           )
           VALUES ($1, $2, $3, $4, $4, $5)
           ON CONFLICT (user_id, reading_date, time_slot)
           DO NOTHING`,
          [
            userId,
            slot.value + dayOffset,
            dateString,
            slot.name,
            measuredAt,
          ]
        );
      }
    }

    await client.query("COMMIT");

    console.log("Demo data seeded successfully!");
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch((error) => {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
  pool.end();
});
