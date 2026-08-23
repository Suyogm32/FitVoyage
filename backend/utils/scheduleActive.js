import dayjs from "dayjs";

// Was this schedule entry in effect on the given date?
//
//   addedOn <= date < removedOn
//
// Compared at day granularity so same-day adds count for that day.
// `date` must be a dayjs object.
//
// Entries predating the effective-dating feature have no addedOn — we fall
// back to the ObjectId's embedded creation timestamp, which is when the
// entry was really added, so no backfill migration is needed.
export const isActiveOn = (exercise, date) => {
  const addedOn = exercise.addedOn || exercise._id?.getTimestamp?.();
  if (addedOn && dayjs(addedOn).isAfter(date, "day")) return false;
  if (exercise.removedOn && !dayjs(exercise.removedOn).isAfter(date, "day")) return false;
  return true;
};

// Strips soft-deleted entries from a whole weekly schedule object. Used for
// the "current plan" views (/schedule), which only care about right now.
export const activeScheduleOnly = (schedule) => {
  const result = {};
  for (const [dayKey, list] of Object.entries(schedule || {})) {
    result[dayKey] = (list || []).filter((ex) => !ex.removedOn);
  }
  return result;
};