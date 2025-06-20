import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserState } from "../App"; // Adjust path if necessary, assuming App.jsx is one level up

const PrivateRoute = () => {
  const { user, loadingUser } = useContext(UserState); // Get the user state and loading state from your context

  // Temporary debugging - log the user state
  console.log("PrivateRoute: Current user state:", user);
  console.log("PrivateRoute: Loading state:", loadingUser);

  // If still loading, show loading indicator
  if (loadingUser) {
    return <div>Loading...</div>;
  }

  // If 'user' is null or undefined (meaning not logged in),
  // redirect to the authentication page.
  // Otherwise, render the nested (protected) routes.
  return user ? <Outlet /> : <Navigate to="/auth" />;
};

export default PrivateRoute;
