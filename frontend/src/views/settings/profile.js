// The profile form of Settings: the gender and goal choices, the age check and reading the form.
export const PF_GENDER = [["", "genderNone"], ["f", "genderF"], ["m", "genderM"]];
export const PF_GOAL = [["", "goalNone"], ["save", "goalSave"], ["debt", "goalDebt"], ["spend", "goalSpend"], ["retire", "goalRetire"]];

// The age now: the age saved plus the years passed since it was saved.
export function profAge(p, now = new Date()) {
  const a = parseInt((p || {}).age, 10);
  return a > 0 ? a + Math.max(0, +p.ageYear ? now.getFullYear() - p.ageYear : 0) : 0;
}
// What the form's boxes hold become the saved profile. `f` has name, age, gender and goal as typed.
export function profRead(f, now = new Date()) {
  const age = parseInt(f.age, 10);
  return { name: String(f.name || "").trim().slice(0, 40), ...(age >= 10 && age <= 110 ? { age, ageYear: now.getFullYear() } : {}), gender: f.gender || "", goal: f.goal || "", asked: 1 };
}
