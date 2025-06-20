import { useState } from "react";
import classes from "./signUp.module.css";
import { Link } from "react-router-dom";
import { axiosInstance } from "../../utility/axios";
import Swal from "sweetalert2";

// Import Font Awesome icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function Signup({ onSwitch }) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

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

  function validateUserData(fname, lname, username) {
    const isValidFname = /^[A-Za-z]{2,}$/.test(fname.trim());
    const isValidLname = /^[A-Za-z]{2,}$/.test(lname.trim());
    const isValidUserName = /^[A-Za-z0-9]+$/.test(username.trim());
    const isValidUsernameLength = username.trim().length > 1;
    return (
      isValidFname && isValidLname && isValidUserName && isValidUsernameLength
    );
  }

  // ✅ Password strength validator
  function isStrongPassword(password) {
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !validateUserData(
        formData.firstName,
        formData.lastName,
        formData.username
      )
    ) {
      return await Swal.fire({
        title: "Error",
        text: "Please enter a valid first, last and username. Names should contain only letters and include at least two characters",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    // ✅ Block weak passwords
    if (!isStrongPassword(formData.password)) {
      return await Swal.fire({
        title: "Weak Password",
        text: "Please create a stronger password: at least 8 characters with uppercase, lowercase, number, and special character.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    // --- Start: Add loading Swal here ---
    Swal.fire({
      title: "Registering...",
      text: "Please wait while we process your registration.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    // --- End: Add loading Swal here ---

    try {
      const response = await axiosInstance.post("/user/register", {
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      Swal.close(); // Close the loading Swal

      if (response.status === 201) {
        setError(null);
        await Swal.fire({
          title: "Registration Successful!",
          text: "Please check your email to verify your account before logging in.",
          icon: "success",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        setSuccess(
          "Registration successful! Please check your email to verify your account."
        );
        setFormData({
          username: "",
          firstName: "",
          lastName: "",
          email: "",
          password: "",
        });
      } else {
        setError(
          response.data.Msg || "Error submitting the form. Please try again."
        );
        await Swal.fire({
          title: "Error",
          text:
            response.data.Msg || "Error submitting the form. Please try again.",
          icon: "error",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        setSuccess(null);
      }
    } catch (err) {
      Swal.close(); // Close the loading Swal even if an error occurs
      setError(
        err.response?.data?.Msg ||
          "Error submitting the form. Please try again. " + err.message
      );
      await Swal.fire({
        title: "Error",
        text:
          err.response?.data?.Msg ||
          "Error submitting the form. Please try again.",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setSuccess(null);
    }
  };

  return (
    <div className={classes.formcontainer}>
      <h2>Join the network</h2>
      <p className="signin-text">
        Already have an account?{" "}
        <a
          onClick={onSwitch}
          style={{ cursor: "pointer", color: "var(--primary-color)" }}
        >
          Sign in
        </a>
      </p>
      {error && <p className={classes.error}>{error}</p>}
      {success && <p className={classes.success}>{success}</p>}
      <form method="POST" onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <div className={classes.nameinputs}>
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={formData.email}
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
            className={classes.togglebtn}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
          </button>
        </div>

        {/* ✅ Password strength message */}
        {formData.password && !isStrongPassword(formData.password) && (
          <p style={{ color: "crimson", fontSize: "13px", marginTop: "5px" }}>
            Password must be at least 8 characters and include uppercase,
            lowercase, number, and special character.
          </p>
        )}

        <div style={{ padding: "5px", fontSize: "14px" }}>
          I agree to the <Link to="/privacyPolicy">privacy policy</Link> and{" "}
          <Link to="/terms">terms of service</Link>.
        </div>

        <button type="submit" className={classes.submitbtn}>
          Agree and Join
        </button>
        <p className={classes.signintext}>
          <a
            onClick={onSwitch}
            style={{ cursor: "pointer", color: "var(--primary-color)" }}
          >
            Already have an account?
          </a>
        </p>
      </form>
    </div>
  );
}

export default Signup;
