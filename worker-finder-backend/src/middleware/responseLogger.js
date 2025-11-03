const isDev = process.env.NODE_ENV === 'development';

// Mask sensitive fields in an object (shallow)
const maskSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = Array.isArray(obj) ? [] : {};
  const sensitiveKeys = ['password', 'token', 'refreshToken', 'authorization', 'Authorization', 'auth', 'accessToken'];

  for (const key of Object.keys(obj)) {
    try {
      if (sensitiveKeys.includes(key)) {
        masked[key] = '***REDACTED***';
      } else if (typeof obj[key] === 'object' && obj[key] !== null && Object.keys(obj[key]).length <= 20) {
        // shallow mask nested object (avoid deep recursion)
        masked[key] = maskSensitive(obj[key]);
      } else {
        masked[key] = obj[key];
      }
    } catch (e) {
      masked[key] = '[unserializable]';
    }
  }

  return masked;
};

module.exports = (req, res, next) => {
  if (!isDev) return next();

  const origJson = res.json.bind(res);
  res.json = (body) => {
    try {
      const safe = maskSensitive(body);
      console.log('responseLogger:json', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode || 200,
        body: safe
      });
      res._responseLogged = true;
    } catch (err) {
      console.error('responseLogger:error while logging json', err.message);
    }
    return origJson(body);
  };

  const origSend = res.send.bind(res);
  res.send = (body) => {
    try {
      if (res._responseLogged) return origSend(body);
      let parsed = body;
      if (typeof body === 'string') {
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          // keep original string
        }
      }
      const safe = maskSensitive(parsed);
      console.log('responseLogger:send', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode || 200,
        body: safe
      });
      res._responseLogged = true;
    } catch (err) {
      console.error('responseLogger:error while logging send', err.message);
    }
    return origSend(body);
  };

  next();
};
