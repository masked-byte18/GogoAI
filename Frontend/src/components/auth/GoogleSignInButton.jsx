import { memo, useEffect, useRef, useState } from 'react';
import { googleSigninRequest } from '../../services/authApi';

const GOOGLE_SCRIPT_ID = 'google-identity-script';

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed to load'));
    document.head.appendChild(script);
  });

const GoogleSignInButton = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!clientId) {
        onErrorRef.current?.('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend .env.');
        return;
      }

      try {
        await loadGoogleScript();

        if (cancelled || !window.google?.accounts?.id || !buttonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              const idToken = String(response?.credential || '').trim();
              if (!idToken) {
                throw new Error('Unable to read Google credentials.');
              }

              const signinResponse = await googleSigninRequest(idToken);
              onSuccessRef.current?.(signinResponse);
            } catch (error) {
              const message =
                error?.response?.data?.message || error?.message || 'Google sign-in failed. Please try again.';
              onErrorRef.current?.(message);
            }
          }
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill'
        });

        setReady(true);
      } catch {
        if (!cancelled) {
          onErrorRef.current?.('Could not load Google sign-in right now.');
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className='google-auth-wrap'>
      <div className='auth-divider'>
        <span>or</span>
      </div>
      <div className='google-btn-host' ref={buttonRef}></div>
      {!ready ? <p className='auth-info'>Loading Google sign-in...</p> : null}
    </div>
  );
};

GoogleSignInButton.displayName = 'GoogleSignInButton';

export default memo(GoogleSignInButton);
