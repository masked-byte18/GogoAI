import axios from 'axios';

const AUTH_API_BASE = 'http://localhost:3000/api/auth';

export const checkRegistrationEmailRequest = async (email) => {
  const response = await axios.post(
    `${AUTH_API_BASE}/register/check-email`,
    { email },
    {
      withCredentials: true
    }
  );

  return response.data;
};

export const registerRequest = async (payload) => {
  const response = await axios.post(`${AUTH_API_BASE}/register`, payload, {
    withCredentials: true
  });

  return response.data;
};

export const requestLoginOtpRequest = async ({ email, password }) => {
  const response = await axios.post(
    `${AUTH_API_BASE}/login/request-otp`,
    { email, password },
    {
      withCredentials: true
    }
  );

  return response.data;
};

export const verifyLoginOtpRequest = async ({ attemptToken, otp }) => {
  const response = await axios.post(
    `${AUTH_API_BASE}/login/verify-otp`,
    { attemptToken, otp },
    {
      withCredentials: true
    }
  );

  return response.data;
};

export const googleSigninRequest = async (idToken) => {
  const response = await axios.post(
    `${AUTH_API_BASE}/google-signin`,
    { idToken },
    {
      withCredentials: true
    }
  );

  return response.data;
};

export const logoutRequest = async () => {
  const response = await axios.post(
    `${AUTH_API_BASE}/logout`,
    {},
    {
      withCredentials: true
    }
  );

  return response.data || null;
};
