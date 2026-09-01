require("dotenv").config();

const path = require("path");

const express =
  require("express");

const cors =
  require("cors");

const helmet =
  require("helmet");

const pool =
  require("./db/pool");

const eventsRouter =
  require("./routes/events");

const exportsRouter =
  require("./routes/exports");


const app =
  express();


const PORT =
  process.env.PORT ||
  5000;


/*
========================================================
SECURITY
========================================================
*/

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);


/*
========================================================
CORS
========================================================
*/

const allowedOrigins = [

  /*
   * Local Academy development
   */

  "http://localhost:3000",

  "http://127.0.0.1:3000",


  /*
   * Local Analytics dashboard
   */

  "http://localhost:5000",

  "http://127.0.0.1:5000"

];


/*
 * Optional production Academy URLs
 *
 * Add them through .env:
 *
 * ACADEMY_ORIGIN=https://your-academy.onrender.com
 *
 * ANALYTICS_ORIGIN=https://your-analytics.onrender.com
 */

if (
  process.env.ACADEMY_ORIGIN
) {

  allowedOrigins.push(
    process.env.ACADEMY_ORIGIN
  );

}


if (
  process.env.ANALYTICS_ORIGIN
) {

  allowedOrigins.push(
    process.env.ANALYTICS_ORIGIN
  );

}


app.use(
  cors({

    origin:
      (
        origin,
        callback
      ) => {

        /*
         * Allow requests without an Origin header.
         *
         * Examples:
         * - Postman
         * - PowerShell
         * - curl
         * - server-to-server requests
         */

        if (
          !origin
        ) {

          return callback(
            null,
            true
          );

        }


        /*
         * Development convenience.
         *
         * Allows local browser ports while the system
         * is still being developed.
         */

        const isLocalhost =
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i
            .test(
              origin
            );


        if (
          isLocalhost
        ) {

          return callback(
            null,
            true
          );

        }


        if (
          allowedOrigins.includes(
            origin
          )
        ) {

          return callback(
            null,
            true
          );

        }


        console.warn(
          "Blocked CORS origin:",
          origin
        );


        return callback(
          new Error(
            "Not allowed by CORS"
          )
        );

      },

    credentials:
      true,

    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization"
    ]

  })
);


/*
========================================================
BODY PARSERS
========================================================
*/

/*
 * Analytics metadata should normally be small.
 *
 * 1 MB is more than enough for tracking events while also
 * protecting the API from unexpectedly huge JSON bodies.
 */

app.use(
  express.json({
    limit: "1mb"
  })
);


app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);


/*
========================================================
STATIC DASHBOARD
========================================================
*/

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/*
========================================================
ROOT
========================================================
*/

app.get(
  "/",
  (
    req,
    res
  ) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/*
========================================================
HEALTH CHECK
========================================================
*/

app.get(
  "/health",
  async (
    req,
    res
  ) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            NOW() AS server_time
          `
        );


      res.json({

        status:
          "healthy",

        api:
          "BeyondZ Analytics API",

        database:
          "connected",

        server_time:
          result.rows[0]
            .server_time

      });


    } catch (
      error
    ) {

      console.error(
        "Health check error:",
        error
      );


      res
        .status(500)
        .json({

          status:
            "unhealthy",

          api:
            "BeyondZ Analytics API",

          database:
            "disconnected"

        });

    }

  }
);


/*
========================================================
API INFO
========================================================
*/

app.get(
  "/api",
  (
    req,
    res
  ) => {

    res.json({

      success:
        true,

      service:
        "BeyondZ Analytics API",

      version:
        "1.0.0",

      endpoints: {

        events:
          "/api/events",

        event_categories:
          "/api/events/categories",

        exports:
          "/api/export",

        health:
          "/health"

      }

    });

  }
);


/*
========================================================
ANALYTICS ROUTES
========================================================
*/

app.use(
  "/api/events",
  eventsRouter
);


app.use(
  "/api/export",
  exportsRouter
);


/*
========================================================
API 404
========================================================
*/

app.use(
  "/api",
  (
    req,
    res
  ) => {

    res
      .status(404)
      .json({

        success:
          false,

        message:
          "API endpoint not found",

        method:
          req.method,

        path:
          req.originalUrl

      });

  }
);


/*
========================================================
GENERAL 404
========================================================
*/

app.use(
  (
    req,
    res
  ) => {

    res
      .status(404)
      .json({

        success:
          false,

        message:
          "Resource not found"

      });

  }
);


/*
========================================================
CENTRAL ERROR HANDLER
========================================================
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Unhandled server error:",
      error
    );


    /*
     * CORS rejection
     */

    if (
      error.message ===
      "Not allowed by CORS"
    ) {

      return res
        .status(403)
        .json({

          success:
            false,

          message:
            "Origin not allowed"

        });

    }


    /*
     * Invalid JSON
     */

    if (
      error instanceof
        SyntaxError &&
      error.status ===
        400 &&
      "body" in error
    ) {

      return res
        .status(400)
        .json({

          success:
            false,

          message:
            "Invalid JSON request body"

        });

    }


    return res
      .status(
        error.status ||
        500
      )
      .json({

        success:
          false,

        message:
          process.env.NODE_ENV ===
            "production"
            ? "Internal server error"
            : (
                error.message ||
                "Internal server error"
              )

      });

  }
);


/*
========================================================
START SERVER
========================================================
*/

const server =
  app.listen(
    PORT,
    () => {

      console.log(
        `BeyondZ Analytics API running on http://localhost:${PORT}`
      );

    }
  );


/*
========================================================
GRACEFUL SHUTDOWN
========================================================
*/

async function shutdown(
  signal
) {

  console.log(
    `${signal} received. Shutting down Analytics API...`
  );


  server.close(
    async () => {

      try {

        if (
          typeof pool.end ===
          "function"
        ) {

          await pool.end();

        }


        console.log(
          "Analytics API stopped."
        );


        process.exit(
          0
        );


      } catch (
        error
      ) {

        console.error(
          "Shutdown error:",
          error
        );


        process.exit(
          1
        );

      }

    }
  );

}


process.on(
  "SIGTERM",
  () => {

    shutdown(
      "SIGTERM"
    );

  }
);


process.on(
  "SIGINT",
  () => {

    shutdown(
      "SIGINT"
    );

  }
);