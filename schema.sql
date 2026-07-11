-- Supabase PostgreSQL Schema for Flight Price Monitor (SerpApi Version)

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS tracked_routes CASCADE;

-- Create tracked_routes table
CREATE TABLE tracked_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    route_type VARCHAR(20) DEFAULT 'specific' NOT NULL,
    origin_iata VARCHAR(3) NOT NULL,
    destination_iata VARCHAR(3),
    explore_regions TEXT[],
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    target_price_threshold DECIMAL(10, 2),
    drop_percentage_threshold DECIMAL(5, 2),
    currency VARCHAR(3) DEFAULT 'DKK' NOT NULL,
    status VARCHAR(10) DEFAULT 'active' NOT NULL,
    trip_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT chk_iata_origin CHECK (length(origin_iata) = 3),
    CONSTRAINT chk_iata_destination CHECK (destination_iata IS NULL OR length(destination_iata) = 3),
    CONSTRAINT chk_route_type_data CHECK (
        (route_type = 'specific' AND destination_iata IS NOT NULL) OR
        (route_type = 'explore' AND explore_regions IS NOT NULL)
    ),
    CONSTRAINT chk_dates CHECK (departure_date <= return_date),
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive'))
);

-- Create price_history table
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES tracked_routes(id) ON DELETE CASCADE,
    fetch_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    lowest_price_found DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'DKK' NOT NULL,
    explore_deals JSONB,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create performance indexes
CREATE INDEX idx_tracked_routes_user ON tracked_routes(user_id);
CREATE INDEX idx_tracked_routes_status ON tracked_routes(status) WHERE status = 'active';
CREATE INDEX idx_price_history_route_date ON price_history(route_id, fetch_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tracked_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracked_routes:
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
CREATE POLICY select_price_history ON price_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tracked_routes
            WHERE tracked_routes.id = price_history.route_id
        )
    );

CREATE POLICY insert_price_history ON price_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY delete_price_history ON price_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tracked_routes
            WHERE tracked_routes.id = price_history.route_id
        )
    );
