import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { describeError, errorHandler } from "../middleware/errorHandler.js";

const GENERIC = "Something went wrong. Please try again.";

const fakeRes = () => {
  const res = { headersSent: false, statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const req = { method: "GET", originalUrl: "/api/test" };

// Run fn with console.error/warn silenced so expected failures don't clutter
// the test output.
const quietly = (fn) => {
  const { error, warn } = console;
  console.error = () => {};
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.error = error;
    console.warn = warn;
  }
};

test("an unknown error is a 500 and its message never reaches the body", () => {
  const { status, body } = describeError(
    new Error("Cast to ObjectId failed for value 'x' at path '_id' for model 'User'"),
  );
  assert.equal(status, 500);
  assert.deepEqual(body, { message: GENERIC });
});

test("a 4xx that the thrower marked exposable keeps its status and message", () => {
  // The shape body-parser throws for malformed JSON.
  const err = Object.assign(new Error("Unexpected token } in JSON at position 4"), {
    status: 400,
    expose: true,
  });
  const { status, body } = describeError(err);
  assert.equal(status, 400);
  assert.equal(body.message, err.message);
});

test("a 4xx without expose is still masked", () => {
  const err = Object.assign(new Error("internal detail"), { status: 404 });
  const { status, body } = describeError(err);
  assert.equal(status, 500);
  assert.equal(body.message, GENERIC);
});

test("a 5xx is masked even when it claims expose", () => {
  const err = Object.assign(new Error("upstream said: ECONNREFUSED 10.0.0.4:27017"), {
    status: 502,
    expose: true,
  });
  const { status, body } = describeError(err);
  assert.equal(status, 500);
  assert.equal(body.message, GENERIC);
});

test("a Mongoose CastError is a 400 with no trace of the value or path", () => {
  const err = new mongoose.Error.CastError("ObjectId", "not-an-id", "user");
  const { status, body } = describeError(err);
  assert.equal(status, 400);
  assert.deepEqual(body, { message: "Invalid identifier." });
});

test("a Mongoose ValidationError is a 400 naming fields, not messages", () => {
  const err = new mongoose.Error.ValidationError();
  err.addError(
    "weight",
    new mongoose.Error.ValidatorError({
      path: "weight",
      message: "Path `weight` is required.",
    }),
  );
  const { status, body } = describeError(err);
  assert.equal(status, 400);
  assert.deepEqual(body, { message: "Invalid data.", fields: ["weight"] });
  assert.equal(JSON.stringify(body).includes("required"), false);
});

test("a non-Error value (a thrown string) is handled, not re-thrown", () => {
  const { status, body } = describeError("something odd");
  assert.equal(status, 500);
  assert.equal(body.message, GENERIC);
});

test("errorHandler writes the response and does not call next", () => {
  const res = fakeRes();
  let nextCalled = false;
  quietly(() =>
    errorHandler(new Error("boom"), req, res, () => {
      nextCalled = true;
    }),
  );
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { message: GENERIC });
  assert.equal(nextCalled, false);
});

test("errorHandler defers to Express once headers are sent", () => {
  const res = fakeRes();
  res.headersSent = true;
  let forwarded = null;
  const err = new Error("mid-stream");
  quietly(() =>
    errorHandler(err, req, res, (e) => {
      forwarded = e;
    }),
  );
  assert.equal(forwarded, err);
  assert.equal(res.body, null);
});

test("a 500 is logged with the original error; a 400 is logged as one line", () => {
  const errors = [];
  const warns = [];
  const { error, warn } = console;
  console.error = (...args) => errors.push(args);
  console.warn = (...args) => warns.push(args);
  try {
    const boom = new Error("boom");
    errorHandler(boom, req, fakeRes(), () => {});
    errorHandler(
      new mongoose.Error.CastError("ObjectId", "x", "id"),
      req,
      fakeRes(),
      () => {},
    );
  } finally {
    console.error = error;
    console.warn = warn;
  }
  assert.equal(errors.length, 1);
  assert.equal(errors[0][1].message, "boom");
  assert.equal(warns.length, 1);
  assert.match(warns[0][0], /-> 400/);
});