import { useCallback, useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import './Auth.css';
import { requestLoginOtpRequest, verifyLoginOtpRequest } from '../services/authApi';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { setAuthSessionHint } from '../services/authSession';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const EyeIcon = ({ isOpen }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'></path>
    <circle cx='12' cy='12' r='3'></circle>
    {!isOpen && <line x1='4' y1='20' x2='20' y2='4'></line>}
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [attemptToken, setAttemptToken] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const {name,value} = e.target;
    setFormData((prev) => {
      if (prev[name] === value) {
        return prev;
      }

      return { ...prev, [name]: value };
    });

    setFieldErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }

      return { ...prev, [name]: false };
    });

    if (authError) {
      setAuthError('');
    }

    if (authInfo) {
      setAuthInfo('');
    }

    if (isOtpStep) {
      setAttemptToken('');
      setIsOtpStep(false);
      setOtp('');
    }
  };

  const handleOtpChange = (e) => {
    const nextOtp = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (nextOtp !== otp) {
      setOtp(nextOtp);
    }

    if (authError) {
      setAuthError('');
    }

    if (authInfo) {
      setAuthInfo('');
    }
  };

  const handleGoogleSuccess = useCallback(() => {
    setAuthSessionHint(true);
    navigate('/');
  }, [navigate]);

  const handleGoogleError = useCallback((message) => {
    setAuthError(message);
  }, []);

  const requestOtp = async (trimmedEmail) => {
    const response = await requestLoginOtpRequest({
      email: trimmedEmail,
      password: formData.password
    });

    setAttemptToken(response.attemptToken || '');
    setIsOtpStep(true);
    setOtp('');
    if (response?.devOtp) {
      setAuthInfo(`Dev mode OTP: ${response.devOtp}`);
      return;
    }

    setAuthInfo('OTP sent to your email. Enter it below to continue.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isOtpStep) {
      if (!otp || otp.length !== 6) {
        setFieldErrors((prev) => ({ ...prev, otp: true }));
        setAuthError('Enter the 6-digit OTP from your email.');
        return;
      }

      setIsSubmitting(true);
      setFieldErrors((prev) => ({ ...prev, otp: false }));
      setAuthError('');

      verifyLoginOtpRequest({
        attemptToken,
        otp
      }).then(() => {
        setAuthSessionHint(true);
        navigate('/');
      }).catch((err) => {
        const message = String(err?.response?.data?.message || 'Unable to verify OTP.');
        setAuthError(message);
      }).finally(() => {
        setIsSubmitting(false);
      });

      return;
    }

    const trimmedEmail = formData.email.trim();
    const hasInvalidEmailFormat = Boolean(trimmedEmail) && !isValidEmail(trimmedEmail);

    const nextFieldErrors = {
      email: !trimmedEmail || hasInvalidEmailFormat,
      password: !formData.password.trim()
    };

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      if (!trimmedEmail || !formData.password.trim()) {
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

    requestOtp(trimmedEmail).catch((err) => {
        const isInvalidCredential = err?.response?.status === 400;
        const message = String(err?.response?.data?.message || '');
        const isOtpSendFailure = /send otp/i.test(message);
        setAuthError(
          isInvalidCredential
            ? 'Wrong email or password.'
            : isOtpSendFailure
            ? message
            : 'Unable to login right now. Please try again.'
        );
    }).finally(()=>{
        setIsSubmitting(false);
    })
  };

  return (
    <main className='page page-auth'>
      <section className='auth-shell'>
        <div className='auth-brand'>
          <p className='auth-chip'>SYSTEM ACCESS</p>
          <h1>Login</h1>
          <p className='auth-subtitle'>
            Login uses two steps: password check, then OTP sent to your email.
          </p>
        </div>

        <form className='auth-form' aria-label='login form' onSubmit={handleSubmit}>
          <label htmlFor='login-email'>Email</label>
          <input
            id='login-email'
            name='email'
            type='email'
            placeholder='you@example.com'
            autoComplete='email'
            value={formData.email}
            onChange={handleChange}
            className={fieldErrors.email ? 'input-error' : ''}
            disabled={isOtpStep}
            required
          />

          <label htmlFor='login-password'>Password</label>
          <div className='password-input-wrap'>
            <input
              id='login-password'
              name='password'
              type={showPassword ? 'text' : 'password'}
              placeholder='Enter your password'
              autoComplete='current-password'
              value={formData.password}
              onChange={handleChange}
              className={fieldErrors.password ? 'input-error' : ''}
              disabled={isOtpStep}
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

          {isOtpStep ? (
            <>
              <label htmlFor='login-otp'>OTP</label>
              <input
                id='login-otp'
                name='otp'
                type='text'
                placeholder='Enter 6-digit OTP'
                autoComplete='one-time-code'
                value={otp}
                onChange={handleOtpChange}
                className={fieldErrors.otp ? 'input-error' : ''}
                required
              />
            </>
          ) : null}

          {authInfo ? <p className='auth-info'>{authInfo}</p> : null}
          {authError ? <p className='auth-error'>{authError}</p> : null}

          <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isOtpStep ? 'Verify OTP & Login' : 'Send OTP'}
          </button>

          {isOtpStep ? (
            <button
              type='button'
              className='btn btn-secondary login-resend-btn'
              disabled={isSubmitting}
              onClick={() => {
                const trimmedEmail = formData.email.trim();
                setIsSubmitting(true);
                setAuthError('');
                requestOtp(trimmedEmail).catch((err) => {
                  const message = String(err?.response?.data?.message || 'Unable to resend OTP.');
                  setAuthError(message);
                }).finally(() => {
                  setIsSubmitting(false);
                });
              }}
            >
              Resend OTP
            </button>
          ) : null}

          {!isOtpStep ? (
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          ) : null}
        </form>

        <div className='auth-links'>
          <span>No account yet?</span>
          <Link to='/register'>Create one</Link>
          <Link to='/'>Home</Link>
        </div>
      </section>
    </main>
  );
};

export default Login;
