import test from "node:test";
import assert from "node:assert/strict";
import {
  addPercentBonus,
  companionAttackBonus,
  companionRewardPercent,
  petFeedReadyAt,
} from "../index.js";

test("species reward perks match only their intended activity", () => {
  assert.equal(companionRewardPercent("fox", "coins", 80), 8);
  assert.equal(companionRewardPercent("owl", "xp", 80), 8);
  assert.equal(companionRewardPercent("slime", "prayerCoins", 80), 8);
  assert.equal(companionRewardPercent("dragon", "coins", 100), 0);
  assert.equal(companionRewardPercent("fox", "xp", 100), 0);
});

test("loyalty scaling is bounded and floors partial loyalty tiers", () => {
  assert.equal(companionRewardPercent("fox", "coins", 9), 0);
  assert.equal(companionRewardPercent("fox", "coins", 19), 1);
  assert.equal(companionRewardPercent("fox", "coins", 100), 10);
  assert.equal(companionRewardPercent("fox", "coins", 1_000), 10);
  assert.equal(companionRewardPercent("fox", "coins", -50), 0);
});

test("dragon attack bonus scales by loyalty up to five damage", () => {
  assert.equal(companionAttackBonus("dragon", 19), 0);
  assert.equal(companionAttackBonus("dragon", 20), 1);
  assert.equal(companionAttackBonus("dragon", 99), 4);
  assert.equal(companionAttackBonus("dragon", 100), 5);
  assert.equal(companionAttackBonus("fox", 100), 0);
});

test("percent bonuses floor fractional rewards and ignore invalid amounts", () => {
  assert.equal(addPercentBonus(101, 10), 111);
  assert.equal(addPercentBonus(15, 6), 15);
  assert.equal(addPercentBonus(0, 10), 0);
  assert.equal(addPercentBonus(Number.NaN, 10), 0);
});

test("feeding is unavailable for 24 hours and becomes available at the boundary", () => {
  const now = new Date("2026-10-05T12:00:00.000Z");
  const lastFed = new Date("2026-10-04T12:00:00.000Z");
  assert.equal(petFeedReadyAt(null, now), null);
  assert.equal(petFeedReadyAt(lastFed, now), null);
  assert.equal(
    petFeedReadyAt(lastFed, new Date(now.getTime() - 1)).toISOString(),
    now.toISOString(),
  );
  assert.equal(petFeedReadyAt(lastFed, new Date(now.getTime() + 1)), null);
  assert.equal(petFeedReadyAt("invalid-date", now), null);
});
