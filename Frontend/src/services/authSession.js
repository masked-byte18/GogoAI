const AUTH_SESSION_HINT_KEY = 'gogoai-auth-session';

export const hasAuthSessionHint = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
};

export const setAuthSessionHint = (isAuthenticated) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (isAuthenticated) {
    window.localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
};
