import mongoose from "mongoose";

// Central error boundary for the API.
//
// Every route's catch block hands its error here with next(error). This is the
// one place that decides what a failed request looks like to a client, and the
// one place that logs it. Before this existed each route returned
// error.message to the caller and logged nothing — the client saw internals
// and the server kept no record.

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// 404 for anything no router claimed. Without it Express answers with an HTML
// page, which a JSON client can't read.
export const notFound = (req, res) => {
  res.status(404).json({ message: "Not found." });
};

// Classify a thrown error into a status and a client-safe body. Anything not
// recognised is a 500 with a fixed message; the real one goes to the log.
//
// Exported separately so it can be unit-tested without an Express app.
export const describeError = (err) => {
  // body-parser and http-errors set `status` and `expose`. `expose` is the
  // library's own promise that the message is safe to show ("Unexpected token
  // in JSON"). Only honoured for 4xx — a 5xx is ours to describe.
  if (Number.isInteger(err?.status) && err.status < 500 && err.expose) {
    return { status: err.status, body: { message: err.message } };
  }

  // A malformed ObjectId in a path or body. The raw message names the
  // collection and field it was cast for, which is nobody's business.
  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, body: { message: "Invalid identifier." } };
  }

  // Schema validation on save. Field names are useful to a client; the
  // per-field messages are Mongoose's own and shouldn't be UI copy.
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 400,
      body: { message: "Invalid data.", fields: Object.keys(err.errors) },
    };
  }

  return { status: 500, body: { message: GENERIC_MESSAGE } };
};

export const errorHandler = (err, req, res, next) => {
  // A handler that already started streaming can't be answered twice.
  // Express's default handler knows how to close that socket; we don't.
  if (res.headersSent) return next(err);

  const { status, body } = describeError(err);

  // 5xx is our fault and needs the stack. 4xx is the client's, and one line
  // is enough — stacks for every bad request would bury the real failures.
  if (status >= 500) {
    console.error(`${req.method} ${req.originalUrl} -> ${status}`, err);
  } else {
    console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }

  res.status(status).json(body);
};