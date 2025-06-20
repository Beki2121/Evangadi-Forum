// App.jsx (relevant parts)
import { createContext, useEffect, useState } from "react";
import "./App.css";
import { axiosInstance } from "./utility/axios";
import AppRouter from "./routes/AppRouter.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter as Router } from "react-router-dom";

<ToastContainer position="top-right" autoClose={3000} />;
export const UserState = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const login = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("EV-Forum-user", JSON.stringify(userData));
    setUser(userData); // <--- This sets the user immediately
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("EV-Forum-user");
    setUser(null);
    delete axiosInstance.defaults.headers.common["Authorization"];
  };

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axiosInstance.get("/user/check");
      const userData = response.data.user;
      console.log("App.jsx: Refreshed user data:", userData);
      setUser(userData);
    } catch (error) {
      console.error("App.jsx: Error refreshing user data:", error);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("EV-Forum-user");
      delete axiosInstance.defaults.headers.common["Authorization"];
    }
  };

  const getUserData = async () => {
    setLoadingUser(true);
    try {
      const token = localStorage.getItem("token");
      console.log("App.jsx: Token from localStorage:", token ? "Exists" : "Not found");

      if (!token) {
        console.log("App.jsx: No token found, setting user to null");
        setUser(null);
        return;
      }

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;

      console.log("App.jsx: Making request to /user/check");
      const response = await axiosInstance.get("/user/check");
      console.log("App.jsx: Response from /user/check:", response.data);
      
      // --- IMPORTANT FIX START ---
      // The API returns { user: { username, userid } }.
      // We need to extract the inner 'user' object.
      const userData = response.data.user;
      // --- IMPORTANT FIX END ---

      console.log("App.jsx: Extracted user data:", userData); // This will now log the direct user object
      setUser(userData);
    } catch (error) {
      console.error("App.jsx: Error fetching user data:", error);
      console.error("App.jsx: Error response:", error.response?.data);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("EV-Forum-user");
      delete axiosInstance.defaults.headers.common["Authorization"];
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  if (loadingUser) {
    return <div>Loading application...</div>;
  }

  return (
    <UserState.Provider value={{ user, setUser, login, logout, refreshUserData, loadingUser }}>
      <AppRouter />
    </UserState.Provider>
  );
}

export default App;
