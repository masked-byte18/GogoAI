import { useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import "./Auth.css";
import { checkRegistrationEmailRequest, registerRequest } from '../services/authApi';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const EyeIcon = ({ isOpen }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'></path>
    <circle cx='12' cy='12' r='3'></circle>
    {!isOpen && <line x1='4' y1='20' x2='20' y2='4'></line>}
  </svg>
);

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: false }));
    setAuthError('');
    setAuthInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = formData.email.trim();
    const hasInvalidEmailFormat = Boolean(trimmedEmail) && !isValidEmail(trimmedEmail);

    const nextFieldErrors = {
      firstName: !formData.firstName.trim(),
      lastName: !formData.lastName.trim(),
      email: !trimmedEmail || hasInvalidEmailFormat,
      password: !formData.password.trim()
    };

    if (
      nextFieldErrors.firstName ||
      nextFieldErrors.lastName ||
      nextFieldErrors.email ||
      nextFieldErrors.password
    ) {
      setFieldErrors(nextFieldErrors);
      if (
        !formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !trimmedEmail ||
        !formData.password.trim()
      ) {
        setAuthError('Please fill all required fields.');
      } else if (hasInvalidEmailFormat) {
        setAuthError('Please enter a valid email address.');
      }
      return;
    }

    setFieldErrors({});
    setAuthError('');
    setAuthInfo('');
    setIsSubmitting(true);

    checkRegistrationEmailRequest(trimmedEmail).then(() => {
      setAuthInfo('Email looks valid. Creating your account...');
      return registerRequest({
        email: trimmedEmail,
        fullName: {
          firstName: formData.firstName,
          lastName: formData.lastName
        },
        password: formData.password
      });
    }).then(() => {
      navigate("/");
    }).catch ((err) =>{
      const message = String(err?.response?.data?.message || '');
      const isAlreadyExists = /user already exists/i.test(message);
      const isEmailInvalid = /email/i.test(message) && /valid|verify|domain|receive|disposable/i.test(message);

      setAuthError(
        isAlreadyExists
          ? 'User already exists with this mail.'
          : isEmailInvalid
          ? message
          : 'Unable to register right now. Please try again.'
      );
    }).finally(() => {
      setIsSubmitting(false);
      setAuthInfo('');
    });
  };

  return (
    <main className="page page-auth">
      <section className="auth-shell">
        <div className="auth-brand">
          <p className="auth-chip">NEW ACCOUNT</p>
          <h1>Register</h1>
          <p className="auth-subtitle">
            Register checks if your email looks real before creating account.
          </p>
        </div>

        <form
          className="auth-form"
          aria-label="register form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="register-first-name">First Name</label>
          <input
            id="register-first-name"
            name="firstName"
            type="text"
            placeholder="Enter first name"
            autoComplete="given-name"
            value={formData.firstName}
            onChange={handleChange}
            className={fieldErrors.firstName ? 'input-error' : ''}
            required
          />

          <label htmlFor="register-last-name">Last Name</label>
          <input
            id="register-last-name"
            name="lastName"
            type="text"
            placeholder="Enter last name"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            className={fieldErrors.lastName ? 'input-error' : ''}
            required
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className={fieldErrors.email ? 'input-error' : ''}
            required
          />

          <label htmlFor="register-password">Password</label>
          <div className='password-input-wrap'>
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a secure password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className={fieldErrors.password ? 'input-error' : ''}
              required
            />
            <button
              type='button'
              className='password-visibility-btn'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <EyeIcon isOpen={showPassword} />
            </button>
          </div>

          {authInfo ? <p className='auth-info'>{authInfo}</p> : null}
          {authError ? <p className='auth-error'>{authError}</p> : null}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="auth-links">
          <span>Already registered?</span>
          <Link to="/login">Login here</Link>
          <Link to="/">Home</Link>
        </div>
      </section>
    </main>
  );
};

export default Register;
