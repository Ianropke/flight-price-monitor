-- Supabase PostgreSQL Schema for Flight Price Monitor

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS tracked_routes CASCADE;

-- Create tracked_routes table
CREATE TABLE tracked_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_price DECIMAL(10, 2),
    drop_percentage DECIMAL(5, 2),
    currency VARCHAR(3) DEFAULT 'DKK' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT chk_iata_origin CHECK (length(origin) = 3),
    CONSTRAINT chk_iata_destination CHECK (length(destination) = 3),
    CONSTRAINT chk_dates CHECK (start_date <= end_date)
);

-- Create price_history table
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES tracked_routes(id) ON DELETE CASCADE,
    fetch_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    lowest_price DECIMAL(10, 2) NOT NULL,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create performance indexes
CREATE INDEX idx_tracked_routes_user ON tracked_routes(user_id);
CREATE INDEX idx_price_history_route_date ON price_history(route_id, fetch_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tracked_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_routes:
-- Allow users to read/write their own tracked routes, or allow public if user_id is null (for simple testing/guest bypass).
CREATE POLICY select_tracked_routes ON tracked_routes
    FOR SELECT USING (
        user_id IS NULL OR 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

CREATE POLICY insert_tracked_routes ON tracked_routes
    FOR INSERT WITH CHECK (
        user_id IS NULL OR 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

CREATE POLICY update_tracked_routes ON tracked_routes
    FOR UPDATE USING (
        user_id IS NULL OR 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

CREATE POLICY delete_tracked_routes ON tracked_routes
    FOR DELETE USING (
        user_id IS NULL OR 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
    );

-- RLS Policies for price_history:
-- Allow reading price history if the parent tracked_route is accessible.
CREATE POLICY select_price_history ON price_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tracked_routes
            WHERE tracked_routes.id = price_history.route_id
        )
    );

-- Allow inserting price history entries (both public and service roles can write histories when updating routes).
CREATE POLICY insert_price_history ON price_history
    FOR INSERT WITH CHECK (true);

-- Allow deletion of price histories if route is accessible (Cascade deletes are handled by foreign key).
CREATE POLICY delete_price_history ON price_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tracked_routes
            WHERE tracked_routes.id = price_history.route_id
        )
    );
