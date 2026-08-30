const express = require("express");
const router = express.Router();

const pool = require("../db/pool");

router.post("/", async (req, res) => {
  try {
    const {
      event_name,
      user_id = null,
      user_role = null,
      tutor_id = null,
      session_id = null,
      page = null,
      entity_type = null,
      entity_id = null,
      metadata = {},
    } = req.body;

    if (!event_name) {
      return res.status(400).json({
        success: false,
        message: "event_name is required",
      });
    }

    const query = `
      INSERT INTO analytics_events (
        event_name,
        user_id,
        user_role,
        tutor_id,
        session_id,
        page,
        entity_type,
        entity_id,
        metadata
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      )
      RETURNING *
    `;

    const values = [
      event_name,
      user_id,
      user_role,
      tutor_id,
      session_id,
      page,
      entity_type,
      entity_id,
      metadata,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      event: result.rows[0],
    });
  } catch (error) {
    console.error("Analytics event error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to store analytics event",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        event_id,
        event_name,
        user_id,
        user_role,
        tutor_id,
        session_id,
        page,
        entity_type,
        entity_id,
        metadata,
        created_at
      FROM analytics_events
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      count: result.rows.length,
      events: result.rows
    });

  } catch (error) {
    console.error(
      "Get analytics events error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load analytics events"
    });
  }
});

module.exports = router;