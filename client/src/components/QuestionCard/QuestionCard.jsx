import styles from "./questionCard.module.css";
import { MdAccountCircle } from "react-icons/md";
import { FaChevronRight } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import moment from 'moment';
import { LuCalendarClock } from "react-icons/lu";
import { useContext } from "react";
import { UserState } from "../../App.jsx";
import Swal from "sweetalert2";
import { axiosInstance } from "../../utility/axios";

function QuestionCard({ id, userName, questionTitle, description, question_date, ownerId }) {
  const formattedDate = moment(question_date).format('ddd, MMM DD, YYYY h:mm A').toUpperCase();
  const { user } = useContext(UserState);
  const navigate = useNavigate();
  const isOwner = user && user.userid === ownerId;

  // Debug logs
  console.log("[QuestionCard Debug] user:", user);
  console.log("[QuestionCard Debug] ownerId:", ownerId);
  console.log("[QuestionCard Debug] isOwner:", isOwner);

  // Delete handler
  const handleDelete = async (e) => {
    e.preventDefault(); // Prevent link navigation
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        title: "Authentication Required",
        text: "You must be logged in to delete a question.",
        icon: "warning",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      return;
    }
    // Step 1: Ask backend for confirmation message
    try {
      const res = await axiosInstance.delete(`/question/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.confirm) {
        // Step 2: Show confirmation dialog
        const result = await Swal.fire({
          title: "Delete Question?",
          text: res.data.message,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, delete it!",
          cancelButtonText: "No, cancel",
        });
        if (result.isConfirmed) {
          // Step 3: Actually delete
          const delRes = await axiosInstance.post(`/question/${id}/confirm-delete`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (delRes.status === 200) {
            Swal.fire({
              icon: "success",
              title: "Deleted!",
              text: "Your question has been deleted.",
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
            window.location.reload(); // Reload to update list
          } else {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Failed to delete question. Please try again.",
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
          }
        }
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete question. Please try again.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  // Edit handler (simple version: redirect to AskQuestion with state, or you can use a modal)
  const handleEdit = (e) => {
    e.preventDefault();
    navigate(`/edit-question/${id}`, { state: { id, questionTitle, description } });
  };

  return (
    <div className={styles.question_holder}>
      <Link
        to={`/question/${id}`}
        style={{
          textDecoration: "none",
          color: "black",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className={styles.requester_question_holder}>
          <div className={styles.requester_holder}>
            <MdAccountCircle size={50} />
            <div>@{userName}</div>
          </div>
          <div className={styles.title_description_holder}>
            <p className={styles.question_title}>{String(questionTitle).length > 100 ? String(questionTitle).substring(0, 100).concat(". . .") : questionTitle}</p>
            <p className={styles.question_description}>{String(description).length > 300 ? String(description).substring(0, 300).concat(". . .") : description}</p>
            <p className={styles.question_date}><LuCalendarClock style={{ marginRight: "5px" }} />{formattedDate}</p>
          </div>
        </div>
        <div className={styles.question_arrow_holder}>
          <FaChevronRight size={23} />
        </div>
      </Link>
      {isOwner && (
        <div className={styles.actionButtons}>
          <button onClick={handleEdit} style={{ background: "#0c4df163", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}>Edit</button>
          <button onClick={handleDelete} style={{ background: "#ff4d4f", color: "white", border: "none", borderRadius: 5, padding: "6px 12px", cursor: "pointer" }}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
