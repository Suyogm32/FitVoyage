import "dotenv/config";
import mongoose from "mongoose";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ExerciseDB } from "../models/ExerciseDB.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_URL_PREFIX = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, maxRetries = 5) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      const waitMs = 2000 * 2 ** attempt;
      console.log(`${res.status} on ${url}, waiting ${waitMs}ms...`);
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) throw new Error(`Failed (${res.status}): ${url}`);
    return res;
  }
  throw new Error(`Gave up after ${maxRetries} retries: ${url}`);
};

const uploadGif = async (exerciseId, gifUrl) => {
  const res = await fetchWithRetry(gifUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const key = `exercises/${exerciseId}.gif`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/gif",
    }),
  );

  return `${S3_URL_PREFIX}${key}`;
};

const run = async () => {
  const limit = process.env.MIGRATION_LIMIT
    ? parseInt(process.env.MIGRATION_LIMIT, 10)
    : Infinity;

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("Clearing old ExerciseDB catalog...");
  await ExerciseDB.deleteMany({});

  let cursor = null;
  let hasNextPage = true;
  let total = 0;

  while (hasNextPage && total < limit) {
    const url = cursor
      ? `https://oss.exercisedb.dev/api/v1/exercises?after=${cursor}`
      : `https://oss.exercisedb.dev/api/v1/exercises`;

    const res = await fetchWithRetry(url);
    const page = await res.json();

    for (const ex of page.data) {
      if (total >= limit) break;

      try {
        const s3GifUrl = await uploadGif(ex.exerciseId, ex.gifUrl);

        await ExerciseDB.updateOne(
          { id: ex.exerciseId },
          {
            $set: {
              id: ex.exerciseId,
              name: ex.name,
              bodyPart: ex.bodyParts?.[0] || "",
              equipment: ex.equipments?.[0] || "",
              target: ex.targetMuscles?.[0] || "",
              secondaryMuscles: ex.secondaryMuscles || [],
              instructions: ex.instructions || [],
              gifUrl: s3GifUrl,
            },
          },
          { upsert: true },
        );

        total++;
        console.log(`[${total}] Migrated ${ex.exerciseId} - ${ex.name}`);
      } catch (err) {
        console.error(`Failed on ${ex.exerciseId} - ${ex.name}:`, err.message);
      }
      await sleep(500);
    }

    hasNextPage = page.meta.hasNextPage;
    cursor = page.meta.nextCursor;
  }

  console.log(`Done. ${total} exercises migrated.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
