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
// Import a new icon for the solution marker
import { FaCheckCircle } from "react-icons/fa";

function QuestionAndAnswer() {
  const [questionDetails, setQuestionDetails] = useState({});
  const { user } = useContext(UserState);
  const userid = user?.userid; // Ensure userid is correctly derived from context
  const { questionId } = useParams();
  // const [loading, setLoading] = useState(true); // Initial state for loading - COMMENTED OUT
  const [expandedAnswer, setExpandedAnswer] = useState(null); // State to track expanded answers
  const answerInput = useRef();
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAnswerText, setEditAnswerText] = useState("");

  // Function to fetch question details and answers
  const fetchQuestionAndAnswers = async () => {
    try {
      // Assuming this endpoint returns question details AND its answers,
      // and each answer object now includes a 'rating_count' property.
      // Also, assuming questionDetails will now have a 'solution_answer_id' if one is marked.
      const res = await axiosInstance.get(`/question/${questionId}`);
      setQuestionDetails(res.data);
      // setLoading(false); // COMMENTED OUT
    } catch (error) {
      console.error("Error fetching question and answers:", error);
      // setLoading(false); // Stop loading even if there's an error - COMMENTED OUT
      Swal.fire({
        title: "Error",
        text: "Failed to load question and answers. Please try again.",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
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
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to post an answer.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const response = await axiosInstance.post(
        "/answer", // This route expects /api/v1/answer
        {
          userid: userid, // Ensure userid is available from context/auth
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
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        answerInput.current.value = ""; // Clear the input field
        fetchQuestionAndAnswers(); // Re-fetch data to show the new answer and updated ratings
      } else {
        Swal.fire({
          title: "Error",
          text: response.data.message || "Failed to post answer.",
          icon: "error",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
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
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }

  // RE-ENABLED FUNCTION: handleRating for answers
  async function handleRating(answerId, ratingType) {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to rate an answer.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
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
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
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
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }

  // NEW FUNCTION: handleMarkAsSolution
  async function handleMarkAsSolution(answerId) {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to mark an answer as a solution.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }

    // Confirm with the user before marking as solution
    const result = await Swal.fire({
      title: "Mark as Solution?",
      text: "Are you sure you want to mark this answer as the solution? This cannot be undone.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, mark it!",
      cancelButtonText: "No, cancel",
    });

    if (!result.isConfirmed) {
      return; // User cancelled the operation
    }

    try {
      // Send the request to mark the answer as a solution
      // The backend should verify that the user making the request is the question owner.
      const response = await axiosInstance.patch(
        `/question/${questionId}/mark-solution`, // Adjust this endpoint as per your backend
        { solutionAnswerId: answerId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "Answer marked as solution successfully!",
          icon: "success",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        fetchQuestionAndAnswers(); // Re-fetch to update UI with solution marker
      } else {
        Swal.fire({
          title: "Error",
          text: response.data.msg || "Failed to mark answer as solution.",
          icon: "error",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error marking answer as solution:", error);
      Swal.fire({
        title: "Error",
        text:
          error.response?.data?.msg ||
          "Failed to mark answer as solution. Please try again later.",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
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

  if (/* loading */ false) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <p>Loading question and answers...</p>
        </div>
      </Layout>
    );
  }

  // Check if the current user is the owner of the question
  const isQuestionOwner = userid === questionDetails?.qtn_userid;
  const solutionAnswerId = questionDetails?.solution_answer_id; // Assuming backend returns this
  // In QuestionAndAnswer.jsx, before the 'return' statement
  console.log("Logged in User ID:", userid);
  console.log("Question Owner ID from backend:", questionDetails?.qtn_userid);
  console.log(
    "Solution Answer ID from backend:",
    questionDetails?.solution_answer_id
  );
  console.log(
    "Is current user the question owner?",
    userid === questionDetails?.qtn_userid
  );
  console.log(
    "Is a solution already marked?",
    !!questionDetails?.solution_answer_id
  ); // !! converts to boolean
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
            questionDetails?.answers?.map((answer) => {
              const isAnswerOwner = userid === answer.userid;
              return (
                <div key={answer?.answerid} className={styles.answer_holder}>
                  <div className={styles.account_holder}>
                    <MdAccountCircle size={50} />
                    <div className={styles.profileName}>@{answer?.username}</div>
                  </div>
                  <div className={styles.answerContentArea}>
                    <div className={styles.answerTextContainer} onClick={() => toggleExpandAnswer(answer?.answerid)}>
                      {editingAnswerId === answer.answerid ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const token = localStorage.getItem("token");
                            if (!token) {
                              Swal.fire({
                                title: "Authentication Required",
                                text: "You must be logged in to edit an answer.",
                                icon: "warning",
                                confirmButtonText: "OK",
                              });
                              return;
                            }
                            try {
                              const res = await axiosInstance.put(
                                `/answer/${answer.answerid}`,
                                { answer: editAnswerText },
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              if (res.status === 200) {
                                Swal.fire({
                                  title: "Success!",
                                  text: "Answer updated successfully!",
                                  icon: "success",
                                  confirmButtonText: "OK",
                                });
                                setEditingAnswerId(null);
                                fetchQuestionAndAnswers();
                              } else {
                                Swal.fire({
                                  title: "Error",
                                  text: res.data.message || "Failed to update answer.",
                                  icon: "error",
                                  confirmButtonText: "OK",
                                });
                              }
                            } catch (error) {
                              Swal.fire({
                                title: "Error",
                                text: error.response?.data?.message || "Failed to update answer.",
                                icon: "error",
                                confirmButtonText: "OK",
                              });
                            }
                          }}
                        >
                          <textarea
                            value={editAnswerText}
                            onChange={(e) => setEditAnswerText(e.target.value)}
                            rows={3}
                            style={{ width: "100%", borderRadius: 5, padding: 8, marginBottom: 8 }}
                            required
                          />
                          <button type="submit" style={{ marginRight: 8, background: "#0c4df163", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}>Save</button>
                          <button type="button" onClick={() => setEditingAnswerId(null)} style={{ background: "#ccc", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}>Cancel</button>
                        </form>
                      ) : (
                        <p className={styles.answerText}>
                          {expandedAnswer === answer?.answerid ? answer?.answer : truncateText(answer?.answer)}
                        </p>
                      )}
                      <p className={styles.answer_date}>
                        <LuCalendarClock style={{ marginRight: "5px" }} size={19} />
                        {moment(answer?.createdAt).format("ddd, MMM DD, h:mm A").toUpperCase()}
                      </p>
                    </div>
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
                      <span className={styles.upvoteCount}>{answer?.upvote_count || 0}</span>
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
                      <span className={styles.downvoteCount}>{answer?.downvote_count || 0}</span>
                      {isQuestionOwner && !solutionAnswerId && (
                        <button
                          className={styles.markSolutionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsSolution(answer?.answerid);
                          }}
                          title="Mark this as the solution"
                        >
                          Mark as Solution
                        </button>
                      )}
                      {solutionAnswerId === answer?.answerid && (
                        <div className={styles.solutionIndicator} title="Marked as Solution">
                          <FaCheckCircle size={50} color="green" />
                          <span style={{ marginLeft: "5px", color: "green", fontWeight: "bold" }}>Solution</span>
                        </div>
                      )}
                      {isAnswerOwner && editingAnswerId !== answer.answerid && (
                        <>
                          <button
                            style={{ marginLeft: 10, background: "#0c4df163", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAnswerId(answer.answerid);
                              setEditAnswerText(answer.answer);
                            }}
                          >Edit</button>
                          <button
                            style={{ marginLeft: 5, background: "#ff4d4f", color: "white", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const token = localStorage.getItem("token");
                              if (!token) {
                                Swal.fire({
                                  title: "Authentication Required",
                                  text: "You must be logged in to delete an answer.",
                                  icon: "warning",
                                  confirmButtonText: "OK",
                                });
                                return;
                              }
                              // Step 1: Ask backend for confirmation message
                              try {
                                const res = await axiosInstance.delete(`/answer/${answer.answerid}`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                });
                                if (res.data.confirm) {
                                  const result = await Swal.fire({
                                    title: "Delete Answer?",
                                    text: res.data.message,
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonText: "Yes, delete it!",
                                    cancelButtonText: "No, cancel",
                                  });
                                  if (result.isConfirmed) {
                                    const delRes = await axiosInstance.post(`/answer/${answer.answerid}/confirm-delete`, {}, {
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    if (delRes.status === 200) {
                                      Swal.fire({
                                        title: "Deleted!",
                                        text: "Your answer has been deleted.",
                                        icon: "success",
                                        confirmButtonText: "OK",
                                      });
                                      fetchQuestionAndAnswers();
                                    } else {
                                      Swal.fire({
                                        title: "Error",
                                        text: delRes.data.message || "Failed to delete answer.",
                                        icon: "error",
                                        confirmButtonText: "OK",
                                      });
                                    }
                                  }
                                }
                              } catch (error) {
                                Swal.fire({
                                  title: "Error",
                                  text: error.response?.data?.message || "Failed to delete answer.",
                                  icon: "error",
                                  confirmButtonText: "OK",
                                });
                              }
                            }}
                          >Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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
