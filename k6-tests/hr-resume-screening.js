import http from "k6/http";
import { check } from "k6";

// Open the PDF in the init stage
const resume = open("../test-resume.pdf", "b");

export const options = {
  vus: 1,
  duration: "10s",
};

export default function () {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibmFtZSI6ImhyNCIsImVtYWlsIjoiaHI0QGdtYWlsLmNvbSIsInJvbGUiOiJociIsImlhdCI6MTc4NzI5NTgwNSwiZXhwIjoxNzg3MzgyMjA1fQ.Y3bQ-1ntNbL0dHnxvV4dmYqcFnA9KZDbgUC6LmqY7yA";

  const formData = {
    resumes: http.file(resume, "test-resume.pdf", "application/pdf"),
  };

  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = http.post(
    "http://localhost:5000/api/hr/upload-resumes",
    formData,
    params
  );

  check(response, {
    "status is successful": (r) =>
      r.status >= 200 && r.status < 300,
  });
}