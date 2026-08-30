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

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
ON analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
ON analytics_events(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tutor_id
ON analytics_events(tutor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
ON analytics_events(created_at);