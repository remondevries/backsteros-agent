export const GOOD_NIGHT_REFLECTION_SECTIONS = [
  "What went well",
  "Where I fell short",
  "What challenged me",
  "How I'll approach it differently",
  "Wins to remember",
] as const;

export type GoodNightReflectionSection = (typeof GOOD_NIGHT_REFLECTION_SECTIONS)[number];

export const GOOD_NIGHT_MEDITATIONS_STYLE = `[Evening reflection writing style — apply ONLY for this edit]
- Self-dialogue: first person ("I...", "Remember..."), not for an audience
- Honest inventory: name what happened without dramatizing or excusing
- Values, not vanity: tie actions to how you want to live
- Growth, not perfection: "where I fell short" is data for tomorrow, not self-attack
- Stoic focus: separate what you controlled from what you did not
- Short blocks: 2–5 bullets per section; one clear sentence beats a paragraph
- Bad-day anchor: "Wins to remember" must include at least one real win`;
