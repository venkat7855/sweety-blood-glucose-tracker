
import { useMemo, useState } from "react";
import GlucoseChart from "./GlucoseChart";

// Format a date using the browser's local timezone
function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Convert YYYY-MM-DD into a readable date
function formatDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Calculate the required report statistics
function calculateStats(readings) {
  const values = readings
    .map((reading) => Number(reading.glucose))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return {
      total: 0,
      average: "--",
      highest: "--",
      lowest: "--",
    };
  }

  const sum = values.reduce(
    (total, value) => total + value,
    0
  );

  return {
    total: values.length,
    average: (sum / values.length).toFixed(1),
    highest: Math.max(...values),
    lowest: Math.min(...values),
  };
}

// Determine the correct date range for each report
function getReportRange(reportType, selectedDate) {
  const [year, month, day] = selectedDate
    .split("-")
    .map(Number);

  if (reportType === "daily") {
    return {
      start: selectedDate,
      end: selectedDate,
      label: formatDate(selectedDate),
    };
  }

  if (reportType === "monthToDate") {
    const start = localDate(
      new Date(year, month - 1, 1)
    );

    return {
      start,
      end: selectedDate,
      label: `${formatDate(start)} – ${formatDate(
        selectedDate
      )}`,
    };
  }

  // Monthly means the entire previous calendar month
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
    label: `${formatDate(start)} – ${formatDate(end)}`,
  };
}

export default function HealthReports({ readings = [] }) {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    localDate()
  );

  const reportRange = useMemo(
    () => getReportRange(reportType, selectedDate),
    [reportType, selectedDate]
  );

  // Filter readings using the report's exact date range
  const filteredReadings = useMemo(() => {
    return readings.filter((reading) => {
      if (!reading.date) return false;

      return (
        reading.date >= reportRange.start &&
        reading.date <= reportRange.end
      );
    });
  }, [readings, reportRange]);

  const stats = useMemo(
    () => calculateStats(filteredReadings),
    [filteredReadings]
  );

  // Daily progress only
  const dailyCompletion = Math.min(
    Math.round((stats.total / 4) * 100),
    100
  );

  const sortedReadings = useMemo(() => {
    return [...filteredReadings].sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      const timeA = a.measuredAt
        ? new Date(a.measuredAt).getTime()
        : 0;

      const timeB = b.measuredAt
        ? new Date(b.measuredAt).getTime()
        : 0;

      return timeB - timeA;
    });
  }, [filteredReadings]);

  const reportNames = {
    daily: "Daily Report",
    monthToDate: "Month-to-Date Report",
    monthly: "Previous Month Report",
  };

  return (
    <div className="health-reports">
      {/* REPORT SELECTION */}
      <section className="card form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              HEALTH ANALYTICS
            </span>

            <h2>Glucose Reports</h2>

            <p>
              Review your glucose history and progress.
            </p>
          </div>

          <div className="section-icon">📊</div>
        </div>

        <div className="form-group">
          <label htmlFor="reportType">
            Report Type
          </label>

          <select
            id="reportType"
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value)
            }
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
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="reportDate">
            Select Date
          </label>

          <input
            id="reportDate"
            type="date"
            value={selectedDate}
            max={localDate()}
            onChange={(event) => {
              if (event.target.value) {
                setSelectedDate(event.target.value);
              }
            }}
          />
        </div>

        <div className="form-group">
          <label>Report Period</label>

          <p className="reading-date">
            {reportRange.label}
          </p>

          <p>
            {reportNames[reportType]}
          </p>
        </div>
      </section>

      {/* REPORT STATISTICS */}
      <section className="stats-grid">
        <div className="stat-card">
          <p>Total Readings</p>
          <h3>{stats.total}</h3>
        </div>

        <div className="stat-card">
          <p>Average Glucose</p>
          <h3>
            {stats.average}
            {stats.total > 0 && (
              <span> mg/dL</span>
            )}
          </h3>
        </div>

        <div className="stat-card">
          <p>Highest Glucose</p>
          <h3>
            {stats.highest}
            {stats.total > 0 && (
              <span> mg/dL</span>
            )}
          </h3>
        </div>

        <div className="stat-card">
          <p>Lowest Glucose</p>
          <h3>
            {stats.lowest}
            {stats.total > 0 && (
              <span> mg/dL</span>
            )}
          </h3>
        </div>
      </section>

      {/* DAILY READING COMPLETION */}
      {reportType === "daily" && (
        <section className="progress-card card">
          <div className="progress-info">
            <span className="eyebrow">
              DAILY PROGRESS
            </span>

            <h2>Reading Completion</h2>

            <p>
              {stats.total} of 4 readings recorded.
            </p>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${dailyCompletion}%`,
                }}
              />
            </div>
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

      {/* EMPTY STATE */}
      {filteredReadings.length === 0 ? (
        <section className="card history-card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>

            <h3>No readings found</h3>

            <p>
              No glucose readings were recorded
              during {reportRange.label}.
            </p>

            <p>
              Try selecting another date or
              add a new glucose reading.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* GLUCOSE CHART */}
          <GlucoseChart
            readings={filteredReadings}
          />

          {/* READING DETAILS */}
          <section className="card history-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  REPORT DETAILS
                </span>

                <h2>Recorded Readings</h2>

                <p>
                  {reportRange.label}
                </p>
              </div>

              <span className="count-badge">
                {stats.total} records
              </span>
            </div>

            <div className="reading-list">
              {sortedReadings.map((reading) => (
                <div
                  className="reading-item"
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
                        {formatDate(reading.date)}
                      </p>

                      {reading.time && (
                        <p className="reading-date">
                          Recorded at {reading.time}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
