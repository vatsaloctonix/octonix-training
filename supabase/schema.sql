-- =============================================================================
-- LEARNFLOW - Database Schema
-- =============================================================================
-- Run this in Supabase SQL Editor to set up the database
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trainer', 'crm', 'candidate', 'other')),
    full_name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    password_set BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by creator
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_email ON users(email);

-- =============================================================================
-- INDEXES TABLE (Content categories: Setup, Training, etc.)
-- =============================================================================
CREATE TABLE indexes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_indexes_created_by ON indexes(created_by);

-- =============================================================================
-- COURSES TABLE
-- =============================================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index_id UUID NOT NULL REFERENCES indexes(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_index_id ON courses(index_id);
CREATE INDEX idx_courses_created_by ON courses(created_by);

-- =============================================================================
-- SECTIONS TABLE
-- =============================================================================
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sections_course_id ON sections(course_id);

-- =============================================================================
-- LECTURES TABLE
-- =============================================================================
CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    youtube_url VARCHAR(500),
    video_storage_path VARCHAR(500),
    video_mime_type VARCHAR(100),
    order_index INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lectures_section_id ON lectures(section_id);

-- =============================================================================
-- LECTURE FILES TABLE (Downloadable attachments)
-- =============================================================================
CREATE TABLE lecture_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    storage_path VARCHAR(500) NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lecture_files_lecture_id ON lecture_files(lecture_id);

-- =============================================================================
-- COURSE ASSIGNMENTS TABLE
-- =============================================================================
CREATE TABLE course_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_course_assignments_user_id ON course_assignments(user_id);
CREATE INDEX idx_course_assignments_course_id ON course_assignments(course_id);

-- =============================================================================
-- INDEX ASSIGNMENTS TABLE (Assign all courses under an index)
-- =============================================================================
CREATE TABLE index_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    index_id UUID NOT NULL REFERENCES indexes(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, index_id)
);

CREATE INDEX idx_index_assignments_user_id ON index_assignments(user_id);
CREATE INDEX idx_index_assignments_index_id ON index_assignments(index_id);

-- =============================================================================
-- LECTURE PROGRESS TABLE
-- =============================================================================
CREATE TABLE lecture_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    time_spent_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, lecture_id)
);

CREATE INDEX idx_lecture_progress_user_id ON lecture_progress(user_id);
CREATE INDEX idx_lecture_progress_lecture_id ON lecture_progress(lecture_id);

-- =============================================================================
-- USER SESSIONS TABLE (Login tracking)
-- =============================================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    ip_address VARCHAR(45)
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON user_sessions(login_at DESC);

-- =============================================================================
-- ACTIVITY LOGS TABLE (Audit trail)
-- =============================================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- =============================================================================
-- FILE DOWNLOADS TABLE
-- =============================================================================
CREATE TABLE file_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES lecture_files(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER INVITES TABLE (Invite flow for setting passwords)
-- =============================================================================
CREATE TABLE user_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

CREATE INDEX idx_user_invites_user_id ON user_invites(user_id);
CREATE INDEX idx_user_invites_email ON user_invites(email);
CREATE INDEX idx_user_invites_token ON user_invites(token);

-- =============================================================================
-- PASSWORD RESET TABLE (Email code verification)
-- =============================================================================
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(12) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_email ON password_resets(email);
CREATE INDEX idx_password_resets_code ON password_resets(code);

CREATE INDEX idx_file_downloads_user_id ON file_downloads(user_id);
CREATE INDEX idx_file_downloads_file_id ON file_downloads(file_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indexes_updated_at BEFORE UPDATE ON indexes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON lectures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR DASHBOARD QUERIES
-- =============================================================================

-- View for trainer statistics
CREATE OR REPLACE VIEW trainer_stats AS
SELECT
    u.id,
    u.full_name,
    u.username,
    u.is_active,
    u.created_at,
    (SELECT COUNT(*) FROM users WHERE created_by = u.id AND role = 'candidate') as total_candidates,
    (SELECT COUNT(*) FROM indexes WHERE created_by = u.id) as total_indexes,
    (SELECT COUNT(*) FROM courses WHERE created_by = u.id) as total_courses,
    (SELECT COUNT(*) FROM lectures l
     JOIN sections s ON l.section_id = s.id
     JOIN courses c ON s.course_id = c.id
     WHERE c.created_by = u.id) as total_lectures,
    (SELECT MAX(login_at) FROM user_sessions WHERE user_id = u.id) as last_active
FROM users u
WHERE u.role = 'trainer';

-- View for CRM statistics
CREATE OR REPLACE VIEW crm_stats AS
SELECT
    u.id,
    u.full_name,
    u.username,
    u.is_active,
    u.created_at,
    (SELECT COUNT(*) FROM users WHERE created_by = u.id AND role = 'other') as total_others,
    (SELECT COUNT(*) FROM indexes WHERE created_by = u.id) as total_indexes,
    (SELECT COUNT(*) FROM courses WHERE created_by = u.id) as total_courses,
    (SELECT COUNT(*) FROM lectures l
     JOIN sections s ON l.section_id = s.id
     JOIN courses c ON s.course_id = c.id
     WHERE c.created_by = u.id) as total_lectures,
    (SELECT MAX(login_at) FROM user_sessions WHERE user_id = u.id) as last_active
FROM users u
WHERE u.role = 'crm';

-- =============================================================================
-- INSERT DEFAULT ADMIN USER
-- Password: admin123 (bcrypt hash)
-- =============================================================================
INSERT INTO users (username, password_hash, role, full_name)
VALUES (
    'admin',
    '$2b$10$Ei4TbvlfH60vN.AahHFU9e6zwIazxa3qaQi5nvZ4u1MKhoBSmAWgu',
    'admin',
    'System Administrator'
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- For now, allow service role full access (API routes use service role)
-- Client-side queries go through API routes for security
CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (true);
CREATE POLICY "Service role has full access to indexes" ON indexes FOR ALL USING (true);
CREATE POLICY "Service role has full access to courses" ON courses FOR ALL USING (true);
CREATE POLICY "Service role has full access to sections" ON sections FOR ALL USING (true);
CREATE POLICY "Service role has full access to lectures" ON lectures FOR ALL USING (true);
CREATE POLICY "Service role has full access to lecture_files" ON lecture_files FOR ALL USING (true);
CREATE POLICY "Service role has full access to course_assignments" ON course_assignments FOR ALL USING (true);
CREATE POLICY "Service role has full access to index_assignments" ON index_assignments FOR ALL USING (true);
CREATE POLICY "Service role has full access to lecture_progress" ON lecture_progress FOR ALL USING (true);
CREATE POLICY "Service role has full access to user_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "Service role has full access to activity_logs" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Service role has full access to file_downloads" ON file_downloads FOR ALL USING (true);
CREATE POLICY "Service role has full access to user_invites" ON user_invites FOR ALL USING (true);
CREATE POLICY "Service role has full access to password_resets" ON password_resets FOR ALL USING (true);

-- =============================================================================
-- STORAGE BUCKET FOR FILES
-- =============================================================================
-- Run this in Supabase Dashboard > Storage > Create bucket
-- Bucket name: lecture-files
-- Public: false

-- =============================================================================
-- STORAGE BUCKETS FOR MEDIA
-- =============================================================================
-- Thumbnails bucket:
-- Bucket name: course-thumbnails
-- Public: true (recommended for easy access)
--
-- Lecture videos bucket:
-- Bucket name: lecture-videos
-- Public: false (served via signed URLs)
