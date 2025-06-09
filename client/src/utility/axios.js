import axios from "axios";

export const axiosInstance = axios.create({
  //local endpoint reference
  baseURL: `http://localhost:5000/api/v1`,
  // deployed endpoint reference
  // baseURL: "https://beki.estictsolutionplc.com/api/v1",
});
