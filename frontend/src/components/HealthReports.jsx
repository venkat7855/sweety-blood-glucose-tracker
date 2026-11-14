import { useMemo, useState } from "react";
import GlucoseChart from "./GlucoseChart";

// ========================================
// CONFIGURATION
// ========================================

const PAGE_SIZE = 5;

const REPORT_NAMES = {
  daily: "Daily Report",
  monthToDate: "Month-to-Date Report",
  monthly: "Previous Month Report",
  custom: "Custom Date Range",
};

const SLOT_ORDER = {
  "Morning (fasting)": 0,
  "Morning fasting": 0,
  "After breakfast": 1,
  "After lunch": 2,
  "After dinner": 3,
};

// ========================================
// COMPONENT STYLES
// ========================================

const styles = {
  container: {
    width: "100%",
    minWidth: 0,
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
    gap: "18px",
    alignItems: "start",
  },

  periodBox: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "16px",
    marginTop: "22px",
    background: "#f0faf5",
    border: "1px solid #dceee4",
    borderRadius: "12px",
  },

  periodIcon: {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dff5e8",
    borderRadius: "11px",
    fontSize: "20px",
  },

  periodLabel: {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#718d80",
    marginBottom: "5px",
  },

  periodValue: {
    color: "#087b5b",
    fontSize: "14px",
    fontWeight: 700,
    overflowWrap: "anywhere",
  },

  error: {
    padding: "14px 16px",
    marginTop: "18px",
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "11px",
    color: "#9a3412",
    fontSize: "13px",
    lineHeight: 1.7,
  },

  helperText: {
    margin: "0",
    color: "#718d80",
    fontSize: "11px",
    lineHeight: 1.6,
  },

  progress: {
    padding: "20px 24px",
  },

  reportReading: {
    padding: "13px 16px",
  },

  reportFooter: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    marginTop: "18px",
    background: "#f5faf7",
    border: "1px solid #e3eee8",
    borderRadius: "11px",
    color: "#647e73",
    fontSize: "11px",
    lineHeight: 1.7,
  },
};

// ========================================
// GET CURRENT DATE IN INDIA
// ========================================

function todayDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  ).value;

  const month = parts.find(
    (part) => part.type === "month"
  ).value;

  const day = parts.find(
    (part) => part.type === "day"
  ).value;

  return `${year}-${month}-${day}`;
}

// ========================================
// CONVERT CALENDAR DATE TO STRING
// ========================================

function localDate(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ========================================
// VALIDATE DATE
// ========================================

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    localDate(date) === value
  );
}

// ========================================
// FORMAT DISPLAY DATE
// ========================================

function formatDate(value) {
  if (!isValidDate(value)) return "";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ========================================
// FORMAT RECORDED TIME
// ========================================

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ========================================
// GET FIRST DAY OF MONTH
// ========================================

function firstDayOfMonth(date) {
  return `${date.slice(0, 7)}-01`;
}

// ========================================
// NORMALIZE READING DATA
// ========================================

function normalizeReadings(readings) {
  if (!Array.isArray(readings)) {
    return [];
  }

  return readings
    .map((reading) => {
      const rawGlucose =
        reading.glucose ??
        reading.glucose_level;

      const glucose =
        rawGlucose === null ||
        rawGlucose === undefined ||
        rawGlucose === ""
          ? NaN
          : Number(rawGlucose);

      const date = String(
        reading.date ??
        reading.reading_date ??
        ""
      ).slice(0, 10);

      const meal =
        reading.meal ??
        reading.time_slot ??
        reading.reading_type ??
        "Glucose reading";

      const measuredAt =
        reading.measuredAt ??
        reading.measured_at ??
        null;

      return {
        ...reading,
        glucose,
        date,
        meal,
        measuredAt,
        time:
          formatTime(measuredAt) ||
          reading.time ||
          "",
      };
    })

    .filter(
      (reading) =>
        Number.isInteger(reading.glucose) &&
        reading.glucose >= 40 &&
        reading.glucose <= 600 &&
        isValidDate(reading.date)
    );
}

// ========================================
// CALCULATE REPORT STATISTICS
// ========================================

function calculateStats(readings) {
  if (readings.length === 0) {
    return {
      total: 0,
      average: "--",
      highest: "--",
      lowest: "--",
    };
  }

  let sum = 0;
  let highest = readings[0].glucose;
  let lowest = readings[0].glucose;

  for (const reading of readings) {
    const value = reading.glucose;

    sum += value;

    if (value > highest) {
      highest = value;
    }

    if (value < lowest) {
      lowest = value;
    }
  }

  return {
    total: readings.length,
    average: (sum / readings.length).toFixed(1),
    highest,
    lowest,
  };
}

// ========================================
// VALIDATE REPORT SELECTION
// ========================================

function validateSelection(
  reportType,
  selectedDate,
  fromDate,
  toDate,
  today
) {
  if (reportType === "custom") {
    if (!fromDate || !toDate) {
      return "Please select both a From Date and a To Date.";
    }

    if (
      !isValidDate(fromDate) ||
      !isValidDate(toDate)
    ) {
      return "Please select valid calendar dates.";
    }

    if (fromDate > today || toDate > today) {
      return "Future dates cannot be included in your glucose report.";
    }

    if (fromDate > toDate) {
      return "Please select a To Date that is on or after your From Date.";
    }

    return "";
  }

  if (!isValidDate(selectedDate)) {
    return "Please select a valid report date.";
  }

  if (selectedDate > today) {
    return "Please select today or an earlier date.";
  }

  return "";
}

// ========================================
// CALCULATE REPORT DATE RANGE
// ========================================

function getReportRange(
  reportType,
  selectedDate,
  fromDate,
  toDate
) {
  // CUSTOM DATE RANGE

  if (reportType === "custom") {
    return {
      start: fromDate,
      end: toDate,
      label:
        fromDate === toDate
          ? formatDate(fromDate)
          : `${formatDate(fromDate)} – ${formatDate(
              toDate
            )}`,
    };
  }

  // DAILY REPORT

  if (reportType === "daily") {
    return {
      start: selectedDate,
      end: selectedDate,
      label: formatDate(selectedDate),
    };
  }

  // MONTH-TO-DATE REPORT

  if (reportType === "monthToDate") {
    const start = firstDayOfMonth(selectedDate);

    return {
      start,
      end: selectedDate,
      label: `${formatDate(start)} – ${formatDate(
        selectedDate
      )}`,
    };
  }

  // PREVIOUS MONTH REPORT

  const [year, month] = selectedDate
    .split("-")
    .map(Number);

  const previousMonthStart = new Date(
    year,
    month - 2,
    1
  );

  const previousMonthEnd = new Date(
    year,
    month - 1,
    0
  );

  const start = localDate(previousMonthStart);
  const end = localDate(previousMonthEnd);

  return {
    start,
    end,
    label: `${formatDate(start)} – ${formatDate(
      end
    )}`,
  };
}

// ========================================
// STATISTICS CARD
// ========================================

function ReportStatCard({
  icon,
  theme,
  label,
  value,
  showUnit = false,
  description,
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${theme}`}>
          {icon}
        </div>
      </div>

      <p>{label}</p>

      <h3>
        {value}

        {showUnit && value !== "--" && (
          <span> mg/dL</span>
        )}
      </h3>

      <small>{description}</small>
    </div>
  );
}

// ========================================
// HEALTH REPORTS COMPONENT
// ========================================

export default function HealthReports({
  readings = [],
}) {
  const today = todayDate();

  const [reportType, setReportType] =
    useState("daily");

  const [selectedDate, setSelectedDate] =
    useState(todayDate);

  const [fromDate, setFromDate] = useState(
    () => firstDayOfMonth(todayDate())
  );

  const [toDate, setToDate] =
    useState(todayDate);

  const [currentPage, setCurrentPage] =
    useState(1);

  // ======================================
  // VALIDATE DATE SELECTION
  // ======================================

  const validationError = validateSelection(
    reportType,
    selectedDate,
    fromDate,
    toDate,
    today
  );

  // ======================================
  // NORMALIZE READINGS
  // ======================================

  const normalizedReadings = useMemo(
    () => normalizeReadings(readings),
    [readings]
  );

  // ======================================
  // SELECTED REPORT PERIOD
  // ======================================

  const reportRange = useMemo(() => {
    if (validationError) {
      return null;
    }

    return getReportRange(
      reportType,
      selectedDate,
      fromDate,
      toDate
    );
  }, [
    reportType,
    selectedDate,
    fromDate,
    toDate,
    validationError,
  ]);

  // ======================================
  // FILTER READINGS BY DATE
  // ======================================

  const filteredReadings = useMemo(() => {
    if (!reportRange) return [];

    return normalizedReadings.filter(
      (reading) =>
        reading.date >= reportRange.start &&
        reading.date <= reportRange.end
    );
  }, [normalizedReadings, reportRange]);

  // ======================================
  // CALCULATE STATISTICS
  // ======================================

  const stats = useMemo(
    () => calculateStats(filteredReadings),
    [filteredReadings]
  );

  // ======================================
  // DAILY COMPLETION
  // ======================================

  const dailyCompletion = Math.min(
    Math.round((stats.total / 4) * 100),
    100
  );

  // ======================================
  // SORT READINGS
  // ======================================

  const sortedReadings = useMemo(() => {
    return [...filteredReadings].sort(
      (a, b) => {
        const dateComparison =
          b.date.localeCompare(a.date);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        const timeA = a.measuredAt
          ? new Date(a.measuredAt).getTime()
          : new Date(
              `${a.date}T${a.time || "00:00"}`
            ).getTime();

        const timeB = b.measuredAt
          ? new Date(b.measuredAt).getTime()
          : new Date(
              `${b.date}T${b.time || "00:00"}`
            ).getTime();

        if (
          Number.isFinite(timeA) &&
          Number.isFinite(timeB) &&
          timeA !== timeB
        ) {
          return timeB - timeA;
        }

        return (
          (SLOT_ORDER[b.meal] ?? 0) -
          (SLOT_ORDER[a.meal] ?? 0)
        );
      }
    );
  }, [filteredReadings]);

  // ======================================
  // PAGINATION
  // ======================================

  const totalPages = Math.max(
    1,
    Math.ceil(sortedReadings.length / PAGE_SIZE)
  );

  const safePage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safePage - 1) * PAGE_SIZE;

  const endIndex = Math.min(
    startIndex + PAGE_SIZE,
    sortedReadings.length
  );

  const visibleReadings = sortedReadings.slice(
    startIndex,
    endIndex
  );

  // ======================================
  // CHANGE REPORT TYPE
  // ======================================

  function handleReportChange(event) {
    setReportType(event.target.value);
    setCurrentPage(1);
  }

  // ======================================
  // CHANGE REPORT DATE
  // ======================================

  function handleSelectedDate(event) {
    setSelectedDate(event.target.value);
    setCurrentPage(1);
  }

  // ======================================
  // CHANGE FROM DATE
  // ======================================

  function handleFromDate(event) {
    setFromDate(event.target.value);
    setCurrentPage(1);
  }

  // ======================================
  // CHANGE TO DATE
  // ======================================

  function handleToDate(event) {
    setToDate(event.target.value);
    setCurrentPage(1);
  }

  // ======================================
  // RESET FILTERS
  // ======================================

  function resetDates() {
    setSelectedDate(today);
    setFromDate(firstDayOfMonth(today));
    setToDate(today);
    setCurrentPage(1);
  }

  // ======================================
  // RENDER REPORTS PAGE
  // ======================================

  return (
    <div
      className="health-reports"
      style={styles.container}
    >
      {/* ================================
          REPORT FILTERS
      ================================= */}

      <section className="card form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              HEALTH ANALYTICS
            </span>

            <h2>Glucose Reports</h2>

            <p>
              Explore your glucose history and
              review your recorded measurements.
            </p>
          </div>

          <div className="section-icon">
            📊
          </div>
        </div>

        {/* FILTER GRID */}

        <div style={styles.filterGrid}>
          {/* REPORT TYPE */}

          <div className="form-group">
            <label htmlFor="reportType">
              Report Type
            </label>

            <select
              id="reportType"
              value={reportType}
              onChange={handleReportChange}
            >
              <option value="daily">
                Daily Report
              </option>

              <option value="monthToDate">
                Month-to-Date Report
              </option>

              <option value="monthly">
                Previous Month Report
              </option>

              <option value="custom">
                Custom Date Range
              </option>
            </select>

            <p style={styles.helperText}>
              Choose how you want to review
              your readings.
            </p>
          </div>

          {/* STANDARD REPORT DATE */}

          {reportType !== "custom" && (
            <div className="form-group">
              <label htmlFor="reportDate">
                Select Date
              </label>

              <input
                id="reportDate"
                type="date"
                value={selectedDate}
                max={today}
                onChange={handleSelectedDate}
                aria-invalid={
                  Boolean(validationError)
                }
              />

              <p style={styles.helperText}>
                {reportType === "daily"
                  ? "View readings for this day."
                  : reportType === "monthToDate"
                  ? "From the first day of the month to this date."
                  : "View the entire previous calendar month."}
              </p>
            </div>
          )}

          {/* CUSTOM FROM DATE */}

          {reportType === "custom" && (
            <>
              <div className="form-group">
                <label htmlFor="reportFromDate">
                  From Date
                </label>

                <input
                  id="reportFromDate"
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={handleFromDate}
                  aria-invalid={
                    Boolean(validationError)
                  }
                />

                <p style={styles.helperText}>
                  Starting date of your report.
                </p>
              </div>

              {/* CUSTOM TO DATE */}

              <div className="form-group">
                <label htmlFor="reportToDate">
                  To Date
                </label>

                <input
                  id="reportToDate"
                  type="date"
                  value={toDate}
                  min={
                    isValidDate(fromDate)
                      ? fromDate
                      : undefined
                  }
                  max={today}
                  onChange={handleToDate}
                  aria-invalid={
                    Boolean(validationError)
                  }
                />

                <p style={styles.helperText}>
                  Ending date of your report.
                </p>
              </div>
            </>
          )}
        </div>

        {/* RESET BUTTON */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
          }}
        >
          <button
            type="button"
            className="cancel-btn"
            onClick={resetDates}
          >
            ↻ Reset Dates
          </button>
        </div>

        {/* FRIENDLY VALIDATION ERROR */}

        {validationError && (
          <div
            role="alert"
            style={styles.error}
          >
            <strong>
              Let's check your selected dates.
            </strong>

            <p style={{ margin: "5px 0 0" }}>
              {validationError}
            </p>
          </div>
        )}

        {/* REPORT PERIOD */}

        {reportRange && (
          <div style={styles.periodBox}>
            <div style={styles.periodIcon}>
              📅
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={styles.periodLabel}>
                Report Period
              </span>

              <strong style={styles.periodValue}>
                {reportRange.label}
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* Only display a report for valid dates */}

      {!validationError && reportRange && (
        <>
          {/* ================================
              REPORT STATISTICS
          ================================= */}

          <div className="dashboard-title">
            <div>
              <h2>Report Overview</h2>

              <p>
                Summary of your recorded glucose
                values for the selected period.
              </p>
            </div>
          </div>

          <section className="stats-grid">
            <ReportStatCard
              icon="📋"
              theme="mint"
              label="Total Readings"
              value={stats.total}
              description="Recorded measurements"
            />

            <ReportStatCard
              icon="📊"
              theme="blue"
              label="Average Glucose"
              value={stats.average}
              showUnit
              description="Mean glucose value"
            />

            <ReportStatCard
              icon="↗"
              theme="orange"
              label="Highest Glucose"
              value={stats.highest}
              showUnit
              description="Highest recorded value"
            />

            <ReportStatCard
              icon="↘"
              theme="purple"
              label="Lowest Glucose"
              value={stats.lowest}
              showUnit
              description="Lowest recorded value"
            />
          </section>

          {/* ================================
              DAILY READING PROGRESS
          ================================= */}

          {reportType === "daily" && (
            <section
              className="progress-card card"
              style={styles.progress}
            >
              <div className="progress-info">
                <span className="eyebrow">
                  DAILY PROGRESS
                </span>

                <h2>Reading Completion</h2>

                <p>
                  <strong>{stats.total}</strong> of
                  4 readings recorded.
                </p>

                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Daily reading completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dailyCompletion}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${dailyCompletion}%`,
                    }}
                  />
                </div>

                <small>
                  Track your daily recording
                  progress.
                </small>
              </div>

              <div
                className="progress-circle"
                style={{
                  background: `conic-gradient(
                    #10b981 ${dailyCompletion}%,
                    #e7f5ef ${dailyCompletion}%
                  )`,
                }}
              >
                <div>
                  <strong>
                    {dailyCompletion}%
                  </strong>

                  <span>Complete</span>
                </div>
              </div>
            </section>
          )}

          {/* ================================
              EMPTY REPORT STATE
          ================================= */}

          {filteredReadings.length === 0 ? (
            <section className="card history-card">
              <div className="empty-state">
                <div className="empty-icon">
                  📅
                </div>

                <h3>
                  No readings for this period
                </h3>

                <p>
                  You haven't recorded any glucose
                  readings during{" "}
                  <strong>
                    {reportRange.label}
                  </strong>
                  .
                </p>

                <p>
                  Try selecting a different date
                  range or record a new glucose
                  measurement.
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  style={{ width: "auto" }}
                  onClick={resetDates}
                >
                  Reset Dates
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* ============================
                  GLUCOSE TREND GRAPH
              ============================= */}

              <GlucoseChart
                readings={filteredReadings}
              />

              {/* ============================
                  REPORT READING DETAILS
              ============================= */}

              <section className="card history-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      REPORT DETAILS
                    </span>

                    <h2>Recorded Readings</h2>

                    <p>{reportRange.label}</p>
                  </div>

                  <span className="count-badge">
                    {stats.total}{" "}
                    {stats.total === 1
                      ? "record"
                      : "records"}
                  </span>
                </div>

                {/* PAGINATED READING LIST */}

                <div className="reading-list">
                  {visibleReadings.map(
                    (reading) => (
                      <div
                        className="reading-item"
                        style={styles.reportReading}
                        key={reading.id}
                      >
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
                              {formatDate(
                                reading.date
                              )}
                            </p>

                            {reading.time && (
                              <p className="reading-entered">
                                Recorded at{" "}
                                {reading.time}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* ==========================
                    REPORT PAGINATION
                =========================== */}

                <nav
                  className="history-pagination"
                  aria-label="Report reading pagination"
                >
                  <span aria-live="polite">
                    Showing {startIndex + 1}–
                    {endIndex} of{" "}
                    {sortedReadings.length}
                  </span>

                  <div>
                    <button
                      type="button"
                      className="cancel-btn"
                      disabled={safePage <= 1}
                      onClick={() =>
                        setCurrentPage(
                          Math.max(1, safePage - 1)
                        )
                      }
                    >
                      ← Previous
                    </button>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#078965",
                      }}
                    >
                      {safePage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      className="save-btn"
                      disabled={
                        safePage >= totalPages
                      }
                      onClick={() =>
                        setCurrentPage(
                          Math.min(
                            totalPages,
                            safePage + 1
                          )
                        )
                      }
                    >
                      Next →
                    </button>
                  </div>
                </nav>

                {/* REPORT INFORMATION */}

                <div style={styles.reportFooter}>
                  <span
                    style={{
                      fontSize: "18px",
                      flexShrink: 0,
                    }}
                  >
                    ℹ️
                  </span>

                  <span>
                    Statistics and trends are
                    calculated using all recorded
                    readings in your selected period,
                    not just the current page.
                  </span>
                </div>
              </section>
            </>
          )}

          {/* ================================
              MEDICAL DISCLAIMER
          ================================= */}

          <div className="report-note">
            <strong>
              💚 About your health report
            </strong>

            <p
              style={{
                margin: "7px 0 0",
              }}
            >
              This {REPORT_NAMES[reportType].toLowerCase()}{" "}
              summarizes your recorded glucose
              measurements. It is intended for
              personal tracking and does not replace
              professional medical advice.
            </p>
          </div>
        </>
      )}
    </div>
  );
}