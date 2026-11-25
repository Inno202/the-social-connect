import { Link } from 'react-router-dom';
import { PlainTitle } from '../components/Layout';
import { useTitle } from '../lib/useTitle';
export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="wrap py-20 md:py-28">
      <div className="max-w-xl mx-auto text-center">
        <PlainTitle eyebrow="404 · Page not found" title="This page is not here" />
        <p className="mt-4 t-lead mx-auto">It does not exist or has moved. Try the events list or the home page.</p>
        <div className="even-row mt-8 [--even-min:10rem]">
          <Link to="/" className="btn btn-outline">Back to home</Link>
          <Link to="/events" className="btn btn-primary">See events</Link>
        </div>
      </div>
    </div>
  );
}
