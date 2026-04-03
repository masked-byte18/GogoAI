import { Link, useLocation } from 'react-router-dom';
import './AccessRequired.css';

const ShieldLockIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M12 3l7 3v5c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V6l7-3z'></path>
    <rect x='9' y='11' width='6' height='5' rx='1'></rect>
    <path d='M10.5 11v-1a1.5 1.5 0 0 1 3 0v1'></path>
  </svg>
);

const AccessRequired = () => {
  const location = useLocation();

  return (
    <main className='page page-access-required'>
      <section className='access-required-shell'>
        <div className='access-hero'>
          <div className='access-icon-wrap'>
            <ShieldLockIcon />
          </div>
          <p className='access-chip'>MEMBERS ONLY</p>
          <h1>Login or Sign up first</h1>
          <p className='access-copy'>
            Gems are available only for authenticated users. Please login or create an account to continue.
          </p>
        </div>

        <div className='access-actions'>
          <Link to='/login' state={{ from: location.pathname }} className='btn btn-primary'>
            Login
          </Link>
          <Link to='/register' state={{ from: location.pathname }} className='btn btn-secondary'>
            Sign up
          </Link>
          <Link to='/' className='access-home-link'>Back to Home</Link>
        </div>
      </section>
    </main>
  );
};

export default AccessRequired;
