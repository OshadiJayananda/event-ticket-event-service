const gatewayUrl = process.env.API_GATEWAY_URL;
const notificationEventsPath =
  process.env.GATEWAY_NOTIFICATION_EVENTS_PATH || "/api/notifications/events";
const notificationTimeoutMs = Number(process.env.GATEWAY_TIMEOUT_MS || 5000);

function buildNotificationUrl() {
  if (!gatewayUrl) {
    throw new Error("API_GATEWAY_URL is not configured");
  }

  const normalizedBase = gatewayUrl.endsWith("/")
    ? gatewayUrl.slice(0, -1)
    : gatewayUrl;
  const normalizedPath = notificationEventsPath.startsWith("/")
    ? notificationEventsPath
    : `/${notificationEventsPath}`;

  return `${normalizedBase}${normalizedPath}`;
}

async function sendNotificationEvent(payload, token) {
  if (!token) {
    throw new Error("Notification gateway request requires a user token");
  }

  const serviceToken =
    process.env.INTERNAL_SERVICE_TOKEN || "shared_service_secret";
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    notificationTimeoutMs,
  );

  try {
    const response = await fetch(buildNotificationUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-service-token": serviceToken,
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(responseText || `Notification request failed with status ${response.status}`);
    }

    return response.json().catch(() => null);
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  sendNotificationEvent,
};
