import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 10,
  duration: "10s",
};

export default function () {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibmFtZSI6ImhyNCIsImVtYWlsIjoiaHI0QGdtYWlsLmNvbSIsInJvbGUiOiJociIsImlhdCI6MTc4NzMxNDcxNywiZXhwIjoxNzg3NDAxMTE3fQ.nIPslQKDjd_lUgJppcKNQZqllY3xAJZcsAG0lJlk0ddw";



  const params = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = http.get(
    "http://localhost:5000/api/admin/job-postings",
    params
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
    "jobs returned": (r) => {
      try {
        const data = r.json();
        return data.success === true;
      } catch {
        return false;
      }
    },
  });

  if (response.status !== 200) {
    console.log(`FAILED: ${response.status} - ${response.body}`);
  }
}