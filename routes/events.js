const express =
  require("express");

const router =
  express.Router();

const pool =
  require("../db/pool");


/*
 * =========================================================
 * BEYONDZ ANALYTICS
 * EVENT CATEGORY DEFINITIONS
 * =========================================================
 *
 * Each category can match:
 *
 * 1. event_name fragments
 * 2. entity_type values
 *
 * This is more reliable than matching only event_name.
 * =========================================================
 */

const EVENT_CATEGORIES = {

  /*
   * ---------------------------------------------------------
   * STUDENT ACTIVITY
   * ---------------------------------------------------------
   */

  "student-activity": {

    eventTerms: [

      "page_view",
      "page_navigation",

      "academy_page_loaded",
      "academy_page_hidden",
      "academy_page_visible",
      "academy_page_exit",

      "login",
      "logout",

      "profile"

    ],

    entityTypes: [

      "page",
      "profile"

    ]

  },


  /*
   * ---------------------------------------------------------
   * LESSONS / VIDEOS / MATERIALS
   * ---------------------------------------------------------
   */

  "lessons-videos": {

    eventTerms: [

      "lesson_",

      "video_",

      "material_"

    ],

    entityTypes: [

      "lesson",
      "lesson_part",
      "video",
      "material"

    ]

  },


  /*
   * ---------------------------------------------------------
   * WRITTEN EXAMS
   * ---------------------------------------------------------
   */

  "written-exams": {

    eventTerms: [

      "written_exam_"

    ],

    entityTypes: [

      "written_exam"

    ]

  },


  /*
   * ---------------------------------------------------------
   * QUIZZES
   * ---------------------------------------------------------
   */

  quizzes: {

    eventTerms: [

      "quiz_",

      "practice_quiz_"

    ],

    entityTypes: [

      "lesson_quiz",
      "practice_quiz",
      "quiz"

    ]

  },


  /*
   * ---------------------------------------------------------
   * ATTENDANCE / QR
   * ---------------------------------------------------------
   */

  attendance: {

    eventTerms: [

      "attendance_",

      "attendance_qr_"

    ],

    entityTypes: [

      "attendance"

    ]

  },


  /*
   * ---------------------------------------------------------
   * ENROLLMENT / PURCHASE / PAYMENT
   * ---------------------------------------------------------
   */

  "enrollment-payments": {

    eventTerms: [

      "enrollment_",

      "enrolment_",

      "plan_",

      "purchase_",

      "payment_",

      "checkout_",

      "cart_",

      "slip_",

      "whatsapp_payment_",

      "subscription_"

    ],

    entityTypes: [

      "enrollment",
      "purchase",
      "payment",
      "checkout",
      "cart",
      "subscription"

    ]

  },


  /*
   * ---------------------------------------------------------
   * AI ASSISTANT
   * ---------------------------------------------------------
   */

  "ai-usage": {

    eventTerms: [

      "ai_",

      "ask_ai_"

    ],

    entityTypes: [

      "ai",
      "ai_assistant"

    ]

  },


  /*
   * ---------------------------------------------------------
   * SUBJECT CHAT
   * ---------------------------------------------------------
   */

  "subject-chat": {

    eventTerms: [

      "chat_",

      "subject_chat_"

    ],

    entityTypes: [

      "chat",
      "subject_chat"

    ]

  },


  /*
   * ---------------------------------------------------------
   * TUTOR OPERATIONS
   * ---------------------------------------------------------
   */

  "tutor-operations": {

    eventTerms: [

      "tutor_",

      "content_created",
      "content_updated",
      "content_deleted",

      "upload_",

      "lesson_created",
      "lesson_updated",

      "video_uploaded",

      "exam_created",

      "quiz_created"

    ],

    entityTypes: [

      "tutor",
      "content",
      "upload"

    ]

  },


  /*
   * ---------------------------------------------------------
   * SYSTEM / ERRORS
   * ---------------------------------------------------------
   */

  "system-errors": {

    eventTerms: [

      "_failed",

      "error",

      "failure",

      "exception"

    ],

    entityTypes: [

      "error",
      "system_error"

    ]

  }

};


/*
 * =========================================================
 * CATEGORY ALIASES
 * =========================================================
 *
 * Keeps older API calls working.
 * =========================================================
 */

const CATEGORY_ALIASES = {

  student_activity:
    "student-activity",

  lessons_videos:
    "lessons-videos",

  written_exams:
    "written-exams",

  tutor_operations:
    "tutor-operations",

  system_errors:
    "system-errors",

  finance:
    "enrollment-payments",

  enrollment:
    "enrollment-payments",

  ai:
    "ai-usage",

  chat:
    "subject-chat"

};


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function cleanValue(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return null;

  }


  const text =
    String(
      value
    ).trim();


  return (
    text ||
    null
  );

}


/*
 * ---------------------------------------------------------
 * SAFE INTEGER
 * ---------------------------------------------------------
 */

function safeInteger(
  value,
  fallback,
  min,
  max
) {

  const parsed =
    Number.parseInt(
      value,
      10
    );


  if (
    !Number.isFinite(
      parsed
    )
  ) {

    return fallback;

  }


  return Math.min(
    Math.max(
      parsed,
      min
    ),
    max
  );

}


/*
 * ---------------------------------------------------------
 * NORMALIZE CATEGORY
 * ---------------------------------------------------------
 */

function normalizeCategory(
  category
) {

  const cleaned =
    cleanValue(
      category
    );


  if (
    !cleaned ||
    cleaned ===
      "events" ||
    cleaned ===
      "all"
  ) {

    return null;

  }


  const normalized =
    cleaned
      .toLowerCase();


  if (
    EVENT_CATEGORIES[
      normalized
    ]
  ) {

    return normalized;

  }


  if (
    CATEGORY_ALIASES[
      normalized
    ]
  ) {

    return CATEGORY_ALIASES[
      normalized
    ];

  }


  return null;

}


/*
 * ---------------------------------------------------------
 * DATE VALIDATION
 * ---------------------------------------------------------
 */

function normalizeDate(
  value
) {

  const cleaned =
    cleanValue(
      value
    );


  if (
    !cleaned
  ) {

    return null;

  }


  const date =
    new Date(
      cleaned
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}


/*
 * =========================================================
 * BUILD CATEGORY SQL
 * =========================================================
 */

function addCategoryConditions({
  category,
  conditions,
  values
}) {

  if (
    !category
  ) {

    return;

  }


  const definition =
    EVENT_CATEGORIES[
      category
    ];


  if (
    !definition
  ) {

    return;

  }


  const categoryConditions =
    [];


  /*
   * ---------------------------------------------------------
   * EVENT NAME MATCHING
   * ---------------------------------------------------------
   */

  for (
    const term
    of definition.eventTerms ||
      []
  ) {

    values.push(
      `%${term}%`
    );


    categoryConditions.push(
      `
        LOWER(event_name)
        LIKE LOWER($${values.length})
      `
    );

  }


  /*
   * ---------------------------------------------------------
   * ENTITY TYPE MATCHING
   * ---------------------------------------------------------
   */

  for (
    const entityType
    of definition.entityTypes ||
      []
  ) {

    values.push(
      entityType
    );


    categoryConditions.push(
      `
        LOWER(
          COALESCE(
            entity_type,
            ''
          )
        )
        =
        LOWER(
          $${values.length}
        )
      `
    );

  }


  if (
    categoryConditions.length >
    0
  ) {

    conditions.push(
      `
        (
          ${categoryConditions.join(
            " OR "
          )}
        )
      `
    );

  }

}


/*
 * =========================================================
 * POST EVENT
 * =========================================================
 */

router.post(
  "/",
  async (
    req,
    res
  ) => {

    try {

      const {

        event_name,

        user_id =
          null,

        user_role =
          null,

        tutor_id =
          null,

        session_id =
          null,

        page =
          null,

        entity_type =
          null,

        entity_id =
          null,

        metadata =
          {}

      } =
        req.body ||
        {};


      /*
       * -----------------------------------------------------
       * EVENT NAME REQUIRED
       * -----------------------------------------------------
       */

      const eventName =
        cleanValue(
          event_name
        );


      if (
        !eventName
      ) {

        return res
          .status(
            400
          )
          .json({

            success:
              false,

            message:
              "event_name is required"

          });

      }


      /*
       * -----------------------------------------------------
       * METADATA MUST BE OBJECT
       * -----------------------------------------------------
       */

      let safeMetadata =
        metadata;


      if (
        !safeMetadata ||
        typeof safeMetadata !==
          "object" ||
        Array.isArray(
          safeMetadata
        )
      ) {

        safeMetadata =
          {};

      }


      /*
       * -----------------------------------------------------
       * INSERT
       * -----------------------------------------------------
       */

      const query =
        `

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

          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9

        )

        RETURNING *

      `;


      const values = [

        eventName,

        cleanValue(
          user_id
        ),

        cleanValue(
          user_role
        ),

        cleanValue(
          tutor_id
        ),

        cleanValue(
          session_id
        ),

        cleanValue(
          page
        ),

        cleanValue(
          entity_type
        ),

        cleanValue(
          entity_id
        ),

        safeMetadata

      ];


      const result =
        await pool.query(
          query,
          values
        );


      return res
        .status(
          201
        )
        .json({

          success:
            true,

          event:
            result.rows[0]

        });


    } catch (
      error
    ) {

      console.error(
        "Analytics event error:",
        error
      );


      return res
        .status(
          500
        )
        .json({

          success:
            false,

          message:
            "Failed to store analytics event"

        });

    }

  }
);


/*
 * =========================================================
 * GET EVENTS
 * =========================================================
 *
 * Examples:
 *
 * /api/events
 *
 * /api/events?category=quizzes
 *
 * /api/events?category=attendance
 *
 * /api/events?user_id=123
 *
 * /api/events?event_name=video_started
 *
 * /api/events?entity_type=written_exam
 *
 * /api/events?from=2026-09-01
 *
 * /api/events?to=2026-09-30
 *
 * /api/events?limit=100
 *
 * /api/events?offset=50
 * =========================================================
 */

router.get(
  "/",
  async (
    req,
    res
  ) => {

    try {

      const requestedCategory =
        cleanValue(
          req.query.category
        );


      const category =
        normalizeCategory(
          requestedCategory
        );


      /*
       * -----------------------------------------------------
       * CATEGORY VALIDATION
       * -----------------------------------------------------
       */

      if (
        requestedCategory &&
        requestedCategory !==
          "events" &&
        requestedCategory !==
          "all" &&
        !category
      ) {

        return res
          .status(
            400
          )
          .json({

            success:
              false,

            message:
              "Unknown analytics category",

            requested_category:
              requestedCategory,

            available_categories:
              Object.keys(
                EVENT_CATEGORIES
              )

          });

      }


      /*
       * -----------------------------------------------------
       * PAGINATION
       * -----------------------------------------------------
       */

      const limit =
        safeInteger(
          req.query.limit,
          50,
          1,
          1000
        );


      const offset =
        safeInteger(
          req.query.offset,
          0,
          0,
          1000000
        );


      /*
       * -----------------------------------------------------
       * FILTERS
       * -----------------------------------------------------
       */

      const eventName =
        cleanValue(
          req.query.event_name
        );


      const userId =
        cleanValue(
          req.query.user_id
        );


      const userRole =
        cleanValue(
          req.query.user_role
        );


      const tutorId =
        cleanValue(
          req.query.tutor_id
        );


      const sessionId =
        cleanValue(
          req.query.session_id
        );


      const entityType =
        cleanValue(
          req.query.entity_type
        );


      const entityId =
        cleanValue(
          req.query.entity_id
        );


      const page =
        cleanValue(
          req.query.page
        );


      const fromDate =
        normalizeDate(
          req.query.from
        );


      const toDate =
        normalizeDate(
          req.query.to
        );


      const conditions =
        [];


      const values =
        [];


      /*
       * -----------------------------------------------------
       * CATEGORY
       * -----------------------------------------------------
       */

      addCategoryConditions({

        category,

        conditions,

        values

      });


      /*
       * -----------------------------------------------------
       * EVENT NAME
       * -----------------------------------------------------
       */

      if (
        eventName
      ) {

        values.push(
          eventName
        );


        conditions.push(
          `
            LOWER(event_name)
            =
            LOWER($${values.length})
          `
        );

      }


      /*
       * -----------------------------------------------------
       * USER ID
       * -----------------------------------------------------
       */

      if (
        userId
      ) {

        values.push(
          userId
        );


        conditions.push(
          `
            user_id =
            $${values.length}
          `
        );

      }


      /*
       * -----------------------------------------------------
       * USER ROLE
       * -----------------------------------------------------
       */

      if (
        userRole
      ) {

        values.push(
          userRole
        );


        conditions.push(
          `
            LOWER(
              COALESCE(
                user_role,
                ''
              )
            )
            =
            LOWER(
              $${values.length}
            )
          `
        );

      }


      /*
       * -----------------------------------------------------
       * TUTOR ID
       * -----------------------------------------------------
       */

      if (
        tutorId
      ) {

        values.push(
          tutorId
        );


        conditions.push(
          `
            tutor_id =
            $${values.length}
          `
        );

      }


      /*
       * -----------------------------------------------------
       * SESSION ID
       * -----------------------------------------------------
       */

      if (
        sessionId
      ) {

        values.push(
          sessionId
        );


        conditions.push(
          `
            session_id =
            $${values.length}
          `
        );

      }


      /*
       * -----------------------------------------------------
       * ENTITY TYPE
       * -----------------------------------------------------
       */

      if (
        entityType
      ) {

        values.push(
          entityType
        );


        conditions.push(
          `
            LOWER(
              COALESCE(
                entity_type,
                ''
              )
            )
            =
            LOWER(
              $${values.length}
            )
          `
        );

      }


      /*
       * -----------------------------------------------------
       * ENTITY ID
       * -----------------------------------------------------
       */

      if (
        entityId
      ) {

        values.push(
          entityId
        );


        conditions.push(
          `
            entity_id =
            $${values.length}
          `
        );

      }


      /*
       * -----------------------------------------------------
       * PAGE
       * -----------------------------------------------------
       */

      if (
        page
      ) {

        values.push(
          `%${page}%`
        );


        conditions.push(
          `
            LOWER(
              COALESCE(
                page,
                ''
              )
            )
            LIKE
            LOWER(
              $${values.length}
            )
          `
        );

      }


      /*
       * -----------------------------------------------------
       * FROM DATE
       * -----------------------------------------------------
       */

      if (
        fromDate
      ) {

        values.push(
          fromDate
        );


        conditions.push(
          `
            created_at >=
            $${values.length}
          `
        );

      }


      /*
       * -----------------------------------------------------
       * TO DATE
       * -----------------------------------------------------
       */

      if (
        toDate
      ) {

        /*
         * If the user passes a date such as:
         *
         * 2026-09-01
         *
         * include the complete day.
         */

        const endDate =
          new Date(
            toDate
          );


        if (
          /^\d{4}-\d{2}-\d{2}$/.test(
            String(
              req.query.to
            )
          )
        ) {

          endDate.setDate(
            endDate.getDate() +
            1
          );

        }


        values.push(
          endDate
        );


        conditions.push(
          `
            created_at <
            $${values.length}
          `
        );

      }


      /*
       * =====================================================
       * COUNT QUERY
       * =====================================================
       */

      let countQuery =
        `

        SELECT
          COUNT(*)::int
          AS total

        FROM analytics_events

      `;


      if (
        conditions.length >
        0
      ) {

        countQuery +=
          `

          WHERE
            ${conditions.join(
              " AND "
            )}

        `;

      }


      const countResult =
        await pool.query(
          countQuery,
          values
        );


      const total =
        countResult.rows[0]
          ?.total ||
        0;


      /*
       * =====================================================
       * EVENTS QUERY
       * =====================================================
       */

      let query =
        `

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

      `;


      if (
        conditions.length >
        0
      ) {

        query +=
          `

          WHERE
            ${conditions.join(
              " AND "
            )}

        `;

      }


      /*
       * -----------------------------------------------------
       * LIMIT
       * -----------------------------------------------------
       */

      values.push(
        limit
      );


      const limitParameter =
        values.length;


      /*
       * -----------------------------------------------------
       * OFFSET
       * -----------------------------------------------------
       */

      values.push(
        offset
      );


      const offsetParameter =
        values.length;


      query +=
        `

        ORDER BY
          created_at DESC,
          event_id DESC

        LIMIT
          $${limitParameter}

        OFFSET
          $${offsetParameter}

      `;


      const result =
        await pool.query(
          query,
          values
        );


      /*
       * =====================================================
       * RESPONSE
       * =====================================================
       */

      return res.json({

        success:
          true,

        category:
          category ||
          "events",

        count:
          result.rows.length,

        total,

        limit,

        offset,

        has_more:
          offset +
            result.rows.length <
          total,

        events:
          result.rows

      });


    } catch (
      error
    ) {

      console.error(
        "Get analytics events error:",
        error
      );


      return res
        .status(
          500
        )
        .json({

          success:
            false,

          message:
            "Failed to load analytics events"

        });

    }

  }
);


/*
 * =========================================================
 * GET AVAILABLE CATEGORIES
 * =========================================================
 */

router.get(
  "/categories",
  (
    req,
    res
  ) => {

    res.json({

      success:
        true,

      categories:
        Object.keys(
          EVENT_CATEGORIES
        )

    });

  }
);


/*
 * =========================================================
 * EXPORT
 * =========================================================
 */

module.exports =
  router;