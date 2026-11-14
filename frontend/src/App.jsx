import { useEffect, useState } from "react";
import "./App.css";

import ActivityTracker from "./components/ActivityTracker";
import GlucoseChart from "./components/GlucoseChart";
import HealthReports from "./components/HealthReports";
import Profile from "./components/Profile";

import {
  getReadings,
  addReadingAPI,
  updateReadingAPI,
  deleteReadingAPI,
} from "./services/readingService";

const SLOTS = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];

const PROFILE_API = "http://localhost:5000/api/auth/profile";
const PAGE_SIZE = 5;

function getLocalDateTime(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatReadingDate(value) {
  if (!value) return "";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getGlucoseError(value) {
  if (String(value).trim() === "") {
    return "Please enter your blood glucose level.";
  }

  const number = Number(value);

  if (!Number.isFinite(number) || !Number.isInteger(number)) {
    return "Please enter a whole number without decimal values.";
  }

  if (number < 40 || number > 600) {
    return "Please enter a glucose value between 40 and 600 mg/dL.";
  }

  return "";
}

function prepareReading(value, glucose, meal) {
  const glucoseError = getGlucoseError(glucose);

  if (glucoseError) {
    throw new Error(glucoseError);
  }

  if (!SLOTS.includes(meal)) {
    throw new Error("Please select an available reading type.");
  }

  if (!value) {
    throw new Error("Please select your measurement date and time.");
  }

  const measuredDate = new Date(value);

  if (Number.isNaN(measuredDate.getTime())) {
    throw new Error("Please select a valid date and time.");
  }

  if (measuredDate > new Date()) {
    throw new Error("Please choose the current time or an earlier time.");
  }

  return {
    glucose: Number(glucose),
    meal,
    date: value.slice(0, 10),
    measuredAt: measuredDate.toISOString(),
  };
}

function getNextMeal(readings, date) {
  const recorded = readings
    .filter((reading) => reading.date === date)
    .map((reading) => reading.meal);

  return SLOTS.find((slot) => !recorded.includes(slot)) || "";
}

export default function App({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // PROFILE STATE
  const [profile, setProfile] = useState(user || null);

  // READINGS STATE
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ADD READING FORM
  const [glucose, setGlucose] = useState("");
  const [meal, setMeal] = useState(SLOTS[0]);
  const [measuredAt, setMeasuredAt] = useState(
    () => getLocalDateTime()
  );
  const [formError, setFormError] = useState("");

  // EDIT READING FORM
  const [editingId, setEditingId] = useState(null);
  const [editGlucose, setEditGlucose] = useState("");
  const [editMeal, setEditMeal] = useState(SLOTS[0]);
  const [editMeasuredAt, setEditMeasuredAt] = useState("");
  const [editError, setEditError] = useState("");

  // PAGINATION AND DATE FILTERS
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // DIALOGS AND NOTIFICATIONS
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const today = getLocalDateTime().slice(0, 10);
  const selectedDate = measuredAt.slice(0, 10);

  const selectedDateReadings = readings.filter(
    (reading) => reading.date === selectedDate
  );

  const recordedSlots = selectedDateReadings.map(
    (reading) => reading.meal
  );

  const todaysReadings = readings.filter(
    (reading) => reading.date === today
  );

  // AUTOMATIC NOTIFICATION DISMISSAL
  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notification]);

  // LOAD READINGS
  async function refreshReadings() {
    const data = await getReadings();
    setReadings(data);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    getReadings()
      .then((data) => {
        if (!cancelled) {
          setReadings(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNotification({
            message: error.message,
            type: "error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // KEEP AVAILABLE TIME SLOTS UPDATED
  useEffect(() => {
    setMeal((currentMeal) => {
      const occupied = readings
        .filter((reading) => reading.date === selectedDate)
        .map((reading) => reading.meal);

      if (
        SLOTS.includes(currentMeal) &&
        !occupied.includes(currentMeal)
      ) {
        return currentMeal;
      }

      return getNextMeal(readings, selectedDate);
    });
  }, [readings, selectedDate]);

  // LOAD USER PROFILE
  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("token");

    if (!token) {
      return () => controller.abort();
    }

    async function loadProfile() {
      try {
        const response = await fetch(PROFILE_API, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load profile.");
        }

        const data = await response.json();

        if (!controller.signal.aborted && data.user) {
          setProfile(data.user);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Profile loading error:", error);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, []);

  function handleProfileUpdated(updatedUser) {
    setProfile(updatedUser);

    localStorage.setItem(
      "sweety-user",
      JSON.stringify(updatedUser)
    );
  }

  function showNotification(message, type = "success") {
    setNotification({
      message,
      type,
    });
  }

  // PAGE NAVIGATION
  function navigate(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
    setNotification(null);
    setEditingId(null);
    setEditError("");
    setFormError("");

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    document.querySelector(".main-wrapper")?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }

  // LOGOUT
  function handleLogout() {
    setMobileMenuOpen(false);
    setShowLogoutModal(true);
  }

  function confirmLogout() {
    setShowLogoutModal(false);
    setProfile(null);
    setReadings([]);
    setNotification(null);

    if (typeof onLogout === "function") {
      onLogout();
    }
  }

  // DASHBOARD CALCULATIONS
  const progress = Math.min(
    (todaysReadings.length / 4) * 100,
    100
  );

  const values = todaysReadings.map(
    (reading) => Number(reading.glucose)
  );

  const average = values.length
    ? (
        values.reduce((sum, value) => sum + value, 0) /
        values.length
      ).toFixed(1)
    : "--";

  const highest = values.length
    ? Math.max(...values)
    : "--";

  const lowest = values.length
    ? Math.min(...values)
    : "--";

  // DATE RANGE FILTERING
  const invalidDateRange =
    Boolean(fromDate && toDate && fromDate > toDate);

  const filteredReadings = [...readings]
    .filter((reading) => {
      if (invalidDateRange) return false;

      if (fromDate && reading.date < fromDate) {
        return false;
      }

      if (toDate && reading.date > toDate) {
        return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.measuredAt || b.date) -
        new Date(a.measuredAt || a.date)
    );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReadings.length / PAGE_SIZE)
  );

  const safePage = Math.min(
    currentPageNumber,
    totalPages
  );

  const startIndex = (safePage - 1) * PAGE_SIZE;

  const visibleReadings = filteredReadings.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPageNumber((page) =>
      Math.min(Math.max(page, 1), totalPages)
    );
  }, [totalPages]);

  function changePage(page) {
    setCurrentPageNumber(page);
    setEditingId(null);
    setEditError("");
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    changePage(1);
  }

  // ADD GLUCOSE READING
  async function addReading(event) {
    event.preventDefault();

    if (saving || loading) return;

    setFormError("");
    setNotification(null);

    try {
      const payload = prepareReading(
        measuredAt,
        glucose,
        meal
      );

      const daily = readings.filter(
        (reading) => reading.date === payload.date
      );

      if (daily.length >= 4) {
        throw new Error(
          "You have completed all four readings for this day. Please choose another date."
        );
      }

      if (daily.some((reading) => reading.meal === payload.meal)) {
        throw new Error(
          "You have already recorded this time slot. Please select another available reading type."
        );
      }

      setSaving(true);

      const savedReading = await addReadingAPI(payload);

      setReadings((current) => [
        savedReading,
        ...current,
      ]);

      setGlucose("");
      setFormError("");
      setEditingId(null);
      clearFilters();

      showNotification(
        "Your glucose reading has been saved successfully!"
      );

      try {
        await refreshReadings();
      } catch {
        // Preserve the successfully saved local reading.
      }
    } catch (error) {
      setFormError(
        error.message || "Unable to save your reading. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // START EDITING
  function startEdit(reading) {
    if (updating || deleting) return;

    setEditingId(reading.id);
    setEditGlucose(String(reading.glucose));
    setEditMeal(reading.meal);
    setEditError("");
    setNotification(null);

    const savedDate = reading.measuredAt
      ? new Date(reading.measuredAt)
      : null;

    setEditMeasuredAt(
      savedDate && !Number.isNaN(savedDate.getTime())
        ? getLocalDateTime(savedDate)
        : `${reading.date}T00:00`
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  // UPDATE GLUCOSE READING
  async function updateReading(event) {
    event.preventDefault();

    if (updating || editingId === null) return;

    setEditError("");
    setNotification(null);

    try {
      const payload = prepareReading(
        editMeasuredAt,
        editGlucose,
        editMeal
      );

      const otherReadings = readings.filter(
        (reading) =>
          reading.date === payload.date &&
          reading.id !== editingId
      );

      if (otherReadings.length >= 4) {
        throw new Error(
          "This date already contains four readings. Please choose another date."
        );
      }

      if (
        otherReadings.some(
          (reading) => reading.meal === payload.meal
        )
      ) {
        throw new Error(
          "This time slot is already recorded. Please choose another available time slot."
        );
      }

      setUpdating(true);

      const updatedReading = await updateReadingAPI(
        editingId,
        payload
      );

      setReadings((current) =>
        current.map((reading) =>
          reading.id === editingId
            ? updatedReading
            : reading
        )
      );

      setEditingId(null);
      setEditError("");

      showNotification(
        "Your glucose reading has been updated successfully!"
      );

      try {
        await refreshReadings();
      } catch {
        // Preserve the successfully updated local reading.
      }
    } catch (error) {
      setEditError(
        error.message || "Unable to update your reading. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  }

  // DELETE GLUCOSE READING
  async function confirmDelete() {
    if (deleteId === null || deleting) return;

    setDeleting(true);
    setNotification(null);

    try {
      await deleteReadingAPI(deleteId);

      setReadings((current) =>
        current.filter(
          (reading) => reading.id !== deleteId
        )
      );

      if (editingId === deleteId) {
        setEditingId(null);
      }

      setDeleteId(null);

      showNotification(
        "Your glucose reading has been deleted successfully."
      );

      try {
        await refreshReadings();
      } catch {
        // Preserve the successfully updated local list.
      }
    } catch (error) {
      setDeleteId(null);

      showNotification(
        error.message || "Unable to delete your reading.",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  }

  // SIDEBAR NAVIGATION
  const menuItems = [
    {
      id: "dashboard",
      icon: "▦",
      label: "Dashboard",
    },
    {
      id: "readings",
      icon: "🩸",
      label: "Glucose Readings",
    },
    {
      id: "activity",
      icon: "♡",
      label: "Activity Tracker",
    },
    {
      id: "reports",
      icon: "▥",
      label: "Health Reports",
    },
    {
      id: "profile",
      icon: "👤",
      label: "My Profile",
    },
  ];

  const currentPage = menuItems.find(
    (item) => item.id === activePage
  );

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // USER-FRIENDLY INLINE ERROR
  function renderFormError(message) {
    if (!message) return null;

    return (
      <div
        className="friendly-form-error"
        role="alert"
        style={{
          padding: "12px 14px",
          borderRadius: "12px",
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          color: "#9a3412",
          fontSize: "13px",
          lineHeight: "1.6",
          marginTop: "10px",
        }}
      >
        <strong>Let's check that again</strong>

        <p style={{ margin: "4px 0 0" }}>
          {message}
        </p>
      </div>
    );
  }

  // ADD READING FORM
  function renderReadingForm() {
    const dayCompleted = selectedDateReadings.length >= 4;

    return (
      <section
        className="card form-card"
        style={{ alignSelf: "start" }}
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              DAILY MONITORING
            </span>

            <h2>Record Blood Glucose</h2>

            <p>Small steps towards better health.</p>
          </div>

          <div className="section-icon">🩸</div>
        </div>

        <form
          className="reading-form"
          onSubmit={addReading}
          noValidate
        >
          <div className="form-group">
            <label htmlFor="glucose">
              Blood Glucose Level
            </label>

            <div className="input-with-unit">
              <input
                id="glucose"
                type="number"
                min="40"
                max="600"
                step="1"
                inputMode="numeric"
                value={glucose}
                placeholder="e.g. 120"
                onChange={(event) => {
                  setGlucose(event.target.value);
                  setFormError("");
                }}
                onBlur={() => {
                  if (glucose !== "") {
                    setFormError(getGlucoseError(glucose));
                  }
                }}
                disabled={saving}
                required
              />

              <span>mg/dL</span>
            </div>

            <p className="form-note">
              Enter a whole number between 40 and 600 mg/dL.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="measuredAt">
              Measurement Date &amp; Time
            </label>

            <input
              id="measuredAt"
              type="datetime-local"
              value={measuredAt}
              max={getLocalDateTime()}
              onChange={(event) => {
                const value = event.target.value;

                setMeasuredAt(value);
                setFormError("");

                if (value) {
                  setMeal(
                    getNextMeal(
                      readings,
                      value.slice(0, 10)
                    )
                  );
                }
              }}
              disabled={saving}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="meal">
              Reading Type
            </label>

            <select
              id="meal"
              value={meal}
              onChange={(event) => {
                setMeal(event.target.value);
                setFormError("");
              }}
              disabled={saving || dayCompleted}
              required
            >
              <option value="" disabled>
                {dayCompleted
                  ? "All readings completed"
                  : "Select reading type"}
              </option>

              {SLOTS.map((slot) => {
                const recorded = recordedSlots.includes(slot);

                return (
                  <option
                    key={slot}
                    value={slot}
                    disabled={recorded}
                  >
                    {slot}
                    {recorded ? " — Recorded ✓" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {renderFormError(formError)}

          <div
            style={{
              padding: "14px",
              background: "#ecfdf5",
              border: "1px solid #d1fae5",
              borderRadius: "12px",
              margin: "12px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                color: "#047857",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <span>Daily reading progress</span>

              <span>
                {selectedDateReadings.length}/4
              </span>
            </div>

            <div
              className="progress-track"
              style={{ marginTop: "10px" }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    selectedDateReadings.length * 25,
                    100
                  )}%`,
                }}
              />
            </div>

            <p
              style={{
                fontSize: "12px",
                color: "#047857",
                margin: "10px 0 0",
              }}
            >
              {dayCompleted
                ? "Great job! All four readings are completed for this date."
                : `${4 - selectedDateReadings.length} reading slots available for this date.`}
            </p>
          </div>

          <button
            className="primary-btn"
            type="submit"
            disabled={saving || loading || dayCompleted}
          >
            {saving
              ? "Saving your reading..."
              : dayCompleted
              ? "✓ Daily Readings Completed"
              : "＋ Save Glucose Reading"}
          </button>

          <p className="form-note">
            💚 Every reading helps you keep track of your health.
          </p>
        </form>
      </section>
    );
  }

  // EDIT READING FORM
  function renderEditForm() {
    const editDate = editMeasuredAt.slice(0, 10);

    const occupiedSlots = readings
      .filter(
        (reading) =>
          reading.date === editDate &&
          reading.id !== editingId
      )
      .map((reading) => reading.meal);

    return (
      <form
        className="edit-form"
        onSubmit={updateReading}
        noValidate
      >
        <h3>Edit Glucose Reading</h3>

        <div className="form-group">
          <label htmlFor="editGlucose">
            Blood Glucose Level (mg/dL)
          </label>

          <input
            id="editGlucose"
            type="number"
            min="40"
            max="600"
            step="1"
            inputMode="numeric"
            value={editGlucose}
            onChange={(event) => {
              setEditGlucose(event.target.value);
              setEditError("");
            }}
            disabled={updating}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="editMeasuredAt">
            Measurement Date &amp; Time
          </label>

          <input
            id="editMeasuredAt"
            type="datetime-local"
            value={editMeasuredAt}
            max={getLocalDateTime()}
            onChange={(event) => {
              const value = event.target.value;

              setEditMeasuredAt(value);
              setEditError("");

              const occupied = readings
                .filter(
                  (reading) =>
                    reading.id !== editingId &&
                    reading.date === value.slice(0, 10)
                )
                .map((reading) => reading.meal);

              if (occupied.includes(editMeal)) {
                setEditMeal(
                  SLOTS.find(
                    (slot) => !occupied.includes(slot)
                  ) || ""
                );
              }
            }}
            disabled={updating}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="editMeal">
            Reading Type
          </label>

          <select
            id="editMeal"
            value={editMeal}
            onChange={(event) => {
              setEditMeal(event.target.value);
              setEditError("");
            }}
            disabled={updating}
          >
            <option value="" disabled>
              Select an available time slot
            </option>

            {SLOTS.map((slot) => (
              <option
                key={slot}
                value={slot}
                disabled={occupiedSlots.includes(slot)}
              >
                {slot}
                {occupiedSlots.includes(slot)
                  ? " — Recorded ✓"
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {renderFormError(editError)}

        <div className="action-buttons">
          <button
            type="submit"
            className="save-btn"
            disabled={updating}
          >
            {updating
              ? "Saving..."
              : "✓ Save Changes"}
          </button>

          <button
            type="button"
            className="cancel-btn"
            onClick={cancelEdit}
            disabled={updating}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // PAGINATION
  function renderPagination() {
    if (filteredReadings.length === 0) return null;

    return (
      <div
        className="history-pagination"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          paddingTop: "18px",
          marginTop: "18px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <span
          style={{
            color: "#64748b",
            fontSize: "12px",
          }}
        >
          Showing {startIndex + 1}–
          {Math.min(
            startIndex + PAGE_SIZE,
            filteredReadings.length
          )}{" "}
          of {filteredReadings.length}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="cancel-btn"
            disabled={safePage === 1 || updating}
            onClick={() => changePage(safePage - 1)}
          >
            ← Previous
          </button>

          <span
            style={{
              fontSize: "13px",
              color: "#047857",
              fontWeight: 600,
            }}
          >
            {safePage} / {totalPages}
          </span>

          <button
            type="button"
            className="save-btn"
            disabled={safePage === totalPages || updating}
            onClick={() => changePage(safePage + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  // READING HISTORY
  function renderReadings() {
    return (
      <section className="card history-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              HEALTH HISTORY
            </span>

            <h2>Glucose History</h2>

            <p>Review and manage your saved readings.</p>
          </div>

          <span className="count-badge">
            {readings.length} records
          </span>
        </div>

        {/* DATE RANGE FILTER */}
        <div
          className="history-filters"
          style={{
            padding: "14px",
            background: "#f8fbf9",
            border: "1px solid #e1eee7",
            borderRadius: "12px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <strong style={{ fontSize: "13px" }}>
              Filter by date
            </strong>

            <button
              className="cancel-btn"
              type="button"
              onClick={clearFilters}
              disabled={updating}
            >
              Reset
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="form-group">
              <label htmlFor="fromDate">
                From Date
              </label>

              <input
                id="fromDate"
                type="date"
                value={fromDate}
                max={toDate || today}
                disabled={updating}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  changePage(1);
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="toDate">
                To Date
              </label>

              <input
                id="toDate"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={today}
                disabled={updating}
                onChange={(event) => {
                  setToDate(event.target.value);
                  changePage(1);
                }}
              />
            </div>
          </div>

          {invalidDateRange &&
            renderFormError(
              "The From Date must be on or before the To Date."
            )}
        </div>

        {loading ? (
          <div className="empty-state">
            <h3>Loading your readings...</h3>

            <p>Please wait a moment.</p>
          </div>
        ) : invalidDateRange ? (
          <div className="empty-state">
            <h3>Choose a valid date range</h3>

            <p>Adjust the dates above to view your readings.</p>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>

            <h3>
              {readings.length === 0
                ? "No readings yet"
                : "No readings found"}
            </h3>

            <p>
              {readings.length === 0
                ? "Add your first glucose reading to begin your health journey."
                : "There are no readings within the selected date range."}
            </p>

            {readings.length > 0 && (
              <button
                type="button"
                className="save-btn"
                onClick={clearFilters}
              >
                View All Readings
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="reading-list">
              {visibleReadings.map((reading) => (
                <div
                  className="reading-item"
                  key={reading.id}
                >
                  {editingId === reading.id ? (
                    renderEditForm()
                  ) : (
                    <>
                      <div className="reading-main">
                        <div className="reading-symbol">
                          🩸
                        </div>

                        <div className="reading-details">
                          <h3>
                            {reading.glucose}
                            <span> mg/dL</span>
                          </h3>

                          <p className="reading-type">
                            {reading.meal}
                          </p>

                          <p className="reading-date">
                            {formatReadingDate(reading.date)}
                          </p>

                          <p className="reading-entered">
                            Recorded:{" "}
                            {formatDateTime(reading.measuredAt)}
                          </p>
                        </div>
                      </div>

                      <div className="action-buttons">
                        <button
                          type="button"
                          className="edit-btn"
                          disabled={updating || deleting}
                          onClick={() => startEdit(reading)}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          className="delete-btn"
                          disabled={updating || deleting}
                          onClick={() => {
                            setNotification(null);
                            setDeleteId(reading.id);
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {renderPagination()}
          </>
        )}
      </section>
    );
  }

  // DASHBOARD
  function renderDashboard() {
    return (
      <>
        <section className="welcome-banner">
          <div>
            <span className="welcome-tag">
              💚 YOUR HEALTH, OUR PRIORITY
            </span>

            <h1>
              Hello{profile?.name
                ? `, ${profile.name.split(" ")[0]}`
                : ""}!
            </h1>

            <p>
              Take charge of your health, one reading
              at a time. Welcome to Sweety.
            </p>

            <button
              className="welcome-btn"
              onClick={() => navigate("readings")}
            >
              + Add New Reading
            </button>
          </div>

          <div className="welcome-illustration">
            <div className="illustration-circle">
              <span>♥</span>
            </div>
          </div>
        </section>

        <div className="dashboard-title">
          <div>
            <h2>Today's Health Overview</h2>

            <p>Your daily glucose monitoring summary</p>
          </div>

          <span className="live-badge">
            ● Daily Summary
          </span>
        </div>

        <section className="stats-grid">
          {[
            {
              title: "Readings Today",
              value: `${todaysReadings.length} / 4`,
              icon: "📋",
            },
            {
              title: "Average Glucose",
              value: `${average} mg/dL`,
              icon: "📊",
            },
            {
              title: "Highest Glucose",
              value: `${highest} mg/dL`,
              icon: "↗",
            },
            {
              title: "Lowest Glucose",
              value: `${lowest} mg/dL`,
              icon: "↘",
            },
          ].map((stat) => (
            <div
              className="stat-card"
              key={stat.title}
            >
              <div className="stat-top">
                <span className="stat-icon mint">
                  {stat.icon}
                </span>
              </div>

              <p>{stat.title}</p>

              <h3>{stat.value}</h3>
            </div>
          ))}
        </section>

        <section className="progress-card card">
          <div className="progress-info">
            <span className="eyebrow">
              DAILY MONITORING
            </span>

            <h2>Daily Reading Progress</h2>

            <p>
              You've recorded{" "}
              <strong>
                {todaysReadings.length} of 4
              </strong>{" "}
              glucose readings today.
            </p>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <div
            className="progress-circle"
            style={{
              background: `conic-gradient(
                #10b981 ${progress}%,
                #e7f5ef ${progress}%
              )`,
            }}
          >
            <div>
              <strong>{progress}%</strong>
              <span>Complete</span>
            </div>
          </div>
        </section>

        <GlucoseChart readings={readings} />

        <div
          className="dashboard-columns"
          style={{ alignItems: "start" }}
        >
          {renderReadingForm()}

          {renderReadings()}
        </div>
      </>
    );
  }

  // MAIN APPLICATION
  return (
    <div className="app-layout">
      {/* LOGOUT CONFIRMATION */}
      {showLogoutModal && (
        <div
          className="sweety-logout-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="sweety-logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sweety-logout-icon">
              <span>↪</span>
            </div>

            <h2 id="logout-dialog-title">
              Leaving already?
            </h2>

            <p>
              Your health records are safely saved.
              See you again soon!
            </p>

            <div className="sweety-logout-actions">
              <button
                type="button"
                className="sweety-logout-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Stay Here
              </button>

              <button
                type="button"
                className="sweety-logout-confirm"
                onClick={confirmLogout}
              >
                ↪ Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteId !== null && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (!deleting) setDeleteId(null);
          }}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-modal-icon">
              🗑️
            </div>

            <h2 id="delete-modal-title">
              Delete this reading?
            </h2>

            <p>
              This glucose reading will be permanently
              removed from your history. Your other
              readings will remain unchanged.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Keep Reading
              </button>

              <button
                type="button"
                className="modal-delete-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete Reading"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-DISMISSING NOTIFICATIONS */}
      {notification && (
        <div
          className={`sweety-toast ${
            notification.type === "error"
              ? "sweety-toast-error"
              : "sweety-toast-success"
          }`}
          role={
            notification.type === "error"
              ? "alert"
              : "status"
          }
        >
          <span>
            {notification.type === "error"
              ? "⚠"
              : "✓"}
          </span>

          <span>{notification.message}</span>

          <button
            type="button"
            aria-label="Close notification"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          mobileMenuOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            ♥
          </div>

          <div>
            <h1>Sweety</h1>

            <p>Health Companion</p>
          </div>
        </div>

        <div className="sidebar-label">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activePage === item.id
                  ? "active"
                  : ""
              }
              aria-current={
                activePage === item.id
                  ? "page"
                  : undefined
              }
              onClick={() => navigate(item.id)}
            >
              <span>{item.icon}</span>{" "}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span>💚</span>

            <h3>Your health matters</h3>

            <p>
              Small daily steps make a difference.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px 16px",
              marginTop: "16px",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ↪ Logout
          </button>

          <p className="sidebar-version">
            Sweety © 2026
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              type="button"
              onClick={() =>
                setMobileMenuOpen(!mobileMenuOpen)
              }
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>

            <div>
              <span className="topbar-label">
                SWEETY HEALTH COMPANION
              </span>

              <h2>
                {activePage === "profile"
                  ? "Account Settings"
                  : currentPage?.label}
              </h2>
            </div>
          </div>

          <div className="topbar-right">
            <span className="date-pill">
              📅 {todayLabel}
            </span>

            <button
              type="button"
              className="profile-avatar"
              aria-label="Open my profile"
              title="My Profile"
              onClick={() => navigate("profile")}
              style={{
                cursor: "pointer",
                border: "none",
              }}
            >
              {profile?.avatar || "👤"}
            </button>
          </div>
        </header>

        <main className="main-content">
          {/* DASHBOARD */}
          {activePage === "dashboard" &&
            renderDashboard()}

          {/* GLUCOSE READINGS */}
          {activePage === "readings" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">
                  DAILY HEALTH TRACKING
                </span>

                <h1>Glucose Monitoring</h1>

                <p>
                  Record and manage your blood glucose
                  measurements in one place.
                </p>
              </div>

              <div
                className="dashboard-columns"
                style={{ alignItems: "start" }}
              >
                {renderReadingForm()}

                {renderReadings()}
              </div>

              <GlucoseChart readings={readings} />
            </>
          )}

          {/* ACTIVITY TRACKER */}
          {activePage === "activity" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">
                  HEALTHY LIFESTYLE
                </span>

                <h1>Daily Activity</h1>

                <p>
                  Keep track of your daily movement
                  and lifestyle habits.
                </p>
              </div>

              <ActivityTracker />
            </>
          )}

          {/* HEALTH REPORTS */}
          {activePage === "reports" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">
                  YOUR HEALTH DATA
                </span>

                <h1>Glucose Insights</h1>

                <p>
                  Understand your recorded glucose levels
                  with daily and monthly reports.
                </p>
              </div>

              <HealthReports readings={readings} />
            </>
          )}

          {/* PROFILE */}
          {activePage === "profile" && (
            <Profile
              onProfileUpdated={handleProfileUpdated}
            />
          )}
        </main>

        {/* FOOTER */}
        <footer className="app-footer">
          <span>
            © 2026 Sweety Health Companion
          </span>

          <span>
            Made with 💚 for better health
          </span>
        </footer>
      </div>
    </div>
  );
}