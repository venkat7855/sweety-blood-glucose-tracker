import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ========================================
// FORMAT DATE
// ========================================

function formatDate(value, includeYear = false) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

// ========================================
// FORMAT TIME
// ========================================

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

// ========================================
// CUSTOM TOOLTIP
// ========================================

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const reading = payload[0].payload;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #dceee4",
        borderRadius: "12px",
        padding: "14px 17px",
        boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
        fontSize: "12px",
        maxWidth: "220px",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          color: "#647e73",
          fontWeight: 700,
        }}
      >
        {reading.fullDate}
      </p>

      <p
        style={{
          margin: "0 0 10px",
          fontSize: "24px",
          fontWeight: 800,
          color: "#078965",
        }}
      >
        {reading.glucose}

        <span
          style={{
            fontSize: "11px",
            marginLeft: "5px",
            fontWeight: 500,
          }}
        >
          mg/dL
        </span>
      </p>

      <p
        style={{
          margin: "5px 0",
          color: "#496a5c",
        }}
      >
        {reading.meal}
      </p>

      {reading.time && (
        <p
          style={{
            margin: "5px 0 0",
            color: "#81998b",
          }}
        >
          {reading.time}
        </p>
      )}
    </div>
  );
}

// ========================================
// GLUCOSE CHART COMPONENT
// ========================================

function GlucoseChart({ readings = [] }) {
  const chartRef = useRef(null);

  const [chartWidth, setChartWidth] = useState(0);

  const gradientId = useId().replace(/:/g, "");

  // ======================================
  // PREPARE CHART DATA
  // ======================================

  const chartData = useMemo(() => {
    if (!Array.isArray(readings)) {
      return [];
    }

    const slotOrder = {
      "Morning (fasting)": 0,
      "Morning fasting": 0,
      "After breakfast": 1,
      "After lunch": 2,
      "After dinner": 3,
    };

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

        const timestamp = measuredAt
          ? new Date(measuredAt).getTime()
          : new Date(
              `${date}T${reading.time || "00:00"}`
            ).getTime();

        return {
          id: reading.id,
          glucose,
          date,
          meal,
          timestamp,

          time:
            formatTime(measuredAt) ||
            reading.time ||
            "",

          fullDate: formatDate(date, true),

          label: formatDate(date),

          slotIndex: slotOrder[meal] ?? 4,
        };
      })

      .filter(
        (reading) =>
          Number.isFinite(reading.glucose) &&
          Number.isInteger(reading.glucose) &&
          reading.glucose >= 40 &&
          reading.glucose <= 600 &&
          /^\d{4}-\d{2}-\d{2}$/.test(reading.date) &&
          !Number.isNaN(
            new Date(
              `${reading.date}T00:00:00`
            ).getTime()
          )
      )

      .sort((a, b) => {
        const dateComparison =
          a.date.localeCompare(b.date);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        if (
          Number.isFinite(a.timestamp) &&
          Number.isFinite(b.timestamp) &&
          a.timestamp !== b.timestamp
        ) {
          return a.timestamp - b.timestamp;
        }

        return a.slotIndex - b.slotIndex;
      })

      .map((reading, index) => ({
        ...reading,
        chartIndex: index,
      }));
  }, [readings]);

  const hasData = chartData.length > 0;

  // ======================================
  // FIX RESPONSIVE CHART WIDTH
  // ======================================

  useEffect(() => {
    const container = chartRef.current;

    if (!container) return;

    function updateWidth() {
      const width = Math.floor(
        container.getBoundingClientRect().width
      );

      if (width > 0) {
        setChartWidth(width);
      }
    }

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(container);

    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        updateWidth
      );
    };
  }, [hasData]);

  // ======================================
  // CHART AXIS LABELS
  // ======================================

  const isSingleDay =
    hasData &&
    chartData.every(
      (reading) =>
        reading.date === chartData[0].date
    );

  function formatXAxis(index) {
    const reading = chartData[index];

    if (!reading) return "";

    if (isSingleDay) {
      return reading.time || reading.meal;
    }

    return reading.label;
  }

  const isMobile =
    chartWidth > 0 && chartWidth < 500;

  const chartHeight = isMobile ? 250 : 320;

  // ======================================
  // RENDER GRAPH
  // ======================================

  return (
    <section
      className="card glucose-chart"
      style={{
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* GRAPH HEADER */}

      <div
        className="section-heading"
        style={{ marginBottom: "20px" }}
      >
        <div>
          <span className="eyebrow">
            GLUCOSE ANALYTICS
          </span>

          <h2 style={{ margin: "8px 0" }}>
            Glucose Trend
          </h2>

          <p>
            Track how your blood glucose changes
            over time.
          </p>
        </div>

        <div className="section-icon">
          📈
        </div>
      </div>

      {/* EMPTY STATE */}

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">
            📊
          </div>

          <h3>No glucose readings to display</h3>

          <p>
            Add a glucose reading or select another
            date range to view your glucose trend.
          </p>
        </div>
      ) : (
        <>
          {/* GRAPH INFORMATION */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                color: "#718d80",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Blood Glucose (mg/dL)
            </span>

            <span className="count-badge">
              {chartData.length}{" "}
              {chartData.length === 1
                ? "reading"
                : "readings"}
            </span>
          </div>

          {/* FIXED RESPONSIVE CHART */}

          <div
            ref={chartRef}
            style={{
              width: "100%",
              minWidth: 0,
              height: `${chartHeight}px`,
              position: "relative",
            }}
          >
            {chartWidth > 0 && (
              <AreaChart
                width={chartWidth}
                height={chartHeight}
                data={chartData}
                margin={{
                  top: 15,
                  right: isMobile ? 12 : 20,
                  left: 0,
                  bottom: 15,
                }}
              >
                {/* GRADIENT */}

                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#10b981"
                      stopOpacity={0.28}
                    />

                    <stop
                      offset="100%"
                      stopColor="#10b981"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                {/* GRID */}

                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="#e3eee8"
                  vertical={false}
                />

                {/* X AXIS */}

                <XAxis
                  dataKey="chartIndex"
                  tickFormatter={formatXAxis}
                  tick={{
                    fontSize: isMobile ? 9 : 11,
                    fill: "#718d80",
                  }}
                  axisLine={{
                    stroke: "#dcebe3",
                  }}
                  tickLine={false}
                  tickMargin={12}
                  minTickGap={isMobile ? 35 : 25}
                  interval="preserveStartEnd"
                  padding={{
                    left: 10,
                    right: 10,
                  }}
                />

                {/* Y AXIS */}

                <YAxis
                  type="number"
                  domain={[
                    (dataMin) =>
                      Math.max(
                        0,
                        Math.floor(
                          (dataMin - 20) / 20
                        ) * 20
                      ),
                    (dataMax) =>
                      Math.ceil(
                        (dataMax + 20) / 20
                      ) * 20,
                  ]}
                  tick={{
                    fontSize: 10,
                    fill: "#718d80",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={6}
                  width={40}
                  allowDecimals={false}
                />

                {/* TOOLTIP */}

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: "#10b981",
                    strokeDasharray: "4 4",
                  }}
                />

                {/* GLUCOSE LINE */}

                <Area
                  type="linear"
                  dataKey="glucose"
                  name="Blood Glucose"
                  stroke="#0aa77b"
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={
                    chartData.length <= 40
                      ? {
                          r: 4,
                          fill: "#10b981",
                          stroke: "#ffffff",
                          strokeWidth: 1.5,
                        }
                      : false
                  }
                  activeDot={{
                    r: 6,
                    fill: "#078965",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </AreaChart>
            )}
          </div>

          {/* LEGEND */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "12px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#0aa77b",
              }}
            />

            <span
              style={{
                color: "#647e73",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Blood Glucose (mg/dL)
            </span>
          </div>
        </>
      )}

      {/* MEDICAL DISCLAIMER */}

      <div
        style={{
          padding: "13px 15px",
          borderRadius: "10px",
          background: "#f4faf7",
          border: "1px solid #e3eee8",
          color: "#647e73",
          fontSize: "11px",
          lineHeight: 1.7,
        }}
      >
        ℹ️ This graph displays your recorded glucose
        measurements. It does not diagnose or predict
        medical conditions.
      </div>
    </section>
  );
}

export default GlucoseChart;