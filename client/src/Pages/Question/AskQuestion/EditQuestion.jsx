import { useContext, useRef, useEffect, useState } from "react";
import classes from "./askQuestion.module.css";
import { axiosInstance } from "../../../utility/axios";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import Layout from "../../../Layout/Layout.jsx";
import { UserState } from "../../../App.jsx";
import Swal from "sweetalert2";

function EditQuestion() {
  const navigate = useNavigate();
  const { user } = useContext(UserState);
  const { id: questionId } = useParams();
  const location = useLocation();
  // const [loading, setLoading] = useState(false); // COMMENTED OUT
  const [question, setQuestion] = useState({ title: "", description: "", tag: "General" });

  const titleDom = useRef();
  const descriptionDom = useRef();

  // Try to get initial data from location.state, otherwise fetch
  useEffect(() => {
    if (location.state && location.state.questionTitle && location.state.description) {
      setQuestion({
        title: location.state.questionTitle,
        description: location.state.description,
        tag: location.state.tag || "General",
      });
    } else {
      // Fetch question details if not passed
      // setLoading(true); // COMMENTED OUT
      axiosInstance.get(`/question/${questionId}`)
        .then(res => {
          setQuestion({
            title: res.data.title,
            description: res.data.description,
            tag: res.data.tag || "General",
          });
          // setLoading(false); // COMMENTED OUT
        })
        .catch(() => {
          // setLoading(false); // COMMENTED OUT
        });
    }
  }, [location.state, questionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const title = titleDom.current.value;
    const description = descriptionDom.current.value;
    const tag = "General";
    const token = localStorage.getItem("token");
    if (!token) {
      await Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to edit a question.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }
    // setLoading(true); // COMMENTED OUT
    try {
      const response = await axiosInstance.put(
        `/question/${questionId}`,
        { title, description, tag },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.status === 200) {
        await Swal.fire({
          title: "Success!",
          text: "Question updated successfully!",
          icon: "success",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        navigate(`/question/${questionId}`);
      } else {
        await Swal.fire({
          title: "Error",
          text: response.data.message || "Failed to update question",
          icon: "error",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      await Swal.fire({
        title: "Error",
        text: error.response?.data?.message || "Failed to update question. Please try again later.",
        icon: "error",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
    // setLoading(false); // COMMENTED OUT
  }

  return (
    <Layout>
      <div className={classes.allContainer}>
        <div className={classes.columnSection}>
          <div className={classes.question__wrapper}>
            <h3 className={classes.question__header__title}>
              <span className={classes.highlight}>Edit Your Question</span>
            </h3>
            <div className={classes.questionContainer}>
              <h2 className={classes.questionTitle}>Update Your Question</h2>
              <div className={classes.questionList}>
                <ul className={classes.questionListUl}>
                  <li className={classes.questionItem}><span className={classes.icon}>📝</span>Edit the title if needed.</li>
                  <li className={classes.questionItem}><span className={classes.icon}>📜</span>Edit the description for clarity.</li>
                  <li className={classes.questionItem}><span className={classes.icon}>🔍</span>Make sure your question is clear and complete.</li>
                  <li className={classes.questionItem}><span className={classes.icon}>✅</span>Save your changes.</li>
                </ul>
              </div>
            </div>
            <h4 className={classes.highlight} style={{ marginTop: "20px", marginBottom: "10px" }}>Edit Question</h4>
            <div className={classes.question__header__titleTwo}>
              <form onSubmit={handleSubmit} className={classes.question__form}>
                <input
                  className={classes.question__title2}
                  ref={titleDom}
                  type="text"
                  placeholder="Question title"
                  required
                  defaultValue={question.title}
                />
                <textarea
                  rows={4}
                  className={classes.question__description}
                  ref={descriptionDom}
                  type="text"
                  placeholder="Question Description..."
                  required
                  defaultValue={question.description}
                />
                <div className={classes.buttonContainer}>
                  <button className={classes.question__button} type="submit">
                    {/* {loading ? "Saving..." : "Save Changes"} */}
                    Save Changes
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
      </div>
    </Layout>
  );
}

export default EditQuestion; 