import test from "node:test";
import assert from "node:assert/strict";
import { blackjackOutcome, createBlackjack, createBlackjackDeck, gamesCommand, handValue } from "../index.js";

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

test("blackjack deals from one shuffled 52-card shoe without duplicate cards", () => {
  const hand = createBlackjack();
  const dealt = [...hand.player, ...hand.dealer, ...hand.deck];
  assert.equal(hand.player.length, 2);
  assert.equal(hand.dealer.length, 2);
  assert.equal(hand.deck.length, 48);
  assert.equal(dealt.length, 52);
  assert.equal(new Set(dealt.map(({ rank, suit }) => `${rank}:${suit}`)).size, 52);
});

test("shoe reconstruction for a legacy active hand excludes cards already dealt", () => {
  const dealt = [card("A"), card("K")];
  const deck = createBlackjackDeck(dealt);
  const keys = new Set(deck.map(({ rank, suit }) => `${rank}:${suit}`));
  assert.equal(deck.length, 50);
  assert.ok(!keys.has("A:♠️"));
  assert.ok(!keys.has("K:♠️"));
});

test("natural blackjack pays 3:2, ties another natural, and beats a three-card 21", () => {
  const natural = blackjackOutcome([card("A"), card("K")], [card("10"), card("7")], 100);
  assert.deepEqual(natural, { player: 21, dealer: 17, natural: true, win: true, push: false, payout: 250 });

  const naturalTie = blackjackOutcome([card("A"), card("K")], [card("A"), card("Q")], 100);
  assert.equal(naturalTie.push, true);
  assert.equal(naturalTie.payout, 100);

  const threeCard21 = blackjackOutcome([card("7"), card("7"), card("7")], [card("10"), card("9")], 100);
  assert.equal(threeCard21.natural, false);
  assert.equal(threeCard21.payout, 200);
});
