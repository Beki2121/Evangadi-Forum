// App.jsx
import { createContext, useEffect, useState } from "react";
import "./App.css";
// import { useNavigate } from "react-router-dom"; // REMOVED: navigate should not be called directly in App
// if AppRouter contains BrowserRouter

import { axiosInstance } from "./utility/axios";
import AppRouter from "./routes/AppRouter.jsx"; // Assuming this wraps BrowserRouter

export const UserState = createContext();

function App() {
  // Initialize user state from localStorage on app load
  const [user, setUser] = useState(null); // Initialize as null, not empty object
  // An empty object `{}` is truthy, but `null` explicitly means no user.
  const [loadingUser, setLoadingUser] = useState(true); // New state for loading status

  // Function to set the user and token after login
  const login = (userData, token) => {
    localStorage.setItem("EV-Forum-token-G3-APR2024", token);
    localStorage.setItem("EV-Forum-user", JSON.stringify(userData)); // Store user data
    setUser(userData);
    // Set the token on axios defaults for all subsequent requests
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  // Function to clear user and token on logout
  const logout = () => {
    localStorage.removeItem("EV-Forum-token-G3-APR2024");
    localStorage.removeItem("EV-Forum-user");
    setUser(null);
    // Clear the token from axios defaults
    delete axiosInstance.defaults.headers.common["Authorization"];
  };

  const getUserData = async () => {
    setLoadingUser(true); // Start loading
    try {
      const token = localStorage.getItem("EV-Forum-token-G3-APR2024");

      if (!token) {
        setUser(null); // No token, no user
        // No navigate here. Let routes handle auth or the interceptor.
        return;
      }

      // Set the token for this request and for future ones (important!)
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;

      const response = await axiosInstance.get("/user/check"); // Token will be automatically attached now

      const userData = response.data;
      console.log("Fetched user data:", userData);
      setUser(userData); // Store the user data in state
    } catch (error) {
      console.error("Error fetching user data:", error);
      // If check fails (e.g., 401 Unauthorized), clear token and user state
      setUser(null);
      localStorage.removeItem("EV-Forum-token-G3-APR2024");
      localStorage.removeItem("EV-Forum-user");
      delete axiosInstance.defaults.headers.common["Authorization"];
      // The Axios response interceptor (if configured) should handle navigation to /auth
    } finally {
      setLoadingUser(false); // Done loading
    }
  };

  useEffect(() => {
    getUserData(); // Attempt to get user data on app mount
  }, []); // Empty dependency array means this runs once on mount

  // You might want to show a loading indicator while user data is being fetched
  if (loadingUser) {
    return <div>Loading application...</div>;
  }

  return (
    <UserState.Provider value={{ user, setUser, login, logout }}>
      <AppRouter />
    </UserState.Provider>
  );
}

export default App;
