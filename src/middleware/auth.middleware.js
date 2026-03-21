function decodeTokenPayload(token) {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );

    return JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function attachUserIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  const payload = decodeTokenPayload(token);

  if (payload) {
    req.user = payload;
    req.token = token;
  }

  return next();
}

module.exports = {
  attachUserIfPresent,
};
