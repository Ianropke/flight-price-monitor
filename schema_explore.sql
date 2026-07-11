-- Migration to support Explore mode

-- 1. Modify tracked_routes
ALTER TABLE tracked_routes ADD COLUMN route_type VARCHAR(20) DEFAULT 'specific' NOT NULL;
ALTER TABLE tracked_routes ADD COLUMN explore_regions TEXT[];

-- Allow destination_iata to be null for explore routes
ALTER TABLE tracked_routes ALTER COLUMN destination_iata DROP NOT NULL;
ALTER TABLE tracked_routes DROP CONSTRAINT chk_iata_destination;
ALTER TABLE tracked_routes ADD CONSTRAINT chk_iata_destination CHECK (destination_iata IS NULL OR length(destination_iata) = 3);

-- Add constraint to ensure correct data based on route_type
ALTER TABLE tracked_routes ADD CONSTRAINT chk_route_type_data CHECK (
    (route_type = 'specific' AND destination_iata IS NOT NULL) OR
    (route_type = 'explore' AND explore_regions IS NOT NULL)
);

-- 2. Modify price_history
-- Add a column to store multiple deals found during an explore search
ALTER TABLE price_history ADD COLUMN explore_deals JSONB;

-- 3. Invalidate schema cache
NOTIFY pgrst, 'reload schema';
