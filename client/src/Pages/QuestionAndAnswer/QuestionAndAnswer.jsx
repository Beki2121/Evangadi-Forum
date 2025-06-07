import { useContext, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { axiosInstance } from "../../utility/axios.js";
import Layout from "../../Layout/Layout.jsx";
import styles from "./answer.module.css";
import { MdAccountCircle } from "react-icons/md";
import { FaClipboardQuestion, FaThumbsUp, FaThumbsDown } from "react-icons/fa6";
import { MdOutlineQuestionAnswer } from "react-icons/md";
import moment from "moment";
import { UserState } from "../../App.jsx";
import { LuCalendarClock } from "react-icons/lu";
import Swal from "sweetalert2";

function QuestionAndAnswer() {
  const [questionDetails, setQuestionDetails] = useState({});
  const { user } = useContext(UserState);
  const userId = user?.userid; // Ensure userId is correctly derived from context
  const { questionId } = useParams();
  const [loading, setLoading] = useState(true); // Initial state for loading
  const [expandedAnswer, setExpandedAnswer] = useState(null); // State to track expanded answers
  const answerInput = useRef();

  // Function to fetch question details and answers
  const fetchQuestionAndAnswers = async () => {
    try {
      // Assuming this endpoint returns question details AND its answers,
      // and each answer object now includes a 'rating_count' property.
      const res = await axiosInstance.get(`/question/${questionId}`);
      setQuestionDetails(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching question and answers:", error);
      setLoading(false); // Stop loading even if there's an error
      Swal.fire({
        title: "Error",
        text: "Failed to load question and answers. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Fetch the question details on component mount or questionId change
  useEffect(() => {
    fetchQuestionAndAnswers();
  }, [questionId]); // Dependency array includes questionId

  // Post a new answer to the question
  async function handlePostAnswer(e) {
    e.preventDefault();

    if (!answerInput.current.value.trim()) {
      Swal.fire({
        title: "Input Required",
        text: "Please enter an answer before submitting.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const token = localStorage.getItem("EV-Forum-token-G3-APR2024");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to post an answer.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const response = await axiosInstance.post(
        "/answer", // This route expects /api/v1/answer
        {
          userid: userId, // Ensure userId is available from context/auth
          answer: answerInput.current.value,
          questionid: questionId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Send the authentication token
          },
        }
      );

      if (response.status === 201) {
        Swal.fire({
          title: "Success!",
          text: "Answer submitted successfully!",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => {
          answerInput.current.value = ""; // Clear the input field
          fetchQuestionAndAnswers(); // Re-fetch data to show the new answer and updated ratings
        });
      } else {
        Swal.fire({
          title: "Error",
          text: response.data.message || "Failed to post answer.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error posting answer:", error);
      Swal.fire({
        title: "Error",
        text:
          error.response?.data?.msg ||
          error.response?.data?.message ||
          "Failed to post answer. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }

  // RE-ENABLED FUNCTION: handleRating for answers
  async function handleRating(answerId, ratingType) {
    const token = localStorage.getItem("EV-Forum-token-G3-APR2024");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to rate an answer.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      // Send the rating request to the backend
      const response = await axiosInstance.post(
        "/answer/rate", // This route expects /api/v1/answer/rate
        {
          answerId: answerId,
          ratingType: ratingType, // 'upvote' or 'downvote'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Include the auth token
          },
        }
      );

      if (response.status === 200) {
        // Re-fetch question details to immediately show the updated rating count
        fetchQuestionAndAnswers();
        // Optional: show a transient success message if desired, but re-fetching is usually sufficient
      } else {
        Swal.fire({
          title: "Rating Error",
          text: response.data.msg || "Failed to submit rating.",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error rating answer:", error);
      Swal.fire({
        title: "Rating Error",
        text:
          error.response?.data?.msg ||
          "Failed to submit rating. Please try again later.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }

  // Function to truncate text after 50 words and add a "See More" link
  const truncateText = (text, limit = 50) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length > limit) {
      return (
        <>
          {words.slice(0, limit).join(" ")}{" "}
          <span
            style={{
              color: "var(--blue-shade)",
              cursor: "pointer",
            }}
          >
            ... See More
          </span>
        </>
      );
    }
    return text;
  };

  // Toggle expand/collapse for the answer (modified to use the actual answerId)
  const toggleExpandAnswer = (answerId) => {
    if (expandedAnswer === answerId) {
      setExpandedAnswer(null); // Collapse the answer
    } else {
      setExpandedAnswer(answerId); // Expand the clicked answer
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <p>Loading question and answers...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.mainContainer}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div>
              <FaClipboardQuestion size={35} style={{ marginRight: "10px" }} />
            </div>
            <div>
              <h1 className={styles.questionTitle}>{questionDetails?.title}</h1>
              <p className={styles.questionDescription}>
                {questionDetails?.description}
              </p>
              <p className={styles.question_date}>
                Asked by:
                <span style={{ fontWeight: "600" }}>
                  {" "}
                  @{questionDetails?.qtn_username}{" "}
                </span>{" "}
                <br />
                <LuCalendarClock style={{ marginRight: "5px" }} size={19} />
                {moment(questionDetails.qtn_createdAt)
                  .format("ddd, MMM DD, h:mm A")
                  .toUpperCase()}
              </p>
            </div>
          </div>

          <h2
            style={{ padding: "5px 0", textAlign: "left", fontWeight: "600" }}
          >
            <MdOutlineQuestionAnswer
              size={35}
              style={{ marginRight: "10px" }}
            />
            Answers From the Community:
          </h2>

          {/* Display answers */}
          {questionDetails?.answers?.length > 0 ? (
            questionDetails?.answers?.map((answer) => (
              <div key={answer?.answerid} className={styles.answer_holder}>
                <div className={styles.account_holder}>
                  <MdAccountCircle size={50} />
                  <div className={styles.profileName}>@{answer?.username}</div>
                </div>
                <div className={styles.answerContentArea}>
                  {" "}
                  <div
                    className={styles.answerTextContainer}
                    onClick={() => toggleExpandAnswer(answer?.answerid)}
                  >
                    <p className={styles.answerText}>
                      {expandedAnswer === answer?.answerid
                        ? answer?.answer
                        : truncateText(answer?.answer)}
                    </p>
                    <p className={styles.answer_date}>
                      <LuCalendarClock
                        style={{ marginRight: "5px" }}
                        size={19}
                      />
                      {moment(answer?.createdAt)
                        .format("ddd, MMM DD, h:mm A")
                        .toUpperCase()}
                    </p>
                  </div>
                  {/* RATING SECTION */}
                  <div className={styles.ratingSection}>
                    <button
                      className={styles.ratingButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(answer?.answerid, "upvote");
                      }}
                      title="Upvote this answer"
                    >
                      <FaThumbsUp size={20} />
                    </button>
                    <span className={styles.ratingCount}>
                      {answer?.rating_count || 0}{" "}
                      {/* Displays the rating_count from backend */}
                    </span>
                    <button
                      className={styles.ratingButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRating(answer?.answerid, "downvote");
                      }}
                      title="Downvote this answer"
                    >
                      <FaThumbsDown size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>
              <span style={{ color: "red", fontWeight: "bold" }}>
                No answers yet!
              </span>{" "}
              <br /> Be the first to contribute your answer and help the
              community.
            </p>
          )}

          {/* Form to submit a new answer */}
          <section className={styles.answerFormSection}>
            <h3 className={styles.answerFormTitle}>Answer The Top Question</h3>
            <Link to="/" className={styles.questionPageLink}>
              Go to Question page
            </Link>
            <form onSubmit={handlePostAnswer}>
              <textarea
                placeholder="Your Answer..."
                className={styles.answerInput}
                required
                ref={answerInput}
              />
              <button className={styles.postAnswerButton} type="submit">
                Post Your Answer
              </button>
            </form>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default QuestionAndAnswer;
