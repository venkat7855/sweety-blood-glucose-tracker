
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

const fieldStyle = {
  padding: "16px",
  border: "1px solid #dce9e3",
  borderRadius: "12px",
  background: "#f8fcfa",
  overflowWrap: "anywhere",
};

const avatarStyle = {
  width: "68px",
  height: "68px",
  borderRadius: "50%",
  background: "#d1fae5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  flexShrink: 0,
};

export default function Profile({ onProfileUpdated }) {
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("👤");

  const [editMode, setEditMode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load the logged-in user's profile
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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load profile."
          );
        }

        if (!data.user) {
          throw new Error("Profile information is missing.");
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

  function startEditingName() {
    setName(user.name);
    setEditMode("name");
    setMessage("");
    setError("");
  }

  function startChangingAvatar() {
    setSelectedAvatar(user.avatar || "👤");
    setEditMode("avatar");
    setMessage("");
    setError("");
  }

  function cancelEditing() {
    setName(user.name);
    setSelectedAvatar(user.avatar || "👤");
    setEditMode(null);
    setMessage("");
    setError("");
  }

  async function updateProfile(changes) {
    setSaving(true);
    setError("");
    setMessage("");

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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update profile."
        );
      }

      if (!data.user) {
        throw new Error("Updated profile was not returned.");
      }

      const updatedUser = data.user;

      setUser(updatedUser);
      setName(updatedUser.name);
      setSelectedAvatar(updatedUser.avatar || "👤");

      setEditMode(null);
      setMessage("Profile updated successfully!");

      // Notify App.jsx so the header avatar can update.
      if (typeof onProfileUpdated === "function") {
        onProfileUpdated(updatedUser);
      }

      // Also notify other components if needed.
      window.dispatchEvent(
        new CustomEvent("sweety-profile-updated", {
          detail: updatedUser,
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveName(event) {
    event.preventDefault();

    const updatedName = name.trim();

    if (!updatedName || updatedName.length > 100) {
      setError("Name must contain 1 to 100 characters.");
      return;
    }

    await updateProfile({
      name: updatedName,
    });
  }

  async function saveAvatar() {
    if (!AVATARS.includes(selectedAvatar)) {
      setError("Please select a valid avatar.");
      return;
    }

    await updateProfile({
      avatar: selectedAvatar,
    });
  }

  return (
    <div className="health-reports">
      <section className="card form-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              MY ACCOUNT
            </span>

            <h2>My Profile</h2>

            <p>
              Manage your personal account information.
            </p>
          </div>

          <div className="section-icon">
            {user?.avatar || "👤"}
          </div>
        </div>

        {loading ? (
          <p>Loading your profile...</p>
        ) : !user ? (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error || "Profile unavailable."}
          </p>
        ) : (
          <>
            {/* Profile summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <div style={avatarStyle}>
                {user.avatar || "👤"}
              </div>

              <div>
                <h3 style={{ margin: 0 }}>
                  {user.name}
                </h3>

                <p
                  style={{
                    marginTop: "5px",
                    color: "#64748b",
                  }}
                >
                  Sweety Member
                </p>
              </div>
            </div>

            {/* Success message */}
            {message && !editMode && (
              <p
                role="status"
                style={{
                  color: "#047857",
                  marginBottom: "18px",
                }}
              >
                ✓ {message}
              </p>
            )}

            {/* Error message */}
            {error && (
              <p
                role="alert"
                style={{
                  color: "#b91c1c",
                  marginBottom: "18px",
                }}
              >
                {error}
              </p>
            )}

            {/* VIEW PROFILE */}
            {!editMode && (
              <div>
                <div className="form-group">
                  <label>Full Name</label>
                  <div style={fieldStyle}>
                    {user.name}
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <div style={fieldStyle}>
                    {user.email}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "22px",
                  }}
                >
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={startEditingName}
                    style={{ flex: "1 1 180px" }}
                  >
                    ✏️ Edit Profile
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={startChangingAvatar}
                    style={{
                      flex: "1 1 180px",
                      background: "#047857",
                    }}
                  >
                    🎨 Change Avatar
                  </button>
                </div>
              </div>
            )}

            {/* EDIT NAME */}
            {editMode === "name" && (
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
                    maxLength={100}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={saving}
                    required
                    autoFocus
                  />
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
                  />

                  <p className="form-note">
                    Your email address cannot be changed here.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={cancelEditing}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={saving || !name.trim()}
                    style={{ flex: 2 }}
                  >
                    {saving
                      ? "Saving..."
                      : "✓ Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* CHANGE AVATAR */}
            {editMode === "avatar" && (
              <div>
                <h3 style={{ marginBottom: "8px" }}>
                  Choose Your Avatar
                </h3>

                <p
                  style={{
                    color: "#64748b",
                    marginBottom: "20px",
                  }}
                >
                  Select an icon that represents you.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(70px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      aria-label={`Choose avatar ${avatar}`}
                      aria-pressed={
                        selectedAvatar === avatar
                      }
                      disabled={saving}
                      onClick={() =>
                        setSelectedAvatar(avatar)
                      }
                      style={{
                        minHeight: "70px",
                        borderRadius: "14px",
                        border:
                          selectedAvatar === avatar
                            ? "3px solid #059669"
                            : "1px solid #dce9e3",
                        background:
                          selectedAvatar === avatar
                            ? "#d1fae5"
                            : "#f8fcfa",
                        fontSize: "30px",
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

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px",
                    background: "#f0fdf4",
                    borderRadius: "14px",
                    marginBottom: "24px",
                  }}
                >
                  <span style={{ fontSize: "40px" }}>
                    {selectedAvatar}
                  </span>

                  <div>
                    <strong>Avatar Preview</strong>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      This is how your profile icon will look.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={cancelEditing}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={saveAvatar}
                    disabled={
                      saving ||
                      selectedAvatar === (user.avatar || "👤")
                    }
                    style={{ flex: 2 }}
                  >
                    {saving
                      ? "Saving..."
                      : "✓ Save Avatar"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
