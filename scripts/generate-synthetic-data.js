require("dotenv").config();

const pool = require("../db/pool");

/*
 * =========================================================
 * BEYONDZ ACADEMY
 * REALISTIC SYNTHETIC ANALYTICS DATA GENERATOR
 * =========================================================
 *
 * IMPORTANT:
 * - This generates synthetic portfolio data.
 * - Every generated row is clearly marked:
 *
 *     metadata.synthetic = true
 *
 * - It can later coexist with real Academy data.
 *
 * - Uses a fixed random seed so the experiment
 *   can be reproduced.
 * =========================================================
 */

const CONFIG = {
  seed: 20260902,

  startDate: "2026-05-01",
  endDate: "2026-08-31",

  studentCount: 180,

  lessonsPerCourse: 12,

  batchSize: 500,

  generator: "beyondz_v1"
};


/*
 * =========================================================
 * SEEDED RANDOM NUMBER GENERATOR
 * =========================================================
 */

function mulberry32(seed) {

  return function () {

    let t =
      (seed += 0x6d2b79f5);

    t =
      Math.imul(
        t ^ (t >>> 15),
        t | 1
      );

    t ^=
      t +
      Math.imul(
        t ^ (t >>> 7),
        t | 61
      );

    return (
      (t ^ (t >>> 14)) >>> 0
    ) / 4294967296;

  };

}


const rng =
  mulberry32(
    CONFIG.seed
  );


function rand() {

  return rng();

}


function chance(probability) {

  return (
    rand() <
    Math.max(
      0,
      Math.min(
        1,
        probability
      )
    )
  );

}


function int(
  min,
  max
) {

  return (
    Math.floor(
      rand() *
      (
        max -
        min +
        1
      )
    ) +
    min
  );

}


function pick(array) {

  return array[
    Math.floor(
      rand() *
      array.length
    )
  ];

}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

}


function round(
  value,
  digits = 0
) {

  const multiplier =
    10 ** digits;

  return (
    Math.round(
      value *
      multiplier
    ) /
    multiplier
  );

}


/*
 * =========================================================
 * NORMAL DISTRIBUTION
 * =========================================================
 */

function normal(
  mean = 0,
  standardDeviation = 1
) {

  let u = 0;
  let v = 0;

  while (u === 0) {

    u = rand();

  }

  while (v === 0) {

    v = rand();

  }

  const z =

    Math.sqrt(
      -2 *
      Math.log(u)
    ) *

    Math.cos(
      2 *
      Math.PI *
      v
    );

  return (
    mean +
    z *
    standardDeviation
  );

}


/*
 * =========================================================
 * WEIGHTED RANDOM CHOICE
 * =========================================================
 */

function weightedChoice(
  items
) {

  const total =
    items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.weight,
      0
    );

  let random =
    rand() *
    total;


  for (
    const item
    of items
  ) {

    random -=
      item.weight;

    if (
      random <= 0
    ) {

      return item.value;

    }

  }


  return (
    items[
      items.length - 1
    ].value
  );

}


/*
 * =========================================================
 * DATE HELPERS
 * =========================================================
 */

function addMinutes(
  date,
  minutes
) {

  return new Date(
    date.getTime() +
    minutes *
    60000
  );

}


function dayKey(
  date
) {

  return (
    date
      .toISOString()
      .slice(
        0,
        10
      )
  );

}


function dateRange(
  start,
  end
) {

  const dates = [];


  const current =
    new Date(
      `${start}T00:00:00.000Z`
    );


  const last =
    new Date(
      `${end}T00:00:00.000Z`
    );


  while (
    current <= last
  ) {

    dates.push(
      new Date(
        current
      )
    );

    current.setUTCDate(
      current.getUTCDate() +
      1
    );

  }


  return dates;

}


/*
 * =========================================================
 * STUDENT PERSONAS
 * =========================================================
 *
 * These create meaningful behavioural groups.
 * =========================================================
 */

const PERSONAS = {

  highly_engaged: {

    activity: 0.52,

    completion: 0.94,

    quiz: 0.95,

    attendance: 0.94,

    abilityMean: 0.88,

    decline: 0.00

  },


  consistent: {

    activity: 0.34,

    completion: 0.84,

    quiz: 0.88,

    attendance: 0.86,

    abilityMean: 0.76,

    decline: 0.02

  },


  irregular: {

    activity: 0.20,

    completion: 0.68,

    quiz: 0.72,

    attendance: 0.68,

    abilityMean: 0.67,

    decline: 0.10

  },


  at_risk: {

    activity: 0.12,

    completion: 0.48,

    quiz: 0.52,

    attendance: 0.50,

    abilityMean: 0.57,

    decline: 0.35

  }

};


/*
 * =========================================================
 * TUTORS
 * =========================================================
 */

const TUTORS = {

  Science:
    "TUT-SCI-001",

  Mathematics:
    "TUT-MAT-001"

};


/*
 * =========================================================
 * GENERATE STUDENTS
 * =========================================================
 */

function makeStudents() {

  const students = [];


  for (
    let i = 1;
    i <= CONFIG.studentCount;
    i++
  ) {

    const personaName =
      weightedChoice([

        {
          value:
            "highly_engaged",

          weight: 18
        },

        {
          value:
            "consistent",

          weight: 42
        },

        {
          value:
            "irregular",

          weight: 26
        },

        {
          value:
            "at_risk",

          weight: 14
        }

      ]);


    const persona =
      PERSONAS[
        personaName
      ];


    const grade =
      weightedChoice([

        {
          value: 8,
          weight: 18
        },

        {
          value: 9,
          weight: 22
        },

        {
          value: 10,
          weight: 28
        },

        {
          value: 11,
          weight: 32
        }

      ]);


    const primarySubject =
      chance(
        0.57
      )
        ? "Science"
        : "Mathematics";


    const subjects =
      chance(
        0.32
      )
        ? [
            "Science",
            "Mathematics"
          ]
        : [
            primarySubject
          ];


    students.push({

      id:
        `SYN-STU-${String(
          i
        ).padStart(
          4,
          "0"
        )}`,

      persona:
        personaName,

      grade,

      subjects,

      ability:
        clamp(

          normal(
            persona.abilityMean,
            0.08
          ),

          0.35,

          0.98

        ),

      device:
        weightedChoice([

          {
            value:
              "mobile",

            weight: 72
          },

          {
            value:
              "desktop",

            weight: 21
          },

          {
            value:
              "tablet",

            weight: 7
          }

        ]),

      connection:
        weightedChoice([

          {
            value:
              "good",

            weight: 65
          },

          {
            value:
              "average",

            weight: 28
          },

          {
            value:
              "poor",

            weight: 7
          }

        ])

    });

  }


  return students;

}


/*
 * =========================================================
 * GENERATE COURSE STRUCTURE
 * =========================================================
 */

function makeCourses() {

  const courses = {};


  for (
    const grade
    of [
      8,
      9,
      10,
      11
    ]
  ) {

    for (
      const subject
      of [
        "Science",
        "Mathematics"
      ]
    ) {

      const key =
        `${grade}-${subject}`;


      courses[key] =
        Array.from(

          {
            length:
              CONFIG.lessonsPerCourse
          },

          (
            _,
            index
          ) => {

            const difficulty =
              clamp(

                normal(
                  0.58 +
                  index *
                  0.012,

                  0.13
                ),

                0.25,

                0.92

              );


            return {

              id:
                `G${grade}-${
                  subject ===
                  "Science"
                    ? "SCI"
                    : "MAT"
                }-L${String(
                  index + 1
                ).padStart(
                  2,
                  "0"
                )}`,

              lessonNo:
                index + 1,

              grade,

              subject,

              tutorId:
                TUTORS[
                  subject
                ],

              difficulty:
                round(
                  difficulty,
                  2
                ),

              videoMinutes:
                int(
                  32,
                  78
                )

            };

          }

        );

    }

  }


  return courses;

}


/*
 * =========================================================
 * STANDARD EVENT CREATOR
 * =========================================================
 */

function eventBase({

  name,

  student,

  tutorId,

  sessionId,

  page,

  entityType,

  entityId,

  at,

  metadata = {}

}) {

  return {

    event_name:
      name,

    user_id:
      student?.id ||
      null,

    user_role:
      student
        ? "student"
        : "tutor_admin",

    tutor_id:
      tutorId ||
      null,

    session_id:
      sessionId ||
      null,

    page,

    entity_type:
      entityType ||
      null,

    entity_id:
      entityId ||
      null,

    metadata: {

      synthetic: true,

      generator:
        CONFIG.generator,

      dataset_seed:
        CONFIG.seed,

      ...(student
        ? {

            persona:
              student.persona,

            grade:
              student.grade,

            device_type:
              student.device,

            connection_quality:
              student.connection

          }
        : {}),

      ...metadata

    },

    created_at:
      at

  };

}


/*
 * =========================================================
 * DAILY ACTIVITY PROBABILITY
 * =========================================================
 */

function activityProbability(

  student,

  dayIndex,

  totalDays,

  date

) {

  const persona =
    PERSONAS[
      student.persona
    ];


  const progress =
    totalDays <= 1
      ? 0
      : dayIndex /
        (
          totalDays -
          1
        );


  /*
   * At-risk students become
   * progressively less active.
   */

  const declineMultiplier =
    1 -
    persona.decline *
    progress;


  const weekday =
    date.getUTCDay();


  const weekendBoost =
    (
      weekday === 0 ||
      weekday === 6
    )
      ? 1.18
      : 1;


  const grade11Boost =
    student.grade === 11
      ? 1.08
      : 1;


  return clamp(

    persona.activity *

    declineMultiplier *

    weekendBoost *

    grade11Boost,

    0.03,

    0.78

  );

}


/*
 * =========================================================
 * SRI LANKA TIME
 * =========================================================
 */

const SRI_LANKA_OFFSET_MINUTES =
  5 * 60 + 30;


/*
 * Convert an intended Sri Lanka local date/time
 * into the equivalent UTC Date object.
 *
 * Example:
 *
 * Sri Lanka 19:00
 * becomes
 * UTC       13:30
 */
function sriLankaTimeToUtc(
  date,
  hour,
  minute = 0,
  second = 0
) {

  const utcEquivalent =
    Date.UTC(

      date.getUTCFullYear(),

      date.getUTCMonth(),

      date.getUTCDate(),

      hour,

      minute,

      second,

      0

    ) -

    SRI_LANKA_OFFSET_MINUTES *
    60 *
    1000;


  return new Date(
    utcEquivalent
  );

}


/*
 * =========================================================
 * SESSION TIME
 * =========================================================
 */

function sessionStartForDay(
  date
) {

  const weekend =
    [
      0,
      6
    ].includes(
      date.getUTCDay()
    );


  const hour =
    weekend

      ? weightedChoice([

          {
            value: 10,
            weight: 30
          },

          {
            value: 15,
            weight: 30
          },

          {
            value: 19,
            weight: 40
          }

        ])

      : weightedChoice([

          {
            value: 17,
            weight: 25
          },

          {
            value: 19,
            weight: 45
          },

          {
            value: 21,
            weight: 30
          }

        ]);


  const minute =
    int(
      0,
      59
    );


  const second =
    int(
      0,
      59
    );


  return sriLankaTimeToUtc(

    date,

    hour,

    minute,

    second

  );

}


/*
 * =========================================================
 * SELECT APPROPRIATE LESSON
 * =========================================================
 */

function selectLesson(

  student,

  subject,

  courses,

  dayIndex,

  totalDays

) {

  const lessons =
    courses[
      `${student.grade}-${subject}`
    ];


  const courseProgress =
    clamp(

      dayIndex /
      totalDays,

      0,

      0.999

    );


  let target =
    Math.floor(

      courseProgress *

      CONFIG.lessonsPerCourse

    ) + 1;


  /*
   * Students sometimes revisit
   * older lessons.
   */

  if (
    chance(
      0.24
    )
  ) {

    target -=
      int(
        1,
        3
      );

  }


  /*
   * Occasionally move ahead.
   */

  if (
    chance(
      0.08
    )
  ) {

    target += 1;

  }


  target =
    clamp(

      target,

      1,

      CONFIG.lessonsPerCourse

    );


  return (
    lessons[
      target - 1
    ]
  );

}


/*
 * =========================================================
 * LESSON + VIDEO + QUIZ SESSION
 * =========================================================
 */

function simulateLessonSession(

  events,

  student,

  lesson,

  startAt,

  sessionId

) {

  const persona =
    PERSONAS[
      student.persona
    ];


  let time =
    new Date(
      startAt
    );


  const commonMetadata = {

    subject:
      lesson.subject,

    lesson_no:
      lesson.lessonNo,

    lesson_difficulty:
      lesson.difficulty

  };


  /*
   * LESSON START
   */

  events.push(

    eventBase({

      name:
        "lesson_started",

      student,

      tutorId:
        lesson.tutorId,

      sessionId,

      page:
        "/student/lesson",

      entityType:
        "lesson",

      entityId:
        lesson.id,

      at:
        time,

      metadata:
        commonMetadata

    })

  );


  time =
    addMinutes(
      time,
      1
    );


  /*
   * VIDEO START
   */

  events.push(

    eventBase({

      name:
        "video_started",

      student,

      tutorId:
        lesson.tutorId,

      sessionId,

      page:
        "/student/video-viewer",

      entityType:
        "video",

      entityId:
        `${lesson.id}-VIDEO`,

      at:
        time,

      metadata: {

        ...commonMetadata,

        video_duration_minutes:
          lesson.videoMinutes

      }

    })

  );


  /*
   * HARDER LESSONS REDUCE
   * COMPLETION PROBABILITY.
   */

  const difficultyPenalty =
    lesson.difficulty *
    0.20;


  const connectionPenalty =

    student.connection ===
    "poor"

      ? 0.13

      : student.connection ===
        "average"

        ? 0.04

        : 0;


  const completionProbability =
    clamp(

      persona.completion +

      student.ability *
      0.10 -

      difficultyPenalty -

      connectionPenalty,

      0.20,

      0.99

    );


  const completed =
    chance(
      completionProbability
    );


  const maxProgress =
    completed

      ? 100

      : weightedChoice([

          {
            value: 25,
            weight: 18
          },

          {
            value: 50,
            weight: 35
          },

          {
            value: 75,
            weight: 47
          }

        ]);


  /*
   * VIDEO PROGRESS EVENTS
   */

  for (
    const progress
    of [
      25,
      50,
      75
    ]
  ) {

    if (
      progress <=
      maxProgress
    ) {

      time =
        addMinutes(

          time,

          lesson.videoMinutes *
          0.22

        );


      events.push(

        eventBase({

          name:
            "video_progress",

          student,

          tutorId:
            lesson.tutorId,

          sessionId,

          page:
            "/student/video-viewer",

          entityType:
            "video",

          entityId:
            `${lesson.id}-VIDEO`,

          at:
            time,

          metadata: {

            ...commonMetadata,

            progress_percent:
              progress

          }

        })

      );

    }

  }


  /*
   * HARDER LESSONS CREATE
   * MORE REWATCHING.
   */

  const rewatchProbability =
    clamp(

      (
        lesson.difficulty -
        student.ability
      ) *
      0.55 +
      0.15,

      0.05,

      0.55

    );


  const rewatchCount =
    chance(
      rewatchProbability
    )

      ? int(

          1,

          lesson.difficulty >
          0.75
            ? 3
            : 2

        )

      : 0;


  for (
    let rewatch = 0;
    rewatch < rewatchCount;
    rewatch++
  ) {

    time =
      addMinutes(
        time,
        int(
          3,
          9
        )
      );


    events.push(

      eventBase({

        name:
          "video_rewatched",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/video-viewer",

        entityType:
          "video",

        entityId:
          `${lesson.id}-VIDEO`,

        at:
          time,

        metadata: {

          ...commonMetadata,

          rewatch_number:
            rewatch + 1

        }

      })

    );

  }


  /*
   * VIDEO COMPLETED
   */

  if (
    completed
  ) {

    time =
      addMinutes(

        time,

        lesson.videoMinutes *
        0.18

      );


    const watchRatio =
      clamp(

        normal(

          0.94 +
          rewatchCount *
          0.08,

          0.08

        ),

        0.72,

        1.35

      );


    events.push(

      eventBase({

        name:
          "video_completed",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/video-viewer",

        entityType:
          "video",

        entityId:
          `${lesson.id}-VIDEO`,

        at:
          time,

        metadata: {

          ...commonMetadata,

          watch_minutes:
            round(

              lesson.videoMinutes *
              watchRatio,

              1

            ),

          rewatch_count:
            rewatchCount

        }

      })

    );


    /*
     * Difficult lessons encourage
     * notes/material downloads.
     */

    if (
      chance(

        0.42 +

        lesson.difficulty *
        0.20

      )
    ) {

      time =
        addMinutes(
          time,
          2
        );


      events.push(

        eventBase({

          name:
            "material_downloaded",

          student,

          tutorId:
            lesson.tutorId,

          sessionId,

          page:
            "/student/lesson",

          entityType:
            "material",

          entityId:
            `${lesson.id}-NOTES`,

          at:
            time,

          metadata:
            commonMetadata

        })

      );

    }

  }


  /*
   * VIDEO ABANDONED
   */

  else {

    time =
      addMinutes(
        time,
        int(
          2,
          10
        )
      );


    events.push(

      eventBase({

        name:
          "video_abandoned",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/video-viewer",

        entityType:
          "video",

        entityId:
          `${lesson.id}-VIDEO`,

        at:
          time,

        metadata: {

          ...commonMetadata,

          progress_percent:
            maxProgress,

          likely_reason:

            student.connection ===
            "poor" &&
            chance(
              0.5
            )

              ? "connection"

              : "engagement"

        }

      })

    );

  }


  /*
   * =====================================================
   * QUIZ
   * =====================================================
   */

  if (

    completed &&

    chance(
      persona.quiz
    )

  ) {

    time =
      addMinutes(
        time,
        int(
          2,
          12
        )
      );


    const quizId =
      `${lesson.id}-QUIZ`;


    events.push(

      eventBase({

        name:
          "quiz_started",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/quiz",

        entityType:
          "quiz",

        entityId:
          quizId,

        at:
          time,

        metadata:
          commonMetadata

      })

    );


    const attempts = [];

    let passed = false;


    for (
      let attempt = 1;
      attempt <= 3;
      attempt++
    ) {

      /*
       * Scores depend on:
       *
       * - student ability
       * - lesson difficulty
       * - random variation
       * - improvement after failing
       */

      const learningBoost =
        (
          attempt -
          1
        ) *
        0.07;


      const score =
  clamp(

    Math.round(

      (
        0.22 +

        student.ability *
        0.82 +

        learningBoost -

        lesson.difficulty *
        0.18 +

        normal(
          0,
          0.065
        )

      ) *
      100

    ),

    25,

    100

  );


      attempts.push(
        score
      );


      time =
        addMinutes(
          time,
          int(
            7,
            18
          )
        );


      passed =
        score >= 80;


      events.push(

        eventBase({

          name:
            passed
              ? "quiz_passed"
              : "quiz_failed",

          student,

          tutorId:
            lesson.tutorId,

          sessionId,

          page:
            "/student/quiz",

          entityType:
            "quiz",

          entityId:
            quizId,

          at:
            time,

          metadata: {

            ...commonMetadata,

            attempt,

            score,

            pass_mark:
              80,

            passed

          }

        })

      );


      if (
        passed
      ) {

        break;

      }


      /*
       * Some students don't retry.
       */

      const retryProbability =

        student.persona ===
        "at_risk"

          ? 0.35

          : 0.68;


      if (
        !chance(
          retryProbability
        )
      ) {

        break;

      }


      time =
        addMinutes(
          time,
          int(
            10,
            50
          )
        );

    }


    events.push(

      eventBase({

        name:
          "quiz_completed",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/quiz",

        entityType:
          "quiz",

        entityId:
          quizId,

        at:
          addMinutes(
            time,
            1
          ),

        metadata: {

          ...commonMetadata,

          attempts:
            attempts.length,

          final_score:
            attempts[
              attempts.length -
              1
            ],

          passed

        }

      })

    );

  }


  /*
   * CONNECTION-RELATED
   * SYSTEM ERROR
   */

  if (
    chance(

      student.connection ===
      "poor"

        ? 0.06

        : 0.008

    )
  ) {

    events.push(

      eventBase({

        name:
          "video_stream_error",

        student,

        tutorId:
          lesson.tutorId,

        sessionId,

        page:
          "/student/video-viewer",

        entityType:
          "video",

        entityId:
          `${lesson.id}-VIDEO`,

        at:
          addMinutes(
            time,
            1
          ),

        metadata: {

          ...commonMetadata,

          error_type:
            "buffering_timeout"

        }

      })

    );

  }


  return time;

}


/*
 * =========================================================
 * ONLINE ACTIVITY
 * =========================================================
 */

function simulateOnlineActivity(

  events,

  students,

  courses,

  days

) {

  for (
    const student
    of students
  ) {

    days.forEach(
      (
        date,
        dayIndex
      ) => {

        const probability =
          activityProbability(

            student,

            dayIndex,

            days.length,

            date

          );


        if (
          !chance(
            probability
          )
        ) {

          return;

        }


        /*
         * Highly engaged students
         * occasionally have two sessions.
         */

        const secondSessionProbability =

          student.persona ===
          "highly_engaged"

            ? 0.16

            : 0.05;


        const sessionCount =
          chance(
            secondSessionProbability
          )
            ? 2
            : 1;


        for (
          let sessionNo = 1;
          sessionNo <= sessionCount;
          sessionNo++
        ) {

          const start =
            addMinutes(

              sessionStartForDay(
                date
              ),

              sessionNo === 2

                ? int(
                    120,
                    260
                  )

                : 0

            );


          const sessionId =
            `SYN-SES-${student.id}-${dayKey(
              date
            )}-${sessionNo}`;


          const subject =
            pick(
              student.subjects
            );


          const lesson =
            selectLesson(

              student,

              subject,

              courses,

              dayIndex,

              days.length

            );


          /*
           * LOGIN
           */

          events.push(

            eventBase({

              name:
                "login",

              student,

              tutorId:
                lesson.tutorId,

              sessionId,

              page:
                "/login",

              entityType:
                "session",

              entityId:
                sessionId,

              at:
                start,

              metadata: {
                subject
              }

            })

          );


          /*
           * DASHBOARD
           */

          events.push(

            eventBase({

              name:
                "page_view",

              student,

              tutorId:
                lesson.tutorId,

              sessionId,

              page:
                "/student/dashboard",

              entityType:
                "page",

              entityId:
                "dashboard",

              at:
                addMinutes(
                  start,
                  1
                ),

              metadata: {
                subject
              }

            })

          );


          /*
           * LEARNING SESSION
           */

          const end =
            simulateLessonSession(

              events,

              student,

              lesson,

              addMinutes(
                start,
                int(
                  2,
                  6
                )
              ),

              sessionId

            );


          /*
           * LOGOUT
           */

          if (
            chance(
              0.76
            )
          ) {

            events.push(

              eventBase({

                name:
                  "logout",

                student,

                tutorId:
                  lesson.tutorId,

                sessionId,

                page:
                  "/logout",

                entityType:
                  "session",

                entityId:
                  sessionId,

                at:
                  addMinutes(
                    end,
                    int(
                      1,
                      8
                    )
                  ),

                metadata: {
                  subject
                }

              })

            );

          }

        }

      }

    );

  }

}


/*
 * =========================================================
 * ATTENDANCE
 * =========================================================
 */

function simulateAttendance(

  events,

  students,

  days

) {

  for (
    const date
    of days
  ) {

    /*
     * Saturday / Sunday classes.
     */

    if (
      ![
        0,
        6
      ].includes(
        date.getUTCDay()
      )
    ) {

      continue;

    }


    for (
      const student
      of students
    ) {

      const persona =
        PERSONAS[
          student.persona
        ];


      if (
        !chance(

          persona.attendance *
          0.52

        )
      ) {

        continue;

      }


      const subject =
        pick(
          student.subjects
        );


      const tutorId =
        TUTORS[
          subject
        ];


      const time =
  sriLankaTimeToUtc(

    date,

    date.getUTCDay() === 6
      ? 8
      : 14,

    int(
      0,
      59
    ),

    int(
      0,
      59
    )

  );


      events.push(

        eventBase({

          name:
            "attendance_marked",

          student,

          tutorId,

          sessionId:
            `SYN-ATT-${student.id}-${dayKey(
              date
            )}`,

          page:
            "/attendance",

          entityType:
            "class",

          entityId:
            `G${student.grade}-${subject}`,

          at:
            time,

          metadata: {

            subject,

            method:
              chance(
                0.84
              )
                ? "qr"
                : "manual",

            status:
              "present"

          }

        })

      );

    }

  }

}


/*
 * =========================================================
 * WRITTEN EXAMS
 * =========================================================
 */

function simulateWrittenExams(

  events,

  students,

  days

) {

  for (
    const date
    of days
  ) {

    /*
     * Exams on Sundays.
     */

    if (
      date.getUTCDay() !==
      0
    ) {

      continue;

    }


    const weekNumber =
      Math.ceil(

        (
          date -
          days[0]
        ) /

        (
          7 *
          86400000
        )

      );


    /*
     * Every second week.
     */

    if (
      weekNumber %
      2 !==
      0
    ) {

      continue;

    }


    for (
      const student
      of students
    ) {

      const persona =
        PERSONAS[
          student.persona
        ];


      if (
        !chance(

          persona.quiz *
          0.38

        )
      ) {

        continue;

      }


      const subject =
        pick(
          student.subjects
        );


      const tutorId =
        TUTORS[
          subject
        ];


      const examId =
        `G${student.grade}-${
          subject ===
          "Science"
            ? "SCI"
            : "MAT"
        }-WEX-${String(
          weekNumber
        ).padStart(
          2,
          "0"
        )}`;


      const time =
  sriLankaTimeToUtc(

    date,

    18,

    int(
      0,
      20
    ),

    0

  );


      const sessionId =
        `SYN-EXAM-${student.id}-${dayKey(
          date
        )}`;


      events.push(

        eventBase({

          name:
            "written_exam_started",

          student,

          tutorId,

          sessionId,

          page:
            "/student/written-exam",

          entityType:
            "written_exam",

          entityId:
            examId,

          at:
            time,

          metadata: {

            subject,

            time_limit_minutes:
              60

          }

        })

      );


      const submits =
        chance(

          student.persona ===
          "at_risk"

            ? 0.62

            : 0.90

        );


      if (
        submits
      ) {

        const score =
          clamp(

            Math.round(

              (
                student.ability +

                normal(
                  0,
                  0.09
                )

              ) *
              100

            ),

            25,

            100

          );


        const duration =
          int(
            38,
            62
          );


        events.push(

          eventBase({

            name:
              "written_exam_submitted",

            student,

            tutorId,

            sessionId,

            page:
              "/student/written-exam",

            entityType:
              "written_exam",

            entityId:
              examId,

            at:
              addMinutes(

                time,

                duration

              ),

            metadata: {

              subject,

              duration_minutes:
                duration,

              score,

              submission_method:
                chance(
                  0.86
                )
                  ? "website"
                  : "whatsapp"

            }

          })

        );

      }


      else {

        events.push(

          eventBase({

            name:
              "written_exam_abandoned",

            student,

            tutorId,

            sessionId,

            page:
              "/student/written-exam",

            entityType:
              "written_exam",

            entityId:
              examId,

            at:
              addMinutes(

                time,

                int(
                  15,
                  58
                )

              ),

            metadata: {
              subject
            }

          })

        );

      }

    }

  }

}


/*
 * =========================================================
 * FINANCE EVENTS
 * =========================================================
 */

function simulateFinance(

  events,

  students

) {

  const months = [

    "2026-05-03",

    "2026-06-03",

    "2026-07-03",

    "2026-08-03"

  ];


  for (
    const student
    of students
  ) {

    for (
      const month
      of months
    ) {

      const paymentLikelihood =

        student.persona ===
        "at_risk"

          ? 0.72

          : student.persona ===
            "irregular"

            ? 0.86

            : 0.96;


      if (
        !chance(
          paymentLikelihood
        )
      ) {

        continue;

      }


      const subject =
        pick(
          student.subjects
        );


      const tutorId =
        TUTORS[
          subject
        ];


      const start =
        new Date(

          `${month}T${String(
            int(
              7,
              20
            )
          ).padStart(
            2,
            "0"
          )}:${String(
            int(
              0,
              59
            )
          ).padStart(
            2,
            "0"
          )}:00.000Z`

        );


      const sessionId =
        `SYN-PAY-${student.id}-${dayKey(
          start
        )}`;


      const amount =
        1500;


      events.push(

        eventBase({

          name:
            "checkout_started",

          student,

          tutorId,

          sessionId,

          page:
            "/student/checkout",

          entityType:
            "subscription",

          entityId:
            `${student.grade}-${subject}`,

          at:
            start,

          metadata: {

            subject,

            amount_lkr:
              amount,

            plan:
              "monthly"

          }

        })

      );


      const succeeds =
        chance(
          0.94
        );


      events.push(

        eventBase({

          name:
            succeeds
              ? "payment_success"
              : "payment_failed",

          student,

          tutorId,

          sessionId,

          page:
            "/student/checkout",

          entityType:
            "payment",

          entityId:
            `PAY-${student.id}-${month.slice(
              0,
              7
            )}`,

          at:
            addMinutes(

              start,

              int(
                1,
                6
              )

            ),

          metadata: {

            subject,

            amount_lkr:
              amount,

            plan:
              "monthly",

            payment_method:
              weightedChoice([

                {
                  value:
                    "bank_transfer",

                  weight: 55
                },

                {
                  value:
                    "card",

                  weight: 35
                },

                {
                  value:
                    "cash",

                  weight: 10
                }

              ])

          }

        })

      );

    }

  }

}


/*
 * =========================================================
 * TUTOR OPERATIONS
 * =========================================================
 */

function simulateTutorOperations(

  events,

  days

) {

  for (
    const date
    of days
  ) {

    /*
     * Tutor content work mainly
     * on Monday.
     */

    if (
      date.getUTCDay() !==
      1
    ) {

      continue;

    }


    for (
      const [
        subject,
        tutorId
      ]
      of Object.entries(
        TUTORS
      )
    ) {

      const time =
  sriLankaTimeToUtc(

    date,

    11,

    int(
      0,
      50
    ),

    0

  );


      const eventNames = [

        "content_created",

        "upload_material",

        "content_updated"

      ];


      const count =
        int(
          1,
          3
        );


      for (
        let i = 0;
        i < count;
        i++
      ) {

        const event =
          eventBase({

            name:
              pick(
                eventNames
              ),

            student:
              null,

            tutorId,

            sessionId:
              `SYN-TUTOR-${tutorId}-${dayKey(
                date
              )}`,

            page:
              "/tutor/dashboard",

            entityType:
              "lesson",

            entityId:
              `${subject.toUpperCase()}-${dayKey(
                date
              )}-${i + 1}`,

            at:
              addMinutes(

                time,

                i *
                18

              ),

            metadata: {
              subject
            }

          });


        event.user_id =
          tutorId;

        event.user_role =
          "tutor_admin";


        events.push(
          event
        );

      }

    }

  }

}


/*
 * =========================================================
 * SUMMARY
 * =========================================================
 */

function summarize(

  events,

  students

) {

  const counts = {};


  for (
    const event
    of events
  ) {

    counts[
      event.event_name
    ] =
      (
        counts[
          event.event_name
        ] ||
        0
      ) +
      1;

  }


  const personas = {};


  for (
    const student
    of students
  ) {

    personas[
      student.persona
    ] =
      (
        personas[
          student.persona
        ] ||
        0
      ) +
      1;

  }


  return {

    events:
      events.length,

    students:
      students.length,

    personas,

    topEvents:
      Object.entries(
        counts
      )
        .sort(
          (
            a,
            b
          ) =>
            b[1] -
            a[1]
        )
        .slice(
          0,
          15
        )

  };

}


/*
 * =========================================================
 * INSERT EVENTS INTO POSTGRESQL
 * =========================================================
 */

async function insertEvents(
  events
) {

  for (

    let offset = 0;

    offset <
    events.length;

    offset +=
    CONFIG.batchSize

  ) {

    const batch =
      events.slice(

        offset,

        offset +
        CONFIG.batchSize

      );


    const values = [];


    const placeholders =
      batch.map(

        (
          event,
          rowIndex
        ) => {

          const base =
            rowIndex *
            10;


          values.push(

            event.event_name,

            event.user_id,

            event.user_role,

            event.tutor_id,

            event.session_id,

            event.page,

            event.entity_type,

            event.entity_id,

            JSON.stringify(
              event.metadata
            ),

            event.created_at

          );


          return `(
            $${base + 1},
            $${base + 2},
            $${base + 3},
            $${base + 4},
            $${base + 5},
            $${base + 6},
            $${base + 7},
            $${base + 8},
            $${base + 9}::jsonb,
            $${base + 10}
          )`;

        }

      );


    await pool.query(
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

        metadata,

        created_at

      )

      VALUES

      ${placeholders.join(
        ","
      )}

      `,
      values
    );


    console.log(

      `Inserted ${Math.min(

        offset +
        batch.length,

        events.length

      )} / ${events.length}`

    );

  }

}


/*
 * =========================================================
 * DELETE PREVIOUS SYNTHETIC DATA
 * =========================================================
 */

async function resetSyntheticData() {

  const result =
    await pool.query(

      `

      DELETE
      FROM analytics_events

      WHERE
        metadata->>'synthetic'
          = 'true'

      AND
        metadata->>'generator'
          = $1

      `,

      [
        CONFIG.generator
      ]

    );


  console.log(

    `Removed ${result.rowCount} previous synthetic events.`

  );

}


/*
 * =========================================================
 * MAIN
 * =========================================================
 */

async function main() {

  const args =
    new Set(
      process.argv.slice(
        2
      )
    );


  const dryRun =
    args.has(
      "--dry-run"
    );


  const reset =
    args.has(
      "--reset"
    );


  console.log(
    "\nGenerating BeyondZ synthetic analytics data..."
  );


  const students =
    makeStudents();


  const courses =
    makeCourses();


  const days =
    dateRange(

      CONFIG.startDate,

      CONFIG.endDate

    );


  const events = [];


  /*
   * Generate correlated datasets.
   */

  simulateOnlineActivity(

    events,

    students,

    courses,

    days

  );


  simulateAttendance(

    events,

    students,

    days

  );


  simulateWrittenExams(

    events,

    students,

    days

  );


  simulateFinance(

    events,

    students

  );


  simulateTutorOperations(

    events,

    days

  );


  /*
   * Chronological ordering.
   */

  events.sort(
    (
      a,
      b
    ) =>
      a.created_at -
      b.created_at
  );


  const summary =
    summarize(

      events,

      students

    );


  console.log(
    "\n======================================"
  );

  console.log(
    "BEYONDZ SYNTHETIC DATASET"
  );

  console.log(
    "======================================"
  );


  console.log(

    JSON.stringify(
      summary,
      null,
      2
    )

  );


  console.log(

    `\nDate range: ${CONFIG.startDate} → ${CONFIG.endDate}`

  );


  console.log(

    `Random seed: ${CONFIG.seed}`

  );


  /*
   * DRY RUN
   */

  if (
    dryRun
  ) {

    console.log(
      "\nDRY RUN ONLY"
    );

    console.log(
      "No database rows were changed."
    );

    return;

  }


  /*
   * RESET OLD SYNTHETIC
   * DATA WHEN REQUESTED
   */

  if (
    reset
  ) {

    await resetSyntheticData();

  }


  /*
   * SAVE TO ANALYTICS DATABASE
   */

  await insertEvents(
    events
  );


  console.log(
    "\n======================================"
  );

  console.log(
    "SYNTHETIC GENERATION COMPLETE"
  );

  console.log(
    "======================================"
  );

}


/*
 * =========================================================
 * RUN
 * =========================================================
 */

main()

  .catch(
    (
      error
    ) => {

      console.error(

        "Synthetic generator failed:",

        error

      );


      process.exitCode =
        1;

    }
  )

  .finally(
    async () => {

      await pool.end();

    }
  );