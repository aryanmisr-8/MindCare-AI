const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'mindcare.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Register Haversine formula directly in SQLite for GPS proximity searches
db.function('haversine', (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in kilometers
  const toRad = Math.PI / 180;
  const dLat = (Number(lat2) - Number(lat1)) * toRad;
  const dLon = (Number(lon2) - Number(lon1)) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(Number(lat1) * toRad) * Math.cos(Number(lat2) * toRad) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
});

/**
 * Transaction helper with user context.
 */
function withUserContext(userId, fn) {
  db.exec('BEGIN');
  try {
    const result = fn(db, userId);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

module.exports = { db, withUserContext };
