import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';
export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="mx-auto max-w-3xl px-4 py-28 text-center">
      <h1 className="display text-6xl">Page not <span className="text-leaf">found</span></h1>
      <p className="mt-4 text-ink-soft">This page does not exist or has moved.</p>
      <Link to="/events" className="btn btn-primary mt-8">See events</Link>
    </div>
  );
}
