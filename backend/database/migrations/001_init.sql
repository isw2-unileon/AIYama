CREATE TABLE users
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

    CREATE TABLE fixed_blocks
    (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL
    );

    CREATE TABLE flexible_tasks
    (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        duration_minutes INT NOT NULL,
        weekly_frequency INT NOT NULL,
        energy_level VARCHAR(20) CHECK (energy_level IN ('low', 'medium', 'high')),
        scheduled_at TIMESTAMP
        WITH TIME ZONE, 
        scheduled_end TIMESTAMP
        WITH TIME ZONE
    );

        CREATE TABLE calendar_events
        (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            task_id UUID REFERENCES flexible_tasks(id) ON DELETE SET NULL,
            title VARCHAR(150),
            start_time TIMESTAMP
            WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP
            WITH TIME ZONE NOT NULL,
    status VARCHAR
            (20) DEFAULT 'proposed' CHECK
            (status IN
            ('proposed', 'confirmed', 'completed', 'cancelled'))
);

            CREATE TABLE
            IF NOT EXISTS calendar_snapshots
            (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid
            (),
    user_id UUID NOT NULL REFERENCES users
            (id) ON
            DELETE CASCADE,
    action_type VARCHAR(50)
            NOT NULL, 
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP
            WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

            CREATE TABLE activity_profiles
            (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                chronotype VARCHAR(20) CHECK (chronotype IN ('morning', 'afternoon', 'night')),
                sleep_hours_goal INT DEFAULT 8,
                sleep_start TIME,
                sleep_end TIME
            );