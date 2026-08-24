import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 50,
  duration: "10s",
};

export default function () {
  const payload = JSON.stringify({
    email: "hr4@gmail.com",
    password: "12345678",
    role: "hr",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(
    "http://localhost:5000/api/auth/login",
    payload,
    params
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
    "login successful": (r) => {
      try {
        return r.json().success === true;
      } catch {
        return false;
      }
    },
    "token returned": (r) => {
      try {
        return !!r.json().token;
      } catch {
        return false;
      }
    },
  });

  if (response.status !== 200) {
    console.log(`LOGIN FAILED: ${response.status} - ${response.body}`);
  }
}