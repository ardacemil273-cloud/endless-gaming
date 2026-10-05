import test from "node:test";
import assert from "node:assert/strict";
import { gamesCommand, handValue } from "../index.js";

const card = (rank) => ({ rank, suit: "♠️" });

test("blackjack scores a soft ace as eleven while the hand stays at 21 or under", () => {
  assert.equal(handValue([card("A"), card("9")]), 20);
  assert.equal(handValue([card("A"), card("10")]), 21);
});

test("blackjack reduces aces from eleven to one to avoid unnecessary busts", () => {
  assert.equal(handValue([card("A"), card("9"), card("K")]), 20);
  assert.equal(handValue([card("A"), card("A"), card("9")]), 21);
  assert.equal(handValue([card("A"), card("9"), card("K"), card("5")]), 25);
});

test("blackjack face cards use the standard ten-point value", () => {
  assert.equal(handValue([card("K"), card("Q")]), 20);
  assert.equal(handValue([card("J"), card("2")]), 12);
});

test("blackjack status is registered as a games subcommand", () => {
  const names = gamesCommand.toJSON().options.map((option) => option.name);
  assert.ok(names.includes("blackjack-status"));
});
