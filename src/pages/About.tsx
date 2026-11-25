import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHero } from '../components/Layout';
import { useTitle } from '../lib/useTitle';
import { posterImg } from '../lib/data';
import { MEDIA_PARTNERS_2024 } from '../data/site';

/* Draft copy, written only from facts MSB Events supplied. Marked for MSB to review (see PLACEHOLDERS.md). */
export default function About() {
  useTitle('About');
  const img = posterImg('/photos/festival-aerial-night');
  return (
    <>
      <PageHero title="About MSB Events" />
      <div className="wrap py-20 md:py-28 grid gap-14 lg:grid-cols-[1.3fr_1fr] items-start">
        <div className="space-y-12 text-lg min-w-0">
          <section>
            <h2 className="t-section">From <span className="text-leaf">Matjhabeng</span></h2>
            <p className="mt-4 text-ink-soft prose-w">
              MSB Events is an events company from Matjhabeng, the municipality around Welkom in the Free State. We are the team
              behind Matjhabeng Spring Blow, Soulful Blow, Spin Blow and Summer Blow, the MSB Fun Walk & Family Day and MSB Comedy Night.
            </p>
          </section>
          <section>
            <h2 className="t-section">More than <span className="text-leaf num">5 years</span></h2>
            <p className="mt-4 text-ink-soft prose-w">
              2026 marks more than 5 years of MSB Events. In September 2024 the MSB Weekend brought Spring Blow, Soulful Blow, Spin Blow
              and MSB Comedy Night together over three days, with {MEDIA_PARTNERS_2024.join(', ').replace(/, ([^,]*)$/, ' and $1')} as media partners.
            </p>
          </section>
          <section>
            <h2 className="t-section">A Blow <span className="text-leaf">weekend</span></h2>
            <p className="mt-4 text-ink-soft prose-w">
              A Blow weekend runs back to back. In 2026, Spring Blow and Soulful Blow took over Robs Cricket Club in Riebeeckstad on
              26 and 27 September, with gates open from 12:00. Spring Blow brings a long line-up of headline artists, local DJs and MCs;
              Soulful Blow brings soul, a spiritual group and the Golden Voice finalists. In the days before, activations around Welkom
              give away free tickets. In December, Summer Blow and a second Soulful Blow close the year.
            </p>
          </section>
          <section>
            <h2 className="t-section">For the <span className="text-leaf">family</span> too</h2>
            <p className="mt-4 text-ink-soft prose-w">
              The MSB Fun Walk & Family Day starts at the Clock Tower and finishes at Zuka Baloi Stadium, with registration for adults
              and children aged 5 to 13.
            </p>
          </section>
          <Link to="/events" className="btn btn-primary btn-lg">See upcoming events <ArrowRight className="btn-arrow text-lime" aria-hidden /></Link>
        </div>
        <figure className="frame aspect-square lg:sticky lg:top-24">
          {img && <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 1024px) 40vw, 100vw" width={img.width} height={img.height} alt="Aerial view of a packed MSB festival field at night" className="w-full h-full object-cover" loading="lazy" decoding="async" />}
        </figure>
      </div>
    </>
  );
}
