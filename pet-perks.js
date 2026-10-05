const MAX_LOYALTY = 100;
const REWARD_PERCENT_PER_10_LOYALTY = 1;
const ATTACK_BONUS_PER_20_LOYALTY = 1;
const FEED_COOLDOWN_MS = 24 * 60 * 60 * 1_000;

const REWARD_EFFECTS = Object.freeze({
  fox: "coins",
  owl: "xp",
  slime: "prayerCoins",
});

function normalizedLoyalty(value) {
  const loyalty = Number(value);
  if (!Number.isFinite(loyalty)) return 0;
  return Math.min(MAX_LOYALTY, Math.max(0, loyalty));
}

export function companionRewardPercent(species, effect, loyalty) {
  if (REWARD_EFFECTS[species] !== effect) return 0;
  return Math.floor(normalizedLoyalty(loyalty) / 10) * REWARD_PERCENT_PER_10_LOYALTY;
}

export function companionAttackBonus(species, loyalty) {
  if (species !== "dragon") return 0;
  return Math.floor(normalizedLoyalty(loyalty) / 20) * ATTACK_BONUS_PER_20_LOYALTY;
}

export function addPercentBonus(amount, percent) {
  const safeAmount = Number(amount);
  const safePercent = Number(percent);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return 0;
  if (!Number.isFinite(safePercent) || safePercent <= 0) return Math.floor(safeAmount);
  return Math.floor(safeAmount * (1 + safePercent / 100));
}

export function petFeedReadyAt(lastFedAt, now = new Date()) {
  if (!lastFedAt) return null;
  const lastFed = new Date(lastFedAt).getTime();
  const currentTime = new Date(now).getTime();
  if (!Number.isFinite(lastFed) || !Number.isFinite(currentTime)) return null;
  const readyAt = new Date(lastFed + FEED_COOLDOWN_MS);
  return readyAt.getTime() > currentTime ? readyAt : null;
}
