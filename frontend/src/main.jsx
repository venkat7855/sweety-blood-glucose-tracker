
import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import AuthPage from "./components/AuthPage.jsx";
import ResetPassword from "./components/ResetPassword.jsx";

import "./index.css";

function SweetyApp() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("sweety-user");

    if (!token || !savedUser) {
      return null;
    }

    try {
      const parsedUser = JSON.parse(savedUser);

      if (!parsedUser || typeof parsedUser !== "object") {
        throw new Error("Invalid saved user");
      }

      return parsedUser;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("sweety-user");
      return null;
    }
  });

  // LOGIN SUCCESS
  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  // LOGOUT
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("sweety-user");
    localStorage.removeItem("sweety-remember");

    // Remove account-specific cached readings from the browser.
    // This does not delete PostgreSQL readings.
    localStorage.removeItem("sweety-readings");

    setUser(null);
  }

  // PASSWORD RESET PAGE
  const path = window.location.pathname;

  if (path === "/reset-password") {
    return <ResetPassword />;
  }

  // AUTHENTICATED DASHBOARD
  if (user) {
    return (
      <App
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // SIGN IN PAGE
  return <AuthPage onLogin={handleLogin} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SweetyApp />
  </React.StrictMode>
);
