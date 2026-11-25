import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Layout';
import { useTitle } from '../lib/useTitle';

export const LEGAL_UPDATED = '25 November 2026';

/** Visible marker for details MSB Events still has to supply before launch. */
function ToAdd({ children }: { children: ReactNode }) {
  return <mark className="bg-lime/40 text-ink px-1 rounded">[{children}]</mark>;
}

function Doc({ title, children }: { title: string; children: ReactNode }) {
  useTitle(title);
  return (
    <>
      <PageHero title={title} photo="/photos/soulfulblow-aerial-sunset" position="center" />
      <article className="legal wrap-read py-12 md:py-16 space-y-6 text-lg leading-relaxed">
        <p className="text-sm num">Last updated {LEGAL_UPDATED}</p>
        {children}
      </article>
    </>
  );
}

export function Terms() {
  return (
    <Doc title="Terms">
      <p>
        These terms apply to the MSB Events website and to tickets issued on it. MSB Events is an events company in Matjhabeng (Welkom), Free
        State, South Africa. Contact: <ToAdd>MSB Events to add its registered name, email and phone number</ToAdd>.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You need an account to get tickets here. You can sign up with your email and a password, or with your Google account. Keep your sign-in to yourself; you are responsible for tickets issued to your account.</li>
        <li>You can change your name and password, or delete your account, on the My tickets page.</li>
      </ul>

      <h2>Tickets</h2>
      <ul>
        <li><strong>No payments are taken on this site at the moment.</strong> Checkout issues tickets without charging you. If paid checkout is switched on later, these terms will be updated first.</li>
        <li>Each ticket has its own QR code and admits one person once. A ticket that has been scanned cannot be used again, so do not share or copy it.</li>
        <li>A VIP table is sold per table. It comes as one ticket per seat (4 or 8), each with a guest's name, so each guest can be scanned at the door. You can change the name on a ticket in My tickets until it has been scanned. Only enter the names of people who have agreed to it.</li>
        <li>Free tickets (for example at activations) work the same way and are still scanned at the door.</li>
        <li>Releases open in order and can sell out. A gate price shown on an event is for information only and is not sold online.</li>
        <li>One account can hold up to 20 tickets for one event.</li>
        <li>MSB Events plans to sell paid tickets on this site. That will only start once a payment provider is connected and these terms are updated.</li>
        <li>Promo codes are not available yet.</li>
      </ul>

      <h2>Tickets sold by other sellers</h2>
      <p>
        Some events are sold by another seller, such as Computicket. The "Buy on…" button takes you to that seller's site. No ticket is issued on
        this site, and the seller's own terms, fees and refund policy apply to that purchase.
      </p>

      <h2 id="refunds">Refunds</h2>
      <p>
        No money is taken on this site at present, so there is nothing to refund for tickets issued here. MSB Events will publish its refund
        policy before any paid tickets are sold on this site: <ToAdd>MSB Events to supply its refund policy</ToAdd>. Nothing in these terms
        limits your rights under the Consumer Protection Act.
      </p>

      <h2>Vendors</h2>
      <p>
        Applying on the Become a vendor page does not reserve a space. MSB Events contacts vendors directly to confirm stall space, fees and
        set-up for each event.
      </p>

      <h2>Age, alcohol and safety</h2>
      <ul>
        <li>Events marked 18+ have no entry for under 18s, and you may be asked to prove your age at the gate.</li>
        <li>Drink responsibly. Alcohol is not for sale to persons under 18.</li>
        <li>Each event's house rules (for example "No cooler boxes") are shown on its page and apply at the gate.</li>
      </ul>

      <h2>Changes to events</h2>
      <p>
        Line-ups, times and venues can change. Changes are shown on the event page. If an event is cancelled, its page and your tickets show this,
        and cancelled tickets cannot be scanned in.
      </p>

      <h2>Using the site</h2>
      <p>Do not try to forge tickets, change prices or get into staff areas. Staff access is limited by role and every staff action is logged.</p>

      <p>See also the <Link className="link" to="/privacy">Privacy policy</Link> and <Link className="link" to="/cookies">Cookie policy</Link>.</p>
    </Doc>
  );
}

export function Privacy() {
  return (
    <Doc title="Privacy">
      <p>
        This policy explains what personal information the MSB Events website collects and why, as required by the Protection of Personal
        Information Act (POPIA). The responsible party is MSB Events, <ToAdd>MSB Events to add its registered name, address and Information
        Officer's name and email</ToAdd>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> your name and email address. If you sign up with a password, it is stored only by Google Firebase Authentication in hashed form; we never see it. If you sign in with Google, Google shares your name and email address with us (we do not use your Google photo or contacts).</li>
        <li><strong>Guest names:</strong> names you enter for the seats of a VIP table are stored on those tickets and shown to door staff when the ticket is scanned.</li>
        <li><strong>Your tickets and orders:</strong> the event, ticket type, quantity, the name on the ticket (your account name), the date issued, and whether and when the ticket was scanned at the door.</li>
        <li><strong>Vendor applications:</strong> if you apply to sell at an event, your business name, contact person, phone number, email, what you sell, the events you chose, whether you need electricity and any link you give. You do not need an account to apply.</li>
        <li><strong>Staff:</strong> for staff accounts, their role and a log of actions taken in the dashboard (for example editing an event or scanning a ticket).</li>
      </ul>
      <p>We do not collect card or bank details: no payments are taken on this site. We do not use analytics, advertising or tracking tools.</p>

      <h2>Why we use it</h2>
      <ul>
        <li>To issue your tickets, show them to you, and check them at the gate.</li>
        <li>To limit how many tickets one account can hold and to stop forged or copied tickets.</li>
        <li>To give event staff attendee lists and counts for the events they run.</li>
        <li>To contact vendors about stall space, fees and set-up. Only MSB event staff can see applications.</li>
      </ul>

      <h2>Who handles it for us</h2>
      <ul>
        <li><strong>Google Firebase</strong> (Authentication and Cloud Firestore) stores accounts, tickets and orders. Data may be stored outside South Africa.</li>
        <li><strong>Google sign-in</strong>, if you choose it, handles signing you in with your Google account.</li>
        <li><strong>GitHub Pages</strong> hosts the website files; like any web host, it receives your browser's IP address when pages load.</li>
        <li><strong>Google Fonts</strong> serves the site's fonts, so your browser's IP address reaches Google when the page loads.</li>
        <li><strong>Cloudinary</strong> stores event posters and gallery photos uploaded by staff.</li>
        <li><strong>Google reCAPTCHA</strong> (through Firebase App Check), when switched on, checks that sign-ups and checkouts come from real people.</li>
        <li><strong>Outside ticket sellers</strong> such as Computicket handle their own sales under their own privacy policies. We receive nothing from them through this site.</li>
        <li>The Google Maps link on an event page only contacts Google if you tap it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Your account is kept until you delete it. Ticket and order records are kept after an event for our event records and to answer questions
        about entry, for <ToAdd>MSB Events to set a retention period</ToAdd>. Vendor applications are kept while MSB Events plans its events and
        deleted on request.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>You can see and correct your name and the names on your tickets, and delete your account, on the My tickets page. Deleting your account removes your profile and sign-in. Ticket records stay linked to the account for event records unless you ask us to remove them.</li>
        <li>You may ask what information we hold about you, ask us to correct or delete it, or object to how we use it, by contacting <ToAdd>MSB Events privacy email</ToAdd>.</li>
        <li>You may complain to the Information Regulator (South Africa) at inforegulator.org.za.</li>
      </ul>

      <h2>Children</h2>
      <p>Most MSB events are for people aged 18 and over. Family events such as the MSB Fun Walk can include children's tickets, which an adult gets in their own account.</p>

      <h2>Security</h2>
      <p>Data travels over HTTPS. Database rules let people read only their own tickets and let staff see only what their role needs.</p>
    </Doc>
  );
}

export function Cookies() {
  return (
    <Doc title="Cookies">
      <p>The MSB Events website does not use advertising or analytics cookies, and it does not track you across other sites.</p>
      <h2>What is stored on your device</h2>
      <ul>
        <li><strong>Sign-in:</strong> Firebase Authentication keeps you signed in using your browser's storage (IndexedDB). Signing out removes it. If you sign in with Google, Google's own sign-in window may use Google cookies.</li>
        <li><strong>Cart:</strong> the tickets in your cart are kept in your browser's local storage until you check out or empty the cart.</li>
        <li><strong>Offline tickets:</strong> your tickets, and the site itself, are saved on your device (IndexedDB and a service worker cache) so they open at the gate without signal. Door staff devices keep the ticket list of the event they are scanning for the same reason.</li>
        <li><strong>Bot protection:</strong> when switched on, Google reCAPTCHA may set its own cookies to tell people from bots.</li>
      </ul>
      <p>These are all needed for the site to work, so there is no consent banner. You can clear them at any time in your browser settings; you will then need to sign in again.</p>
    </Doc>
  );
}
