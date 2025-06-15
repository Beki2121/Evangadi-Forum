import { useContext } from "react";
import { Link } from "react-router-dom";
import styles from "./HowItWorks.module.css";
import Layout from "../../Layout/Layout.jsx";
import { UserState } from "../../App.jsx";

const HowItWorks = () => {
  const { user } = useContext(UserState);
  const userid = user?.userid;

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.inner_container}>
          <h2 className={styles.title}>Purpose of the Platform</h2>
          <p className={styles.description}>
            The platform’s purpose is to foster collaborative learning among
            students by enabling them to ask questions, answer peers, and review
            responses. It creates an interactive environment where students can
            share knowledge, support each other, and enhance understanding
            through discussions and feedback.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <h3>1️⃣ User Authentication 🔐</h3>
              <p>
                Students create an account with{" "}
                <strong>email verification</strong> and can use{" "}
                <strong>password reset</strong> when needed. This ensures
                secure, personal access.
              </p>
            </div>

            <div className={styles.step}>
              <h3>2️⃣ Q&A Features + Search 🔍</h3>
              <p>
                Ask and answer academic questions. Use the{" "}
                <strong>search</strong> function to check if your question has
                already been answered — saving time and avoiding duplicates.
              </p>
            </div>

            <div className={styles.step}>
              <h3>3️⃣ Review & Mark as Solution ✅</h3>
              <p>
                Users can <strong>upvote</strong> helpful answers and{" "}
                <strong>mark</strong> the best one as the accepted solution.
                This helps future students find reliable answers easily.
              </p>
            </div>

            <div className={styles.step}>
              <h3>4️⃣ Live Chat + Files & Voice 🎤📎</h3>
              <p>
                Engage in real-time chat with peers. Send and receive{" "}
                <strong>images, PDFs, other files</strong>, and now even{" "}
                <strong>voice messages</strong> — enhancing collaboration.
              </p>
            </div>

            <div className={styles.step}>
              <h3>5️⃣ Edit Profile 🧑‍💻</h3>
              <p>
                Keep your account up-to-date by editing your{" "}
                <strong>name, email, and password</strong>. A personalized
                profile improves your learning journey.
              </p>
            </div>

            <div className={styles.step}>
              <h3>6️⃣ Get Help from Chatbot 🤖</h3>
              <p>
                Our built-in <strong>Gemini chatbot</strong> assists with quick
                answers, definitions, or suggestions while you wait for help —
                like your 24/7 study buddy!
              </p>
            </div>
          </div>

          <div className="parentContainer">
            {userid ? (
              <></>
            ) : (
              <div className={styles.buttonContainer}>
                <Link to={"/auth"}>
                  <button className={styles.signupButton}>
                    Join us Sign Up Now
                  </button>
                </Link>
                <span>
                  Already have an account?
                  <Link to="/auth" className={styles.login}>
                    Login
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HowItWorks;
