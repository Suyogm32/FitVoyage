import { User } from "../models/User.js";

const setHeaders = (res, limit, remaining, resetAt) => {
  res.set("X-RateLimit-Limit", String(limit));
  res.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  res.set("X-RateLimit-Reset", resetAt.toISOString());
};

// Per-user fixed window, counted in the user document.
//
// Per-user rather than per-IP: the endpoint is authenticated, and an IP limit
// would punish everyone behind one NAT while doing nothing about a single
// account looping requests.
//
// In the database rather than in memory so the count survives a restart and
// stays correct if this ever runs on more than one instance.
//
// Fixed window, not sliding: a user can spend a full window's worth either
// side of a boundary. Acceptable here — the limit exists to stop a runaway
// loop and cap spend, not to smooth traffic.
export const rateLimit = ({ key, limit, windowMs }) => {
  const path = `rateLimits.${key}`;

  return async (req, res, next) => {
    const now = new Date();
    const windowFloor = new Date(now.getTime() - windowMs);

    try {
      // Window open and room left. A single atomic op, so two concurrent
      // requests can't both read "one left" and both go through.
      let doc = await User.findOneAndUpdate(
        {
          _id: req.user.dbId,
          [`${path}.windowStart`]: { $gt: windowFloor },
          [`${path}.count`]: { $lt: limit },
        },
        { $inc: { [`${path}.count`]: 1 } },
        { new: true, projection: path },
      ).lean();

      // No open window, or it has expired. Start a fresh one at 1.
      if (!doc) {
        doc = await User.findOneAndUpdate(
          {
            _id: req.user.dbId,
            $or: [
              { [`${path}.windowStart`]: { $lte: windowFloor } },
              { [`${path}.windowStart`]: null },
            ],
          },
          { $set: { [`${path}.windowStart`]: now, [`${path}.count`]: 1 } },
          { new: true, projection: path },
        ).lean();
      }

      // Neither matched: the window is open and the count is at the limit.
      if (!doc) {
        const current = await User.findById(req.user.dbId).select(path).lean();
        const windowStart = current?.rateLimits?.[key]?.windowStart || now;
        const resetAt = new Date(new Date(windowStart).getTime() + windowMs);
        const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

        setHeaders(res, limit, 0, resetAt);
        res.set("Retry-After", String(retryAfter));

        return res.status(429).json({
          message: "Rate limit reached.",
          limit,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          retryAfter,
        });
      }

      const state = doc.rateLimits?.[key] || { windowStart: now, count: 1 };
      const resetAt = new Date(
        new Date(state.windowStart).getTime() + windowMs,
      );
      setHeaders(res, limit, limit - state.count, resetAt);

      req.rateLimit = { limit, remaining: limit - state.count, resetAt };
      next();
    } catch (error) {
      console.error(`Rate limit check failed for ${key}:`, error.message);
      // Fail closed. This limiter protects spend, so a database blip must not
      // become an open door.
      res.status(503).json({
        message: "Couldn't verify your usage limit. Please try again.",
      });
    }
  };
};

// Read-only view of the same counter, for showing remaining quota in the UI
// without consuming one.
export const readRateLimit = async (dbId, { key, limit, windowMs }) => {
  const now = new Date();
  const user = await User.findById(dbId).select(`rateLimits.${key}`).lean();

  const state = user?.rateLimits?.[key];
  const windowStart = state?.windowStart ? new Date(state.windowStart) : null;
  const expired = !windowStart || now - windowStart >= windowMs;

  if (expired) {
    return {
      limit,
      remaining: limit,
      resetAt: new Date(now.getTime() + windowMs).toISOString(),
    };
  }

  return {
    limit,
    remaining: Math.max(0, limit - (state.count || 0)),
    resetAt: new Date(windowStart.getTime() + windowMs).toISOString(),
  };
};
