const express =
  require("express");

const ExcelJS =
  require("exceljs");

const pool =
  require("../db/pool");

const router =
  express.Router();


/*
 * =========================================================
 * BEYONDZ ANALYTICS
 * EXCEL EXPORT SYSTEM
 * =========================================================
 *
 * Raw events remain available.
 *
 * Category exports flatten metadata into columns so the
 * resulting workbooks are easier to use with:
 *
 * - Excel
 * - Power BI
 * - R
 * - SQL / operational analysis
 * =========================================================
 */


/*
 * =========================================================
 * EVENT CATEGORY RULES
 * =========================================================
 */

const EVENT_CATEGORIES = {

  student_activity: {

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


  lessons_videos: {

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


  written_exams: {

    eventTerms: [

      "written_exam_"

    ],

    entityTypes: [

      "written_exam"

    ]

  },


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


  attendance: {

    eventTerms: [

      "attendance_",
      "attendance_qr_"

    ],

    entityTypes: [

      "attendance"

    ]

  },


  enrollment_payments: {

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


  ai_usage: {

    eventTerms: [

      "ai_",
      "ask_ai_"

    ],

    entityTypes: [

      "ai",
      "ai_assistant"

    ]

  },


  subject_chat: {

    eventTerms: [

      "chat_",
      "subject_chat_"

    ],

    entityTypes: [

      "chat",
      "subject_chat"

    ]

  },


  tutor_operations: {

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


  "system-errors": {
  eventTerms: [
    "error",
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
 * BASIC HELPERS
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


  if (
    typeof value ===
    "string"
  ) {

    const cleaned =
      value.trim();


    return (
      cleaned ||
      null
    );

  }


  return value;

}


/*
 * ---------------------------------------------------------
 * NUMBER
 * ---------------------------------------------------------
 */

function safeNumber(
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return null;

  }


  const number =
    Number(
      value
    );


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


/*
 * ---------------------------------------------------------
 * BOOLEAN
 * ---------------------------------------------------------
 */

function safeBoolean(
  value
) {

  if (
    value === true ||
    value === false
  ) {

    return value;

  }


  if (
    value ===
      "true" ||
    value ===
      1 ||
    value ===
      "1"
  ) {

    return true;

  }


  if (
    value ===
      "false" ||
    value ===
      0 ||
    value ===
      "0"
  ) {

    return false;

  }


  return null;

}


/*
 * ---------------------------------------------------------
 * METADATA
 * ---------------------------------------------------------
 */

function getMetadata(
  row
) {

  if (
    !row?.metadata
  ) {

    return {};

  }


  if (
    typeof row.metadata ===
    "object"
  ) {

    return row.metadata;

  }


  try {

    return JSON.parse(
      row.metadata
    );

  } catch {

    return {};

  }

}


/*
 * ---------------------------------------------------------
 * FIRST AVAILABLE VALUE
 * ---------------------------------------------------------
 */

function firstValue(
  ...values
) {

  for (
    const value
    of values
  ) {

    const cleaned =
      cleanValue(
        value
      );


    if (
      cleaned !== null &&
      cleaned !== undefined
    ) {

      return cleaned;

    }

  }


  return null;

}


/*
 * =========================================================
 * LOAD EVENTS
 * =========================================================
 */

async function loadEvents(
  category = null,
  filters = {}
) {

  const definition =
    category
      ? EVENT_CATEGORIES[
          category
        ]
      : null;


  const conditions =
    [];


  const values =
    [];


  /*
   * =======================================================
   * CATEGORY
   * =======================================================
   */

  if (
    definition
  ) {

    const categoryConditions =
      [];


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
   * =======================================================
   * SYNTHETIC DATA
   * =======================================================
   */

  if (
    filters.synthetic ===
    true
  ) {

    conditions.push(
      `
        metadata->>'synthetic'
        =
        'true'
      `
    );

  }


  /*
   * =======================================================
   * EVENT NAME
   * =======================================================
   */

  if (
    filters.event_name
  ) {

    values.push(
      `%${filters.event_name}%`
    );


    conditions.push(
      `
        LOWER(event_name)
        LIKE LOWER($${values.length})
      `
    );

  }


  /*
   * =======================================================
   * USER ID
   * =======================================================
   */

  if (
    filters.user_id
  ) {

    values.push(
      `%${filters.user_id}%`
    );


    conditions.push(
      `
        LOWER(
          COALESCE(
            user_id,
            ''
          )
        )
        LIKE LOWER(
          $${values.length}
        )
      `
    );

  }


  /*
   * =======================================================
   * TUTOR ID
   * =======================================================
   */

  if (
    filters.tutor_id
  ) {

    values.push(
      `%${filters.tutor_id}%`
    );


    conditions.push(
      `
        LOWER(
          COALESCE(
            tutor_id,
            ''
          )
        )
        LIKE LOWER(
          $${values.length}
        )
      `
    );

  }


  /*
   * =======================================================
   * ENTITY TYPE
   * =======================================================
   */

  if (
    filters.entity_type
  ) {

    values.push(
      `%${filters.entity_type}%`
    );


    conditions.push(
      `
        LOWER(
          COALESCE(
            entity_type,
            ''
          )
        )
        LIKE LOWER(
          $${values.length}
        )
      `
    );

  }


  /*
   * =======================================================
   * FROM DATE
   * =======================================================
   */

  if (
    filters.from
  ) {

    values.push(
      filters.from
    );


    conditions.push(
      `
        created_at
        >=
        $${values.length}::timestamptz
      `
    );

  }


  /*
   * =======================================================
   * TO DATE
   * =======================================================
   */

  if (
    filters.to
  ) {

    values.push(
      filters.to
    );


    conditions.push(
      `
        created_at
        <
        $${values.length}::timestamptz
      `
    );

  }


  const whereClause =
    conditions.length
      ? `
          WHERE
          ${conditions.join(
            "\nAND\n"
          )}
        `
      : "";


  const query =
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

      ${whereClause}

      ORDER BY
        created_at DESC,
        event_id DESC
    `;


  const result =
    await pool.query(
      query,
      values
    );


  return result.rows;

}


/*
 * =========================================================
 * COMMON EVENT DATA
 * =========================================================
 */

function buildCommonRow(
  row
) {

  const metadata =
    getMetadata(
      row
    );


  return {

    event_id:
      row.event_id,

    created_at:
      row.created_at,

    event_name:
      row.event_name,

    user_id:
      row.user_id,

    user_role:
      row.user_role,

    tutor_id:
      row.tutor_id,

    session_id:
      row.session_id,

    page:
      row.page,

    entity_type:
      row.entity_type,

    entity_id:
      row.entity_id,


    grade:
      firstValue(
        metadata.grade,
        metadata.student_grade
      ),

    subject:
      firstValue(
        metadata.subject,
        metadata.student_subject
      ),

    academic_year:
      firstValue(
        metadata.academic_year,
        metadata.academicYear
      ),


    lesson_id:
      firstValue(
        metadata.lesson_id,
        metadata.lessonId
      ),

    lesson_title:
      firstValue(
        metadata.lesson_title,
        metadata.lessonTitle
      ),


    part_id:
      firstValue(
        metadata.part_id,
        metadata.partId
      ),

    part_title:
      firstValue(
        metadata.part_title,
        metadata.partTitle
      )

  };

}


/*
 * =========================================================
 * WORKSHEET STYLE
 * =========================================================
 */

function styleWorksheet(
  worksheet
) {

  const header =
    worksheet.getRow(
      1
    );


  header.font = {

    bold:
      true

  };


  header.alignment = {

    vertical:
      "middle",

    wrapText:
      true

  };


  header.height =
    30;


  worksheet.views = [

    {

      state:
        "frozen",

      ySplit:
        1

    }

  ];


  if (
    worksheet.columnCount >
    0
  ) {

    worksheet.autoFilter = {

      from: {
        row: 1,
        column: 1
      },

      to: {
        row: 1,
        column:
          worksheet.columnCount
      }

    };

  }


  worksheet.eachRow(
    (
      row,
      rowNumber
    ) => {

      if (
        rowNumber >
        1
      ) {

        row.alignment = {

          vertical:
            "top"

        };

      }

    }
  );

}


/*
 * =========================================================
 * RAW EVENTS WORKSHEET
 * =========================================================
 */

function createRawEventsWorksheet(
  workbook,
  sheetName,
  rows
) {

  const worksheet =
    workbook.addWorksheet(
      sheetName.substring(
        0,
        31
      )
    );


  worksheet.columns = [

    {
      header:
        "Event ID",
      key:
        "event_id",
      width:
        12
    },

    {
      header:
        "Created At",
      key:
        "created_at",
      width:
        24
    },

    {
      header:
        "Event Name",
      key:
        "event_name",
      width:
        38
    },

    {
      header:
        "User ID",
      key:
        "user_id",
      width:
        20
    },

    {
      header:
        "User Role",
      key:
        "user_role",
      width:
        16
    },

    {
      header:
        "Tutor ID",
      key:
        "tutor_id",
      width:
        20
    },

    {
      header:
        "Session ID",
      key:
        "session_id",
      width:
        38
    },

    {
      header:
        "Page",
      key:
        "page",
      width:
        30
    },

    {
      header:
        "Entity Type",
      key:
        "entity_type",
      width:
        22
    },

    {
      header:
        "Entity ID",
      key:
        "entity_id",
      width:
        24
    },

    {
      header:
        "Metadata JSON",
      key:
        "metadata",
      width:
        60
    }

  ];


  for (
    const row
    of rows
  ) {

    worksheet.addRow({

      ...row,

      metadata:
        JSON.stringify(
          getMetadata(
            row
          )
        )

    });

  }


  styleWorksheet(
    worksheet
  );


  return worksheet;

}


/*
 * =========================================================
 * GENERIC ANALYTICS WORKSHEET
 * =========================================================
 */

function createAnalyticsWorksheet({
  workbook,
  sheetName,
  columns,
  rows,
  transform
}) {

  const worksheet =
    workbook.addWorksheet(
      sheetName.substring(
        0,
        31
      )
    );


  worksheet.columns =
    columns;


  for (
    const row
    of rows
  ) {

    worksheet.addRow(
      transform(
        row
      )
    );

  }


  styleWorksheet(
    worksheet
  );


  return worksheet;

}


/*
 * =========================================================
 * COMMON COLUMNS
 * =========================================================
 */

const COMMON_COLUMNS = [

  {
    header:
      "Event ID",
    key:
      "event_id",
    width:
      12
  },

  {
    header:
      "Created At",
    key:
      "created_at",
    width:
      24
  },

  {
    header:
      "Event Name",
    key:
      "event_name",
    width:
      38
  },

  {
    header:
      "User ID",
    key:
      "user_id",
    width:
      20
  },

  {
    header:
      "User Role",
    key:
      "user_role",
    width:
      16
  },

  {
    header:
      "Tutor ID",
    key:
      "tutor_id",
    width:
      20
  },

  {
    header:
      "Session ID",
    key:
      "session_id",
    width:
      38
  },

  {
    header:
      "Page",
    key:
      "page",
    width:
      30
  },

  {
    header:
      "Entity Type",
    key:
      "entity_type",
    width:
      22
  },

  {
    header:
      "Entity ID",
    key:
      "entity_id",
    width:
      24
  },

  {
    header:
      "Grade",
    key:
      "grade",
    width:
      12
  },

  {
    header:
      "Subject",
    key:
      "subject",
    width:
      20
  },

  {
    header:
      "Academic Year",
    key:
      "academic_year",
    width:
      16
  },

  {
    header:
      "Lesson ID",
    key:
      "lesson_id",
    width:
      20
  },

  {
    header:
      "Lesson Title",
    key:
      "lesson_title",
    width:
      30
  },

  {
    header:
      "Part ID",
    key:
      "part_id",
    width:
      20
  },

  {
    header:
      "Part Title",
    key:
      "part_title",
    width:
      30
  }

];


/*
 * =========================================================
 * STUDENT ACTIVITY
 * =========================================================
 */

function createStudentActivitySheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Student Activity",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Source",
        key:
          "source",
        width:
          22
      },

      {
        header:
          "Action",
        key:
          "action",
        width:
          25
      },

      {
        header:
          "Target",
        key:
          "target",
        width:
          30
      },

      {
        header:
          "Duration Seconds",
        key:
          "duration_seconds",
        width:
          18
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          source:
            firstValue(
              metadata.source,
              metadata.navigation_source
            ),

          action:
            firstValue(
              metadata.action,
              metadata.dashboard_action
            ),

          target:
            firstValue(
              metadata.target,
              metadata.destination,
              metadata.href
            ),

          duration_seconds:
            safeNumber(
              firstValue(
                metadata.duration_seconds,
                metadata.page_duration_seconds
              )
            )

        };

      }

  });

}


/*
 * =========================================================
 * LESSON / VIDEO ENGAGEMENT
 * =========================================================
 */

function createVideoSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Lessons & Videos",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Video ID",
        key:
          "video_id",
        width:
          22
      },

      {
        header:
          "Video Title",
        key:
          "video_title",
        width:
          30
      },

      {
        header:
          "Video Duration Seconds",
        key:
          "video_duration_seconds",
        width:
          22
      },

      {
        header:
          "Current Time Seconds",
        key:
          "current_time_seconds",
        width:
          20
      },

      {
        header:
          "Watch Seconds",
        key:
          "watch_seconds",
        width:
          18
      },

      {
        header:
          "Completion %",
        key:
          "completion_percentage",
        width:
          18
      },

      {
        header:
          "Progress Bucket",
        key:
          "progress_bucket",
        width:
          18
      },

      {
        header:
          "Seek From",
        key:
          "seek_from",
        width:
          15
      },

      {
        header:
          "Seek To",
        key:
          "seek_to",
        width:
          15
      },

      {
        header:
          "Source",
        key:
          "source",
        width:
          22
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          video_id:
            firstValue(
              metadata.video_id,
              metadata.videoId
            ),

          video_title:
            firstValue(
              metadata.video_title,
              metadata.videoTitle
            ),

          video_duration_seconds:
            safeNumber(
              firstValue(
                metadata.video_duration_seconds,
                metadata.duration_seconds
              )
            ),

          current_time_seconds:
            safeNumber(
              firstValue(
                metadata.current_time_seconds,
                metadata.currentTime
              )
            ),

          watch_seconds:
            safeNumber(
              metadata.watch_seconds
            ),

          completion_percentage:
            safeNumber(
              firstValue(
                metadata.completion_percentage,
                metadata.progress_percentage
              )
            ),

          progress_bucket:
            safeNumber(
              metadata.progress_bucket
            ),

          seek_from:
            safeNumber(
              metadata.seek_from
            ),

          seek_to:
            safeNumber(
              metadata.seek_to
            ),

          source:
            cleanValue(
              metadata.source
            )

        };

      }

  });

}


/*
 * =========================================================
 * WRITTEN EXAMS
 * =========================================================
 */

function createWrittenExamSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Written Exams",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Exam ID",
        key:
          "exam_id",
        width:
          22
      },

      {
        header:
          "Exam Title",
        key:
          "exam_title",
        width:
          32
      },

      {
        header:
          "Requires Timer",
        key:
          "requires_timer",
        width:
          16
      },

      {
        header:
          "Time Limit Minutes",
        key:
          "time_limit_minutes",
        width:
          20
      },

      {
        header:
          "Exam Duration Seconds",
        key:
          "exam_duration_seconds",
        width:
          22
      },

      {
        header:
          "Submission Open Duration",
        key:
          "submission_open_duration_seconds",
        width:
          25
      },

      {
        header:
          "File Count",
        key:
          "file_count",
        width:
          14
      },

      {
        header:
          "Total File Size Bytes",
        key:
          "total_file_size_bytes",
        width:
          22
      },

      {
        header:
          "File Types",
        key:
          "file_types",
        width:
          30
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      },

      {
        header:
          "Submitted",
        key:
          "submitted",
        width:
          14
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        const fileTypes =
          metadata.file_types;


        return {

          ...buildCommonRow(
            row
          ),

          exam_id:
            firstValue(
              metadata.exam_id,
              metadata.examId,
              row.entity_id
            ),

          exam_title:
            firstValue(
              metadata.exam_title,
              metadata.exam_name,
              metadata.examTitle
            ),

          requires_timer:
            safeBoolean(
              metadata.requires_timer
            ),

          time_limit_minutes:
            safeNumber(
              metadata.time_limit_minutes
            ),

          exam_duration_seconds:
            safeNumber(
              firstValue(
                metadata.exam_duration_seconds,
                metadata.duration_seconds
              )
            ),

          submission_open_duration_seconds:
            safeNumber(
              metadata
                .submission_open_duration_seconds
            ),

          file_count:
            safeNumber(
              metadata.file_count
            ),

          total_file_size_bytes:
            safeNumber(
              metadata.total_file_size_bytes
            ),

          file_types:
            Array.isArray(
              fileTypes
            )
              ? fileTypes.join(
                  ", "
                )
              : cleanValue(
                  fileTypes
                ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            ),

          submitted:
            row.event_name ===
              "written_exam_submitted"
              ? true
              : (
                  metadata.submitted !==
                    undefined
                    ? safeBoolean(
                        metadata.submitted
                      )
                    : null
                )

        };

      }

  });

}


/*
 * =========================================================
 * QUIZ PERFORMANCE
 * =========================================================
 */

function createQuizSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Quiz Performance",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Quiz ID",
        key:
          "quiz_id",
        width:
          22
      },

      {
        header:
          "Quiz Title",
        key:
          "quiz_title",
        width:
          30
      },

      {
        header:
          "Quiz Type",
        key:
          "quiz_type",
        width:
          18
      },

      {
        header:
          "Graded",
        key:
          "graded",
        width:
          12
      },

      {
        header:
          "Score",
        key:
          "score",
        width:
          12
      },

      {
        header:
          "Percentage",
        key:
          "percentage",
        width:
          14
      },

      {
        header:
          "Correct Answers",
        key:
          "correct_answers",
        width:
          18
      },

      {
        header:
          "Total Questions",
        key:
          "total_questions",
        width:
          18
      },

      {
        header:
          "Passed",
        key:
          "passed",
        width:
          12
      },

      {
        header:
          "Pass Mark",
        key:
          "pass_mark",
        width:
          14
      },

      {
        header:
          "Answered Count",
        key:
          "answered_count",
        width:
          18
      },

      {
        header:
          "Question ID",
        key:
          "question_id",
        width:
          22
      },

      {
        header:
          "Duration Seconds",
        key:
          "duration_seconds",
        width:
          18
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          quiz_id:
            firstValue(
              metadata.quiz_id,
              metadata.quizId,
              row.entity_id
            ),

          quiz_title:
            firstValue(
              metadata.quiz_title,
              metadata.quizTitle
            ),

          quiz_type:
            firstValue(
              metadata.quiz_type,
              metadata.quizType
            ),

          graded:
            safeBoolean(
              metadata.graded
            ),

          score:
            safeNumber(
              metadata.score
            ),

          percentage:
            safeNumber(
              firstValue(
                metadata.percentage,
                metadata.score_percentage
              )
            ),

          correct_answers:
            safeNumber(
              metadata.correct_answers
            ),

          total_questions:
            safeNumber(
              metadata.total_questions
            ),

          passed:
            safeBoolean(
              metadata.passed
            ),

          pass_mark:
            safeNumber(
              metadata.pass_mark
            ),

          answered_count:
            safeNumber(
              metadata.answered_count
            ),

          question_id:
            cleanValue(
              metadata.question_id
            ),

          duration_seconds:
            safeNumber(
              metadata.duration_seconds
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * ATTENDANCE / QR
 * =========================================================
 */

function createAttendanceSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Attendance & QR",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Attendance ID",
        key:
          "attendance_id",
        width:
          22
      },

      {
        header:
          "Attendance Method",
        key:
          "attendance_method",
        width:
          20
      },

      {
        header:
          "Source",
        key:
          "source",
        width:
          22
      },

      {
        header:
          "QR Available",
        key:
          "qr_available",
        width:
          15
      },

      {
        header:
          "QR Active",
        key:
          "qr_active",
        width:
          15
      },

      {
        header:
          "Account Suspended",
        key:
          "account_suspended",
        width:
          20
      },

      {
        header:
          "QR Card Visible",
        key:
          "qr_card_visible",
        width:
          18
      },

      {
        header:
          "QR Image Available",
        key:
          "qr_image_available",
        width:
          20
      },

      {
        header:
          "Load Number",
        key:
          "load_number",
        width:
          14
      },

      {
        header:
          "Download Number",
        key:
          "download_number",
        width:
          18
      },

      {
        header:
          "Print Number",
        key:
          "print_number",
        width:
          14
      },

      {
        header:
          "Present",
        key:
          "present",
        width:
          12
      },

      {
        header:
          "Attendance Status",
        key:
          "attendance_status",
        width:
          20
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          attendance_id:
            firstValue(
              metadata.attendance_id,
              row.entity_id
            ),

          attendance_method:
            firstValue(
              metadata.attendance_method,
              "qr"
            ),

          source:
            cleanValue(
              metadata.source
            ),

          qr_available:
            safeBoolean(
              metadata.qr_available
            ),

          qr_active:
            safeBoolean(
              metadata.qr_active
            ),

          account_suspended:
            safeBoolean(
              metadata.account_suspended
            ),

          qr_card_visible:
            safeBoolean(
              metadata.qr_card_visible
            ),

          qr_image_available:
            safeBoolean(
              metadata.qr_image_available
            ),

          load_number:
            safeNumber(
              metadata.load_number
            ),

          download_number:
            safeNumber(
              metadata.download_number
            ),

          print_number:
            safeNumber(
              metadata.print_number
            ),

          present:
            safeBoolean(
              metadata.present
            ),

          attendance_status:
            cleanValue(
              metadata.attendance_status
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * ENROLLMENT / PAYMENT
 * =========================================================
 */

function createEnrollmentSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Enrollment & Payments",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Plan Type",
        key:
          "plan_type",
        width:
          18
      },

      {
        header:
          "Month",
        key:
          "month",
        width:
          16
      },

      {
        header:
          "Selected Lesson Count",
        key:
          "selected_lesson_count",
        width:
          22
      },

      {
        header:
          "Agreed",
        key:
          "agreed",
        width:
          12
      },

      {
        header:
          "Payment Method",
        key:
          "payment_method",
        width:
          20
      },

      {
        header:
          "Payment Status",
        key:
          "payment_status",
        width:
          20
      },

      {
        header:
          "Amount",
        key:
          "amount",
        width:
          16
      },

      {
        header:
          "Currency",
        key:
          "currency",
        width:
          12
      },

      {
        header:
          "File Count",
        key:
          "file_count",
        width:
          14
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          plan_type:
            firstValue(
              metadata.plan_type,
              metadata.planType
            ),

          month:
            firstValue(
              metadata.month,
              metadata.selected_month
            ),

          selected_lesson_count:
            safeNumber(
              firstValue(
                metadata.selected_lesson_count,
                metadata.lesson_count
              )
            ),

          agreed:
            safeBoolean(
              metadata.agreed
            ),

          payment_method:
            cleanValue(
              metadata.payment_method
            ),

          payment_status:
            firstValue(
              metadata.payment_status,
              metadata.status
            ),

          amount:
            safeNumber(
              metadata.amount
            ),

          currency:
            cleanValue(
              metadata.currency
            ),

          file_count:
            safeNumber(
              metadata.file_count
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * AI USAGE
 * =========================================================
 */

function createAiUsageSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "AI Usage",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Source",
        key:
          "source",
        width:
          22
      },

      {
        header:
          "Question Length",
        key:
          "question_length",
        width:
          18
      },

      {
        header:
          "Question Word Count",
        key:
          "question_word_count",
        width:
          22
      },

      {
        header:
          "Answer Length",
        key:
          "answer_length",
        width:
          18
      },

      {
        header:
          "Source Count",
        key:
          "source_count",
        width:
          16
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          source:
            cleanValue(
              metadata.source
            ),

          question_length:
            safeNumber(
              metadata.question_length
            ),

          question_word_count:
            safeNumber(
              metadata.question_word_count
            ),

          answer_length:
            safeNumber(
              metadata.answer_length
            ),

          source_count:
            safeNumber(
              metadata.source_count
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * SUBJECT CHAT
 * =========================================================
 */

function createSubjectChatSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Subject Chat",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Message Length",
        key:
          "message_length",
        width:
          18
      },

      {
        header:
          "Message Word Count",
        key:
          "message_word_count",
        width:
          22
      },

      {
        header:
          "Message Count",
        key:
          "message_count",
        width:
          18
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          message_length:
            safeNumber(
              metadata.message_length
            ),

          message_word_count:
            safeNumber(
              metadata.message_word_count
            ),

          message_count:
            safeNumber(
              metadata.message_count
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * TUTOR OPERATIONS
 * =========================================================
 */

function createTutorOperationsSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "Tutor Operations",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Action",
        key:
          "action",
        width:
          24
      },

      {
        header:
          "Content Type",
        key:
          "content_type",
        width:
          20
      },

      {
        header:
          "File Count",
        key:
          "file_count",
        width:
          14
      },

      {
        header:
          "File Size Bytes",
        key:
          "file_size_bytes",
        width:
          20
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          action:
            firstValue(
              metadata.action,
              row.event_name
            ),

          content_type:
            firstValue(
              metadata.content_type,
              row.entity_type
            ),

          file_count:
            safeNumber(
              metadata.file_count
            ),

          file_size_bytes:
            safeNumber(
              firstValue(
                metadata.file_size_bytes,
                metadata.total_file_size_bytes
              )
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            )

        };

      }

  });

}


/*
 * =========================================================
 * SYSTEM ERRORS
 * =========================================================
 */

function createSystemErrorsSheet(
  workbook,
  rows
) {

  return createAnalyticsWorksheet({

    workbook,

    sheetName:
      "System Errors",

    columns: [

      ...COMMON_COLUMNS,

      {
        header:
          "Error Type",
        key:
          "error_type",
        width:
          25
      },

      {
        header:
          "HTTP Status",
        key:
          "http_status",
        width:
          14
      },

      {
        header:
          "Request Duration Ms",
        key:
          "request_duration_ms",
        width:
          20
      },

      {
        header:
          "Source",
        key:
          "source",
        width:
          22
      }

    ],

    rows,

    transform:
      (
        row
      ) => {

        const metadata =
          getMetadata(
            row
          );


        return {

          ...buildCommonRow(
            row
          ),

          error_type:
            firstValue(
              metadata.error_type,
              metadata.error_name
            ),

          http_status:
            safeNumber(
              metadata.http_status
            ),

          request_duration_ms:
            safeNumber(
              metadata.request_duration_ms
            ),

          source:
            cleanValue(
              metadata.source
            )

        };

      }

  });

}


/*
 * =========================================================
 * EXPORT REQUEST FILTERS
 * =========================================================
 */

function getExportFilters(
  req
) {

  return {

    synthetic:
      String(
        req.query.synthetic ||
        ""
      )
        .trim()
        .toLowerCase() ===
      "true",

    event_name:
      cleanValue(
        req.query.event_name
      ),

    user_id:
      cleanValue(
        req.query.user_id
      ),

    tutor_id:
      cleanValue(
        req.query.tutor_id
      ),

    entity_type:
      cleanValue(
        req.query.entity_type
      ),

    from:
      cleanValue(
        req.query.from
      ),

    to:
      cleanValue(
        req.query.to
      ),

    filename_from:
      cleanValue(
        req.query.filename_from
      ),

    filename_to:
      cleanValue(
        req.query.filename_to
      )

  };

}


/*
 * =========================================================
 * SAFE FILENAME VALUE
 * =========================================================
 */

function safeFilenamePart(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }


  return String(
    value
  )
    .trim()
    .replace(
      /[<>:"/\\|?*]+/g,
      "-"
    )
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^[-_.]+|[-_.]+$/g,
      ""
    )
    .substring(
      0,
      60
    );

}


/*
 * =========================================================
 * EXPORT DATE
 * =========================================================
 */

function getExportDate() {

  const now =
    new Date();


  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Colombo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    );


  const parts =
    formatter.formatToParts(
      now
    );


  const values =
    {};


  for (
    const part
    of parts
  ) {

    if (
      part.type !==
      "literal"
    ) {

      values[
        part.type
      ] =
        part.value;

    }

  }


  return (
    `${values.year}-` +
    `${values.month}-` +
    `${values.day}`
  );

}


/*
 * =========================================================
 * AUTOMATIC EXPORT FILENAME
 * =========================================================
 */

function buildExportFilename({

  categoryLabel,

  filters

}) {

  const parts =
    [
      "BeyondZ",

      filters.synthetic
        ? "Synthetic"
        : "Real",

      categoryLabel
    ];


  if (
    filters.event_name
  ) {

    parts.push(
      `Event-${filters.event_name}`
    );

  }


  if (
    filters.user_id
  ) {

    parts.push(
      `User-${filters.user_id}`
    );

  }


  if (
    filters.tutor_id
  ) {

    parts.push(
      `Tutor-${filters.tutor_id}`
    );

  }


  if (
    filters.entity_type
  ) {

    parts.push(
      `Entity-${filters.entity_type}`
    );

  }


  if (
    filters.filename_from
  ) {

    parts.push(
      `From-${filters.filename_from}`
    );

  }


  if (
    filters.filename_to
  ) {

    parts.push(
      `To-${filters.filename_to}`
    );

  }


  parts.push(
    getExportDate()
  );


  return (
    parts
      .map(
        safeFilenamePart
      )
      .filter(
        Boolean
      )
      .join(
        "_"
      ) +
    ".xlsx"
  );

}


/*
 * =========================================================
 * SEND EXCEL
 * =========================================================
 */

async function sendWorkbook(
  res,
  workbook,
  filename
) {

  workbook.creator =
    "BeyondZ Analytics";

  workbook.company =
    "BeyondZ Academy";

  workbook.created =
    new Date();


  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );


  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );


  await workbook.xlsx.write(
    res
  );


  res.end();

}


/*
 * =========================================================
 * 1. RAW EVENTS
 * =========================================================
 */

router.get(
  "/events.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          null,
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createRawEventsWorksheet(
        workbook,
        "All Events",
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "All Events",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "All events export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export analytics events"

        });

    }

  }
);


/*
 * =========================================================
 * 2. STUDENT ACTIVITY
 * =========================================================
 */

router.get(
  "/student-activity.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "student_activity",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createStudentActivitySheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Student Activity",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Student activity export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export student activity"

        });

    }

  }
);


/*
 * =========================================================
 * 3. LESSON / VIDEO ENGAGEMENT
 * =========================================================
 */

router.get(
  "/lessons-videos.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "lessons_videos",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createVideoSheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Lessons Videos",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Lesson/video export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export lesson/video data"

        });

    }

  }
);


/*
 * =========================================================
 * 4. WRITTEN EXAMS
 * =========================================================
 */

router.get(
  "/written-exams.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "written_exams",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createWrittenExamSheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Written Exams",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Written exam export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export written exam data"

        });

    }

  }
);


/*
 * =========================================================
 * 5. QUIZZES
 * =========================================================
 */

router.get(
  "/quizzes.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "quizzes",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createQuizSheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Quiz Performance",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Quiz export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export quiz data"

        });

    }

  }
);


/*
 * =========================================================
 * 6. ATTENDANCE / QR
 * =========================================================
 */

router.get(
  "/attendance.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "attendance",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createAttendanceSheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Attendance QR",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Attendance export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export attendance data"

        });

    }

  }
);


/*
 * =========================================================
 * 7. ENROLLMENT / PAYMENTS
 * =========================================================
 */

router.get(
  "/enrollment-payments.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const filters =
        getExportFilters(
          req
        );


      const rows =
        await loadEvents(
          "enrollment_payments",
          filters
        );


      const workbook =
        new ExcelJS.Workbook();


      createEnrollmentSheet(
        workbook,
        rows
      );


      await sendWorkbook(

        res,

        workbook,

        buildExportFilename({

          categoryLabel:
            "Enrollment Payments",

          filters

        })

      );


    } catch (
      error
    ) {

      console.error(
        "Enrollment export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export enrollment/payment data"

        });

    }

  }
);

/*
 * =========================================================
 * LEGACY FINANCE URL
 * =========================================================
 *
 * Keeps the old /finance.xlsx link working.
 * =========================================================
 */

router.get(
  "/finance.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await loadEvents(
          "enrollment_payments"
        );


      const workbook =
        new ExcelJS.Workbook();


      createEnrollmentSheet(
        workbook,
        rows
      );


      await sendWorkbook(
        res,
        workbook,
        "beyondz-enrollment-payments.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "Finance export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export enrollment/payment data"

        });

    }

  }
);


/*
 * =========================================================
 * 8. AI USAGE
 * =========================================================
 */

router.get(
  "/ai-usage.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await loadEvents(
          "ai_usage"
        );


      const workbook =
        new ExcelJS.Workbook();


      createAiUsageSheet(
        workbook,
        rows
      );


      await sendWorkbook(
        res,
        workbook,
        "beyondz-ai-usage.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "AI usage export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export AI usage data"

        });

    }

  }
);


/*
 * =========================================================
 * 9. SUBJECT CHAT
 * =========================================================
 */

router.get(
  "/subject-chat.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await loadEvents(
          "subject_chat"
        );


      const workbook =
        new ExcelJS.Workbook();


      createSubjectChatSheet(
        workbook,
        rows
      );


      await sendWorkbook(
        res,
        workbook,
        "beyondz-subject-chat.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "Subject chat export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export subject chat data"

        });

    }

  }
);


/*
 * =========================================================
 * 10. TUTOR OPERATIONS
 * =========================================================
 */

router.get(
  "/tutor-operations.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await loadEvents(
          "tutor_operations"
        );


      const workbook =
        new ExcelJS.Workbook();


      createTutorOperationsSheet(
        workbook,
        rows
      );


      await sendWorkbook(
        res,
        workbook,
        "beyondz-tutor-operations.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "Tutor operations export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export tutor operations"

        });

    }

  }
);


/*
 * =========================================================
 * 11. SYSTEM ERRORS
 * =========================================================
 */

router.get(
  "/system-errors.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const rows =
        await loadEvents(
          "system_errors"
        );


      const workbook =
        new ExcelJS.Workbook();


      createSystemErrorsSheet(
        workbook,
        rows
      );


      await sendWorkbook(
        res,
        workbook,
        "beyondz-system-errors.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "System error export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export system error data"

        });

    }

  }
);


/*
 * =========================================================
 * 12. COMPLETE ANALYTICS WORKBOOK
 * =========================================================
 */

router.get(
  "/complete.xlsx",
  async (
    req,
    res
  ) => {

    try {

      const workbook =
        new ExcelJS.Workbook();


      /*
       * -----------------------------------------------------
       * RAW DATA
       * -----------------------------------------------------
       */

      const allEvents =
        await loadEvents();


      createRawEventsWorksheet(
        workbook,
        "Raw Events",
        allEvents
      );


      /*
       * -----------------------------------------------------
       * STUDENT ACTIVITY
       * -----------------------------------------------------
       */

      createStudentActivitySheet(
        workbook,
        await loadEvents(
          "student_activity"
        )
      );


      /*
       * -----------------------------------------------------
       * VIDEOS
       * -----------------------------------------------------
       */

      createVideoSheet(
        workbook,
        await loadEvents(
          "lessons_videos"
        )
      );


      /*
       * -----------------------------------------------------
       * WRITTEN EXAMS
       * -----------------------------------------------------
       */

      createWrittenExamSheet(
        workbook,
        await loadEvents(
          "written_exams"
        )
      );


      /*
       * -----------------------------------------------------
       * QUIZZES
       * -----------------------------------------------------
       */

      createQuizSheet(
        workbook,
        await loadEvents(
          "quizzes"
        )
      );


      /*
       * -----------------------------------------------------
       * ATTENDANCE
       * -----------------------------------------------------
       */

      createAttendanceSheet(
        workbook,
        await loadEvents(
          "attendance"
        )
      );


      /*
       * -----------------------------------------------------
       * ENROLLMENT / PAYMENTS
       * -----------------------------------------------------
       */

      createEnrollmentSheet(
        workbook,
        await loadEvents(
          "enrollment_payments"
        )
      );


      /*
       * -----------------------------------------------------
       * AI
       * -----------------------------------------------------
       */

      createAiUsageSheet(
        workbook,
        await loadEvents(
          "ai_usage"
        )
      );


      /*
       * -----------------------------------------------------
       * CHAT
       * -----------------------------------------------------
       */

      createSubjectChatSheet(
        workbook,
        await loadEvents(
          "subject_chat"
        )
      );


      /*
       * -----------------------------------------------------
       * TUTOR OPERATIONS
       * -----------------------------------------------------
       */

      createTutorOperationsSheet(
        workbook,
        await loadEvents(
          "tutor_operations"
        )
      );


      /*
       * -----------------------------------------------------
       * ERRORS
       * -----------------------------------------------------
       */

      createSystemErrorsSheet(
        workbook,
        await loadEvents(
          "system_errors"
        )
      );


      /*
       * -----------------------------------------------------
       * SEND
       * -----------------------------------------------------
       */

      await sendWorkbook(
        res,
        workbook,
        "beyondz-complete-analytics.xlsx"
      );


    } catch (
      error
    ) {

      console.error(
        "Complete analytics export error:",
        error
      );


      res
        .status(500)
        .json({

          success:
            false,

          message:
            "Failed to export complete analytics workbook"

        });

    }

  }
);


/*
 * =========================================================
 * EXPORT ROUTER
 * =========================================================
 */

module.exports =
  router;