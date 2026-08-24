import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "5s",
};

export default function () {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibmFtZSI6ImhyNCIsImVtYWlsIjoiaHI0QGdtYWlsLmNvbSIsInJvbGUiOiJociIsImlhdCI6MTc4NzMxNDcxNywiZXhwIjoxNzg3NDAxMTE3fQ.nIPslQKDjd_lUgJppcKNQZqllY3xAJZcsAG0lJlk0ddw";


  const payload = JSON.stringify({
    title: `AI Engineer ${__VU}-${__ITER}`,
    department: "Technology",
    company: "ResumeIQ AI",
    location: "Hyderabad",
    description:
      "AI Engineer responsible for developing machine learning applications.",
    keySkills: ["Python", "Machine Learning", "React", "Node.js"],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const response = http.post(
    "http://localhost:5000/api/admin/job-postings",
    payload,
    params
  );

  check(response, {
    "status is 201": (r) => r.status === 201,
    "job created successfully": (r) => {
      try {
        return r.json().success === true;
      } catch {
        return false;
      }
    },
    "job returned": (r) => {
      try {
        return r.json().job != null;
      } catch {
        return false;
      }
    },
  });

  if (response.status !== 201) {
    console.log(`FAILED: ${response.status} - ${response.body}`);
  }

  sleep(1);
}