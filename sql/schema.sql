CREATE TABLE IF NOT EXISTS analytics_events (
    event_id BIGSERIAL PRIMARY KEY,

    event_name VARCHAR(100) NOT NULL,

    user_id VARCHAR(100),
    user_role VARCHAR(50),

    tutor_id VARCHAR(100),

    session_id VARCHAR(150),

    page VARCHAR(255),

    entity_type VARCHAR(100),
    entity_id VARCHAR(100),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


/*
========================================================
CORE SINGLE-COLUMN INDEXES
========================================================
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
ON analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_role
ON analytics_events(user_role);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tutor_id
ON analytics_events(tutor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_page
ON analytics_events(page);

CREATE INDEX IF NOT EXISTS idx_analytics_events_entity_type
ON analytics_events(entity_type);

CREATE INDEX IF NOT EXISTS idx_analytics_events_entity_id
ON analytics_events(entity_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON analytics_events(created_at);


/*
========================================================
TIME-BASED ANALYTICS INDEXES
========================================================
*/

/*
Useful for:
- student history
- user journey analysis
- recent activity by student
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created_at
ON analytics_events(user_id, created_at DESC);


/*
Useful for:
- tutor operational analysis
- tutor-specific dashboards
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_tutor_created_at
ON analytics_events(tutor_id, created_at DESC);


/*
Useful for:
- session journey analysis
- funnel/path analysis
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created_at
ON analytics_events(session_id, created_at DESC);


/*
Useful for:
- event trend analysis
- counts of specific events over time
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created_at
ON analytics_events(event_name, created_at DESC);


/*
Useful for:
- quizzes
- written exams
- attendance
- videos
- AI
- chat
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_entity_type_created_at
ON analytics_events(entity_type, created_at DESC);


/*
Useful when analysing one specific:
- lesson
- exam
- quiz
- video
- entity
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_entity_created_at
ON analytics_events(entity_type, entity_id, created_at DESC);


/*
========================================================
JSONB METADATA INDEX
========================================================
*/

/*
Supports future queries such as:

metadata @> '{"grade":"11"}'

metadata @> '{"subject":"Science"}'

metadata @> '{"passed":true}'

metadata @> '{"quiz_type":"lesson"}'
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_metadata_gin
ON analytics_events
USING GIN (metadata);


/*
========================================================
OPTIONAL LOWERCASE SEARCH INDEXES
========================================================
*/

/*
Your API uses LOWER(event_name) and LOWER(entity_type)
in category/filter queries.

These indexes help PostgreSQL with those comparisons.
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_lower_event_name
ON analytics_events(LOWER(event_name));

CREATE INDEX IF NOT EXISTS idx_analytics_events_lower_entity_type
ON analytics_events(LOWER(entity_type));

CREATE INDEX IF NOT EXISTS idx_analytics_events_lower_user_role
ON analytics_events(LOWER(user_role));


/*
========================================================
LATEST EVENTS INDEX
========================================================
*/

/*
The dashboard frequently requests newest events first.
*/

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_event
ON analytics_events(created_at DESC, event_id DESC);