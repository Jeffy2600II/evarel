const tmMsOf = (tm, now) => tm ? tm.acc + (tm.startedAt ? now - tm.startedAt : 0) : 0;
const dialPctOf = (doneMs, goalMs) => Math.min(100, doneMs / goalMs * 100);
const timerMinsOf = (tm, now) => Math.round(tmMsOf(tm, now) / 6e4);
export {
  dialPctOf,
  timerMinsOf,
  tmMsOf
};
