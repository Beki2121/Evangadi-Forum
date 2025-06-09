import { useState, useContext } from "react"; // Import useContext
import { axiosInstance } from "../../utility/axios.js";
import classes from "./login.module.css";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import Swal from "sweetalert2";

// Import Font Awesome icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

// Import your UserState context
import { UserState } from "../../App.jsx"; // Adjust path if necessary

function Login({ onSwitch }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    usernameOrEmail: "",
    password: "",
  });

  const navigate = useNavigate(); // Initialize useNavigate
  const { login } = useContext(UserState); // Get the login function from context

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axiosInstance.post("/user/Login", {
        usernameOrEmail: formData.usernameOrEmail,
        password: formData.password,
      });

      if (response.status === 200) {
        // --- CRUCIAL CHANGE HERE ---
        // Call the login function from context
        // Assuming your backend returns { user: { userid: '...', ... }, token: '...' }
        const { token, user } = response.data;
        login(user, token); // Pass user data and token to the context's login function

        setSuccess("Login successful! Redirecting...");
        await Swal.fire({
          title: "Success!",
          text: "User Logged in successfully!",
          icon: "success",
          confirmButtonText: "OK",
        });
        setError(null);
        navigate("/"); // Use navigate from react-router-dom for smoother navigation
        // This will trigger App.jsx's useEffect to fetch user data
        // which will then update the user context.
      } else {
        // This 'else' block for response.status is less common with Axios for non-2xx codes,
        // as Axios usually throws an error for those, sending execution to the `catch` block.
        setError(response.data.msg || "Login failed due to unexpected status.");
        await Swal.fire({
          title: "Error",
          text: response.data.msg || "Error logging in. Please try again.",
          icon: "error",
          confirmButtonText: "OK",
        });
        setSuccess(null);
      }
    } catch (err) {
      console.error("Login error:", err); // Log the full error object for debugging

      let errorMessage = "Error logging in. Please try again.";
      if (err.response && err.response.data && err.response.data.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.message) {
        errorMessage = err.message; // Fallback to generic Axios error message
      }

      setError(errorMessage);
      await Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "OK",
      });
      setSuccess(null);
    }
  };

  return (
    <div className={classes.formcontainer}>
      <div className={classes.innerContainer}>
        <div className={classes.heading}>
          <h2 className={classes.title}>Login to your account</h2>
          <p className={classes.signuptext}>
            Don't have an account?{" "}
            <a
              onClick={onSwitch}
              style={{ cursor: "pointer", color: "var(--primary-color)" }}
            >
              create a new account
            </a>
          </p>
          {error && (
            <p className={classes.error} style={{ marginBottom: "10px" }}>
              {error}
            </p>
          )}{" "}
          {/* Display error message */}
          {success && <p className={classes.success}>{success}</p>}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="usernameOrEmail"
            placeholder="User name or Email"
            value={formData.usernameOrEmail}
            onChange={handleChange}
            required
          />
          <div className={classes.passwordinput}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={handleTogglePassword}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 5px", // Adjust padding as needed
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
            </button>
          </div>
          <p className={classes.forgotpasswordtext}>
            <Link to="/forgetPass">Forgot password?</Link>
          </p>
          <button type="submit" className={classes.submitbtn}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
