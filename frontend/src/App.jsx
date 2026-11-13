
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

function prepareReading(value, glucose, meal) {
  if (!value) {
    throw new Error("Please select a measurement date and time.");
  }

  const measuredDate = new Date(value);

  if (Number.isNaN(measuredDate.getTime())) {
    throw new Error("Invalid measurement date and time.");
  }

  if (measuredDate > new Date()) {
    throw new Error("Measurement time cannot be in the future.");
  }

  const number = Number(glucose);

  if (
    String(glucose).trim() === "" ||
    !Number.isInteger(number) ||
    number < 40 ||
    number > 600
  ) {
    throw new Error(
      "Please enter a whole number between 40 and 600 mg/dL."
    );
  }

  return {
    glucose: number,
    meal,
    date: value.slice(0, 10),
    measuredAt: measuredDate.toISOString(),
  };
}

function getNextMeal(readings, date) {
  const recorded = readings
    .filter((reading) => reading.date === date)
    .map((reading) => reading.meal);

  return SLOTS.find((slot) => !recorded.includes(slot)) || SLOTS[0];
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

  const [glucose, setGlucose] = useState("");
  const [meal, setMeal] = useState(SLOTS[0]);
  const [measuredAt, setMeasuredAt] = useState(
    () => getLocalDateTime()
  );

  const [editingId, setEditingId] = useState(null);
  const [editGlucose, setEditGlucose] = useState("");
  const [editMeal, setEditMeal] = useState(SLOTS[0]);
  const [editMeasuredAt, setEditMeasuredAt] = useState("");

  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);

  // CUSTOM LOGOUT DIALOG STATE
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // OPEN CUSTOM LOGOUT DIALOG
  function handleLogout() {
    setMobileMenuOpen(false);
    setShowLogoutModal(true);
  }

  // CONFIRM LOGOUT
  function confirmLogout() {
    setShowLogoutModal(false);
    setProfile(null);
    setReadings([]);

    if (typeof onLogout === "function") {
      onLogout();
    }
  }

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
        if (!cancelled) setReadings(data);
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
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // LOAD PROFILE AND SAVED AVATAR
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

  // UPDATE AVATAR IN HEADER IMMEDIATELY
  function handleProfileUpdated(updatedUser) {
    setProfile(updatedUser);

    // Keep the locally saved user information in sync.
    localStorage.setItem(
      "sweety-user",
      JSON.stringify(updatedUser)
    );
  }

  function showNotification(message, type = "success") {
    setNotification({ message, type });
  }

  function navigate(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // DASHBOARD CALCULATIONS
  const today = getLocalDateTime().slice(0, 10);

  const todaysReadings = readings.filter(
    (reading) => reading.date === today
  );

  const selectedDate = measuredAt.slice(0, 10);

  const selectedDateReadings = readings.filter(
    (reading) => reading.date === selectedDate
  );

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

  // ADD GLUCOSE READING
  async function addReading(event) {
    event.preventDefault();

    if (saving || loading) return;

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
          "You can record only 4 readings per day."
        );
      }

      if (daily.some((reading) => reading.meal === meal)) {
        throw new Error(
          "This reading type is already recorded for the selected date."
        );
      }

      setSaving(true);

      const savedReading = await addReadingAPI(payload);

      setReadings((current) => [
        savedReading,
        ...current,
      ]);

      setGlucose("");
      showNotification("Reading added successfully!");

      try {
        const updated = await refreshReadings();
        setMeal(getNextMeal(updated, payload.date));
      } catch {
        setMeal(
          getNextMeal(
            [...readings, savedReading],
            payload.date
          )
        );
      }
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // START EDIT READING
  function startEdit(reading) {
    setEditingId(reading.id);
    setEditGlucose(String(reading.glucose));
    setEditMeal(reading.meal);

    const savedDate = reading.measuredAt
      ? new Date(reading.measuredAt)
      : null;

    setEditMeasuredAt(
      savedDate && !Number.isNaN(savedDate.getTime())
        ? getLocalDateTime(savedDate)
        : `${reading.date}T00:00`
    );
  }

  // UPDATE READING
  async function updateReading(event) {
    event.preventDefault();

    if (updating || editingId === null) return;

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
          "You can record only 4 readings per day."
        );
      }

      if (
        otherReadings.some(
          (reading) => reading.meal === payload.meal
        )
      ) {
        throw new Error(
          "This reading type is already recorded for the selected date."
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
      showNotification("Reading updated successfully!");

      try {
        await refreshReadings();
      } catch {
        // Keep the locally updated reading.
      }
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setUpdating(false);
    }
  }

  // DELETE READING
  async function confirmDelete() {
    if (deleteId === null || deleting) return;

    setDeleting(true);

    try {
      await deleteReadingAPI(deleteId);

      setReadings((current) =>
        current.filter((reading) => reading.id !== deleteId)
      );

      if (editingId === deleteId) {
        setEditingId(null);
      }

      setDeleteId(null);
      showNotification("Reading deleted successfully!");

      try {
        await refreshReadings();
      } catch {
        // Keep the locally updated list.
      }
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  // SIDEBAR MENU
  const menuItems = [
    { id: "dashboard", icon: "▦", label: "Dashboard" },
    { id: "readings", icon: "🩸", label: "Glucose Readings" },
    { id: "activity", icon: "♡", label: "Activity Tracker" },
    { id: "reports", icon: "▥", label: "Health Reports" },
    { id: "profile", icon: "👤", label: "My Profile" },
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

  // READING FORM
  function renderReadingForm() {
    return (
      <section className="card form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              GLUCOSE MONITORING
            </span>

            <h2>Record Blood Glucose</h2>

            <p>
              Keep your daily health records up to date.
            </p>
          </div>

          <div className="section-icon">🩸</div>
        </div>

        <form
          className="reading-form"
          onSubmit={addReading}
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
                value={glucose}
                placeholder="Enter glucose value"
                onChange={(event) =>
                  setGlucose(event.target.value)
                }
                disabled={saving}
                required
              />

              <span>mg/dL</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="meal">
              Reading Type
            </label>

            <select
              id="meal"
              value={meal}
              onChange={(event) =>
                setMeal(event.target.value)
              }
              disabled={saving}
            >
              {SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
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

            <p className="form-note">
              💚 Keep track of your daily glucose readings.
            </p>
          </div>

          <button
            className="primary-btn"
            type="submit"
            disabled={
              saving ||
              loading ||
              selectedDateReadings.length >= 4
            }
          >
            {saving
              ? "Saving..."
              : selectedDateReadings.length >= 4
                ? "✓ All 4 Readings Recorded"
                : "＋ Save Glucose Reading"}
          </button>

          <p className="form-note">
            {selectedDateReadings.length} of 4 readings
            recorded for the selected date.
          </p>
        </form>
      </section>
    );
  }

  // READING HISTORY
  function renderReadings() {
    const sorted = [...readings].sort(
      (a, b) =>
        new Date(b.measuredAt || b.date) -
        new Date(a.measuredAt || a.date)
    );

    return (
      <section className="card history-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              HEALTH HISTORY
            </span>

            <h2>Recent Glucose Readings</h2>

            <p>
              View and manage your recorded measurements.
            </p>
          </div>

          <span className="count-badge">
            {readings.length} records
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <h3>Loading your readings...</h3>
          </div>
        ) : readings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>

            <h3>No readings yet</h3>

            <p>
              Add your first glucose reading to start tracking.
            </p>
          </div>
        ) : (
          <div className="reading-list">
            {sorted.map((reading) => (
              <div
                className="reading-item"
                key={reading.id}
              >
                {editingId === reading.id ? (
                  <form
                    className="edit-form"
                    onSubmit={updateReading}
                  >
                    <h3>✏️ Edit Reading</h3>

                    <div className="form-group">
                      <label>
                        Glucose Level (mg/dL)
                      </label>

                      <input
                        type="number"
                        min="40"
                        max="600"
                        step="1"
                        value={editGlucose}
                        onChange={(event) =>
                          setEditGlucose(event.target.value)
                        }
                        disabled={updating}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Reading Type</label>

                      <select
                        value={editMeal}
                        onChange={(event) =>
                          setEditMeal(event.target.value)
                        }
                        disabled={updating}
                      >
                        {SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        Measurement Date &amp; Time
                      </label>

                      <input
                        type="datetime-local"
                        value={editMeasuredAt}
                        max={getLocalDateTime()}
                        onChange={(event) =>
                          setEditMeasuredAt(event.target.value)
                        }
                        disabled={updating}
                        required
                      />
                    </div>

                    <div className="action-buttons">
                      <button
                        type="submit"
                        className="save-btn"
                        disabled={updating}
                      >
                        {updating
                          ? "Updating..."
                          : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => setEditingId(null)}
                        disabled={updating}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
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
                          {reading.date}
                        </p>

                        <p className="reading-entered">
                          Recorded:{" "}
                          {formatDateTime(
                            reading.measuredAt
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => startEdit(reading)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() =>
                          setDeleteId(reading.id)
                        }
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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

            <h1>Hello, welcome to Sweety!</h1>

            <p>
              Track your glucose levels and build healthier
              habits, one day at a time.
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

            <p>
              Your daily glucose monitoring summary
            </p>
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

        <div className="dashboard-columns">
          {renderReadingForm()}
          {renderReadings()}
        </div>
      </>
    );
  }

  // MAIN APPLICATION LAYOUT
  return (
    <div className="app-layout">
      {/* CUSTOM SWEETY LOGOUT DIALOG */}
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
              Are you sure you want to log out of Sweety?
              Your saved health records will be here
              when you return.
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
              Delete Reading?
            </h2>

            <p>
              Are you sure you want to delete this glucose
              reading? This action cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
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

      {/* NOTIFICATIONS */}
      {notification && (
        <div
          className={`sweety-toast ${
            notification.type === "error"
              ? "sweety-toast-error"
              : "sweety-toast-success"
          }`}
          role="status"
        >
          <span>
            {notification.type === "error"
              ? "⚠️"
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

          {/* SIDEBAR LOGOUT BUTTON */}
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
        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              type="button"
              onClick={() =>
                setMobileMenuOpen(!mobileMenuOpen)
              }
              aria-label="Toggle navigation"
            >
              ☰
            </button>

            <div>
              <span className="topbar-label">
                HEALTH OVERVIEW
              </span>

              <h2>
                {currentPage?.label}
              </h2>
            </div>
          </div>

          <div className="topbar-right">
            <span className="date-pill">
              📅 {todayLabel}
            </span>

            {/* DYNAMIC PROFILE AVATAR */}
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

            {/* TOP BAR LOGOUT BUTTON */}
            <button
              type="button"
              onClick={handleLogout}
              title="Log out of Sweety"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                padding: "10px 15px",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ↪ Logout
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

                <h1>
                  Glucose Monitoring
                </h1>

                <p>
                  Record, review, and manage your blood
                  glucose measurements.
                </p>
              </div>

              <div className="dashboard-columns">
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

                <h1>
                  Activity Tracker
                </h1>

                <p>
                  Keep track of your daily movement and
                  lifestyle habits.
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

                <h1>
                  Health Reports
                </h1>

                <p>
                  Explore your daily and monthly glucose
                  reports.
                </p>
              </div>

              <HealthReports readings={readings} />
            </>
          )}

          {/* PROFILE */}
          {activePage === "profile" && (
            <>
              <div className="page-intro">
                <span className="eyebrow">
                  ACCOUNT SETTINGS
                </span>

                <h1>
                  My Profile
                </h1>

                <p>
                  Manage your Sweety account information.
                </p>
              </div>

              <Profile
                onProfileUpdated={handleProfileUpdated}
              />
            </>
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
