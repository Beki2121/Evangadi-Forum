import { createContext, useEffect, useState } from "react";
import "./App.css";
import { useNavigate } from "react-router-dom";

import { axiosInstance } from "./utility/axios";
import AppRouter from "./routes/AppRouter.jsx";

export const UserState = createContext(); // Create a context for the user data

function App() {
  const [user, setUser] = useState({});
  const navigate = useNavigate();

  const getUserData = async () => {
    try {
      const token = localStorage.getItem("EV-Forum-token-G3-APR2024"); // Get the token stored during login from local storage
      if (!token) {
        navigate("/auth");
      }

      const userData = await axiosInstance
        .get("/user/check", { headers: { Authorization: "Bearer " + token } })
        .then((response) => response.data);
      console.log(userData);
      setUser(userData); // Store the user data in state so that it can be accessed by others too
    } catch (error) {
      console.log(error);
      navigate("/auth");
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  return (
    <UserState.Provider value={{ user, setUser }}>
      <AppRouter />
    </UserState.Provider>
  );
}

export default App;
