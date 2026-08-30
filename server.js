require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./db/pool");
const eventsRouter = require("./routes/events");
const exportsRouter = require("./routes/exports");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static("public"));


app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    res.json({
      status: "healthy",
      database: "connected",
      server_time: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

app.use("/api/events", eventsRouter);
app.use("/api/export", exportsRouter);

app.listen(PORT, () => {
  console.log(`BeyondZ Analytics API running on http://localhost:${PORT}`);
});