import { Link, useLocation } from 'react-router-dom';
import './NotFound.css';

const CompassBrokenIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <circle cx='12' cy='12' r='9'></circle>
    <path d='M15.8 8.2l-2 5-5 2 2-5 5-2z'></path>
    <path d='M4 4l16 16'></path>
  </svg>
);

const NotFound = () => {
  const location = useLocation();

  return (
    <main className='page page-not-found'>
      <section className='not-found-shell'>
        <div className='not-found-hero'>
          <div className='not-found-icon-wrap'>
            <CompassBrokenIcon />
          </div>
          <p className='not-found-chip'>404 ERROR</p>
          <h1>Page not found</h1>
          <p className='not-found-copy'>
            We could not find <span>{location.pathname}</span>. The page may have moved, or the URL may be incorrect.
          </p>
        </div>

        <div className='not-found-actions'>
          <Link to='/' className='btn btn-primary'>Go to Home</Link>
          <Link to='/login' className='btn btn-secondary'>Login</Link>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
