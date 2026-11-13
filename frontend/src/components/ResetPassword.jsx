
import { useState } from "react";
import "./AuthPage.css";

const API_URL = "http://localhost:5000/api/auth";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to reset password."
        );
      }

      setSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <section className="auth-visual">
          <div className="auth-visual-top">
            <div className="auth-logo-white">
              <span className="auth-logo-symbol">♥</span>
              <span>Sweety</span>
            </div>
          </div>

          <div className="auth-visual-content">
            <div className="auth-welcome-pill">
              💚 ACCOUNT SECURITY
            </div>

            <h1>
              Your health.
              <br />
              Your account.
              <br />
              Protected.
            </h1>

            <p>
              Create a new password to securely regain
              access to your Sweety health dashboard.
            </p>

            <div className="auth-health-scene">
              <div className="auth-orbit auth-orbit-one" />
              <div className="auth-orbit auth-orbit-two" />

              <div className="auth-health-circle">
                <div className="auth-health-icon">♥</div>
                <span>ACCOUNT RECOVERY</span>
              </div>
            </div>
          </div>

          <div className="auth-visual-bottom">
            <span>✦ Secure</span>
            <span>✦ Recover</span>
            <span>✦ Continue</span>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-top">
            <span className="auth-secure-badge">
              <span className="auth-secure-dot" />
              ACCOUNT RECOVERY
            </span>
          </div>

          <div className="auth-form-content">
            <div className="auth-mobile-brand">
              <span>♥</span> Sweety
            </div>

            <div className="auth-form-heading">
              <span className="auth-form-eyebrow">
                RESET PASSWORD
              </span>

              <h2>Create new password</h2>
              <p>
                Choose a new password with at least
                8 characters.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="new-password">
                  New Password
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>

                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={Boolean(success)}
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password">
                  Confirm Password
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>

                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={Boolean(success)}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="auth-alert auth-alert-error"
                  role="alert"
                >
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div
                  className="auth-alert auth-alert-success"
                  role="status"
                >
                  ✓ {success}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || Boolean(success) || !token}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>

            <div className="auth-switch">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>

          <div className="auth-form-footer">
            <span>© 2026 Sweety Health Companion</span>
            <span>Made with 💚 for better health</span>
          </div>
        </section>
      </div>
    </div>
  );
}
