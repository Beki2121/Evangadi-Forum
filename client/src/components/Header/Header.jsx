import { useContext } from "react";
import { Link } from "react-router-dom";
import { Navbar, Nav, Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
// Import Lucide React Icons for profile and logout
import { UserCircle2, LogOut } from "lucide-react";

import classes from "./header.module.css"; // Ensure this path is correct
import EvangadiLogo from "../../Assets/Images/evangadi-logo-header.png";
import { UserState } from "../../App.jsx";

function Header() {
  const { user } = useContext(UserState);
  const userid = user?.userid;

  // Debug logging for avatar
  console.log("Header: Current user state:", user);
  console.log("Header: Avatar URL:", user?.avatar_url);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    window.location.replace("/auth");
  };

  // Utility function to get user initial for avatar placeholder
  const getUserInitial = (username) => {
    return username ? username.charAt(0).toUpperCase() : "?";
  };

  return (
    <Navbar
      expand="md" // Collapses on medium and smaller screens
      className={classes.navbar_custom}
    >
      <Container className={classes.header_container}>
        {/* Brand Logo */}
        <Navbar.Brand as={Link} to="/">
          <img src={EvangadiLogo} alt="Evangadi Logo" width="200" />
        </Navbar.Brand>

        {/* Navbar Toggler for mobile */}
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <span className="navbar-toggler-icon"></span>
        </Navbar.Toggle>

        {/* Collapsible content (navigation links, logout, profile icon) */}
        <Navbar.Collapse
          id="basic-navbar-nav"
          className={classes.navbar_collapse_custom}
        >
          <Nav className={classes.nav_links_holder}>
            {/* Conditional Home Link */}
            {userid && (
              <Nav.Link as={Link} to="/" className={classes.navigation_links}>
                Home
              </Nav.Link>
            )}
            {/* Conditional Chat Link */}
            {userid && (
              <Nav.Link
                as={Link}
                to="/public-chat"
                className={classes.navigation_links}
              >
                Chat
              </Nav.Link>
            )}
            {/* How it Works Link */}
            <Nav.Link
              as={Link}
              to="/howitworks"
              className={classes.navigation_links}
            >
              How it Works
            </Nav.Link>

            {/* Conditional rendering for authenticated vs. unauthenticated user */}
            {userid ? (
              // Authenticated user: Logout button and Profile Icon
              <>
                <button onClick={handleSignOut} className={classes.logout_btn}>
                  <LogOut size={18} className={classes.icon_space} /> Logout
                </button>
                <Nav.Link
                  as={Link}
                  to={`/profile/${userid}`}
                  className={classes.profile_icon_link} // Styling for profile circle
                  title={user?.username} // Tooltip for username
                >
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile Picture" 
                      className={classes.profile_picture}
                    />
                  ) : (
                    <div className={classes.profile_picture_placeholder}>
                      {getUserInitial(user?.username)}
                    </div>
                  )}
                </Nav.Link>
              </>
            ) : (
              // Unauthenticated user: Login button
              <Nav.Link
                as={Link}
                to="/auth"
                className={`${classes.navigation_links} ${classes.login_btn}`}
              >
                Login
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
