-- Database indexes for better query performance
-- Run this manually in your SQLite database for better performance

-- Equipment table indexes
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_updated_at ON equipment(updatedAt);
CREATE INDEX IF NOT EXISTS idx_equipment_current_owner ON equipment(currentOwnerId);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date ON equipment(nextMaintenanceDate);

-- Equipment requests indexes
CREATE INDEX IF NOT EXISTS idx_equipment_requests_status ON equipment_requests(status);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_requester ON equipment_requests(requesterId);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_created_at ON equipment_requests(createdAt);

-- Request history indexes
CREATE INDEX IF NOT EXISTS idx_request_history_created_at ON request_history(createdAt);
CREATE INDEX IF NOT EXISTS idx_request_history_user ON request_history(userId);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_active ON users(isActive);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(teamId);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);