// Checks the dashboard's "Load MSB events" button on an EMPTY database (like a new live project).
// Wipes the local emulator data. Needs the emulators and the pages server from pages-check.mjs.
import { chromium } from 'playwright';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) process.exitCode = 1; };
initializeApp({ projectId: 'demo-msb-events' });
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-msb-events/databases/(default)/documents', { method: 'DELETE' });
const u = await getAuth().getUserByEmail('admin@msb.test');
await getFirestore().doc(`users/${u.uid}`).set({ name: 'Ayanda Admin', email: 'admin@msb.test', role: 'ADMIN', active: true, createdAt: Timestamp.now() });

const ROOT = 'http://127.0.0.1:4174/the-social-connect';
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await b.newPage();
await page.goto(`${ROOT}/events`);
await page.waitForTimeout(2500);
ok(await page.getByText('No upcoming events right now').isVisible(), 'empty database: the events page says there is nothing yet');
await page.goto(`${ROOT}/account?next=/dashboard/events`);
await page.getByLabel('Email').fill('admin@msb.test');
await page.getByLabel('Password', { exact: true }).fill('msb-test-pass');
await page.locator('form button[type=submit]').click();
await page.getByText('The live database is empty').waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Load MSB events' }).click();
await page.getByText('Loaded 9 events and 9 gallery photos.').waitFor({ timeout: 30000 }).then(() => ok(true, 'admin loads the 9 built-in events and 9 gallery photos through the rules'), () => ok(false, 'load built-in content'));
await page.goto(`${ROOT}/events`);
await page.getByText('Matjhabeng Summer Blow 2026').waitFor({ timeout: 15000 }).then(() => ok(true, 'the events page now lists Summer Blow from the database'), () => ok(false, 'events after import'));
ok(await page.getByText('Tables from R3,000').isVisible(), 'ticket types came across (Tables from R3,000)');
await b.close();
process.exit();
