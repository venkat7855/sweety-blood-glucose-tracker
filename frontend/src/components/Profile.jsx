import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/auth/profile";

const AVATARS = [
  "👤",
  "👨",
  "👩",
  "🧑",
  "🧑‍⚕️",
  "💪",
  "🏃",
  "🧘",
  "❤️",
  "🌿",
];

const styles = {
  container: {
    width: "100%",
    maxWidth: "1050px",
    margin: "0 auto",
    minWidth: 0,
  },

  card: {
    padding: "clamp(16px, 3vw, 28px)",
  },

  banner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "24px",
    padding: "clamp(16px, 3vw, 28px)",
    background:
      "linear-gradient(135deg, #e8f8ef, #f5fcf8)",
    border: "1px solid #dcefe4",
    borderRadius: "18px",
    marginBottom: "28px",
  },

  profileSummary: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "18px",
    flex: "1 1 240px",
    minWidth: 0,
  },

  avatar: {
    width: "84px",
    height: "84px",
    minWidth: "84px",
    flexShrink: 0,
    borderRadius: "50%",
    background: "#d1fae5",
    border: "4px solid #ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "40px",
    boxShadow: "0 4px 15px #04785715",
  },

  name: {
    margin: "0 0 6px",
    color: "#173b36",
    fontSize: "clamp(20px, 3vw, 27px)",
    fontWeight: 800,
    overflowWrap: "anywhere",
  },

  member: {
    margin: "0 0 10px",
    color: "#647e73",
    fontSize: "13px",
  },

  accountBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    background: "#d1fae5",
    color: "#047857",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: 700,
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  editButton: {
    width: "auto",
    minHeight: "42px",
    padding: "11px 17px",
    fontSize: "12px",
    borderRadius: "10px",
  },

  avatarButton: {
    minHeight: "42px",
    padding: "11px 17px",
    border: "1px solid #bce0ce",
    background: "#ffffff",
    color: "#047857",
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "10px",
  },

  sectionTitle: {
    margin: "0 0 6px",
    color: "#173b36",
    fontSize: "18px",
    fontWeight: 800,
  },

  description: {
    margin: "0 0 22px",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#718d80",
  },

  informationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
    gap: "18px",
  },

  informationCard: {
    minWidth: 0,
    padding: "20px",
    border: "1px solid #e0eee6",
    borderRadius: "14px",
    background: "#fbfefc",
  },

  informationIcon: {
    width: "38px",
    height: "38px",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e4f8ed",
    borderRadius: "10px",
    fontSize: "17px",
  },

  informationLabel: {
    display: "block",
    color: "#718d80",
    fontSize: "12px",
    marginBottom: "8px",
    fontWeight: 600,
  },

  informationValue: {
    display: "block",
    color: "#234b3e",
    fontSize: "15px",
    fontWeight: 700,
    overflowWrap: "anywhere",
  },

  privacyCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "20px",
    border: "1px solid #e3eee8",
    borderRadius: "14px",
    background: "#f7fbf9",
    marginTop: "28px",
  },

  message: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "13px 16px",
    border: "1px solid #a7f3d0",
    borderRadius: "11px",
    background: "#ecfdf5",
    color: "#047857",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "22px",
    lineHeight: 1.6,
  },

  error: {
    padding: "13px 16px",
    border: "1px solid #fecaca",
    borderRadius: "11px",
    background: "#fff5f5",
    color: "#b91c1c",
    fontSize: "13px",
    lineHeight: 1.6,
    marginBottom: "22px",
    overflowWrap: "anywhere",
  },

  editor: {
    padding: "clamp(14px, 3vw, 24px)",
    background: "#fbfefc",
    border: "1px solid #e0eee6",
    borderRadius: "15px",
  },

  editorActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "20px",
  },

  cancelButton: {
    minHeight: "44px",
    padding: "12px 22px",
    borderRadius: "10px",
    fontSize: "13px",
  },

  saveButton: {
    width: "auto",
    minHeight: "44px",
    padding: "12px 24px",
    fontSize: "13px",
  },

  avatarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(65px, 1fr))",
    gap: "12px",
    marginBottom: "24px",
  },
};

export default function Profile({ onProfileUpdated }) {
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] =
    useState("👤");

  const [editMode, setEditMode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ================================
  // LOAD USER PROFILE
  // ================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load your profile."
          );
        }

        if (!data.user) {
          throw new Error(
            "Profile information is unavailable."
          );
        }

        setUser(data.user);
        setName(data.user.name);
        setSelectedAvatar(data.user.avatar || "👤");
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, []);

  // ================================
  // AUTO-DISMISS SUCCESS MESSAGE
  // ================================

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  // ================================
  // START EDITING NAME
  // ================================

  function startEditingName() {
    if (!user || saving) return;

    setName(user.name);
    setEditMode("name");
    setMessage("");
    setError("");
  }

  // ================================
  // START CHANGING AVATAR
  // ================================

  function startChangingAvatar() {
    if (!user || saving) return;

    setSelectedAvatar(user.avatar || "👤");
    setEditMode("avatar");
    setMessage("");
    setError("");
  }

  // ================================
  // CANCEL EDITING
  // ================================

  function cancelEditing() {
    if (!user || saving) return;

    setName(user.name);
    setSelectedAvatar(user.avatar || "👤");
    setEditMode(null);
    setMessage("");
    setError("");
  }

  // ================================
  // UPDATE PROFILE API
  // ================================

  async function updateProfile(changes) {
    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    let updatedUser;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(API_URL, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(changes),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update your profile."
        );
      }

      if (!data.user) {
        throw new Error(
          "Updated profile was not returned."
        );
      }

      updatedUser = data.user;

      setUser(updatedUser);
      setName(updatedUser.name);

      setSelectedAvatar(
        updatedUser.avatar || "👤"
      );

      setEditMode(null);

      setMessage(
        "Your profile has been updated successfully!"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }

    if (updatedUser) {
      // Update the avatar and profile in App.jsx.

      try {
        if (typeof onProfileUpdated === "function") {
          onProfileUpdated(updatedUser);
        }
      } catch (err) {
        console.error("Profile callback failed:", err);
      }

      // Notify other components.

      window.dispatchEvent(
        new CustomEvent("sweety-profile-updated", {
          detail: updatedUser,
        })
      );
    }
  }

  // ================================
  // SAVE NAME
  // ================================

  async function saveName(event) {
    event.preventDefault();

    const updatedName = name.trim();

    if (!updatedName) {
      setError("Please enter your full name.");
      return;
    }

    if (updatedName.length > 100) {
      setError(
        "Your name must contain no more than 100 characters."
      );
      return;
    }

    if (updatedName === user.name) {
      cancelEditing();
      return;
    }

    await updateProfile({
      name: updatedName,
    });
  }

  // ================================
  // SAVE AVATAR
  // ================================

  async function saveAvatar() {
    if (!AVATARS.includes(selectedAvatar)) {
      setError("Please choose an avatar.");
      return;
    }

    await updateProfile({
      avatar: selectedAvatar,
    });
  }

  // ================================
  // LOADING STATE
  // ================================

  if (loading) {
    return (
      <div style={styles.container}>
        <section className="card">
          <div className="empty-state" role="status">
            <div className="empty-icon">👤</div>

            <h3>Loading your profile...</h3>

            <p>
              Please wait while we retrieve your
              account information.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ================================
  // PROFILE ERROR STATE
  // ================================

  if (!user) {
    return (
      <div style={styles.container}>
        <section className="card">
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>

            <h3>Unable to load your profile</h3>

            <p role="alert">
              {error ||
                "Something went wrong. Please try again."}
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ width: "auto" }}
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ================================
  // PROFILE PAGE
  // ================================

  return (
    <div style={styles.container}>
      <section
        className="card"
        style={styles.card}
      >
        {/* PROFILE BANNER */}

        <div style={styles.banner}>
          <div style={styles.profileSummary}>
            <div
              style={styles.avatar}
              aria-label="Your profile avatar"
              role="img"
            >
              {user.avatar || "👤"}
            </div>

            <div style={{ minWidth: 0 }}>
              <h2 style={styles.name}>
                {user.name}
              </h2>

              <p style={styles.member}>
                Sweety Member
              </p>

              <span style={styles.accountBadge}>
                🛡 Personal Account
              </span>
            </div>
          </div>

          {!editMode && (
            <div style={styles.actions}>
              <button
                type="button"
                className="primary-btn"
                style={styles.editButton}
                onClick={startEditingName}
              >
                ✏️ Edit Profile
              </button>

              <button
                type="button"
                style={styles.avatarButton}
                onClick={startChangingAvatar}
              >
                Change Avatar
              </button>
            </div>
          )}
        </div>

        {/* SUCCESS NOTIFICATION */}

        {message && (
          <div role="status" style={styles.message}>
            <span style={{ fontSize: "18px" }}>
              ✓
            </span>

            <span>{message}</span>
          </div>
        )}

        {/* ERROR NOTIFICATION */}

        {error && (
          <div role="alert" style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* PERSONAL INFORMATION */}

        {!editMode && (
          <>
            <div>
              <h3 style={styles.sectionTitle}>
                Personal Information
              </h3>

              <p style={styles.description}>
                View and manage your account details.
              </p>
            </div>

            <div style={styles.informationGrid}>
              {/* FULL NAME */}

              <div style={styles.informationCard}>
                <div style={styles.informationIcon}>
                  👤
                </div>

                <span
                  style={styles.informationLabel}
                >
                  Full Name
                </span>

                <span
                  style={styles.informationValue}
                >
                  {user.name}
                </span>
              </div>

              {/* EMAIL ADDRESS */}

              <div style={styles.informationCard}>
                <div style={styles.informationIcon}>
                  ✉️
                </div>

                <span
                  style={styles.informationLabel}
                >
                  Email Address
                </span>

                <span
                  style={styles.informationValue}
                >
                  {user.email}
                </span>
              </div>
            </div>

            {/* ACCOUNT PRIVACY */}

            <div style={styles.privacyCard}>
              <div
                style={{
                  fontSize: "25px",
                  flexShrink: 0,
                }}
              >
                🔒
              </div>

              <div>
                <h4
                  style={{
                    margin: "0 0 7px",
                    color: "#234b3e",
                    fontSize: "14px",
                  }}
                >
                  Account Privacy
                </h4>

                <p
                  style={{
                    margin: 0,
                    color: "#718d80",
                    fontSize: "12px",
                    lineHeight: 1.7,
                  }}
                >
                  Keep your login credentials private
                  and remember to log out when using
                  a shared device.
                </p>
              </div>
            </div>
          </>
        )}

        {/* EDIT PROFILE FORM */}

        {editMode === "name" && (
          <div style={styles.editor}>
            <h3 style={styles.sectionTitle}>
              Edit Personal Information
            </h3>

            <p style={styles.description}>
              Update your display name below.
            </p>

            <form
              className="reading-form"
              onSubmit={saveName}
            >
              <div className="form-group">
                <label htmlFor="profileName">
                  Full Name
                </label>

                <input
                  id="profileName"
                  type="text"
                  value={name}
                  placeholder="Enter your full name"
                  maxLength={100}
                  autoComplete="name"
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                  disabled={saving}
                  required
                  autoFocus
                />

                <span
                  style={{
                    textAlign: "right",
                    fontSize: "11px",
                    color: "#81998b",
                  }}
                >
                  {name.length}/100 characters
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="profileEmail">
                  Email Address
                </label>

                <input
                  id="profileEmail"
                  type="email"
                  value={user.email}
                  readOnly
                  style={{
                    background: "#f0f5f2",
                    color: "#718d80",
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    lineHeight: 1.6,
                    color: "#718d80",
                  }}
                >
                  🔒 Your registered email address
                  cannot be changed here.
                </p>
              </div>

              <div style={styles.editorActions}>
                <button
                  type="button"
                  className="cancel-btn"
                  style={styles.cancelButton}
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  style={styles.saveButton}
                  disabled={
                    saving ||
                    !name.trim() ||
                    name.trim() === user.name
                  }
                >
                  {saving
                    ? "Saving..."
                    : "✓ Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CHANGE AVATAR SECTION */}

        {editMode === "avatar" && (
          <div style={styles.editor}>
            <h3 style={styles.sectionTitle}>
              Choose Your Avatar
            </h3>

            <p style={styles.description}>
              Personalize your Sweety experience
              with an avatar that represents you.
            </p>

            <div style={styles.avatarGrid}>
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  aria-label={`Choose avatar ${avatar}`}
                  aria-pressed={
                    selectedAvatar === avatar
                  }
                  disabled={saving}
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    setError("");
                  }}
                  style={{
                    minHeight: "74px",
                    borderRadius: "14px",

                    border:
                      selectedAvatar === avatar
                        ? "2px solid #059669"
                        : "2px solid #e1eee6",

                    background:
                      selectedAvatar === avatar
                        ? "#d1fae5"
                        : "#ffffff",

                    fontSize: "31px",

                    boxShadow:
                      selectedAvatar === avatar
                        ? "0 0 0 3px #10b98115"
                        : "none",

                    cursor: saving
                      ? "not-allowed"
                      : "pointer",

                    transition: "all 0.2s ease",
                  }}
                >
                  {avatar}
                </button>
              ))}
            </div>

            {/* AVATAR PREVIEW */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                padding: "20px",
                background: "#ecfdf5",
                border: "1px solid #d1fae5",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  ...styles.avatar,
                  width: "64px",
                  height: "64px",
                  minWidth: "64px",
                  fontSize: "30px",
                }}
              >
                {selectedAvatar}
              </div>

              <div>
                <strong
                  style={{
                    color: "#047857",
                    fontSize: "14px",
                  }}
                >
                  Your New Avatar
                </strong>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#718d80",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  This is how your profile icon
                  will appear after saving.
                </p>
              </div>
            </div>

            {/* AVATAR ACTIONS */}

            <div style={styles.editorActions}>
              <button
                type="button"
                className="cancel-btn"
                style={styles.cancelButton}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn"
                style={styles.saveButton}
                onClick={saveAvatar}
                disabled={
                  saving ||
                  selectedAvatar ===
                    (user.avatar || "👤")
                }
              >
                {saving
                  ? "Saving..."
                  : "✓ Save Avatar"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}