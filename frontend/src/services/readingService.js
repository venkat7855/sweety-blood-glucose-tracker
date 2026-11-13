
const API_URL = "http://localhost:5000/api/readings";

// Get authentication token
function getToken() {
  return localStorage.getItem("token");
}

// Common API request handler
async function request(path = "", options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Please log in to manage your readings.");
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch (error) {
    console.error("Network request failed:", error);

    throw new Error(
      "Unable to connect to the server. Please try again."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

// Convert database readings to frontend format
export function normalizeReading(reading) {
  if (!reading || typeof reading !== "object") {
    throw new Error("Invalid reading received from the server.");
  }

  const date =
    typeof reading.reading_date === "string"
      ? reading.reading_date.slice(0, 10)
      : reading.reading_date
        ? new Date(reading.reading_date)
            .toISOString()
            .slice(0, 10)
        : "";

  const measuredAt = reading.measured_at || null;

  const measuredDate = measuredAt
    ? new Date(measuredAt)
    : null;

  const validMeasuredDate =
    measuredDate &&
    !Number.isNaN(measuredDate.getTime());

  return {
    id: reading.id,
    glucose: Number(reading.glucose_level),
    meal: reading.time_slot,
    date,

    time: validMeasuredDate
      ? measuredDate.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "",

    measuredAt: validMeasuredDate
      ? measuredDate.toISOString()
      : null,

    createdAt: reading.created_at,
  };
}

// Convert frontend reading into backend request format
export function toApiReading(reading) {
  const glucose = Number(reading.glucose);
  const measuredDate = new Date(reading.measuredAt);

  if (
    reading.measuredAt === undefined ||
    reading.measuredAt === null ||
    reading.measuredAt === "" ||
    Number.isNaN(measuredDate.getTime())
  ) {
    throw new Error(
      "Please select a valid measurement date and time."
    );
  }

  if (measuredDate > new Date()) {
    throw new Error(
      "Measurement time cannot be in the future."
    );
  }

  if (
    !Number.isInteger(glucose) ||
    glucose < 40 ||
    glucose > 600
  ) {
    throw new Error(
      "Please enter a glucose value between 40 and 600 mg/dL."
    );
  }

  if (
    typeof reading.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reading.date)
  ) {
    throw new Error("Please select a valid reading date.");
  }

  return {
    glucose_level: glucose,
    reading_date: reading.date,
    time_slot: reading.meal,
    measured_at: measuredDate.toISOString(),
  };
}

// GET - Load all readings
export async function getReadings() {
  const data = await request();

  if (!Array.isArray(data)) {
    throw new Error("Unable to load your readings.");
  }

  return data.map(normalizeReading);
}

// POST - Add reading
export async function addReadingAPI(reading) {
  const payload = toApiReading(reading);

  const data = await request("", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!data.reading) {
    throw new Error("The server did not return the saved reading.");
  }

  return normalizeReading(data.reading);
}

// PUT - Update reading
export async function updateReadingAPI(id, reading) {
  const payload = toApiReading(reading);

  const data = await request(`/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!data.reading) {
    throw new Error("The server did not return the updated reading.");
  }

  return normalizeReading(data.reading);
}

// DELETE - Delete reading
export async function deleteReadingAPI(id) {
  return request(`/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
