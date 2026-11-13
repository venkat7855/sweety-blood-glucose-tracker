
import { useState } from "react";
import "./ActivityTracker.css";

const STORAGE_KEY = "sweety-activities";

const ACTIVITIES = [
  {
    id: "walk",
    icon: "🚶",
    title: "Walk After Meal",
    description: "Enjoy a gentle walk after eating.",
    points: 20,
  },
  {
    id: "exercise",
    icon: "🚴",
    title: "Physical Activity",
    description: "Complete your planned daily exercise.",
    points: 25,
  },
  {
    id: "meal",
    icon: "🥗",
    title: "Eat a Balanced Meal",
    description: "Choose a nutritious, balanced meal.",
    points: 15,
  },
  {
    id: "water",
    icon: "💧",
    title: "Stay Hydrated",
    description: "Follow your daily hydration plan.",
    points: 10,
  },
  {
    id: "stress",
    icon: "🧘",
    title: "Stress Relief",
    description: "Practice relaxation or mindfulness.",
    points: 10,
  },
  {
    id: "movement",
    icon: "🏃",
    title: "Take Movement Breaks",
    description: "Break up long periods of sitting.",
    points: 10,
  },
  {
    id: "sleep",
    icon: "🌙",
    title: "Follow Sleep Routine",
    description: "Maintain your regular sleep schedule.",
    points: 10,
  },
];

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    return saved && typeof saved === "object"
      ? saved
      : {};
  } catch {
    return {};
  }
}

export default function ActivityTracker() {
  const [history, setHistory] = useState(loadActivities);
  const [selectedDate, setSelectedDate] = useState(getToday);

  const completed = history[selectedDate] || [];

  const totalPoints = ACTIVITIES.reduce(
    (sum, activity) =>
      sum + (completed.includes(activity.id) ? activity.points : 0),
    0
  );

  const completedCount = ACTIVITIES.filter((activity) =>
    completed.includes(activity.id)
  ).length;

  const progress = Math.min(totalPoints, 100);

  const toggleActivity = (id) => {
    const updated = completed.includes(id)
      ? completed.filter((item) => item !== id)
      : [...completed, id];

    const newHistory = {
      ...history,
      [selectedDate]: updated,
    };

    setHistory(newHistory);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(newHistory)
    );
  };

  return (
    <section className="activity-dashboard">
      <div className="activity-header">
        <div>
          <span className="activity-eyebrow">
            DAILY WELLNESS
          </span>

          <h2>🏆 Daily Activity Challenge</h2>

          <p>
            Complete healthy activities and earn points!
          </p>
        </div>

        <div className="activity-date">
          <label htmlFor="activity-date">
            Tracking Date
          </label>

          <input
            id="activity-date"
            type="date"
            value={selectedDate}
            max={getToday()}
            onChange={(event) =>
              setSelectedDate(event.target.value)
            }
          />
        </div>
      </div>

      <div className="activity-progress-card">
        <div className="activity-progress-top">
          <div>
            <span className="activity-progress-label">
              YOUR DAILY PROGRESS
            </span>

            <h3>
              {totalPoints}
              <span> / 100 Points</span>
            </h3>

            <p>
              {completedCount} of {ACTIVITIES.length} activities completed
            </p>
          </div>

          <div className="activity-score-icon">
            {totalPoints === 100 ? "🏆" : "💚"}
          </div>
        </div>

        <div
          className="activity-progress-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily activity points"
        >
          <div
            className="activity-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="activity-progress-footer">
          <span>Keep going, you've got this!</span>
          <strong>{progress}%</strong>
        </div>
      </div>

      <div className="activity-section-title">
        <div>
          <h3>Today's Healthy Habits</h3>
          <p>
            Select the activities you've completed.
          </p>
        </div>

        <span className="activity-count">
          {completedCount}/{ACTIVITIES.length} Completed
        </span>
      </div>

      <div className="activity-grid">
        {ACTIVITIES.map((activity) => {
          const isCompleted = completed.includes(activity.id);

          return (
            <label
              key={activity.id}
              className={`activity-item ${
                isCompleted ? "activity-item-done" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={() =>
                  toggleActivity(activity.id)
                }
              />

              <div className="activity-item-top">
                <div className="activity-item-icon">
                  {activity.icon}
                </div>

                <div
                  className={`activity-check ${
                    isCompleted ? "checked" : ""
                  }`}
                  aria-hidden="true"
                >
                  {isCompleted ? "✓" : ""}
                </div>
              </div>

              <h4>{activity.title}</h4>

              <p>{activity.description}</p>

              <span className="activity-points">
                {isCompleted ? "✓ Completed" : `+${activity.points} pts`}
              </span>
            </label>
          );
        })}
      </div>

      {totalPoints === 100 && (
        <div className="activity-celebration">
          <span>🎉</span>

          <div>
            <h3>Daily Challenge Completed!</h3>

            <p>
              Amazing work! You've completed all seven
              healthy habits today.
            </p>
          </div>
        </div>
      )}

      <div className="activity-disclaimer">
        <span>💡</span>
        <p>
          Activities should match your personal healthcare
          plan. Points reflect completed habits, not
          medical outcomes.
        </p>
      </div>
    </section>
  );
}
