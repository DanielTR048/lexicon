const KEY = "lexicon-lab-v1";
export const emptyProfile = () => ({
  xp: 0,
  wins: 0,
  words: 0,
  seconds: 0,
  themes: [],
  dailyDays: [],
  history: [],
  discoveries: [],
  achievements: [],
});
export function readStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!saved || saved.version !== 1) return null;
    const profile = { ...emptyProfile(), ...saved.profile };
    for (const key of ["xp", "wins", "words", "seconds"])
      if (!Number.isFinite(profile[key]) || profile[key] < 0) profile[key] = 0;
    for (const key of [
      "themes",
      "dailyDays",
      "history",
      "discoveries",
      "achievements",
    ])
      if (!Array.isArray(profile[key])) profile[key] = [];
    for (const key of ["themes", "dailyDays", "achievements"])
      profile[key] = [
        ...new Set(profile[key].filter((item) => typeof item === "string")),
      ];
    profile.history = profile.history
      .filter(
        (h) =>
          h &&
          typeof h.title === "string" &&
          ["easy", "medium", "hard"].includes(h.difficulty) &&
          typeof h.day === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(h.day) &&
          Number.isFinite(h.seconds) &&
          h.seconds >= 0 &&
          Number.isFinite(h.xp) &&
          h.xp >= 0,
      )
      .slice(0, 50);
    profile.discoveries = profile.discoveries
      .filter(
        (d) => d && typeof d.word === "string" && typeof d.clue === "string",
      )
      .slice(-500);
    return {
      ...saved,
      profile,
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
      settings: { sound: false, ...saved.settings },
    };
  } catch {
    return null;
  }
}
export function writeStore(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: 1 }));
    return true;
  } catch {
    return false;
  }
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function streakOf(days, today = localDay()) {
  const dates = new Set(days);
  const d = new Date(`${today}T12:00:00`);
  if (!dates.has(localDay(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (dates.has(localDay(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
