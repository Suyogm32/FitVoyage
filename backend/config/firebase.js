import { initializeApp, applicationDefault, cert } from "firebase-admin/app";

// applicationDefault() looks for a credentials FILE — either
// GOOGLE_APPLICATION_CREDENTIALS pointing at one, or gcloud's local login.
// That works on your machine and would work on a Google Cloud host, but a
// generic container has nowhere to mount that file and no gcloud identity.
// So: if a full service-account JSON is handed over as one environment
// variable, use it directly. This is what makes the container portable —
// Render, AWS, Fly, all just set an env var, no platform-specific credential
// plumbing. Falls back to applicationDefault() for local dev, so nothing
// changes about running this outside Docker.
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : applicationDefault();

const app = initializeApp({ credential });

export default app;