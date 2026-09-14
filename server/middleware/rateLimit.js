const rateLimit = require("express-rate-limit");

// Separate limiter instance per login route (client vs admin) so brute-forcing
// one doesn't share a budget with the other. Keyed by IP — requires `trust proxy`
// to be set correctly in index.js when running behind a reverse proxy (cPanel/Passenger).
function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too_many_attempts" },
  });
}

module.exports = { createLoginLimiter };
