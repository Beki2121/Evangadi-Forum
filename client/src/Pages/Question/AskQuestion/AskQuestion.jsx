import { useContext, useRef } from "react";
import classes from "./askQuestion.module.css";
import { axiosInstance } from "../../../utility/axios";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../../Layout/Layout.jsx";
import { UserState } from "../../../App.jsx";
import Swal from "sweetalert2";

function AskQuestion() {
  const navigate = useNavigate();
  const { user } = useContext(UserState);

  const titleDom = useRef();
  const descriptionDom = useRef();
  // This userid correctly accesses the userid from the user context
  const userid = user?.userid;
  console.log(user);

  async function handleSubmit(e) {
    e.preventDefault();
    const title = titleDom.current.value;
    const description = descriptionDom.current.value;
    // REMOVED: const userid = userid; -- This line caused the ReferenceError
    // The 'userid' from the component's scope is already accessible here.
    const tag = "General";

    try {
      const response = await axiosInstance.post("/question", {
        userid, // Using the 'userid' from the component's scope
        title,
        description,
        tag,
      });
      if (response.status === 201) {
        console.log("Question created successfully");
        await Swal.fire({
          title: "Success!",
          text: "Question created successfully!",
          icon: "success",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        navigate("/");
      } else {
        console.error("Failed to create question");
        await Swal.fire({
          title: "Error",
          text: "Failed to create question",
          icon: "error",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error(error);
      await Swal.fire({
        title: "Error",
        text: "Failed to create question. Please try again later.",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }
  return (
    <Layout>
      <div className={classes.allContainer}>
        {/* Left Section: Question Form */}
        <div className={classes.columnSection}>
          <div className={classes.question__wrapper}>
            <h3 className={classes.question__header__title}>
              <span className={classes.highlight}>
                Steps To Write A Good Question
              </span>
            </h3>

            <div className={classes.questionContainer}>
              <h2 className={classes.questionTitle}>
                How to Ask a Good Question
              </h2>
              <div className={classes.questionList}>
                <ul className={classes.questionListUl}>
                  <li className={classes.questionItem}>
                    <span className={classes.icon}>📝</span>
                    Summarize your problem in a one-line title.
                  </li>
                  <li className={classes.questionItem}>
                    <span className={classes.icon}>📜</span>
                    Describe your problem in more detail.
                  </li>
                  <li className={classes.questionItem}>
                    <span className={classes.icon}>🔍</span>
                    Explain what you have tried and what you expected to happen.
                  </li>
                  <li className={classes.questionItem}>
                    <span className={classes.icon}>✅</span>
                    Review your question and post it to the site.
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <h4
            className={classes.highlight}
            style={{ marginTop: "20px", marginBottom: "10px" }}
          >
            Post Your Question
          </h4>
          <div className={classes.question__header__titleTwo}>
            <form onSubmit={handleSubmit} className={classes.question__form}>
              <input
                className={classes.question__title2}
                ref={titleDom}
                type="text"
                placeholder="Question title"
                required
              />
              <textarea
                rows={4}
                className={classes.question__description}
                ref={descriptionDom}
                type="text"
                placeholder="Question Description..."
                required
              />
              <div className={classes.buttonContainer}>
                <button className={classes.question__button} type="submit">
                  Post Question
                </button>
                <Link to="/">
                  <button className={classes.question__btn} type="button">
                    Back to Home
                  </button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AskQuestion;
