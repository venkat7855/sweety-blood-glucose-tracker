
import { useState } from "react";
import "./AuthPage.css";

const API_URL = "http://localhost:5000/api/auth";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

  function changeMode(nextMode) {
    setMode(nextMode);
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isForgot
        ? "forgot-password"
        : isRegister
          ? "register"
          : "login";

      const payload = isForgot
        ? { email: email.trim() }
        : isRegister
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(
        `${API_URL}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Something went wrong. Please try again."
        );
      }

      if (isForgot) {
        setMessage(
          "If this email is registered, you will receive password reset instructions."
        );
        return;
      }

      if (isRegister) {
        changeMode("login");
        setMessage(
          "Account created successfully! Please sign in."
        );
        return;
      }

      if (!data.token || !data.user) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "sweety-user",
        JSON.stringify(data.user)
      );
      localStorage.setItem(
        "sweety-remember",
        String(rememberMe)
      );

      if (typeof onLogin === "function") {
        onLogin(data.user);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* LEFT HEALTHCARE PANEL */}
        <section className="auth-visual">
          <div className="auth-visual-top">
            <div className="auth-logo-white">
              <span className="auth-logo-symbol">
                ♥
              </span>
              <span>Sweety</span>
            </div>

            <span className="auth-visual-badge">
              ✦ Your Health Companion
            </span>
          </div>

          <div className="auth-visual-content">
            <div className="auth-welcome-pill">
              💚 HEALTHIER DAYS START HERE
            </div>

            <h1>
              A healthier you,
              <br />
              one step at
              <br />
              a time.
            </h1>

            <p>
              Track your glucose levels, build healthy
              habits, and understand your daily progress
              with Sweety.
            </p>

            <div className="auth-health-scene">
              <div className="auth-orbit auth-orbit-one" />
              <div className="auth-orbit auth-orbit-two" />

              <div className="auth-health-circle">
                <div className="auth-health-icon">
                  ♥
                </div>
                <span>HEALTH & WELLNESS</span>
              </div>

              <div className="auth-floating-card auth-floating-glucose">
                <span className="auth-floating-icon">
                  🩸
                </span>
                <div>
                  <small>Glucose Tracking</small>
                  <strong>Stay informed</strong>
                </div>
              </div>

              <div className="auth-floating-card auth-floating-activity">
                <span className="auth-floating-icon">
                  🌿
                </span>
                <div>
                  <small>Daily Activity</small>
                  <strong>Build healthy habits</strong>
                </div>
              </div>

              <div className="auth-floating-heart">
                ♥
              </div>
            </div>
          </div>

          <div className="auth-visual-bottom">
            <span>✦ Track</span>
            <span>✦ Understand</span>
            <span>✦ Improve</span>
          </div>
        </section>

        {/* RIGHT AUTHENTICATION PANEL */}
        <section className="auth-form-panel">
          <div className="auth-form-top">
            <span className="auth-secure-badge">
              <span className="auth-secure-dot" />
              PERSONAL HEALTH DASHBOARD
            </span>
          </div>

          <div className="auth-form-content">
            <div className="auth-mobile-brand">
              <span>♥</span> Sweety
            </div>

            <div className="auth-form-heading">
              <span className="auth-form-eyebrow">
                {isForgot
                  ? "ACCOUNT RECOVERY"
                  : isRegister
                    ? "GET STARTED"
                    : "WELCOME BACK"}
              </span>

              <h2>
                {isForgot
                  ? "Forgot password?"
                  : isRegister
                    ? "Create your account"
                    : "Welcome back!"}
              </h2>

              <p>
                {isForgot
                  ? "Enter your registered email address to request a password reset link."
                  : isRegister
                    ? "Create your Sweety account and begin your health journey."
                    : "Sign in to continue your health journey with Sweety."}
              </p>
            </div>

            <form
              key={mode}
              className="auth-form"
              onSubmit={handleSubmit}
              autoComplete={isRegister ? "off" : "on"}
            >
              {/* FULL NAME - REGISTER ONLY */}
              {isRegister && (
                <div className="auth-field">
                  <label htmlFor="auth-name">
                    Full Name
                  </label>

                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      ♙
                    </span>

                    <input
                      id="auth-name"
                      name="registration-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      autoComplete="off"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
              )}

              {/* EMAIL ADDRESS */}
              <div className="auth-field">
                <label htmlFor="auth-email">
                  Email Address
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    ✉
                  </span>

                  <input
                    key={`email-${mode}`}
                    id="auth-email"
                    name={
                      isRegister
                        ? "registration-email"
                        : "email"
                    }
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete={
                      isRegister ? "off" : "email"
                    }
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              {!isForgot && (
                <div className="auth-field">
                  <label htmlFor="auth-password">
                    Password
                  </label>

                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      🔒
                    </span>

                    <input
                      id="auth-password"
                      name={
                        isRegister
                          ? "registration-password"
                          : "password"
                      }
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder={
                        isRegister
                          ? "Create a strong password"
                          : "Enter your password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete={
                        isRegister
                          ? "new-password"
                          : "current-password"
                      }
                      minLength={
                        isRegister ? 8 : undefined
                      }
                      required
                    />

                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {isRegister && (
                    <p className="auth-password-hint">
                      Use at least 8 characters.
                    </p>
                  )}
                </div>
              )}

              {/* LOGIN OPTIONS */}
              {mode === "login" && (
                <div className="auth-form-options">
                  <label className="auth-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) =>
                        setRememberMe(
                          event.target.checked
                        )
                      }
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() =>
                      changeMode("forgot")
                    }
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* ERROR MESSAGE */}
              {error && (
                <div
                  className="auth-alert auth-alert-error"
                  role="alert"
                >
                  ⚠️ {error}
                </div>
              )}

              {/* SUCCESS MESSAGE */}
              {message && (
                <div
                  className="auth-alert auth-alert-success"
                  role="status"
                >
                  ✓ {message}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isForgot
                    ? "Send Reset Link"
                    : isRegister
                      ? "Create Account"
                      : "Sign In"}

                {!loading && <span>→</span>}
              </button>
            </form>

            {/* SWITCH BETWEEN LOGIN AND REGISTER */}
            {isForgot ? (
              <div className="auth-switch">
                <button
                  type="button"
                  onClick={() =>
                    changeMode("login")
                  }
                >
                  ← Back to Sign In
                </button>
              </div>
            ) : (
              <div className="auth-switch">
                <span>
                  {isRegister
                    ? "Already have an account?"
                    : "New to Sweety?"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    changeMode(
                      isRegister
                        ? "login"
                        : "register"
                    )
                  }
                >
                  {isRegister
                    ? "Sign In"
                    : "Create an account"}
                </button>
              </div>
            )}

            {/* SECURITY NOTE */}
            <div className="auth-trust-note">
              <span>🔒</span>
              <p>
                Your health records are accessible only
                through your authenticated account.
              </p>
            </div>
          </div>

          <div className="auth-form-footer">
            <span>
              © 2026 Sweety Health Companion
            </span>
            <span>
              Made with 💚 for better health
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
