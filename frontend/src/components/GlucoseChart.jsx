
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

function GlucoseChart({ readings }) {
  const chartData = [...readings]
    .sort((a, b) => {
      return (
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
      );
    })
    .map((reading) => ({
      time: `${reading.date} ${reading.time}`,
      glucose: reading.glucose,
      meal: reading.meal
    }));

  return (
    <section className="card glucose-chart">
      <h2>📈 Glucose Trend Graph</h2>
      <p>Track how your blood glucose changes over time.</p>

      {chartData.length === 0 ? (
        <p>Add glucose readings to see your graph.</p>
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#eee"
              />

              <XAxis
                dataKey="time"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  value.split(" ").slice(-1)[0]
                }
              />

              <YAxis
                label={{
                  value: "mg/dL",
                  angle: -90,
                  position: "insideLeft"
                }}
              />

              <Tooltip
                formatter={(value) => [
                  `${value} mg/dL`,
                  "Glucose"
                ]}
              />

              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#8056e8"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <small>
        This chart displays recorded glucose measurements.
        It does not diagnose or predict medical conditions.
      </small>
    </section>
  );
}

export default GlucoseChart;
