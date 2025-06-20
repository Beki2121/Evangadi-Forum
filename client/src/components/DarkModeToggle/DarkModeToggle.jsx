import React, { useContext } from "react";
import { DarkModeContext } from "../../App.jsx";
import { FiSun, FiMoon } from "react-icons/fi";
import styles from "./DarkModeToggle.module.css";

const DarkModeToggle = () => {
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  return (
    <button
      className={styles.toggleButton}
      onClick={toggleDarkMode}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {darkMode ? (
        <FiSun className={styles.icon} />
      ) : (
        <FiMoon className={styles.icon} />
      )}
    </button>
  );
};

export default DarkModeToggle; 