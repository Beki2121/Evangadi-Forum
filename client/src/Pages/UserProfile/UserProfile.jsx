import { useEffect, useState, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  User,
  Mail,
  Key,
  Save,
  XCircle,
  Edit,
  Loader,
  CalendarDays,
  Camera,
  Upload,
} from "lucide-react";
import classes from "./UserProfile.module.css";

// 🔻 You will manage the correct pa/ths for these
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { UserState } from "../../App.jsx";
import { axiosInstance } from "../../utility/axios";

function UserProfile() {
  const { userid } = useParams();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullname, setEditFullname] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile picture states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Get global user state and setUser function
  const { user, setUser, refreshUserData } = useContext(UserState);

  // Utility function to get user initial for avatar placeholder
  const getUserInitial = (username) => {
    return username ? username.charAt(0).toUpperCase() : "?";
  };

  // Handle file selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        Swal.fire({
          icon: "error",
          title: "Invalid File Type",
          text: "Please select an image file (JPG, PNG, GIF, etc.)",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "Please select an image smaller than 5MB",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    if (!selectedImage) {
      Swal.fire({
        icon: "warning",
        title: "No Image Selected",
        text: "Please select an image to upload",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Authentication Required",
        text: "You are not logged in. Please log in to upload a profile picture.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        console.log("Profile picture base64 data length:", base64Image.length);
        console.log(
          "Profile picture base64 data starts with:",
          base64Image.substring(0, 50)
        );

        // Upload to backend
        const response = await axiosInstance.put(
          `/user/${userid}`,
          { avatar_url: base64Image },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("UserProfile: Image upload response:", response.data);

        // Update local state
        setUserData((prev) => ({ ...prev, avatar_url: base64Image }));
        setSelectedImage(null);
        setImagePreview(null);

        console.log(
          "UserProfile: Profile picture uploaded successfully. Refreshing user data..."
        );

        // Refresh global user data from server
        await refreshUserData();

        console.log(
          "UserProfile: User data refreshed. Current user state:",
          user
        );

        Swal.fire({
          icon: "success",
          title: "Profile Picture Updated!",
          text: "Your profile picture has been updated successfully.",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      };
      reader.readAsDataURL(selectedImage);
    } catch (err) {
      const msg =
        err.response?.data?.Msg ||
        "Failed to upload profile picture. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: msg,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("User not authenticated. Please log in.");
        Swal.fire({
          icon: "error",
          title: "Authentication Required",
          text: "You are not logged in. Please log in to view your profile.",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        return;
      }

      // Use authenticated user's ID if available, otherwise use URL parameter
      const targetUserid = user?.userid || userid;
      console.log("UserProfile: Using target userid:", targetUserid);
      console.log("UserProfile: URL userid:", userid);
      console.log("UserProfile: Authenticated userid:", user?.userid);

      // Test if backend is responding
      try {
        console.log("UserProfile: Testing backend connectivity...");
        const testResponse = await axiosInstance.get("/user/test");
        console.log("UserProfile: Backend test response:", testResponse.data);
      } catch (testErr) {
        console.error(
          "UserProfile: Backend connectivity test failed:",
          testErr
        );
        console.error("UserProfile: Test error response:", testErr.response);
        console.error(
          "UserProfile: Test error status:",
          testErr.response?.status
        );
        console.error("UserProfile: Test error data:", testErr.response?.data);

        // Test if user check endpoint is working
        try {
          console.log("UserProfile: Testing user check endpoint...");
          const checkResponse = await axiosInstance.get("/user/check");
          console.log("UserProfile: User check response:", checkResponse.data);
        } catch (checkErr) {
          console.error("UserProfile: User check test failed:", checkErr);
          console.error(
            "UserProfile: Check error response:",
            checkErr.response
          );
          console.error(
            "UserProfile: Check error status:",
            checkErr.response?.status
          );
        }

        // Test if server root is responding
        try {
          console.log("UserProfile: Testing server root endpoint...");
          const rootResponse = await axios.get(
            "https://server.evangadiforum.com/"
          );
          console.log("UserProfile: Server root response:", rootResponse.data);
        } catch (rootErr) {
          console.error("UserProfile: Server root test also failed:", rootErr);
          console.error(
            "UserProfile: This suggests the server is not running or not accessible"
          );
        }
      }

      try {
        console.log("UserProfile: Making API call to fetch user data...");
        const response = await axiosInstance.get(`/user/${targetUserid}`);
        const { fullname, username, email } = response.data;
        setUserData(response.data);
        setEditFullname(fullname || "");
        setEditUsername(username || "");
        setEditEmail(email || "");
        setEditPassword("");
        setConfirmPassword("");
        setError(null);
      } catch (err) {
        console.error("UserProfile: Error fetching user data:", err);
        console.error("UserProfile: Error response:", err.response);
        console.error("UserProfile: Error status:", err.response?.status);
        console.error("UserProfile: Error data:", err.response?.data);
        console.error("UserProfile: Error message:", err.message);
        console.error("UserProfile: Error stack:", err.stack);

        // Log the full error object
        console.error(
          "UserProfile: Full error object:",
          JSON.stringify(err, null, 2)
        );

        let errorMessage = "Failed to load user profile. Please try again.";
        if (err.response?.status === 401) {
          errorMessage =
            "Session expired or unauthorized. Please log in again.";
        } else if (err.response?.data?.Msg) {
          errorMessage = err.response.data.Msg;
        } else if (err.response?.data?.msg) {
          errorMessage = err.response.data.msg;
        }
        setError(errorMessage);
        Swal.fire({
          icon: "error",
          title: "Error Fetching Profile",
          text: errorMessage,
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        setUserData(null);
      }
    };

    if (userid) fetchUserData();
    else {
      const warning = "No user ID provided in the URL.";
      setError(warning);
      Swal.fire({
        icon: "warning",
        title: "Missing User ID",
        text: warning,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }, [userid]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    if (userData) {
      setEditFullname(userData.fullname || "");
      setEditUsername(userData.username || "");
      setEditEmail(userData.email || "");
    }
    setEditPassword("");
    setConfirmPassword("");
    Swal.fire({
      icon: "info",
      title: "Edit Cancelled",
      text: "Your changes have been discarded.",
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "fullname") setEditFullname(value);
    else if (name === "username") setEditUsername(value);
    else if (name === "email") setEditEmail(value);
    else if (name === "password") setEditPassword(value);
    else if (name === "confirmPassword") setConfirmPassword(value);
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    if (editPassword && editPassword !== confirmPassword) {
      return Swal.fire({
        icon: "warning",
        title: "Password Mismatch",
        text: "New password and confirm password do not match.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    if (editPassword && editPassword.length < 8) {
      return Swal.fire({
        icon: "warning",
        title: "Password Too Short",
        text: "Password should be at least 8 characters long.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    const updatedData = {
      fullname: editFullname,
      username: editUsername,
      email: editEmail,
      ...(editPassword ? { password: editPassword } : {}),
    };

    const token = localStorage.getItem("token");
    if (!token) {
      return Swal.fire({
        icon: "error",
        title: "Authentication Required",
        text: "You are not logged in. Please log in to update your profile.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }

    try {
      const response = await axiosInstance.put(`/user/${userid}`, updatedData);
      setUserData((prev) => ({ ...prev, ...updatedData }));
      setIsEditing(false);
      setEditPassword("");
      setConfirmPassword("");
      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text:
          response.data.msg || "Your profile has been updated successfully.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } catch (err) {
      const msg =
        err.response?.data?.Msg ||
        "Failed to update profile. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: msg,
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setError(msg);
    }
  };

  return (
    <>
      <Header />
      <div className={classes.profile_container}>
        {error && !userData ? (
          <div className={classes["alert-box"]}>
            <div
              className={`${classes["alert-content"]} ${classes["alert-error-bg"]}`}
            >
              <strong className={classes["alert-strong"]}>Error!</strong>
              <span className={classes["alert-span"]}>{error}</span>
            </div>
          </div>
        ) : !userData ? (
          <div className={classes["alert-box"]}>
            <div
              className={`${classes["alert-content"]} ${classes["alert-loading-bg"]}`}
            >
              <strong className={classes["alert-strong"]}>Loading...</strong>
              <span className={classes["alert-span"]}>
                Loading user profile...
              </span>
              <Loader className={classes["loader-icon"]} size={20} />
            </div>
          </div>
        ) : (
          <>
            <h2 className={classes.title}>User Profile</h2>
            <div className={classes.profile_card}>
              {/* Profile Picture Section */}
              <div className={classes.profile_picture_section}>
                <div className={classes.profile_picture_container}>
                  {userData.avatar_url ? (
                    <img
                      src={userData.avatar_url}
                      alt="Profile Picture"
                      className={classes.profile_picture}
                    />
                  ) : (
                    <div className={classes.profile_picture_placeholder}>
                      {getUserInitial(userData.username)}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className={classes.profile_picture_upload}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />

                    <div className={classes.upload_controls}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={classes.select_image_btn}
                        disabled={isUploading}
                      >
                        <Camera className={classes.icon_button} /> Select Image
                      </button>

                      {selectedImage && (
                        <>
                          <button
                            type="button"
                            onClick={handleImageUpload}
                            className={classes.upload_btn}
                            disabled={isUploading}
                          >
                            <Upload className={classes.icon_button} />
                            {isUploading ? "Uploading..." : "Upload"}
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className={classes.remove_btn}
                            disabled={isUploading}
                          >
                            <XCircle className={classes.icon_button} /> Remove
                          </button>
                        </>
                      )}
                    </div>

                    {imagePreview && (
                      <div className={classes.image_preview}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className={classes.preview_image}
                        />
                        <p className={classes.preview_text}>Preview</p>
                      </div>
                    )}

                    <p className={classes.upload_info}>
                      Supported formats: JPG, PNG, GIF (Max 5MB)
                    </p>
                  </div>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveClick} className={classes.form}>
                  <div className={classes.form_group}>
                    <label htmlFor="fullname">
                      <User className={classes["icon-label"]} /> Full Name:
                    </label>
                    <input
                      type="text"
                      id="fullname"
                      name="fullname"
                      value={editFullname}
                      onChange={handleInputChange}
                      className={classes.input_field}
                      required
                    />
                  </div>
                  <div className={classes.form_group}>
                    <label htmlFor="username">
                      <User className={classes["icon-label"]} /> Username:
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={editUsername}
                      onChange={handleInputChange}
                      className={classes.input_field}
                      required
                    />
                  </div>
                  <div className={classes.form_group}>
                    <label htmlFor="email">
                      <Mail className={classes["icon-label"]} /> Email:
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={editEmail}
                      onChange={handleInputChange}
                      className={classes.input_field}
                      required
                    />
                  </div>
                  <div className={classes.form_group}>
                    <label htmlFor="password">
                      <Key className={classes["icon-label"]} /> New Password
                      (optional):
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={editPassword}
                      onChange={handleInputChange}
                      className={classes.input_field}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                  <div className={classes.form_group}>
                    <label htmlFor="confirmPassword">
                      <Key className={classes["icon-label"]} /> Confirm New
                      Password:
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={handleInputChange}
                      className={classes.input_field}
                    />
                  </div>
                  <div className={classes.button_group}>
                    <button type="submit" className={classes.save_btn}>
                      <Save className={classes["icon-button"]} /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      className={classes.cancel_btn}
                    >
                      <XCircle className={classes["icon-button"]} /> Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className={classes["profile-details"]}>
                  <p>
                    <User className={classes["icon-detail"]} />
                    <strong>Full Name:</strong> {userData.fullname}
                  </p>
                  <p>
                    <User className={classes["icon-detail"]} />
                    <strong>Username:</strong> {userData.username}
                  </p>
                  <p>
                    <Mail className={classes["icon-detail"]} />
                    <strong>Email:</strong> {userData.email}
                  </p>
                  <p>
                    <CalendarDays className={classes["icon-detail"]} />
                    <strong>Registered Date:</strong>{" "}
                    {new Date(userData.created_at).toLocaleDateString()}
                  </p>
                  <button
                    onClick={handleEditClick}
                    className={classes.edit_btn}
                  >
                    <Edit className={classes["icon-button"]} /> Edit Profile
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

export default UserProfile;
