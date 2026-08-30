const express = require("express");
const ExcelJS = require("exceljs");
const pool = require("../db/pool");

const router = express.Router();

router.get("/events.xlsx", async (req, res) => {
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
    `);

    const workbook = new ExcelJS.Workbook();

    const worksheet =
      workbook.addWorksheet("Analytics Events");

    worksheet.columns = [
      { header: "Event ID", key: "event_id", width: 12 },
      { header: "Event Name", key: "event_name", width: 25 },
      { header: "User ID", key: "user_id", width: 18 },
      { header: "User Role", key: "user_role", width: 15 },
      { header: "Tutor ID", key: "tutor_id", width: 18 },
      { header: "Session ID", key: "session_id", width: 40 },
      { header: "Page", key: "page", width: 30 },
      { header: "Entity Type", key: "entity_type", width: 20 },
      { header: "Entity ID", key: "entity_id", width: 20 },
      { header: "Metadata", key: "metadata", width: 40 },
      { header: "Created At", key: "created_at", width: 25 }
    ];

    result.rows.forEach((row) => {
      worksheet.addRow({
        ...row,
        metadata: JSON.stringify(row.metadata || {})
      });
    });

    worksheet.getRow(1).font = {
      bold: true
    };

    worksheet.autoFilter = {
      from: "A1",
      to: "K1"
    };

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1
      }
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="beyondz-analytics-events.xlsx"'
    );

    await workbook.xlsx.write(res);

    res.end();

  } catch (error) {
    console.error(
      "Excel export error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to export analytics data"
    });
  }
});

module.exports = router;