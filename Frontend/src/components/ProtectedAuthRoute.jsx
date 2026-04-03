import { useEffect, useState } from 'react';
import AccessRequired from '../pages/AccessRequired';
import { fetchChatsRequest } from '../services/chatApi';

const ProtectedAuthRoute = ({ children }) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        await fetchChatsRequest();
        if (!cancelled) {
          setStatus('authorized');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error?.response?.status === 401) {
          setStatus('unauthorized');
          return;
        }

        setStatus('error');
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <main className='page page-access-required'>
        <section className='access-required-shell'>
          <p className='access-chip'>ACCESS CHECK</p>
          <h1>Checking your session...</h1>
          <p className='access-copy'>Please wait while we confirm your login status.</p>
        </section>
      </main>
    );
  }

  if (status === 'authorized') {
    return children;
  }

  if (status === 'unauthorized') {
    return <AccessRequired />;
  }

  return (
    <main className='page page-access-required'>
      <section className='access-required-shell'>
        <p className='access-chip'>SERVICE ISSUE</p>
        <h1>Unable to verify session</h1>
        <p className='access-copy'>We could not reach the server right now. Please try again in a moment.</p>
      </section>
    </main>
  );
};

export default ProtectedAuthRoute;
