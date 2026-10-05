var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
import "dotenv/config";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import express from "express";
import pg from "pg";
import pino from "pino";
import { randomInt as randomInt4 } from "node:crypto";
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder as SlashCommandBuilder4
} from "discord.js";

// ===== Eğlence ve sosyal komutlar =====
import { randomInt } from "node:crypto";
import { SlashCommandBuilder } from "discord.js";
var cooldowns = /* @__PURE__ */ new Map();
var COOLDOWN_MS = 2e3;
var EIGHT_BALL_ANSWERS = [
  "Kesinlikle evet.",
  "Y\u0131ld\u0131zlar olumlu g\xF6r\xFCn\xFCyor.",
  "B\xFCy\xFCk ihtimalle.",
  "\u015Eimdilik karars\u0131z.",
  "Tekrar sorman daha iyi olabilir.",
  "Pek sanm\u0131yorum.",
  "Kesinlikle hay\u0131r.",
  "ENDLESS kehanet motoru bu soruya cevap vermeyi reddediyor."
];
var TRIVIA = [
  { question: "Bir deste iskambil ka\u011F\u0131d\u0131nda ka\xE7 kart vard\u0131r?", answer: "52", hint: "D\xF6rt tak\u0131m\u0131n her birinde 13 kart bulunur." },
  { question: "G\xFCne\u015F sisteminin en b\xFCy\xFCk gezegeni hangisidir?", answer: "J\xFCpiter", hint: "Gaz devi ve ad\u0131n\u0131 Roma tanr\u0131lar\u0131n\u0131n kral\u0131ndan al\u0131r." },
  { question: "Discord'un temel metin bi\xE7imlendirme dili hangisidir?", answer: "Markdown", hint: "Y\u0131ld\u0131z i\u015Faretleriyle kal\u0131n yaz\u0131 yazabildi\u011Fin dil." },
  { question: "D\xFCnyan\u0131n en b\xFCy\xFCk okyanusu hangisidir?", answer: "Pasifik Okyanusu", hint: "Asya ile Amerika k\u0131talar\u0131 aras\u0131nda uzan\u0131r." },
  { question: "Bir haftada ka\xE7 g\xFCn vard\u0131r?", answer: "7", hint: "Pazartesi ile ba\u015Flay\u0131p pazarla biter." }
];
var JOKES = [
  "Programc\u0131 neden karanl\u0131kta \xE7al\u0131\u015F\u0131r? \xC7\xFCnk\xFC \u0131\u015F\u0131kta bug'lar saklanamaz.",
  "Klavye neden doktora gitmi\u015F? Tu\u015Flar\u0131na bas\u0131l\u0131yormu\u015F.",
  "Bir SQL sorgusu bara girmi\u015F ve iki tablo istemi\u015F. Barmen sormu\u015F: JOIN ister misin?",
  "Wi-Fi neden ayr\u0131lm\u0131\u015F? Aralar\u0131nda ba\u011Flant\u0131 kalmam\u0131\u015F.",
  "Bug\xFCn \xE7ok kararl\u0131yd\u0131m\u2026 sonra bir zar att\u0131m."
];
var QUOTES = [
  "K\xFC\xE7\xFCk bir \u015Fans, b\xFCy\xFCk bir maceran\u0131n ba\u015Flang\u0131c\u0131d\u0131r.",
  "En iyi ekipman, iyi arkada\u015Flard\u0131r.",
  "Kazanmak g\xFCzel, ama oyunu e\u011Flenceli yapan yolculuktur.",
  "Bug\xFCn\xFCn g\xF6revi: biraz g\xFCl, biraz oyna, biraz da mola ver.",
  "ENDLESS d\xFCnyas\u0131nda her oyuncunun bir sonraki seviyesi vard\u0131r."
];
var COMPLIMENTS = [
  "Bug\xFCn enerjin bir boss sava\u015F\u0131n\u0131 tek ba\u015F\u0131na bitirecek kadar y\xFCksek.",
  "Senin oldu\u011Fun tak\u0131mda \u015Fans bonusu otomatik aktif oluyor.",
  "Zek\xE2n, ENDLESS'in en nadir e\u015Fyas\u0131 olabilir.",
  "Sohbete girdi\u011Fin anda sunucunun havas\u0131 g\xFCzelle\u015Fiyor.",
  "Sen ger\xE7ek bir macerac\u0131 ruhuna sahipsin."
];
var FRIENDLY_ROASTS = [
  "Senin \u015Fans\u0131n\u0131 g\xF6r\xFCnce zarlar bile utan\u0131p k\xF6\u015Feye \xE7ekiliyor.",
  "Haritay\u0131 kaybetmedin; harita seni bulamam\u0131\u015F.",
  "Envanterin dolu ama strateji \xE7antan h\xE2l\xE2 bo\u015F g\xF6r\xFCn\xFCyor.",
  "Sen boss de\u011Filsin, ama kesinlikle gizli g\xF6rev gibisin.",
  "Bug\xFCn reflekslerin ke\u015Fif cooldown'\u0131nda olabilir."
];
var VIBES = [
  ["Ka\u015Fif", "Yeni yerler, yeni fikirler ve bolca macera."],
  ["\u015Eans Ustas\u0131", "Bug\xFCn evren zarlar\u0131 senin lehine at\u0131yor."],
  ["Stratejist", "Hamleni herkesten \xF6nce d\xFC\u015F\xFCn\xFCyorsun."],
  ["Kaos El\xE7isi", "Plan yok, ama kesinlikle e\u011Flence var."],
  ["Lobi Efsanesi", "Sohbete girdi\u011Fin anda atmosfer de\u011Fi\u015Fiyor."],
  ["Boss Enerjisi", "Bug\xFCn seni durdurmak i\xE7in b\xFCt\xFCn ekip laz\u0131m."]
];
var RPS = { rock: "Ta\u015F", paper: "Ka\u011F\u0131t", scissors: "Makas" };
var RPS_BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
var funCommand = new SlashCommandBuilder().setName("fun").setDescription("ENDLESS e\u011Flence merkezini a\xE7; oyun, \u015Fans ve sosyal komutlar\u0131 kullan.").addSubcommand((sub) => sub.setName("coinflip").setDescription("Yaz\u0131 m\u0131 tura m\u0131? \u015Eans\u0131n\u0131 hemen test et.")).addSubcommand((sub) => sub.setName("dice").setDescription("\u0130stedi\u011Fin y\xFCz say\u0131s\u0131nda zar at.").addIntegerOption((option) => option.setName("sides").setDescription("Zar y\xFCz\xFC: 2 ile 100 aras\u0131nda.").setMinValue(2).setMaxValue(100))).addSubcommand((sub) => sub.setName("8ball").setDescription("Gizemli 8 topuna bir soru sor.").addStringOption((option) => option.setName("question").setDescription("Cevab\u0131n\u0131 merak etti\u011Fin soru.").setRequired(true).setMaxLength(300))).addSubcommand((sub) => sub.setName("rps").setDescription("ENDLESS'e kar\u015F\u0131 ta\u015F, ka\u011F\u0131t veya makas oyna.").addStringOption((option) => option.setName("choice").setDescription("Bu turdaki se\xE7imin.").setRequired(true).addChoices({ name: "Ta\u015F", value: "rock" }, { name: "Ka\u011F\u0131t", value: "paper" }, { name: "Makas", value: "scissors" }))).addSubcommand((sub) => sub.setName("choose").setDescription("Karar veremiyorsan iki se\xE7enekten birini se\xE7.").addStringOption((option) => option.setName("first").setDescription("\u0130lk se\xE7enek.").setRequired(true).setMaxLength(100)).addStringOption((option) => option.setName("second").setDescription("\u0130kinci se\xE7enek.").setRequired(true).setMaxLength(100))).addSubcommand((sub) => sub.setName("trivia").setDescription("Mini bilgi, ipucu ve sohbet meydan okumas\u0131 al.")).addSubcommand((sub) => sub.setName("joke").setDescription("Sohbete rastgele, k\u0131sa bir \u015Faka b\u0131rak.")).addSubcommand((sub) => sub.setName("quote").setDescription("Maceraya uygun rastgele bir s\xF6z ke\u015Ffet.")).addSubcommand((sub) => sub.setName("compliment").setDescription("Bir oyuncuya pozitif ve e\u011Flenceli iltifat g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("\u0130ltifat g\xF6nderilecek oyuncu."))).addSubcommand((sub) => sub.setName("roast").setDescription("K\u0131r\u0131c\u0131 olmayan, tamamen dost\xE7a bir \u015Faka yap.").addUserOption((option) => option.setName("user").setDescription("Dost\xE7a \u015Faka yap\u0131lacak oyuncu."))).addSubcommand((sub) => sub.setName("ship").setDescription("\u0130ki oyuncunun tak\u0131m uyumunu e\u011Flenceli \xF6l\xE7.").addUserOption((option) => option.setName("first").setDescription("\u0130lk oyuncu.").setRequired(true)).addUserOption((option) => option.setName("second").setDescription("\u0130kinci oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("vibe").setDescription("Bug\xFCnk\xFC ENDLESS enerjini \xF6\u011Fren."));
function respond(interaction, content) {
  return interaction.reply({ content, ephemeral: false, allowedMentions: { parse: [] } });
}
__name(respond, "respond");
function isRateLimited(interaction) {
  const key = `${interaction.guildId ?? "dm"}:${interaction.user.id}`;
  const last = cooldowns.get(key) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) return Math.ceil(remaining / 1e3);
  cooldowns.set(key, Date.now());
  return 0;
}
__name(isRateLimited, "isRateLimited");
function displayUser(user) {
  return user?.globalName ?? user?.username ?? "Gizemli oyuncu";
}
__name(displayUser, "displayUser");
async function handleFun(interaction) {
  const remaining = isRateLimited(interaction);
  if (remaining) return respond(interaction, `Biraz yava\u015F, e\u011Flence motoru \u0131s\u0131n\u0131yor. **${remaining} saniye** sonra tekrar dene.`);
  const action = interaction.options.getSubcommand();
  if (action === "coinflip") return respond(interaction, `\u{1FA99} **${randomInt(0, 2) ? "Tura" : "Yaz\u0131"}**!`);
  if (action === "dice") {
    const sides = interaction.options.getInteger("sides") ?? 6;
    return respond(interaction, `\u{1F3B2} **d${sides}** at\u0131ld\u0131: **${randomInt(1, sides + 1)}**`);
  }
  if (action === "8ball") {
    const question = interaction.options.getString("question", true);
    return respond(interaction, `\u{1F52E} **${question}**
> ${EIGHT_BALL_ANSWERS[randomInt(0, EIGHT_BALL_ANSWERS.length)]}`);
  }
  if (action === "choose") {
    const options = [interaction.options.getString("first", true), interaction.options.getString("second", true)];
    return respond(interaction, `\u{1F3AF} ENDLESS se\xE7ti: **${options[randomInt(0, options.length)]}**`);
  }
  if (action === "rps") {
    const player = interaction.options.getString("choice", true);
    const choices = Object.keys(RPS);
    const bot = choices[randomInt(0, choices.length)];
    const result = player === bot ? "Berabere!" : RPS_BEATS[player] === bot ? "Kazand\u0131n!" : "Bu turu ben ald\u0131m!";
    return respond(interaction, `\u270A **${RPS[player]}** vs **${RPS[bot]}** \u2014 **${result}**`);
  }
  if (action === "trivia") {
    const trivia = TRIVIA[randomInt(0, TRIVIA.length)];
    return respond(interaction, `\u{1F9E0} **Mini Trivia**
${trivia.question}
\u0130pucu: *${trivia.hint}*
Cevab\u0131n\u0131 sohbete yaz! Cevap: ||${trivia.answer}||`);
  }
  if (action === "joke") return respond(interaction, `\u{1F602} ${JOKES[randomInt(0, JOKES.length)]}`);
  if (action === "quote") return respond(interaction, `\u{1F4DC} *${QUOTES[randomInt(0, QUOTES.length)]}*`);
  if (action === "vibe") {
    const [name, description] = VIBES[randomInt(0, VIBES.length)];
    return respond(interaction, `\u2728 Bug\xFCnk\xFC vibe'\u0131n: **${name}**
${description}`);
  }
  if (action === "compliment" || action === "roast") {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const text = action === "compliment" ? COMPLIMENTS[randomInt(0, COMPLIMENTS.length)] : FRIENDLY_ROASTS[randomInt(0, FRIENDLY_ROASTS.length)];
    return respond(interaction, `${action === "compliment" ? "\u{1F496}" : "\u{1F525}"} **${displayUser(user)}** i\xE7in: ${text}`);
  }
  const first = interaction.options.getUser("first", true);
  const second = interaction.options.getUser("second", true);
  const score = randomInt(0, 101);
  const verdict = score >= 85 ? "Efsanevi tak\u0131m!" : score >= 65 ? "\xC7ok iyi uyum!" : score >= 40 ? "Dengeli bir ikili." : "Kaos ama e\u011Flenceli bir tak\u0131m!";
  return respond(interaction, `\u{1F49E} **${displayUser(first)} + ${displayUser(second)}**
Uyum skoru: **%${score}** \u2014 ${verdict}`);
}
__name(handleFun, "handleFun");

// ===== Koleksiyon ve etkinlik komutları =====
import { randomInt as randomInt2 } from "node:crypto";
import { SlashCommandBuilder as SlashCommandBuilder2 } from "discord.js";

// ===== Yoldaş bonus yardımcıları =====
var MAX_LOYALTY = 100;
var REWARD_PERCENT_PER_10_LOYALTY = 1;
var ATTACK_BONUS_PER_20_LOYALTY = 1;
var FEED_COOLDOWN_MS = 24 * 60 * 60 * 1e3;
var REWARD_EFFECTS = Object.freeze({
  fox: "coins",
  owl: "xp",
  slime: "prayerCoins"
});
function normalizedLoyalty(value) {
  const loyalty = Number(value);
  if (!Number.isFinite(loyalty)) return 0;
  return Math.min(MAX_LOYALTY, Math.max(0, loyalty));
}
__name(normalizedLoyalty, "normalizedLoyalty");
function companionRewardPercent(species, effect, loyalty) {
  if (REWARD_EFFECTS[species] !== effect) return 0;
  return Math.floor(normalizedLoyalty(loyalty) / 10) * REWARD_PERCENT_PER_10_LOYALTY;
}
__name(companionRewardPercent, "companionRewardPercent");
function companionAttackBonus(species, loyalty) {
  if (species !== "dragon") return 0;
  return Math.floor(normalizedLoyalty(loyalty) / 20) * ATTACK_BONUS_PER_20_LOYALTY;
}
__name(companionAttackBonus, "companionAttackBonus");
function addPercentBonus(amount, percent) {
  const safeAmount = Number(amount);
  const safePercent = Number(percent);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) return 0;
  if (!Number.isFinite(safePercent) || safePercent <= 0) return Math.floor(safeAmount);
  return Math.floor(safeAmount * (1 + safePercent / 100));
}
__name(addPercentBonus, "addPercentBonus");
function petFeedReadyAt(lastFedAt, now = /* @__PURE__ */ new Date()) {
  if (!lastFedAt) return null;
  const lastFed = new Date(lastFedAt).getTime();
  const currentTime = new Date(now).getTime();
  if (!Number.isFinite(lastFed) || !Number.isFinite(currentTime)) return null;
  const readyAt = new Date(lastFed + FEED_COOLDOWN_MS);
  return readyAt.getTime() > currentTime ? readyAt : null;
}
__name(petFeedReadyAt, "petFeedReadyAt");

// ===== Koleksiyon ve etkinlik komutları =====
var COOLDOWN_MS2 = 60 * 1e3;
var HUNT_REWARDS = {
  common: { label: "S\u0131radan", emoji: "\u{1F40C}", coins: [12, 30], xp: 8 },
  uncommon: { label: "S\u0131rad\u0131\u015F\u0131", emoji: "\u{1F430}", coins: [30, 70], xp: 16 },
  rare: { label: "Nadir", emoji: "\u{1F98A}", coins: [75, 160], xp: 30 },
  epic: { label: "Epik", emoji: "\u{1F409}", coins: [180, 400], xp: 60 },
  legendary: { label: "Efsanevi", emoji: "\u{1F984}", coins: [500, 1200], xp: 120 }
};
var ANIMALS = [
  ["common", "Sonsuz Salyangoz"],
  ["common", "Ne\u015Feli Ar\u0131"],
  ["common", "Piksel B\xF6ce\u011Fi"],
  ["uncommon", "G\xFCm\xFC\u015F Tav\u015Fan"],
  ["uncommon", "Kozmik Civciv"],
  ["uncommon", "\xC7\xF6l Faresi"],
  ["rare", "Gece Tilkisi"],
  ["rare", "Kristal Kedi"],
  ["rare", "Y\u0131ld\u0131z K\xF6pe\u011Fi"],
  ["epic", "K\xFCl Ejderhas\u0131"],
  ["epic", "F\u0131rt\u0131na Balinas\u0131"],
  ["legendary", "G\xF6kku\u015Fa\u011F\u0131 Tekboynuzu"]
];
var FRIENDLY_BATTLES = [
  "kalkan\u0131yla savunup son anda kar\u015F\u0131l\u0131k verdi",
  "m\xFCkemmel bir kritik hamle yapt\u0131",
  "rakibini \u015Fa\u015F\u0131rtan bir combo a\xE7t\u0131",
  "\u015Fans zar\u0131n\u0131 son saniyede kendi lehine \xE7evirdi"
];
var endlessCommand = new SlashCommandBuilder2().setName("endless").setDescription("ENDLESS koleksiyon, sosyal e\u011Flence ve riskli \xF6d\xFCl merkezini a\xE7.").addSubcommand((sub) => sub.setName("hunt").setDescription("Rastgele bir hayvan avla, Coin ve XP kazan.")).addSubcommand((sub) => sub.setName("zoo").setDescription("Toplad\u0131\u011F\u0131n hayvanlar\u0131 ve koleksiyon ilerlemeni g\xF6r.")).addSubcommand((sub) => sub.setName("give").setDescription("Bir oyuncuya g\xFCvenli \u015Fekilde Coin g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("Coin g\xF6nderilecek oyuncu.").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("G\xF6nderilecek Coin miktar\u0131.").setMinValue(1).setMaxValue(1e5).setRequired(true))).addSubcommand((sub) => sub.setName("gamble").setDescription("Coin yat\u0131r, \u015Fans\u0131n varsa iki kat\u0131n\u0131 kazan.").addIntegerOption((option) => option.setName("amount").setDescription("Risk edilecek Coin miktar\u0131.").setMinValue(1).setMaxValue(1e5).setRequired(true))).addSubcommand((sub) => sub.setName("pray").setDescription("\u015Eans tap\u0131na\u011F\u0131nda dua et, s\xFCrpriz \xF6d\xFCl kazan.")).addSubcommand((sub) => sub.setName("battle").setDescription("Bir oyuncuyla zarars\u0131z dost\xE7a sava\u015F yap.").addUserOption((option) => option.setName("user").setDescription("Dost\xE7a sava\u015F\u0131lacak oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("cookie").setDescription("Bir oyuncuya sanal kurabiye g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("Kurabiye g\xF6nderilecek oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("curse").setDescription("Bir oyuncuya tamamen e\u011Flencelik \u015Fans laneti g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("\u015Eaka yap\u0131lacak oyuncu.").setRequired(true)));
function displayUser2(user) {
  return user?.globalName ?? user?.username ?? "Gizemli oyuncu";
}
__name(displayUser2, "displayUser");
var sleep = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "sleep");
async function playAnimation(interaction, frames) {
  for (const frame of frames) {
    await interaction.editReply({ content: frame, allowedMentions: { parse: [] } });
    await sleep(220);
  }
}
__name(playAnimation, "playAnimation");
function randomBetween([min, max]) {
  return randomInt2(min, max + 1);
}
__name(randomBetween, "randomBetween");
function rollRarity() {
  const roll = randomInt2(1, 10001) / 100;
  if (roll <= 0.5) return "legendary";
  if (roll <= 2.5) return "epic";
  if (roll <= 10) return "rare";
  if (roll <= 30) return "uncommon";
  return "common";
}
__name(rollRarity, "rollRarity");
function randomAnimal() {
  const rarity = rollRarity();
  const candidates = ANIMALS.filter(([candidate]) => candidate === rarity);
  return { rarity, name: candidates[randomInt2(0, candidates.length)][1] };
}
__name(randomAnimal, "randomAnimal");
function createEndlessHandler({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, applyXp: applyXp2, MAX_BALANCE: MAX_BALANCE2 }) {
  async function hunt(worldId, userId) {
    return inTransaction2(async (client) => {
      const playerResult = await client.query(
        "SELECT level, xp FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId]
      );
      const player = playerResult.rows[0];
      const walletResult = await client.query(
        "SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId]
      );
      const wallet = walletResult.rows[0];
      if (!player || !wallet) return { ok: false, reason: "not_registered" };
      const petResult = await client.query(
        "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
        [worldId, userId]
      );
      const pet = petResult.rows[0];
      const now = /* @__PURE__ */ new Date();
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS2);
      const stateResult = await client.query(
        "SELECT hunt_until FROM endless_collection_state WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId]
      );
      const previous = stateResult.rows[0]?.hunt_until;
      if (previous && new Date(previous).getTime() > now.getTime()) return { ok: false, reason: "cooldown", cooldownUntil: previous };
      const animal = randomAnimal();
      const reward = HUNT_REWARDS[animal.rarity];
      const coins = Math.min(
        addPercentBonus(randomBetween(reward.coins), companionRewardPercent(pet?.species, "coins", pet?.loyalty)),
        MAX_BALANCE2 - Number(wallet.wallet_coins)
      );
      const xp = addPercentBonus(reward.xp, companionRewardPercent(pet?.species, "xp", pet?.loyalty));
      if (coins > 0) {
        await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: coins, reason: "endless_hunt", idempotencyKey: `endless:hunt:${worldId}:${userId}:${now.toISOString()}` });
      }
      const xpResult = applyXp2(Number(player.level), Number(player.xp), xp);
      await client.query("UPDATE endless_players SET level = $3, xp = $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, xpResult.level, xpResult.xp]);
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, coins]);
      await client.query(
        `INSERT INTO endless_collection_state (world_id, user_id, hunt_until, pray_until, gamble_until)
         VALUES ($1, $2, $3, NULL, NULL)
         ON CONFLICT (world_id, user_id) DO UPDATE SET hunt_until = EXCLUDED.hunt_until, updated_at = NOW()`,
        [worldId, userId, cooldownUntil]
      );
      await client.query(
        `INSERT INTO endless_collection_animals (world_id, user_id, animal_key, rarity, quantity)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (world_id, user_id, animal_key) DO UPDATE SET quantity = endless_collection_animals.quantity + 1, updated_at = NOW()`,
        [worldId, userId, animal.name.toLowerCase().replaceAll(" ", "_"), animal.rarity]
      );
      return { ok: true, animal, reward, coins, xp, level: xpResult.level, levelsGained: xpResult.levelsGained, cooldownUntil };
    });
  }
  __name(hunt, "hunt");
  async function pray(worldId, userId) {
    return inTransaction2(async (client) => {
      const walletResult = await client.query("SELECT wallet_coins, wallet_gems FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      if (!walletResult.rows[0]) return { ok: false, reason: "not_registered" };
      const petResult = await client.query("SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2", [worldId, userId]);
      const pet = petResult.rows[0];
      const now = /* @__PURE__ */ new Date();
      const stateResult = await client.query("SELECT pray_until FROM endless_collection_state WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      const previous = stateResult.rows[0]?.pray_until;
      if (previous && new Date(previous).getTime() > now.getTime()) return { ok: false, reason: "cooldown", cooldownUntil: previous };
      const requestedCoins = addPercentBonus(randomInt2(35, 151), companionRewardPercent(pet?.species, "prayerCoins", pet?.loyalty));
      const coins = Math.min(requestedCoins, MAX_BALANCE2 - Number(walletResult.rows[0].wallet_coins));
      const gems = randomInt2(1, 101) <= 12 && Number(walletResult.rows[0].wallet_gems) < MAX_BALANCE2 ? 1 : 0;
      if (coins > 0) await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: coins, reason: "endless_pray", idempotencyKey: `endless:pray:${worldId}:${userId}:${now.toISOString()}` });
      if (gems > 0) await insertLedger2(client, { worldId, userId, currency: "gem", walletDelta: gems, reason: "endless_pray", idempotencyKey: `endless:pray:${worldId}:${userId}:${now.toISOString()}:gem` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, wallet_gems = wallet_gems + $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, coins, gems]);
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS2);
      await client.query(`INSERT INTO endless_collection_state (world_id, user_id, hunt_until, pray_until, gamble_until) VALUES ($1, $2, NULL, $3, NULL) ON CONFLICT (world_id, user_id) DO UPDATE SET pray_until = EXCLUDED.pray_until, updated_at = NOW()`, [worldId, userId, cooldownUntil]);
      return { ok: true, coins, gems, cooldownUntil };
    });
  }
  __name(pray, "pray");
  async function give(worldId, userId, targetId, amount, interactionId) {
    if (userId === targetId) return { ok: false, reason: "self" };
    return inTransaction2(async (client) => {
      const ids = [userId, targetId].sort();
      const result = await client.query("SELECT user_id, wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = ANY($2::text[]) FOR UPDATE", [worldId, ids]);
      if (result.rows.length !== 2) return { ok: false, reason: "not_registered" };
      const source = result.rows.find((row) => row.user_id === userId);
      if (Number(source.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
      await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: -amount, reason: "endless_give", idempotencyKey: `endless:give:${interactionId}:from` });
      await insertLedger2(client, { worldId, userId: targetId, currency: "coin", walletDelta: amount, reason: "endless_give", idempotencyKey: `endless:give:${interactionId}:to` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, amount]);
      await client.query("UPDATE endless_wallets SET wallet_coins = LEAST(wallet_coins + $3, $4), updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, targetId, amount, MAX_BALANCE2]);
      return { ok: true };
    });
  }
  __name(give, "give");
  async function gamble(worldId, userId, amount, interactionId) {
    return inTransaction2(async (client) => {
      const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      const wallet = result.rows[0];
      if (!wallet) return { ok: false, reason: "not_registered" };
      if (Number(wallet.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
      const jackpot = randomInt2(1, 101) <= 4;
      const won = jackpot || randomInt2(1, 101) <= 46;
      const payout = won ? amount * (jackpot ? 5 : 2) : 0;
      const delta = payout - amount;
      await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: delta, reason: jackpot ? "endless_gamble_jackpot" : won ? "endless_gamble_win" : "endless_gamble_loss", idempotencyKey: `endless:gamble:${interactionId}` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, delta]);
      return { ok: true, won, jackpot, payout, delta };
    });
  }
  __name(gamble, "gamble");
  return /* @__PURE__ */ __name(async function handleEndless2(interaction) {
    const worldId = interaction.guildId;
    if (!worldId) return interaction.reply({ content: "Bu komut yaln\u0131zca bir Discord sunucusunda kullan\u0131labilir.", ephemeral: true });
    await interaction.deferReply({ ephemeral: false });
    const action = interaction.options.getSubcommand();
    if (["cookie", "curse", "battle"].includes(action)) {
      const target = interaction.options.getUser("user", true);
      const targetName = displayUser2(target);
      await playAnimation(interaction, action === "battle" ? ["\u2694\uFE0F Arena kap\u0131lar\u0131 a\xE7\u0131l\u0131yor...", `\u2694\uFE0F **${targetName}** d\xFCelloya davet edildi...`, "\u2694\uFE0F Zarlar at\u0131l\u0131yor..."] : action === "cookie" ? ["\u{1F36A} F\u0131r\u0131n \u0131s\u0131n\u0131yor...", `\u{1F36A} **${targetName}** i\xE7in hamur haz\u0131rlan\u0131yor...`, "\u{1F36A} \xDCzerine \xE7ikolata par\xE7alar\u0131 ekleniyor..."] : ["\u{1F300} Lanet kitab\u0131 a\xE7\u0131l\u0131yor...", `\u{1F300} **${targetName}** i\xE7in hedef se\xE7iliyor...`, "\u{1F300} Minik kaos haz\u0131rlan\u0131yor..."]);
      const message = action === "cookie" ? `\u{1F36A} **${targetName}** oyuncusuna s\u0131cac\u0131k bir kurabiye g\xF6nderildi!` : action === "curse" ? `\u{1F300} **${targetName}** oyuncusuna tamamen e\u011Flencelik bir \u015Fans laneti g\xF6nderildi. Etkisi 3 saniye s\xFCrer!` : `\u2694\uFE0F **${displayUser2(interaction.user)}**, **${targetName}** ile dost\xE7a sava\u015Fa girdi ve ${FRIENDLY_BATTLES[randomInt2(0, FRIENDLY_BATTLES.length)]}. Sonu\xE7: herkes kazand\u0131!`;
      return interaction.editReply({ content: message, allowedMentions: { parse: [] } });
    }
    if (action === "zoo") {
      const result2 = await pool2.query("SELECT animal_key, rarity, quantity FROM endless_collection_animals WHERE world_id = $1 AND user_id = $2 ORDER BY quantity DESC, rarity ASC LIMIT 20", [worldId, interaction.user.id]);
      if (!result2.rows.length) return interaction.editReply("Hayvan koleksiyonun bo\u015F. `/endless hunt` ile ilk hayvan\u0131n\u0131 bul!");
      const lines = result2.rows.map((row) => `\u2022 **${row.animal_key.replaceAll("_", " ")}** \u2014 ${HUNT_REWARDS[row.rarity]?.emoji ?? "\u{1F43E}"} ${HUNT_REWARDS[row.rarity]?.label ?? row.rarity} \xD7${row.quantity}`);
      return interaction.editReply(["**ENDLESS Hayvan Koleksiyonu**", ...lines, `Toplam farkl\u0131 t\xFCr: **${result2.rows.length}**`].join("\n"));
    }
    if (action === "hunt") {
      await playAnimation(interaction, ["\u{1F332} ENDLESS orman\u0131na giriliyor...", "\u{1F50E} \u0130zler aran\u0131yor...", "\u{1F3F9} Yay geriliyor..."]);
      const result2 = await hunt(worldId, interaction.user.id);
      if (!result2.ok) return interaction.editReply(result2.reason === "cooldown" ? `Av cooldown'\u0131 devam ediyor. <t:${Math.ceil(new Date(result2.cooldownUntil).getTime() / 1e3)}:R> sonra tekrar dene.` : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.");
      const levelText = result2.levelsGained ? ` Level atlad\u0131n: **${result2.level}**!` : "";
      return interaction.editReply(`${result2.reward.emoji} **${result2.reward.label} ${result2.animal.name}** buldun! **${result2.coins} Coin** ve **${result2.xp} XP** kazand\u0131n.${levelText} Yeni av <t:${Math.ceil(result2.cooldownUntil.getTime() / 1e3)}:R> haz\u0131r.`);
    }
    if (action === "pray") {
      await playAnimation(interaction, ["\u{1F56F}\uFE0F Tap\u0131nak kap\u0131lar\u0131 a\xE7\u0131l\u0131yor...", "\u{1F64F} Dua g\xF6ky\xFCz\xFCne y\xFCkseliyor...", "\u2728 \u015Eans kristali parl\u0131yor..."]);
      const result2 = await pray(worldId, interaction.user.id);
      if (!result2.ok) return interaction.editReply(result2.reason === "cooldown" ? `Tap\u0131nak seni duydu. Yeni dua i\xE7in <t:${Math.ceil(new Date(result2.cooldownUntil).getTime() / 1e3)}:R> bekle.` : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.");
      return interaction.editReply(`\u{1F64F} Dua kabul edildi! **${result2.coins} Coin**${result2.gems ? ` ve **${result2.gems} Gem**` : ""} kazand\u0131n.`);
    }
    if (action === "give") {
      const target = interaction.options.getUser("user", true);
      const amount2 = interaction.options.getInteger("amount", true);
      await playAnimation(interaction, ["\u{1F4B8} Transfer haz\u0131rlan\u0131yor...", `\u{1F4B8} **${amount2.toLocaleString("tr-TR")} Coin** say\u0131l\u0131yor...`, "\u{1F4B8} G\xFCvenli ledger kayd\u0131 olu\u015Fturuluyor..."]);
      const result2 = await give(worldId, interaction.user.id, target.id, amount2, interaction.id);
      const message = result2.reason === "self" ? "Kendine Coin g\xF6nderemezsin." : result2.reason === "insufficient_funds" ? "C\xFCzdan\u0131nda bu transfer i\xE7in yeterli Coin yok." : result2.reason === "not_registered" ? "\u0130ki oyuncunun da bu d\xFCnyada `/start` ile karakter olu\u015Fturmas\u0131 gerekiyor." : `\u{1F4B8} **${target.username}** oyuncusuna **${amount2.toLocaleString("tr-TR")} Coin** g\xF6nderildi.`;
      return interaction.editReply(message);
    }
    const amount = interaction.options.getInteger("amount", true);
    await playAnimation(interaction, ["\u{1F3B0} Makine haz\u0131rlan\u0131yor...", "\u{1F3B0} Makaralar d\xF6n\xFCyor...", "\u{1F3B0} Son sembol bekleniyor..."]);
    const result = await gamble(worldId, interaction.user.id, amount, interaction.id);
    if (!result.ok) return interaction.editReply(result.reason === "insufficient_funds" ? "Bu bahis i\xE7in c\xFCzdan\u0131nda yeterli Coin yok." : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.");
    if (result.jackpot) return interaction.editReply(`\u{1F3B0} **JACKPOT!** **${result.payout.toLocaleString("tr-TR")} Coin** kazand\u0131n!`);
    return interaction.editReply(result.won ? `\u{1F3B2} Kazand\u0131n! **${result.payout.toLocaleString("tr-TR")} Coin** geri ald\u0131n.` : `\u{1F3B2} Bu tur olmad\u0131; **${amount.toLocaleString("tr-TR")} Coin** kaybettin. \u015Eans\u0131n\u0131 tekrar denemek i\xE7in yeniden oyna.`);
  }, "handleEndless");
}
__name(createEndlessHandler, "createEndlessHandler");

// ===== Oyun merkezi ve kalıcı blackjack =====
import { randomInt as randomInt3 } from "node:crypto";
import { fileURLToPath } from "node:url";
import { AttachmentBuilder, SlashCommandBuilder as SlashCommandBuilder3 } from "discord.js";
var MAX_BET = 1e5;
var SOCIAL_COOLDOWN_MS = 2e3;
var socialCooldowns = /* @__PURE__ */ new Map();
var ASSET_ROOT = fileURLToPath(new URL("./assets/gifs/", import.meta.url));
var SOCIAL_GIFS = Object.fromEntries(Object.keys({ hug: 1, kiss: 1, cuddle: 1, pat: 1, highfive: 1, boop: 1 }).map((name) => [name, `${ASSET_ROOT}/endless-${name}.gif`]));
var SLOTS = [
  { icon: "\u{1F352}", weight: 30, multiplier: 2 },
  { icon: "\u{1F34B}", weight: 25, multiplier: 2 },
  { icon: "\u{1F514}", weight: 18, multiplier: 3 },
  { icon: "\u{1F48E}", weight: 10, multiplier: 5 },
  { icon: "\u{1F319}", weight: 7, multiplier: 8 },
  { icon: "\u267E\uFE0F", weight: 2, multiplier: 20 }
];
var CARD_VALUES = { A: 11, K: 10, Q: 10, J: 10 };
var CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
var CARD_SUITS = ["\u2660\uFE0F", "\u2665\uFE0F", "\u2666\uFE0F", "\u2663\uFE0F"];
var SOCIAL_LINES = {
  hug: ["\u{1FAC2} Endless kollar\u0131n\u0131 a\xE7\u0131yor...", "\u{1FAC2} S\u0131cak bir enerji yakla\u015F\u0131yor...", "\u{1FAC2} sar\u0131ld\u0131! Sunucuya +100 ne\u015Fe yay\u0131ld\u0131."],
  kiss: ["\u{1F48B} Endless y\u0131ld\u0131z tozunu haz\u0131rl\u0131yor...", "\u{1F48B} Minik bir kalp hedefe u\xE7uyor...", "\u{1F48B} tatl\u0131 bir \xF6p\xFCc\xFCk g\xF6nderdi!"],
  cuddle: ["\u{1F9F8} Battaniye modu etkin...", "\u{1F9F8} Rahatl\u0131k seviyesi %99...", "\u{1F9F8} ile s\u0131cac\u0131k bir sar\u0131lma molas\u0131 ba\u015Flad\u0131."],
  pat: ["\u2728 Endless \u015Fefkat sens\xF6r\xFCn\xFC a\xE7\u0131yor...", "\u2728 Nazik bir dokunu\u015F haz\u0131rlan\u0131yor...", "\u2728 usulca ok\u015Fad\u0131: her \u015Fey yoluna girecek!"],
  highfive: ["\u{1F64C} Eller havaya...", "\u{1F64C} Zamanlama kilitlendi...", "\u{1F64C} ile kusursuz \xE7ak! Kombo tamamland\u0131."],
  boop: ["\u{1F449} Hedef kilitleniyor...", "\u{1F449} Minik bir d\xFCrtme y\xFCkleniyor...", "\u{1F449} burnuna tatl\u0131 bir p\u0131t yapt\u0131!"]
};
var gamesCommand = new SlashCommandBuilder3().setName("games").setDescription("ENDLESS'in \xF6zg\xFCn \u015Fans ve strateji oyunlar\u0131n\u0131 a\xE7.").addSubcommand((sub) => sub.setName("slots").setDescription("ENDLESS slot makinesinde Coin dene.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktar\u0131.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true))).addSubcommand((sub) => sub.setName("blackjack").setDescription("21'e yakla\u015F, da\u011F\u0131t\u0131c\u0131y\u0131 yen.").addIntegerOption((option) => option.setName("amount").setDescription("Yeni el i\xE7in bahis miktar\u0131.").setMinValue(1).setMaxValue(MAX_BET).setRequired(false))).addSubcommand((sub) => sub.setName("blackjack-status").setDescription("A\xE7\u0131k blackjack elini ve s\u0131radaki hamleni g\xF6r.")).addSubcommand((sub) => sub.setName("blackjack-hit").setDescription("Blackjack eline bir kart \xE7ek.")).addSubcommand((sub) => sub.setName("blackjack-stand").setDescription("Blackjack elinde kal ve da\u011F\u0131t\u0131c\u0131yla kar\u015F\u0131la\u015Ft\u0131r.")).addSubcommand((sub) => sub.setName("blackjack-cancel").setDescription("A\xE7\u0131k blackjack elini iptal et ve bahsi iade al.")).addSubcommand((sub) => sub.setName("mines").setDescription("Gizli may\u0131nlardan ka\xE7\u0131narak \xF6d\xFCl \xE7arpan\u0131n\u0131 b\xFCy\xFCt.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktar\u0131.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addIntegerOption((option) => option.setName("cell").setDescription("1-9 aras\u0131nda bir h\xFCcre se\xE7.").setMinValue(1).setMaxValue(9).setRequired(true))).addSubcommand((sub) => sub.setName("roulette").setDescription("K\u0131rm\u0131z\u0131, siyah veya ye\u015Fil rulet rengi se\xE7.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktar\u0131.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addStringOption((option) => option.setName("color").setDescription("Tahmin edece\u011Fin renk.").setRequired(true).addChoices({ name: "K\u0131rm\u0131z\u0131", value: "red" }, { name: "Siyah", value: "black" }, { name: "Ye\u015Fil", value: "green" }))).addSubcommand((sub) => sub.setName("crash").setDescription("\xC7arpan patlamadan \xF6nce g\xFCvenli kazanc\u0131 yakala.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktar\u0131.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addNumberOption((option) => option.setName("cashout").setDescription("Hedef \xE7arpan: 1.10 ile 5.00 aras\u0131.").setMinValue(1.1).setMaxValue(5).setRequired(true))).addSubcommand((sub) => sub.setName("daily-spin").setDescription("Her g\xFCn bir kez Endless \u015Eans \xC7ark\u0131 \xE7evir.")).addSubcommand((sub) => sub.setName("help").setDescription("Oyunlar\u0131n nas\u0131l oynand\u0131\u011F\u0131n\u0131 g\xF6r."));
var socialCommand = new SlashCommandBuilder3().setName("social").setDescription("ENDLESS'in \xF6zg\xFCn sosyal animasyonlar\u0131n\u0131 g\xF6nder.").addSubcommand((sub) => sub.setName("hug").setDescription("Bir oyuncuya s\u0131cac\u0131k sar\u0131l.").addUserOption((option) => option.setName("user").setDescription("Sar\u0131laca\u011F\u0131n oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("kiss").setDescription("Bir oyuncuya tatl\u0131 bir \xF6p\xFCc\xFCk g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("\xD6p\xFCc\xFCk g\xF6nderece\u011Fin oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("cuddle").setDescription("Bir oyuncuyla \u015Firin bir kucakla\u015Fma ba\u015Flat.").addUserOption((option) => option.setName("user").setDescription("Kucakla\u015Faca\u011F\u0131n oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("pat").setDescription("Bir oyuncuya moral veren nazik bir ok\u015Fama g\xF6nder.").addUserOption((option) => option.setName("user").setDescription("Ok\u015Fayaca\u011F\u0131n oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("highfive").setDescription("Bir oyuncuyla \xE7ak yap.").addUserOption((option) => option.setName("user").setDescription("\xC7ak yapaca\u011F\u0131n oyuncu.").setRequired(true))).addSubcommand((sub) => sub.setName("boop").setDescription("Bir oyuncunun burnuna tatl\u0131 bir p\u0131t yap.").addUserOption((option) => option.setName("user").setDescription("P\u0131t yapaca\u011F\u0131n oyuncu.").setRequired(true)));
function userName(user) {
  return user?.globalName ?? user?.username ?? "gizemli oyuncu";
}
__name(userName, "userName");
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep2, "sleep");
async function animate(interaction, frames) {
  for (const frame of frames) {
    await interaction.editReply({ content: frame, allowedMentions: { parse: [] } });
    await sleep2(260);
  }
}
__name(animate, "animate");
function weightedSlot() {
  const total = SLOTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = randomInt3(1, total + 1);
  for (const item of SLOTS) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return SLOTS[0];
}
__name(weightedSlot, "weightedSlot");
function cardKey(card) {
  return `${card.rank}:${card.suit}`;
}
__name(cardKey, "cardKey");
function createBlackjackDeck(excludedCards = []) {
  const excluded = new Set(excludedCards.map(cardKey));
  const deck = CARD_RANKS.flatMap((rank) => CARD_SUITS.map((suit) => ({ rank, suit }))).filter((card) => !excluded.has(cardKey(card)));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = randomInt3(0, index + 1);
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}
__name(createBlackjackDeck, "createBlackjackDeck");
function ensureBlackjackDeck(hand) {
  if (!Array.isArray(hand.deck) || hand.deck.length === 0) {
    hand.deck = createBlackjackDeck([...hand.player, ...hand.dealer]);
  }
}
__name(ensureBlackjackDeck, "ensureBlackjackDeck");
function drawCard(deck) {
  const card = deck.pop();
  if (!card) throw new Error("Blackjack shoe is empty.");
  return card;
}
__name(drawCard, "drawCard");
function cardText(card) {
  return `${card.rank}${card.suit}`;
}
__name(cardText, "cardText");
function handValue(hand) {
  let value = hand.reduce((sum, card) => sum + (CARD_VALUES[card.rank] ?? Number(card.rank)), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}
__name(handValue, "handValue");
function blackjackOutcome(playerHand, dealerHand, bet) {
  const player = handValue(playerHand);
  const dealer = handValue(dealerHand);
  const playerNatural = playerHand.length === 2 && player === 21;
  const dealerNatural = dealerHand.length === 2 && dealer === 21;
  if (playerNatural && dealerNatural) return { player, dealer, natural: true, win: false, push: true, payout: bet };
  if (playerNatural) return { player, dealer, natural: true, win: true, push: false, payout: bet + Math.floor(bet * 1.5) };
  if (dealerNatural) return { player, dealer, natural: true, win: false, push: false, payout: 0 };
  const win = player > dealer || dealer > 21;
  const push = player === dealer;
  return { player, dealer, natural: false, win, push, payout: win ? bet * 2 : push ? bet : 0 };
}
__name(blackjackOutcome, "blackjackOutcome");
function handText(hand) {
  return hand.map(cardText).join(" ");
}
__name(handText, "handText");
function createBlackjack() {
  const deck = createBlackjackDeck();
  const hand = { player: [], dealer: [], deck, bet: 0 };
  hand.player.push(drawCard(deck), drawCard(deck));
  hand.dealer.push(drawCard(deck), drawCard(deck));
  return hand;
}
__name(createBlackjack, "createBlackjack");
async function walletBet({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId, userId, amount, reason, interactionId }) {
  return inTransaction2(async (client) => {
    const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
    const wallet = result.rows[0];
    if (!wallet) return { ok: false, reason: "not_registered" };
    if (Number(wallet.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
    const inserted = await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: -amount, reason, idempotencyKey: `games:${reason}:${interactionId}` });
    if (!inserted) return { ok: false, reason: "duplicate" };
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, amount]);
    return { ok: true };
  });
}
__name(walletBet, "walletBet");
async function walletPayout({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId, userId, amount, reason, interactionId }) {
  return inTransaction2(async (client) => {
    const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
    if (!result.rows[0]) return { ok: false, reason: "not_registered" };
    const credited = Math.min(amount, Math.max(0, 2e9 - Number(result.rows[0].wallet_coins)));
    if (credited === 0) return { ok: true, credited: 0 };
    const inserted = await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: credited, reason, idempotencyKey: `games:${reason}:${interactionId}` });
    if (!inserted) return { ok: false, reason: "duplicate" };
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, credited]);
    return { ok: true, credited };
  });
}
__name(walletPayout, "walletPayout");
async function walletPayoutInTransaction(client, { insertLedger: insertLedger2, worldId, userId, amount, reason, interactionId }) {
  const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
  if (!result.rows[0]) return { ok: false, reason: "not_registered", credited: 0 };
  const credited = Math.min(amount, Math.max(0, 2e9 - Number(result.rows[0].wallet_coins)));
  if (credited === 0) return { ok: true, credited: 0 };
  const inserted = await insertLedger2(client, { worldId, userId, currency: "coin", walletDelta: credited, reason, idempotencyKey: `games:${reason}:${interactionId}` });
  if (!inserted) return { ok: false, reason: "duplicate", credited: 0 };
  await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, credited]);
  return { ok: true, credited };
}
__name(walletPayoutInTransaction, "walletPayoutInTransaction");
function notRegistered(result) {
  return result.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "";
}
__name(notRegistered, "notRegistered");
function betError(result, message) {
  if (result.reason === "not_registered") return notRegistered(result);
  return result.reason === "duplicate" ? "Bu oyun iste\u011Fi daha \xF6nce i\u015Flendi." : message;
}
__name(betError, "betError");
function createGamesHandler({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2 }) {
  async function slots(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const debit = await walletBet({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "slots_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(betError(debit, "Bu bahis i\xE7in yeterli Coin yok."));
    await animate(interaction, ["\u{1F3B0} ENDLESS makinesi uyan\u0131yor...", "\u{1F3B0} Makaralar d\xF6n\xFCyor...", "\u{1F3B0} \u015Eans \xE7ekirde\u011Fi kilitleniyor..."]);
    const reels = [weightedSlot(), weightedSlot(), weightedSlot()];
    const same = reels.every((item) => item.icon === reels[0].icon);
    const grossPayout = same ? amount * reels[0].multiplier : 0;
    let payout = 0;
    if (grossPayout) {
      const result = await walletPayout({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount: grossPayout, reason: "slots_payout", interactionId: interaction.id });
      payout = result.credited ?? 0;
    }
    const line = reels.map((item) => item.icon).join(" \u2502 ");
    return interaction.editReply(`${line}
${!grossPayout ? `Makaralar sustu. **${amount.toLocaleString("tr-TR")} Coin** gitti; tekrar denemek i\xE7in \u015Fans\u0131n\u0131 haz\u0131rla.` : `\u2728 **${reels[0].icon} ${reels[0].icon} ${reels[0].icon}**! **${payout.toLocaleString("tr-TR")} Coin** c\xFCzdan\u0131na eklendi${payout < grossPayout ? ` (\xF6d\xFCl\xFCn bakiyeye s\u0131\u011Fan k\u0131sm\u0131; c\xFCzdan s\u0131n\u0131r\u0131 ${grossPayout.toLocaleString("tr-TR")} Coin \xF6d\xFCl\xFC k\u0131s\u0131tlad\u0131)` : ""}.`}`);
  }
  __name(slots, "slots");
  async function blackjackStart(interaction) {
    const amount = interaction.options.getInteger("amount") ?? 0;
    if (amount < 1) return interaction.editReply("Yeni el ba\u015Flatmak i\xE7in `amount` belirtmelisin.");
    const result = await inTransaction2(async (client) => {
      const wallet = await client.query(
        "SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [interaction.guildId, interaction.user.id]
      );
      if (!wallet.rows[0]) return { ok: false, reason: "not_registered" };
      const existing = await client.query(
        "SELECT 1 FROM endless_blackjack_sessions WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [interaction.guildId, interaction.user.id]
      );
      if (existing.rows[0]) return { ok: false, reason: "already_active" };
      if (Number(wallet.rows[0].wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
      const inserted = await insertLedger2(client, {
        worldId: interaction.guildId,
        userId: interaction.user.id,
        currency: "coin",
        walletDelta: -amount,
        reason: "blackjack_bet",
        idempotencyKey: `games:blackjack_bet:${interaction.id}`
      });
      if (!inserted) return { ok: false, reason: "duplicate" };
      await client.query(
        "UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2",
        [interaction.guildId, interaction.user.id, amount]
      );
      const hand2 = createBlackjack();
      hand2.bet = amount;
      const opening = blackjackOutcome(hand2.player, hand2.dealer, amount);
      if (opening.natural) {
        let credited = 0;
        if (opening.payout > 0) {
          const payment = await walletPayoutInTransaction(client, {
            insertLedger: insertLedger2,
            worldId: interaction.guildId,
            userId: interaction.user.id,
            amount: opening.payout,
            reason: opening.push ? "blackjack_natural_push" : "blackjack_natural_payout",
            interactionId: interaction.id
          });
          if (!payment.ok) return payment;
          credited = payment.credited;
        }
        return { ok: true, hand: hand2, opening: { ...opening, credited } };
      }
      await client.query(
        `INSERT INTO endless_blackjack_sessions
          (world_id, user_id, interaction_id, player_hand, dealer_hand, deck, bet)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)`,
        [interaction.guildId, interaction.user.id, interaction.id, JSON.stringify(hand2.player), JSON.stringify(hand2.dealer), JSON.stringify(hand2.deck), amount]
      );
      return { ok: true, hand: hand2 };
    });
    if (!result.ok) {
      if (result.reason === "not_registered") return interaction.editReply(notRegistered(result));
      if (result.reason === "already_active") return interaction.editReply("Zaten a\xE7\u0131k bir blackjack elin var. `/games blackjack-status` ile elini g\xF6r, ard\u0131ndan hit/stand/cancel kullan.");
      if (result.reason === "duplicate") return interaction.editReply("Bu blackjack iste\u011Fi daha \xF6nce i\u015Flendi.");
      return interaction.editReply("Bu el i\xE7in yeterli Coin yok.");
    }
    const hand = result.hand;
    if (result.opening) {
      await animate(interaction, ["\u{1F0CF} \u0130lk kartlar a\xE7\u0131l\u0131yor...", "\u2728 Do\u011Fal blackjack kontrol ediliyor..."]);
      const opening = result.opening;
      const summary = opening.push
        ? `\u0130ki taraf\u0131n da do\u011Fal blackjack'i var; **${opening.credited.toLocaleString("tr-TR")} Coin** iade edildi.`
        : opening.win
          ? `Do\u011Fal blackjack! 3:2 ikramiyeyle toplam **${opening.credited.toLocaleString("tr-TR")} Coin** c\xFCzdan\u0131na eklendi.`
          : `Krupiyenin do\u011Fal blackjack'i var; **${amount.toLocaleString("tr-TR")} Coin** kaybettin.`;
      return interaction.editReply(`**Blackjack — Do\u011Fal 21**\nSen: ${handText(hand.player)} (**${handValue(hand.player)}**)\nKrupiye: ${handText(hand.dealer)} (**${handValue(hand.dealer)}**)\n${summary}`);
    }
    await animate(interaction, ["\u{1F0CF} ENDLESS krupiyesi kartlar\u0131 kar\u0131yor...", "\u{1F0CF} \u0130lk kartlar da\u011F\u0131t\u0131l\u0131yor...", "\u{1F0CF} Hamleni se\xE7: hit veya stand."]);
    return interaction.editReply(`**Blackjack**
Sen: ${handText(hand.player)} (**${handValue(hand.player)}**)
Da\u011F\u0131t\u0131c\u0131: ${cardText(hand.dealer[0])} \u2753
Bahis: **${amount.toLocaleString("tr-TR")} Coin**

devam: "/games blackjack-hit" veya "/games blackjack-stand"`);
  }
  __name(blackjackStart, "blackjackStart");
  async function blackjackStatus(interaction) {
    const result = await pool2.query(
      "SELECT player_hand, dealer_hand, bet FROM endless_blackjack_sessions WHERE world_id = $1 AND user_id = $2 LIMIT 1",
      [interaction.guildId, interaction.user.id]
    );
    const hand = result.rows[0];
    if (!hand) return interaction.editReply("A\xE7\u0131k bir blackjack elin yok. `/games blackjack amount:50` ile ba\u015Flayabilirsin.");
    return interaction.editReply(`**A\xE7\u0131k Blackjack Elin**
Sen: ${handText(hand.player_hand)} (**${handValue(hand.player_hand)}**)
Da\u011F\u0131t\u0131c\u0131: ${cardText(hand.dealer_hand[0])} \u2753
Bahis: **${Number(hand.bet).toLocaleString("tr-TR")} Coin**
Devam etmek i\xE7in hit, stand veya cancel kullan.`);
  }
  __name(blackjackStatus, "blackjackStatus");
  async function blackjackAction(interaction, action) {
    const result = await inTransaction2(async (client) => {
      const wallet = await client.query(
        "SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [interaction.guildId, interaction.user.id]
      );
      if (!wallet.rows[0]) return { ok: false, reason: "no_session" };
      const sessionResult = await client.query(
        `SELECT interaction_id, player_hand, dealer_hand, deck, bet
         FROM endless_blackjack_sessions
         WHERE world_id = $1 AND user_id = $2
         FOR UPDATE`,
        [interaction.guildId, interaction.user.id]
      );
      const session = sessionResult.rows[0];
      if (!session) return { ok: false, reason: "no_session" };
      const actionResult = await client.query(
        `INSERT INTO endless_blackjack_actions (world_id, user_id, interaction_id, action)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (world_id, user_id, interaction_id) DO NOTHING
         RETURNING interaction_id`,
        [interaction.guildId, interaction.user.id, interaction.id, action]
      );
      if (!actionResult.rows[0]) return { ok: false, reason: "duplicate" };
      const hand = {
        player: session.player_hand,
        dealer: session.dealer_hand,
        deck: session.deck ?? [],
        bet: Number(session.bet)
      };
      ensureBlackjackDeck(hand);
      if (action === "cancel") {
        const refund = await walletPayoutInTransaction(client, {
          insertLedger: insertLedger2,
          worldId: interaction.guildId,
          userId: interaction.user.id,
          amount: hand.bet,
          reason: "blackjack_cancel_refund",
          interactionId: interaction.id
        });
        if (!refund.ok) return refund;
        await client.query("DELETE FROM endless_blackjack_sessions WHERE world_id = $1 AND user_id = $2", [interaction.guildId, interaction.user.id]);
        return { ok: true, kind: "cancel", bet: hand.bet, refunded: refund.credited };
      }
      if (action === "hit") {
        const card = drawCard(hand.deck);
        hand.player.push(card);
        if (handValue(hand.player) > 21) {
          await client.query("DELETE FROM endless_blackjack_sessions WHERE world_id = $1 AND user_id = $2", [interaction.guildId, interaction.user.id]);
          return { ok: true, kind: "bust", hand };
        }
        await client.query(
          "UPDATE endless_blackjack_sessions SET player_hand = $3::jsonb, deck = $4::jsonb, updated_at = NOW() WHERE world_id = $1 AND user_id = $2",
          [interaction.guildId, interaction.user.id, JSON.stringify(hand.player), JSON.stringify(hand.deck)]
        );
        return { ok: true, kind: "hit", hand, card };
      }
      while (handValue(hand.dealer) < 17) hand.dealer.push(drawCard(hand.deck));
      const outcome = blackjackOutcome(hand.player, hand.dealer, hand.bet);
      const { player, dealer, win, push, payout, natural } = outcome;
      let credited = 0;
      if (payout > 0) {
        const paid = await walletPayoutInTransaction(client, {
          insertLedger: insertLedger2,
          worldId: interaction.guildId,
          userId: interaction.user.id,
          amount: payout,
          reason: natural ? push ? "blackjack_natural_push" : "blackjack_natural_payout" : push ? "blackjack_push" : "blackjack_payout",
          interactionId: interaction.id
        });
        if (!paid.ok) return paid;
        credited = paid.credited;
      }
      await client.query("DELETE FROM endless_blackjack_sessions WHERE world_id = $1 AND user_id = $2", [interaction.guildId, interaction.user.id]);
      return { ok: true, kind: "stand", hand, player, dealer, win, push, natural, credited };
    });
    if (!result.ok) {
      if (result.reason === "duplicate") return interaction.editReply("Bu hamle zaten i\u015Flendi. G\xFCncel elini `/games blackjack-status` ile kontrol et.");
      return interaction.editReply("A\xE7\u0131k bir blackjack elin yok. `/games blackjack amount:50` ile ba\u015Fla.");
    }
    if (result.kind === "cancel") return interaction.editReply(`Blackjack eli iptal edildi; **${result.refunded.toLocaleString("tr-TR")} Coin** iade edildi.`);
    if (result.kind === "bust") {
      await animate(interaction, ["\u{1F0CF} Yeni kart geliyor...", "\u{1F4A5} Elin 21'i a\u015Ft\u0131!"]);
      return interaction.editReply(`Sen: ${handText(result.hand.player)} (**${handValue(result.hand.player)}**) \u2014 **Batt\u0131n.** ${result.hand.bet.toLocaleString("tr-TR")} Coin kaybedildi.`);
    }
    if (result.kind === "hit") return interaction.editReply(`\u{1F0CF} Kart \xE7ekildi: ${handText(result.hand.player)} (**${handValue(result.hand.player)}**)
Da\u011F\u0131t\u0131c\u0131: ${cardText(result.hand.dealer[0])} \u2753
Hit veya stand se\xE7ebilirsin. Elin art\u0131k veritaban\u0131nda kay\u0131tl\u0131.`);
    await animate(interaction, ["\u{1F0CF} Da\u011F\u0131t\u0131c\u0131 kartlar\u0131n\u0131 a\xE7\u0131yor...", "\u{1F0CF} Sonu\xE7 hesaplan\u0131yor..."]);
    return interaction.editReply(`**Blackjack sonucu**
Sen: ${handText(result.hand.player)} (**${result.player}**)
Da\u011F\u0131t\u0131c\u0131: ${handText(result.hand.dealer)} (**${result.dealer}**)
${result.win ? `\u{1F3C6} Kazand\u0131n! **${result.credited.toLocaleString("tr-TR")} Coin** ald\u0131n.` : result.push ? `\u{1F91D} Berabere! **${result.credited.toLocaleString("tr-TR")} Coin** iade edildi.` : `\u{1F311} Bu eli da\u011F\u0131t\u0131c\u0131 ald\u0131. **${result.hand.bet.toLocaleString("tr-TR")} Coin** kaybedildi.`}`);
  }
  __name(blackjackAction, "blackjackAction");
  async function blackjackCancel(interaction) {
    return blackjackAction(interaction, "cancel");
  }
  __name(blackjackCancel, "blackjackCancel");
  async function mines(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const cell = interaction.options.getInteger("cell", true);
    const debit = await walletBet({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "mines_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(betError(debit, "Bu oyun i\xE7in yeterli Coin yok."));
    await animate(interaction, ["\u{1F4A3} ENDLESS may\u0131n tarlas\u0131n\u0131 kuruyor...", "\u{1F4A3} H\xFCcreler kar\u0131\u015Ft\u0131r\u0131l\u0131yor...", `\u{1F4A3} **${cell}** numaral\u0131 h\xFCcre a\xE7\u0131l\u0131yor...`]);
    const minesSet = /* @__PURE__ */ new Set();
    while (minesSet.size < 3) minesSet.add(randomInt3(1, 10));
    if (minesSet.has(cell)) return interaction.editReply(`\u{1F4A5} H\xFCcre **${cell}** may\u0131nd\u0131! **${amount.toLocaleString("tr-TR")} Coin** kaybedildi. Tahta: \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F`);
    const grossPayout = Math.floor(amount * (1.55 + cell % 3 * 0.2));
    const payment = await walletPayout({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount: grossPayout, reason: "mines_payout", interactionId: interaction.id });
    const payout = payment.credited ?? 0;
    return interaction.editReply(`\u2705 H\xFCcre **${cell}** g\xFCvenli! **${payout.toLocaleString("tr-TR")} Coin** c\xFCzdan\u0131na eklendi. Tahta: \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F \u25AB\uFE0F`);
  }
  __name(mines, "mines");
  async function roulette(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const chosenColor = interaction.options.getString("color", true);
    const debit = await walletBet({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "roulette_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(betError(debit, "Rulet i\xE7in yeterli Coin yok."));
    await animate(interaction, ["\u{1F3A1} Endless ruleti haz\u0131rlan\u0131yor...", "\u{1F3A1} Top d\xF6n\xFCyor...", "\u{1F3A1} Renk kilitleniyor..."]);
    const number = randomInt3(0, 37);
    const resultColor = number === 0 ? "green" : number <= 18 ? "red" : "black";
    const multiplier = resultColor === "green" ? 14 : 2;
    const grossPayout = resultColor === chosenColor ? amount * multiplier : 0;
    let payout = 0;
    if (grossPayout) {
      const payment = await walletPayout({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount: grossPayout, reason: "roulette_payout", interactionId: interaction.id });
      payout = payment.credited ?? 0;
    }
    const labels = { red: "K\u0131rm\u0131z\u0131", black: "Siyah", green: "Ye\u015Fil" };
    return interaction.editReply(`\u{1F3A1} Top **${number}** \xFCzerinde durdu: **${labels[resultColor]}**.
${!grossPayout ? `\u{1F311} Bu turda **${amount.toLocaleString("tr-TR")} Coin** kaybettin.` : `\u{1F3C6} Tahminin tuttu! **${payout.toLocaleString("tr-TR")} Coin** c\xFCzdan\u0131na eklendi.`}`);
  }
  __name(roulette, "roulette");
  async function crash(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const cashout = interaction.options.getNumber("cashout", true);
    const debit = await walletBet({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "crash_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(betError(debit, "Crash i\xE7in yeterli Coin yok."));
    await animate(interaction, ["\u{1F680} Endless roketi kalk\u0131yor...", "\u{1F680} \xC7arpan y\xFCkseliyor...", `\u{1F680} Hedef **x${cashout.toFixed(2)}** olarak ayarland\u0131...`]);
    const crashPoint = Math.round((1.1 + randomInt3(0, 391) / 100) * 100) / 100;
    if (cashout > crashPoint) return interaction.editReply(`\u{1F4A5} Roket **x${crashPoint.toFixed(2)}** noktas\u0131nda patlad\u0131. **${amount.toLocaleString("tr-TR")} Coin** kaybedildi.`);
    const payout = Math.floor(amount * cashout);
    const payment = await walletPayout({ pool: pool2, inTransaction: inTransaction2, insertLedger: insertLedger2, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: "crash_payout", interactionId: interaction.id });
    return interaction.editReply(`\u{1F680} Zaman\u0131nda \xE7ektin: **x${cashout.toFixed(2)}**! **${(payment.credited ?? 0).toLocaleString("tr-TR")} Coin** hesab\u0131na ge\xE7ti.`);
  }
  __name(crash, "crash");
  async function dailySpin(interaction) {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const result = await inTransaction2(async (client) => {
      const player = await client.query("SELECT 1 FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [interaction.guildId, interaction.user.id]);
      if (!player.rows[0]) return { ok: false, reason: "not_registered" };
      const rewardType = randomInt3(1, 101) <= 12 ? "gem" : "coin";
      const rewardAmount = rewardType === "gem" ? randomInt3(1, 4) : randomInt3(75, 301);
      const inserted = await client.query("INSERT INTO endless_daily_spins (world_id, user_id, spin_date, reward_type, reward_amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (world_id, user_id, spin_date) DO NOTHING RETURNING reward_type, reward_amount", [interaction.guildId, interaction.user.id, today, rewardType, rewardAmount]);
      if (!inserted.rows[0]) return { ok: false, reason: "already_spun" };
      await insertLedger2(client, { worldId: interaction.guildId, userId: interaction.user.id, currency: rewardType, walletDelta: rewardAmount, reason: "daily_spin", idempotencyKey: `daily-spin:${interaction.guildId}:${interaction.user.id}:${today}` });
      const column = rewardType === "gem" ? "wallet_gems" : "wallet_coins";
      await client.query(`UPDATE endless_wallets SET ${column} = LEAST(${column} + $3, $4), updated_at = NOW() WHERE world_id = $1 AND user_id = $2`, [interaction.guildId, interaction.user.id, rewardAmount, 2e9]);
      return { ok: true, rewardType, rewardAmount };
    });
    if (!result.ok) return interaction.editReply(result.reason === "not_registered" ? "\xD6nce `/start` ile karakter olu\u015Ftur." : "Bug\xFCnk\xFC \u015Eans \xC7ark\u0131 hakk\u0131n\u0131 zaten kulland\u0131n. Yar\u0131n tekrar d\xF6n!");
    await animate(interaction, ["\u{1F381} Endless \u015Eans \xC7ark\u0131 a\xE7\u0131l\u0131yor...", "\u{1F381} I\u015F\u0131klar d\xF6n\xFCyor...", "\u{1F381} \xD6d\xFCl cebine \u0131\u015F\u0131nlan\u0131yor..."]);
    return interaction.editReply(`\u{1F381} G\xFCnl\xFCk \xF6d\xFCl\xFCn haz\u0131r: **${result.rewardAmount} ${result.rewardType === "gem" ? "Gem" : "Coin"}**! Yar\u0131n yeniden gel.`);
  }
  __name(dailySpin, "dailySpin");
  return /* @__PURE__ */ __name(async function handleGames2(interaction) {
    const action = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: action === "blackjack-status" });
    if (action === "help") return interaction.editReply("**ENDLESS Oyunlar\u0131**\n`/games slots amount:50` \u2014 Slot\n`/games blackjack amount:50` \u2014 Blackjack ba\u015Flat; sonra hit/stand kullan\n`/games blackjack-status` \u2014 A\xE7\u0131k elini, bot yeniden ba\u015Flat\u0131lsa bile g\xF6r\n`/games mines amount:50 cell:4` \u2014 1-9 h\xFCcre se\xE7\n`/games roulette amount:50 color:red` \u2014 Rulet rengi tahmini\n`/games crash amount:50 cashout:2` \u2014 x2 olmadan \xF6nce g\xFCvenli \xE7ek\n`/games daily-spin` \u2014 Her g\xFCn bir kez \xFCcretsiz \xE7ark\nBahisler Coin c\xFCzdan\u0131ndan d\xFC\u015Fer; kazan\xE7lar otomatik eklenir.");
    if (action === "slots") return slots(interaction);
    if (action === "blackjack") return blackjackStart(interaction);
    if (action === "blackjack-status") return blackjackStatus(interaction);
    if (action === "blackjack-hit") return blackjackAction(interaction, "hit");
    if (action === "blackjack-stand") return blackjackAction(interaction, "stand");
    if (action === "blackjack-cancel") return blackjackCancel(interaction);
    if (action === "mines") return mines(interaction);
    if (action === "roulette") return roulette(interaction);
    if (action === "crash") return crash(interaction);
    return dailySpin(interaction);
  }, "handleGames");
}
__name(createGamesHandler, "createGamesHandler");
async function handleSocial(interaction) {
  const target = interaction.options.getUser("user", true);
  if (target.id === interaction.user.id) return interaction.reply({ content: "ENDLESS aynayla da etkile\u015Fim kurabilir ama bu hareketi ba\u015Fka bir oyuncuya g\xF6nderebilirsin.", allowedMentions: { parse: [] } });
  const key = `${interaction.guildId}:${interaction.user.id}`;
  const remaining = SOCIAL_COOLDOWN_MS - (Date.now() - (socialCooldowns.get(key) ?? 0));
  if (remaining > 0) return interaction.reply({ content: `Animasyon motoru nefesleniyor. **${Math.ceil(remaining / 1e3)} saniye** bekle.`, ephemeral: true });
  socialCooldowns.set(key, Date.now());
  const action = interaction.options.getSubcommand();
  const frames = SOCIAL_LINES[action];
  const name = userName(target);
  await interaction.deferReply();
  const personalized = frames.map((frame) => frame.replace("sar\u0131ld\u0131", `**${name}** ile sar\u0131ld\u0131`).replace("\xF6p\xFCc\xFCk g\xF6nderdi", `**${name}** oyuncusuna \xF6p\xFCc\xFCk g\xF6nderdi`).replace("bir kucakla\u015Fma molas\u0131 ba\u015Flad\u0131", `**${name}** ile kucakla\u015Fma molas\u0131 ba\u015Flad\u0131`).replace("usulca ok\u015Fad\u0131", `**${name}** oyuncusunu usulca ok\u015Fad\u0131`).replace("ile kusursuz \xE7ak", `**${name}** ile kusursuz \xE7ak`).replace("burnuna tatl\u0131 bir p\u0131t yapt\u0131", `**${name}** oyuncusunun burnuna tatl\u0131 bir p\u0131t yapt\u0131`));
  await animate(interaction, personalized);
  const gifPath = SOCIAL_GIFS[action];
  return interaction.editReply({
    content: `${personalized.at(-1)}
\u{1F39E}\uFE0F **Endless \xF6zel animasyonu**`,
    files: gifPath ? [new AttachmentBuilder(gifPath)] : [],
    allowedMentions: { parse: [] }
  });
}
__name(handleSocial, "handleSocial");

// index.js
var { Pool } = pg;
var logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var MAX_BALANCE = 2e9;
var STARTING_COINS = 100;
var STARTING_GEMS = 5;
var EXPLORE_COOLDOWN_MS = 5 * 60 * 1e3;
var CURRENCY_COLUMNS = {
  coin: { wallet: "wallet_coins", bank: "bank_coins", label: "Coin" },
  gem: { wallet: "wallet_gems", bank: "bank_gems", label: "Gem" }
};
var ITEM_CATALOG = {
  trail_blade: {
    name: "Ka\u015Fif K\u0131l\u0131c\u0131",
    description: "Ke\u015Fiflerde %12 daha fazla Coin ve sava\u015Fta +5 sald\u0131r\u0131 sa\u011Flar.",
    kind: "equipment",
    slot: "weapon",
    price: { currency: "coin", amount: 700 },
    effects: { coinBonusPercent: 12, attackBonus: 5 }
  },
  scout_cloak: {
    name: "\u0130zci Pelerini",
    description: "Ke\u015Fiflerde %15 daha fazla XP ve sava\u015Fta +3 savunma sa\u011Flar.",
    kind: "equipment",
    slot: "armor",
    price: { currency: "coin", amount: 650 },
    effects: { xpBonusPercent: 15, defenseBonus: 3 }
  },
  lucky_compass: {
    name: "\u015Eans Pusulas\u0131",
    description: "Gem bulma ihtimalini ve kritik vuru\u015F \u015Fans\u0131n\u0131 5 puan art\u0131r\u0131r.",
    kind: "equipment",
    slot: "charm",
    price: { currency: "gem", amount: 4 },
    effects: { gemChanceBonus: 5, critChanceBonus: 5 }
  },
  xp_tonic: {
    name: "Bilgi Toni\u011Fi",
    description: "Kullan\u0131ld\u0131\u011F\u0131nda 50 XP verir.",
    kind: "consumable",
    price: { currency: "coin", amount: 180 },
    useXp: 50
  }
};
var EQUIPMENT_SLOTS = [
  { name: "Silah", value: "weapon" },
  { name: "Z\u0131rh", value: "armor" },
  { name: "T\u0131ls\u0131m", value: "charm" }
];
var DUNGEON_ENTRY_FEE = 50;
var DUNGEON_COOLDOWN_MS = 20 * 60 * 1e3;
var DUNGEON_CLEAR_REWARD = { coins: 240, gems: 2, bonusXp: 80 };
var DUNGEON_ENEMIES = [
  {
    name: "K\xFCl Slime'\u0131",
    title: "1. Dalga",
    maxHp: 42,
    minAttack: 7,
    maxAttack: 11,
    xp: 18
  },
  {
    name: "Harabe Bek\xE7isi",
    title: "2. Dalga",
    maxHp: 72,
    minAttack: 9,
    maxAttack: 13,
    xp: 28
  },
  {
    name: "K\xFCl Ejderhas\u0131",
    title: "Boss",
    maxHp: 135,
    minAttack: 13,
    maxAttack: 18,
    xp: 60
  }
];
var DAILY_QUESTS = [
  {
    key: "explore_three",
    title: "Haritac\u0131",
    description: "Bug\xFCn 3 ke\u015Fif tamamla.",
    activity: "explore",
    target: 3,
    rewardCoins: 160,
    rewardGems: 0,
    rewardXp: 40
  },
  {
    key: "claim_daily",
    title: "G\xFCne Ba\u015Fla",
    description: "G\xFCnl\xFCk \xF6d\xFCl\xFCn\xFC al.",
    activity: "daily_claim",
    target: 1,
    rewardCoins: 100,
    rewardGems: 1,
    rewardXp: 0
  },
  {
    key: "bank_coin_250",
    title: "Gelece\u011Fe Yat\u0131r\u0131m",
    description: "Bankaya toplam 250 Coin yat\u0131r.",
    activity: "bank_coin_deposit",
    target: 250,
    rewardCoins: 120,
    rewardGems: 0,
    rewardXp: 30
  }
];
var ACHIEVEMENTS = [
  { key: "first_step", title: "\u0130lk Ad\u0131m", description: "ENDLESS d\xFCnyas\u0131nda karakter olu\u015Ftur.", rewardCoins: 50, rewardGems: 1, rewardXp: 10 },
  { key: "level_five", title: "\xC7\u0131rak Ka\u015Fif", description: "5. seviyeye ula\u015F.", rewardCoins: 250, rewardGems: 2, rewardXp: 40 },
  { key: "fortune_hunter", title: "\u015Eans Avc\u0131s\u0131", description: "Slot oyununda 3 kez kazan\xE7 al.", rewardCoins: 300, rewardGems: 2, rewardXp: 50 },
  { key: "high_roller", title: "B\xFCy\xFCk Oyuncu", description: "Oyunlarda toplam 1.000 Coin bahis yap.", rewardCoins: 350, rewardGems: 3, rewardXp: 60 },
  { key: "collector", title: "Koleksiyoncu", description: "En az 5 farkl\u0131 hayvan t\xFCr\xFC ke\u015Ffet.", rewardCoins: 400, rewardGems: 3, rewardXp: 70 },
  { key: "dungeon_master", title: "Zindan Ustas\u0131", description: "K\xFCl Harabeleri'ni en az bir kez temizle.", rewardCoins: 500, rewardGems: 4, rewardXp: 100 }
];
var PET_SPECIES = {
  fox: { label: "Kristal Tilki", emoji: "\u{1F98A}", bonus: "Ke\u015Fif ve av Coin \xF6d\xFCllerine sadakatine g\xF6re +%1\u201310" },
  dragon: { label: "K\xFCl Ejderhas\u0131", emoji: "\u{1F409}", bonus: "Zindan sald\u0131r\u0131lar\u0131na sadakatine g\xF6re +1\u20135 hasar" },
  owl: { label: "Bilge Bayku\u015F", emoji: "\u{1F989}", bonus: "Ke\u015Fif, av ve g\xF6rev XP \xF6d\xFCllerine sadakatine g\xF6re +%1\u201310" },
  slime: { label: "Ne\u015Fe Slime'\u0131", emoji: "\u{1F7E2}", bonus: "Dua Coin \xF6d\xFCllerine sadakatine g\xF6re +%1\u201310" }
};
function itemPriceLabel(item) {
  const currency = CURRENCY_COLUMNS[item.price.currency].label;
  return `${item.price.amount.toLocaleString("tr-TR")} ${currency}`;
}
__name(itemPriceLabel, "itemPriceLabel");
function getItemDefinition(itemKey) {
  return Object.hasOwn(ITEM_CATALOG, itemKey) ? ITEM_CATALOG[itemKey] : null;
}
__name(getItemDefinition, "getItemDefinition");
var catalogEntries = Object.entries(ITEM_CATALOG);
var equipmentChoices = catalogEntries.filter(([, item]) => item.kind === "equipment").map(([key, item]) => ({ name: item.name, value: key }));
var consumableChoices = catalogEntries.filter(([, item]) => item.kind === "consumable").map(([key, item]) => ({ name: item.name, value: key }));
var shopItemChoices = catalogEntries.map(([key, item]) => ({
  name: `${item.name} \xB7 ${itemPriceLabel(item)}`,
  value: key
}));
var commandData = [
  new SlashCommandBuilder4().setName("start").setDescription("Bu sunucuda kendi ENDLESS karakterini olu\u015Ftur ve macerana ba\u015Fla."),
  new SlashCommandBuilder4().setName("world").setDescription("Sunucunun ENDLESS d\xFCnyas\u0131n\u0131, oyuncu say\u0131s\u0131n\u0131 ve canl\u0131 durumunu g\xF6r.").addSubcommand(
    (subcommand) => subcommand.setName("status").setDescription("D\xFCnya ad\u0131n\u0131 ve toplam macerac\u0131 say\u0131s\u0131n\u0131 g\xF6r\xFCnt\xFCle.")
  ),
  new SlashCommandBuilder4().setName("player").setDescription("Karakter profilini, seviyeni ve d\xFCnya s\u0131ralamas\u0131n\u0131 incele.").addSubcommandGroup(
    (group) => group.setName("profile").setDescription("Senin veya se\xE7ti\u011Fin oyuncunun karakter profilini g\xF6r\xFCnt\xFCle.").addSubcommand(
      (subcommand) => subcommand.setName("show").setDescription("Bir oyuncunun seviye, XP ve varl\u0131klar\u0131n\u0131 g\xF6ster.").addUserOption(
        (option) => option.setName("user").setDescription("Profili g\xF6r\xFCnt\xFClenecek oyuncu.").setRequired(false)
      )
    )
  ).addSubcommandGroup(
    (group) => group.setName("ranking").setDescription("Level, Coin veya Gem alan\u0131nda en iyi oyuncular\u0131 g\xF6r.").addSubcommand(
      (subcommand) => subcommand.setName("leaderboard").setDescription("D\xFCnyan\u0131n en iyi 10 oyuncusunu se\xE7ti\u011Fin \xF6l\xE7\xFCte g\xF6re s\u0131rala.").addStringOption(
        (option) => option.setName("metric").setDescription("S\u0131ralama \xF6l\xE7\xFCt\xFC.").setRequired(false).addChoices(
          { name: "Level", value: "level" },
          { name: "C\xFCzdan Coin", value: "coins" },
          { name: "C\xFCzdan Gem", value: "gems" }
        )
      )
    )
  ),
  new SlashCommandBuilder4().setName("economy").setDescription("C\xFCzdan\u0131n\u0131 ve bankan\u0131 y\xF6net.").addSubcommandGroup(
    (group) => group.setName("wallet").setDescription("C\xFCzdan\u0131ndaki harcanabilir Coin ve Gem miktar\u0131n\u0131 g\xF6r.").addSubcommand(
      (subcommand) => subcommand.setName("balance").setDescription("Anl\u0131k Coin ve Gem c\xFCzdan bakiyeni h\u0131zl\u0131ca g\xF6r\xFCnt\xFCle.")
    )
  ).addSubcommandGroup(
    (group) => group.setName("bank").setDescription("Birikimlerini g\xFCvenle y\xF6net ve banka i\u015Flemlerini yap.").addSubcommand(
      (subcommand) => subcommand.setName("balance").setDescription("C\xFCzdan ve banka bakiyelerini g\xF6ster.")
    ).addSubcommand(
      (subcommand) => subcommand.setName("deposit").setDescription("Coin veya Gem biriktirmek i\xE7in bankaya para yat\u0131r.").addStringOption(
        (option) => option.setName("currency").setDescription("Yat\u0131r\u0131lacak para birimi.").setRequired(true).addChoices(
          { name: "Coin", value: "coin" },
          { name: "Gem", value: "gem" }
        )
      ).addIntegerOption(
        (option) => option.setName("amount").setDescription("Yat\u0131r\u0131lacak miktar.").setMinValue(1).setRequired(true)
      )
    ).addSubcommand(
      (subcommand) => subcommand.setName("withdraw").setDescription("Harcamak i\xE7in bankadaki Coin veya Gem paran\u0131 \xE7ek.").addStringOption(
        (option) => option.setName("currency").setDescription("\xC7ekilecek para birimi.").setRequired(true).addChoices(
          { name: "Coin", value: "coin" },
          { name: "Gem", value: "gem" }
        )
      ).addIntegerOption(
        (option) => option.setName("amount").setDescription("\xC7ekilecek miktar.").setMinValue(1).setRequired(true)
      )
    )
  ),
  new SlashCommandBuilder4().setName("adventure").setDescription("G\xFCnl\xFCk \xF6d\xFCl\xFCn\xFC al, ke\u015Ffe \xE7\u0131k ve macera XP\u2019si kazan.").addSubcommandGroup(
    (group) => group.setName("daily").setDescription("Seri bonusunu koruyarak g\xFCnl\xFCk \xF6d\xFCl\xFCn\xFC al.").addSubcommand(
      (subcommand) => subcommand.setName("claim").setDescription("G\xFCnl\xFCk Coin, Gem ve seri bonusunu ka\xE7\u0131rmadan al.")
    )
  ).addSubcommandGroup(
    (group) => group.setName("journey").setDescription("Cooldown sonunda yeniden ke\u015Ffe \xE7\u0131k ve rastgele olaylar\u0131 ke\u015Ffet.").addSubcommand(
      (subcommand) => subcommand.setName("explore").setDescription("XP, Coin, Gem ve s\xFCrpriz olaylar i\xE7in ke\u015Ffe \xE7\u0131k.")
    )
  ),
  new SlashCommandBuilder4().setName("dungeon").setDescription("K\xFCl Harabeleri\u2019nde \xFC\xE7 dalgay\u0131 a\u015F, boss\u2019u yen ve b\xFCy\xFCk \xF6d\xFCl\xFC kap.").addSubcommand(
    (subcommand) => subcommand.setName("enter").setDescription("50 Coin \xF6deyerek \xFC\xE7 a\u015Famal\u0131 K\xFCl Harabeleri ko\u015Fusunu ba\u015Flat.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("status").setDescription("Mevcut dalga, HP, d\xFC\u015Fman ve cooldown durumunu kontrol et.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("fight").setDescription("D\xFC\u015Fmana sald\u0131r, hasar ver ve kar\u015F\u0131 sald\u0131r\u0131ya haz\u0131rlan.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("retreat").setDescription("Ko\u015Fuyu b\u0131rak; giri\u015F bedeli iade edilmez ve cooldown ba\u015Flar.")
  ),
  new SlashCommandBuilder4().setName("quest").setDescription("G\xFCnl\xFCk hedeflerini tamamla, ilerlemeni g\xF6r ve \xF6d\xFClleri topla.").addSubcommand(
    (subcommand) => subcommand.setName("board").setDescription("Bug\xFCn\xFCn g\xF6revlerini, ilerlemelerini ve \xF6d\xFCllerini listele.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("claim").setDescription("Tamamlad\u0131\u011F\u0131n g\xFCnl\xFCk g\xF6revin \xF6d\xFCl\xFCn\xFC g\xFCvenle teslim al.").addStringOption(
      (option) => option.setName("quest").setDescription("\xD6d\xFCl\xFCn\xFC alaca\u011F\u0131n g\xF6rev.").setRequired(true).addChoices(
        ...DAILY_QUESTS.map((quest) => ({
          name: quest.title,
          value: quest.key
        }))
      )
    )
  ),
  new SlashCommandBuilder4().setName("shop").setDescription("G\xFC\xE7l\xFC ekipmanlar\u0131 ve t\xFCketilebilir e\u015Fyalar\u0131 incele, sat\u0131n al.").addSubcommand(
    (subcommand) => subcommand.setName("browse").setDescription("T\xFCm ekipmanlar\u0131, etkilerini ve g\xFCncel fiyatlar\u0131n\u0131 g\xF6r.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("buy").setDescription("C\xFCzdan\u0131ndaki para ile se\xE7ti\u011Fin e\u015Fyadan sat\u0131n al.").addStringOption(
      (option) => option.setName("item").setDescription("Sat\u0131n al\u0131nacak e\u015Fya.").setRequired(true).addChoices(...shopItemChoices)
    ).addIntegerOption(
      (option) => option.setName("quantity").setDescription("Adet (en fazla 10).").setMinValue(1).setMaxValue(10).setRequired(false)
    )
  ),
  new SlashCommandBuilder4().setName("inventory").setDescription("Envanterini d\xFCzenle, ekipman ku\u015Fan ve e\u015Fyalar\u0131n\u0131 kullan.").addSubcommand(
    (subcommand) => subcommand.setName("bag").setDescription("\xC7antandaki e\u015Fyalar\u0131 ve aktif ekipman bonuslar\u0131n\u0131 g\xF6r.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("equip").setDescription("Sahip oldu\u011Fun ekipman\u0131 do\u011Fru slota ku\u015Fan ve bonus kazan.").addStringOption(
      (option) => option.setName("item").setDescription("Ku\u015Fan\u0131lacak ekipman.").setRequired(true).addChoices(...equipmentChoices)
    )
  ).addSubcommand(
    (subcommand) => subcommand.setName("unequip").setDescription("Se\xE7ti\u011Fin ekipman slotunu bo\u015Falt ve bonusu kald\u0131r.").addStringOption(
      (option) => option.setName("slot").setDescription("Bo\u015Falt\u0131lacak yuva.").setRequired(true).addChoices(...EQUIPMENT_SLOTS)
    )
  ).addSubcommand(
    (subcommand) => subcommand.setName("use").setDescription("T\xFCketilebilir e\u015Fyan\u0131 kullanarak an\u0131nda XP kazan.").addStringOption(
      (option) => option.setName("item").setDescription("Kullan\u0131lacak t\xFCketilebilir e\u015Fya.").setRequired(true).addChoices(...consumableChoices)
    ).addIntegerOption(
      (option) => option.setName("quantity").setDescription("Kullan\u0131lacak adet (en fazla 10).").setMinValue(1).setMaxValue(10).setRequired(false)
    )
  ),
  new SlashCommandBuilder4().setName("help").setDescription("T\xFCm ENDLESS oyun, ekonomi, macera ve e\u011Flence komutlar\u0131n\u0131 ke\u015Ffet."),
  new SlashCommandBuilder4().setName("achievements").setDescription("Rozetlerini, ilerlemeni ve a\xE7\u0131labilir ba\u015Far\u0131mlar\u0131n\u0131 g\xF6r.").addSubcommand(
    (subcommand) => subcommand.setName("show").setDescription("T\xFCm ba\u015Far\u0131mlar\u0131n\u0131 ve mevcut ilerlemeni listele.")
  ).addSubcommand(
    (subcommand) => subcommand.setName("claim").setDescription("Tamamlad\u0131\u011F\u0131n ba\u015Far\u0131m\u0131n tek seferlik \xF6d\xFCl\xFCn\xFC al.").addStringOption(
      (option) => option.setName("achievement").setDescription("\xD6d\xFCl\xFC al\u0131nacak ba\u015Far\u0131m.").setRequired(true).addChoices(...ACHIEVEMENTS.map(({ key, title }) => ({ name: title, value: key })))
    )
  ),
  new SlashCommandBuilder4().setName("pet").setDescription("Kendi Endless Yolda\u015F\u0131n\u0131 sahiplen, besle ve sadakatini art\u0131r.").addSubcommand(
    (subcommand) => subcommand.setName("adopt").setDescription("Bir yolda\u015F sahiplen ve ona isim ver.").addStringOption((option) => option.setName("species").setDescription("Yolda\u015F t\xFCr\xFC.").setRequired(true).addChoices({ name: "Kristal Tilki", value: "fox" }, { name: "K\xFCl Ejderhas\u0131", value: "dragon" }, { name: "Bilge Bayku\u015F", value: "owl" }, { name: "Ne\u015Fe Slime'\u0131", value: "slime" })).addStringOption((option) => option.setName("name").setDescription("Yolda\u015F\u0131n\u0131n ad\u0131.").setMinLength(2).setMaxLength(24).setRequired(true))
  ).addSubcommand((subcommand) => subcommand.setName("show").setDescription("Yolda\u015F\u0131n\u0131 ve sadakat seviyesini g\xF6r.")).addSubcommand((subcommand) => subcommand.setName("feed").setDescription("25 Coin harcayarak yolda\u015F\u0131n\u0131n sadakatini art\u0131r.")),
  new SlashCommandBuilder4().setName("event").setDescription("Sunucunun ortak D\xFCnya Boss etkinli\u011Fine kat\u0131l.").addSubcommand((subcommand) => subcommand.setName("status").setDescription("Ortak bossun kalan can\u0131n\u0131 ve etkinlik durumunu g\xF6r.")).addSubcommand((subcommand) => subcommand.setName("attack").setDescription("20 Coin \xF6deyip boss'a sald\u0131r ve katk\u0131 puan\u0131 kazan.")).addSubcommand((subcommand) => subcommand.setName("leaderboard").setDescription("Boss sava\u015F\u0131ndaki en y\xFCksek hasar katk\u0131lar\u0131n\u0131 g\xF6r.")),
  new SlashCommandBuilder4().setName("arena").setDescription("ENDLESS Arena'da Coin bahisli PvP d\xFCellosuna \xE7\u0131k.").addSubcommand((subcommand) => subcommand.setName("duel").setDescription("Bir oyuncuyla bahisli d\xFCello yap.").addUserOption((option) => option.setName("user").setDescription("D\xFCello rakibin.").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("\u0130ki oyuncunun da yat\u0131raca\u011F\u0131 Coin.").setMinValue(10).setMaxValue(5e4).setRequired(true))).addSubcommand((subcommand) => subcommand.setName("stats").setDescription("Arena galibiyetlerini, kay\u0131plar\u0131n\u0131 ve rating'ini g\xF6r.")).addSubcommand((subcommand) => subcommand.setName("leaderboard").setDescription("Sunucunun en iyi Arena oyuncular\u0131n\u0131 g\xF6r.")),
  funCommand,
  endlessCommand,
  gamesCommand,
  socialCommand
];
var commandNames = new Set(commandData.map((command) => command.name));
function loggerError(error, context) {
  logger.error(
    {
      err: error,
      errorCode: error?.code,
      databaseConstraint: error?.constraint,
      ...context
    },
    error?.message ?? "Unhandled ENDLESS error"
  );
}
__name(loggerError, "loggerError");
async function ensureDatabaseSchema() {
  const schemaUrl = new URL("./database/schema.sql", import.meta.url);
  const schema = readFileSync(schemaUrl, "utf8");
  await pool.query(schema);
  logger.info("PostgreSQL \u015Femas\u0131 do\u011Fruland\u0131.");
}
__name(ensureDatabaseSchema, "ensureDatabaseSchema");
function utcDateString(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
__name(utcDateString, "utcDateString");
function applyXp(level, currentXp, xpAwarded) {
  let nextLevel = level;
  let nextXp = currentXp + xpAwarded;
  let levelsGained = 0;
  while (nextXp >= nextLevel * 100) {
    nextXp -= nextLevel * 100;
    nextLevel += 1;
    levelsGained += 1;
  }
  return { level: nextLevel, xp: nextXp, levelsGained };
}
__name(applyXp, "applyXp");
async function inTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError) => {
      loggerError(rollbackError, { operation: "transaction_rollback" });
    });
    throw error;
  } finally {
    client.release();
  }
}
__name(inTransaction, "inTransaction");
async function insertLedger(client, input) {
  const result = await client.query(
    `INSERT INTO endless_ledger
      (world_id, user_id, currency, wallet_delta, bank_delta, reason, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [
      input.worldId,
      input.userId,
      input.currency,
      input.walletDelta ?? 0,
      input.bankDelta ?? 0,
      input.reason,
      input.idempotencyKey
    ]
  );
  return result.rowCount === 1;
}
__name(insertLedger, "insertLedger");
async function ensureDailyQuestRows(client, worldId, userId, questDate) {
  await client.query(
    `INSERT INTO endless_daily_quest_progress
      (world_id, user_id, quest_date, quest_key)
     VALUES
      ($1, $2, $3, 'explore_three'),
      ($1, $2, $3, 'claim_daily'),
      ($1, $2, $3, 'bank_coin_250')
     ON CONFLICT (world_id, user_id, quest_date, quest_key) DO NOTHING`,
    [worldId, userId, questDate]
  );
}
__name(ensureDailyQuestRows, "ensureDailyQuestRows");
async function advanceDailyQuest(client, input) {
  const quest = DAILY_QUESTS.find(
    (candidate) => candidate.activity === input.activity
  );
  if (!quest) {
    return;
  }
  await ensureDailyQuestRows(
    client,
    input.worldId,
    input.userId,
    input.questDate
  );
  await client.query(
    `UPDATE endless_daily_quest_progress
     SET progress = LEAST(progress + $5, $6)
     WHERE world_id = $1
       AND user_id = $2
       AND quest_date = $3
       AND quest_key = $4`,
    [
      input.worldId,
      input.userId,
      input.questDate,
      quest.key,
      input.amount ?? 1,
      quest.target
    ]
  );
}
__name(advanceDailyQuest, "advanceDailyQuest");
async function createOrUpdatePlayer(input) {
  return inTransaction(async (client) => {
    await client.query(
      `INSERT INTO endless_worlds (guild_id, name)
       VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE
       SET name = EXCLUDED.name, updated_at = NOW()`,
      [input.worldId, input.worldName]
    );
    await client.query(
      `INSERT INTO endless_accounts (user_id, username, global_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET username = EXCLUDED.username,
           global_name = EXCLUDED.global_name,
           updated_at = NOW()`,
      [input.userId, input.username, input.globalName]
    );
    const insertedPlayer = await client.query(
      `INSERT INTO endless_players (world_id, user_id, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (world_id, user_id) DO NOTHING
       RETURNING user_id`,
      [input.worldId, input.userId, input.displayName]
    );
    await client.query(
      `UPDATE endless_players
       SET display_name = $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, input.displayName]
    );
    const wallet = await client.query(
      `INSERT INTO endless_wallets
        (world_id, user_id, wallet_coins, wallet_gems)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (world_id, user_id) DO NOTHING
       RETURNING user_id`,
      [input.worldId, input.userId, STARTING_COINS, STARTING_GEMS]
    );
    if (wallet.rowCount === 1) {
      const ledgerEntries = [
        {
          currency: "coin",
          amount: STARTING_COINS,
          suffix: "coin"
        },
        {
          currency: "gem",
          amount: STARTING_GEMS,
          suffix: "gem"
        }
      ];
      for (const entry of ledgerEntries) {
        const inserted = await insertLedger(client, {
          worldId: input.worldId,
          userId: input.userId,
          currency: entry.currency,
          walletDelta: entry.amount,
          reason: "welcome_grant",
          idempotencyKey: `welcome:${input.worldId}:${input.userId}:${entry.suffix}`
        });
        if (!inserted) {
          throw new Error("Welcome reward ledger idempotency check failed.");
        }
      }
    }
    return { created: insertedPlayer.rowCount === 1, walletCreated: wallet.rowCount === 1 };
  });
}
__name(createOrUpdatePlayer, "createOrUpdatePlayer");
async function getWorldStatus(worldId, worldName) {
  return inTransaction(async (client) => {
    await client.query(
      `INSERT INTO endless_worlds (guild_id, name)
       VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE
       SET name = EXCLUDED.name, updated_at = NOW()`,
      [worldId, worldName]
    );
    const result = await client.query(
      `SELECT COUNT(*)::int AS player_count
       FROM endless_players
       WHERE world_id = $1`,
      [worldId]
    );
    return { playerCount: result.rows[0].player_count };
  });
}
__name(getWorldStatus, "getWorldStatus");
async function getPlayerProfile(worldId, userId) {
  const result = await pool.query(
    `SELECT p.user_id, p.display_name, p.level, p.xp,
            a.username, a.global_name,
            COALESCE(w.wallet_coins, 0)::int AS wallet_coins,
            COALESCE(w.bank_coins, 0)::int AS bank_coins,
            COALESCE(w.wallet_gems, 0)::int AS wallet_gems,
            COALESCE(w.bank_gems, 0)::int AS bank_gems
     FROM endless_players p
     JOIN endless_accounts a ON a.user_id = p.user_id
     LEFT JOIN endless_wallets w
       ON w.world_id = p.world_id AND w.user_id = p.user_id
     WHERE p.world_id = $1 AND p.user_id = $2
     LIMIT 1`,
    [worldId, userId]
  );
  return result.rows[0] ?? null;
}
__name(getPlayerProfile, "getPlayerProfile");
async function getLeaderboard(worldId, metric) {
  const orderBy = {
    level: "p.level DESC, p.xp DESC",
    coins: "COALESCE(w.wallet_coins, 0) DESC, p.level DESC, p.xp DESC",
    gems: "COALESCE(w.wallet_gems, 0) DESC, p.level DESC, p.xp DESC"
  }[metric];
  if (!orderBy) {
    throw new Error(`Unsupported leaderboard metric: ${metric}`);
  }
  const result = await pool.query(
    `SELECT p.user_id, p.display_name, p.level, p.xp,
            COALESCE(w.wallet_coins, 0)::int AS wallet_coins,
            COALESCE(w.wallet_gems, 0)::int AS wallet_gems
     FROM endless_players p
     LEFT JOIN endless_wallets w
       ON w.world_id = p.world_id AND w.user_id = p.user_id
     WHERE p.world_id = $1
     ORDER BY ${orderBy}
     LIMIT 10`,
    [worldId]
  );
  return result.rows;
}
__name(getLeaderboard, "getLeaderboard");
async function getWallet(worldId, userId) {
  const result = await pool.query(
    `SELECT wallet_coins, bank_coins, wallet_gems, bank_gems
     FROM endless_wallets
     WHERE world_id = $1 AND user_id = $2
     LIMIT 1`,
    [worldId, userId]
  );
  return result.rows[0] ?? null;
}
__name(getWallet, "getWallet");
async function moveFunds(input) {
  if (!Number.isSafeInteger(input.amount) || input.amount < 1) {
    return { ok: false, reason: "invalid_amount" };
  }
  const columns = CURRENCY_COLUMNS[input.currency];
  if (!columns) {
    return { ok: false, reason: "invalid_currency" };
  }
  return inTransaction(async (client) => {
    const walletResult = await client.query(
      `SELECT wallet_coins, bank_coins, wallet_gems, bank_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { ok: false, reason: "not_registered" };
    }
    const fromBalance = input.action === "deposit" ? wallet[columns.wallet] : wallet[columns.bank];
    const toBalance = input.action === "deposit" ? wallet[columns.bank] : wallet[columns.wallet];
    if (fromBalance < input.amount) {
      return { ok: false, reason: "insufficient_funds" };
    }
    if (toBalance + input.amount > MAX_BALANCE) {
      return { ok: false, reason: "balance_limit" };
    }
    const walletDelta = input.action === "deposit" ? -input.amount : input.amount;
    const bankDelta = input.action === "deposit" ? input.amount : -input.amount;
    const inserted = await insertLedger(client, {
      worldId: input.worldId,
      userId: input.userId,
      currency: input.currency,
      walletDelta,
      bankDelta,
      reason: `bank_${input.action}`,
      idempotencyKey: `bank:${input.worldId}:${input.userId}:${input.interactionId}`
    });
    if (!inserted) {
      return { ok: false, reason: "duplicate_request" };
    }
    const nextWallet = input.action === "deposit" ? wallet[columns.wallet] - input.amount : wallet[columns.wallet] + input.amount;
    const nextBank = input.action === "deposit" ? wallet[columns.bank] + input.amount : wallet[columns.bank] - input.amount;
    await client.query(
      `UPDATE endless_wallets
       SET ${columns.wallet} = $3, ${columns.bank} = $4, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, nextWallet, nextBank]
    );
    if (input.action === "deposit" && input.currency === "coin") {
      await advanceDailyQuest(client, {
        worldId: input.worldId,
        userId: input.userId,
        questDate: utcDateString(),
        activity: "bank_coin_deposit",
        amount: input.amount
      });
    }
    return { ok: true, wallet: { ...wallet, [columns.wallet]: nextWallet, [columns.bank]: nextBank } };
  });
}
__name(moveFunds, "moveFunds");
async function claimDailyReward(worldId, userId) {
  const now = /* @__PURE__ */ new Date();
  const claimDate = utcDateString(now);
  const yesterday = utcDateString(new Date(now.getTime() - 24 * 60 * 60 * 1e3));
  return inTransaction(async (client) => {
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { claimed: false, reason: "not_registered" };
    }
    const previousResult = await client.query(
      `SELECT claim_date::text AS claim_date, streak
       FROM endless_daily_claims
       WHERE world_id = $1 AND user_id = $2 AND claim_date < $3
       ORDER BY claim_date DESC
       LIMIT 1`,
      [worldId, userId, claimDate]
    );
    const previous = previousResult.rows[0];
    const streak = previous?.claim_date === yesterday ? previous.streak + 1 : 1;
    const requestedCoins = 100 + Math.min(streak - 1, 20) * 10;
    const requestedGems = streak % 7 === 0 ? 1 : 0;
    const coinsAwarded = Math.min(requestedCoins, MAX_BALANCE - wallet.wallet_coins);
    const gemsAwarded = Math.min(requestedGems, MAX_BALANCE - wallet.wallet_gems);
    if (coinsAwarded === 0 && gemsAwarded === 0) {
      return { claimed: false, reason: "balance_limit" };
    }
    const claimResult = await client.query(
      `INSERT INTO endless_daily_claims
        (world_id, user_id, claim_date, streak, coins_awarded, gems_awarded)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (world_id, user_id, claim_date) DO NOTHING
       RETURNING claim_date`,
      [worldId, userId, claimDate, streak, coinsAwarded, gemsAwarded]
    );
    if (claimResult.rowCount !== 1) {
      return { claimed: false, reason: "already_claimed" };
    }
    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "daily_reward",
        idempotencyKey: `daily:${worldId}:${userId}:${claimDate}:coin`
      });
      if (!inserted) {
        throw new Error("Daily Coin reward ledger idempotency check failed.");
      }
    }
    if (gemsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "gem",
        walletDelta: gemsAwarded,
        reason: "daily_reward",
        idempotencyKey: `daily:${worldId}:${userId}:${claimDate}:gem`
      });
      if (!inserted) {
        throw new Error("Daily Gem reward ledger idempotency check failed.");
      }
    }
    await client.query(
      `UPDATE endless_wallets
       SET wallet_coins = wallet_coins + $3,
           wallet_gems = wallet_gems + $4,
           updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, coinsAwarded, gemsAwarded]
    );
    await advanceDailyQuest(client, {
      worldId,
      userId,
      questDate: claimDate,
      activity: "daily_claim"
    });
    return {
      claimed: true,
      claimDate,
      streak,
      coinsAwarded,
      gemsAwarded
    };
  });
}
__name(claimDailyReward, "claimDailyReward");
async function getDailyQuestBoard(worldId, userId) {
  const questDate = utcDateString();
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       LIMIT 1`,
      [worldId, userId]
    );
    if (playerResult.rowCount === 0) {
      return null;
    }
    await ensureDailyQuestRows(client, worldId, userId, questDate);
    const progressResult = await client.query(
      `SELECT quest_key, progress, claimed_at
       FROM endless_daily_quest_progress
       WHERE world_id = $1 AND user_id = $2 AND quest_date = $3`,
      [worldId, userId, questDate]
    );
    const progressByKey = new Map(
      progressResult.rows.map((row) => [row.quest_key, row])
    );
    return {
      questDate,
      quests: DAILY_QUESTS.map((quest) => {
        const progress = progressByKey.get(quest.key);
        return {
          ...quest,
          progress: progress?.progress ?? 0,
          claimed: Boolean(progress?.claimed_at)
        };
      })
    };
  });
}
__name(getDailyQuestBoard, "getDailyQuestBoard");
async function claimDailyQuest(worldId, userId, questKey) {
  const quest = DAILY_QUESTS.find((candidate) => candidate.key === questKey);
  if (!quest) {
    return { claimed: false, reason: "not_found" };
  }
  const now = /* @__PURE__ */ new Date();
  const questDate = utcDateString(now);
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const player = playerResult.rows[0];
    if (!player) {
      return { claimed: false, reason: "not_registered" };
    }
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { claimed: false, reason: "not_registered" };
    }
    await ensureDailyQuestRows(client, worldId, userId, questDate);
    const progressResult = await client.query(
      `SELECT progress, claimed_at
       FROM endless_daily_quest_progress
       WHERE world_id = $1 AND user_id = $2
         AND quest_date = $3 AND quest_key = $4
       FOR UPDATE`,
      [worldId, userId, questDate, quest.key]
    );
    const progress = progressResult.rows[0];
    if (!progress || progress.claimed_at) {
      return { claimed: false, reason: "already_claimed" };
    }
    if (progress.progress < quest.target) {
      return {
        claimed: false,
        reason: "incomplete",
        progress: progress.progress,
        target: quest.target
      };
    }
    const petResult = await client.query(
      "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
      [worldId, userId]
    );
    const pet = petResult.rows[0];
    const xpAwarded = quest.rewardXp + Math.floor(
      quest.rewardXp * companionRewardPercent(pet?.species, "xp", pet?.loyalty) / 100
    );
    const coinsAwarded = Math.min(
      quest.rewardCoins,
      MAX_BALANCE - wallet.wallet_coins
    );
    const gemsAwarded = Math.min(
      quest.rewardGems,
      MAX_BALANCE - wallet.wallet_gems
    );
    if (coinsAwarded === 0 && gemsAwarded === 0 && xpAwarded === 0) {
      return { claimed: false, reason: "balance_limit" };
    }
    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "daily_quest_reward",
        idempotencyKey: `quest:${worldId}:${userId}:${questDate}:${quest.key}:coin`
      });
      if (!inserted) {
        throw new Error("Quest Coin reward ledger idempotency check failed.");
      }
    }
    if (gemsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "gem",
        walletDelta: gemsAwarded,
        reason: "daily_quest_reward",
        idempotencyKey: `quest:${worldId}:${userId}:${questDate}:${quest.key}:gem`
      });
      if (!inserted) {
        throw new Error("Quest Gem reward ledger idempotency check failed.");
      }
    }
    const xpResult = applyXp(player.level, player.xp, xpAwarded);
    await client.query(
      `UPDATE endless_wallets
       SET wallet_coins = wallet_coins + $3,
           wallet_gems = wallet_gems + $4,
           updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, coinsAwarded, gemsAwarded]
    );
    if (xpAwarded > 0) {
      await client.query(
        `UPDATE endless_players
         SET level = $3, xp = $4, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2`,
        [worldId, userId, xpResult.level, xpResult.xp]
      );
    }
    await client.query(
      `UPDATE endless_daily_quest_progress
       SET claimed_at = $5
       WHERE world_id = $1 AND user_id = $2
         AND quest_date = $3 AND quest_key = $4`,
      [worldId, userId, questDate, quest.key, now]
    );
    return {
      claimed: true,
      title: quest.title,
      coinsAwarded,
      gemsAwarded,
      xpAwarded,
      levelsGained: xpResult.levelsGained,
      level: xpResult.level
    };
  });
}
__name(claimDailyQuest, "claimDailyQuest");
async function exploreWorld(input) {
  const now = /* @__PURE__ */ new Date();
  const cooldownUntil = new Date(now.getTime() + EXPLORE_COOLDOWN_MS);
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    const player = playerResult.rows[0];
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    const wallet = walletResult.rows[0];
    if (!player || !wallet) {
      return { explored: false, reason: "not_registered" };
    }
    const reservation = await client.query(
      `INSERT INTO endless_adventure_state
        (world_id, user_id, cooldown_until)
       VALUES ($1, $2, $4)
       ON CONFLICT (world_id, user_id) DO UPDATE
       SET cooldown_until = EXCLUDED.cooldown_until
       WHERE endless_adventure_state.cooldown_until <= $3
       RETURNING cooldown_until`,
      [input.worldId, input.userId, now, cooldownUntil]
    );
    if (reservation.rowCount === 0) {
      const stateResult = await client.query(
        `SELECT cooldown_until
         FROM endless_adventure_state
         WHERE world_id = $1 AND user_id = $2
         LIMIT 1`,
        [input.worldId, input.userId]
      );
      return {
        explored: false,
        reason: "cooldown",
        cooldownUntil: stateResult.rows[0]?.cooldown_until ?? cooldownUntil
      };
    }
    const equippedResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId]
    );
    let coinBonusPercent = 0;
    let xpBonusPercent = 0;
    let gemChanceBonus = 0;
    for (const row of equippedResult.rows) {
      const item = getItemDefinition(row.item_key);
      if (item?.kind === "equipment") {
        coinBonusPercent += item.effects.coinBonusPercent ?? 0;
        xpBonusPercent += item.effects.xpBonusPercent ?? 0;
        gemChanceBonus += item.effects.gemChanceBonus ?? 0;
      }
    }
    const petResult = await client.query(
      "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
      [input.worldId, input.userId]
    );
    const pet = petResult.rows[0];
    coinBonusPercent += companionRewardPercent(pet?.species, "coins", pet?.loyalty);
    xpBonusPercent += companionRewardPercent(pet?.species, "xp", pet?.loyalty);
    const eventRoll = randomInt4(1, 101);
    const event = eventRoll <= 8 ? {
      title: "Kadim erzak sand\u0131\u011F\u0131",
      description: "Yol kenar\u0131nda buldu\u011Fun sand\u0131kta fazladan 30 Coin vard\u0131.",
      coins: 30,
      gems: 0,
      xp: 0
    } : eventRoll <= 13 ? {
      title: "Unutulmu\u015F par\u015F\xF6men",
      description: "Eski par\u015F\xF6menin i\xE7indeki notlar sana 25 ek XP kazand\u0131rd\u0131.",
      coins: 0,
      gems: 0,
      xp: 25
    } : eventRoll <= 15 ? {
      title: "Gem damar\u0131",
      description: "Kayalar\u0131n aras\u0131nda parlayan bir Gem buldun.",
      coins: 0,
      gems: 1,
      xp: 0
    } : null;
    const baseCoins = randomInt4(25, 81);
    const requestedCoins = Math.floor(
      (baseCoins + (event?.coins ?? 0)) * (1 + coinBonusPercent / 100)
    );
    const coinsAwarded = Math.min(
      requestedCoins,
      MAX_BALANCE - wallet.wallet_coins
    );
    const gemChance = Math.min(100, 5 + gemChanceBonus);
    const randomGem = randomInt4(1, 101) <= gemChance && wallet.wallet_gems < MAX_BALANCE ? 1 : 0;
    const gemsAwarded = Math.min(
      MAX_BALANCE - wallet.wallet_gems,
      randomGem + (event?.gems ?? 0)
    );
    const xpAwarded = Math.floor(
      (randomInt4(15, 36) + (event?.xp ?? 0)) * (1 + xpBonusPercent / 100)
    );
    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId: input.worldId,
        userId: input.userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "exploration_reward",
        idempotencyKey: `explore:${input.interactionId}:coin`
      });
      if (!inserted) {
        throw new Error("Exploration Coin reward idempotency check failed.");
      }
    }
    if (gemsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId: input.worldId,
        userId: input.userId,
        currency: "gem",
        walletDelta: gemsAwarded,
        reason: "exploration_reward",
        idempotencyKey: `explore:${input.interactionId}:gem`
      });
      if (!inserted) {
        throw new Error("Exploration Gem reward idempotency check failed.");
      }
    }
    const xpResult = applyXp(player.level, player.xp, xpAwarded);
    await client.query(
      `UPDATE endless_players
       SET level = $3, xp = $4, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, xpResult.level, xpResult.xp]
    );
    await client.query(
      `UPDATE endless_wallets
       SET wallet_coins = wallet_coins + $3,
           wallet_gems = wallet_gems + $4,
           updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, coinsAwarded, gemsAwarded]
    );
    await advanceDailyQuest(client, {
      worldId: input.worldId,
      userId: input.userId,
      questDate: utcDateString(now),
      activity: "explore"
    });
    return {
      explored: true,
      coinsAwarded,
      gemsAwarded,
      xpAwarded,
      level: xpResult.level,
      levelsGained: xpResult.levelsGained,
      cooldownUntil,
      event
    };
  });
}
__name(exploreWorld, "exploreWorld");
function getCombatStats(equipmentRows, level, companion = null) {
  const stats = {
    attackBonus: 0,
    defenseBonus: 0,
    critChanceBonus: 0
  };
  for (const row of equipmentRows) {
    const item = getItemDefinition(row.item_key);
    if (item?.kind !== "equipment") continue;
    stats.attackBonus += item.effects.attackBonus ?? 0;
    stats.defenseBonus += item.effects.defenseBonus ?? 0;
    stats.critChanceBonus += item.effects.critChanceBonus ?? 0;
  }
  stats.attackBonus += companionAttackBonus(companion?.species, companion?.loyalty);
  return {
    ...stats,
    maxHp: 120 + level * 25,
    defense: Math.floor(level / 2) + stats.defenseBonus,
    critChance: Math.min(75, 5 + stats.critChanceBonus)
  };
}
__name(getCombatStats, "getCombatStats");
async function enterDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const player = playerResult.rows[0];
    if (!player) {
      return { entered: false, reason: "not_registered" };
    }
    const walletResult = await client.query(
      `SELECT wallet_coins
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { entered: false, reason: "not_registered" };
    }
    const stateResult = await client.query(
      `SELECT run_number, status, cooldown_until
       FROM endless_dungeon_state
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const state = stateResult.rows[0];
    if (state?.status === "active") {
      return { entered: false, reason: "already_active", state };
    }
    const now = /* @__PURE__ */ new Date();
    if (state?.cooldown_until && new Date(state.cooldown_until).getTime() > now.getTime()) {
      return {
        entered: false,
        reason: "cooldown",
        cooldownUntil: state.cooldown_until
      };
    }
    if (wallet.wallet_coins < DUNGEON_ENTRY_FEE) {
      return { entered: false, reason: "insufficient_funds" };
    }
    const runNumber = (state?.run_number ?? 0) + 1;
    const actionResult = await client.query(
      `INSERT INTO endless_dungeon_actions
        (world_id, user_id, run_number, interaction_id, action)
       VALUES ($1, $2, $3, $4, 'enter')
       ON CONFLICT (world_id, user_id, interaction_id) DO NOTHING
       RETURNING id`,
      [worldId, userId, runNumber, interactionId]
    );
    if (actionResult.rowCount === 0) {
      return { entered: false, reason: "duplicate_request" };
    }
    const inserted = await insertLedger(client, {
      worldId,
      userId,
      currency: "coin",
      walletDelta: -DUNGEON_ENTRY_FEE,
      reason: "dungeon_entry",
      idempotencyKey: `dungeon:${worldId}:${userId}:run:${runNumber}:entry`
    });
    if (!inserted) {
      return { entered: false, reason: "duplicate_request" };
    }
    const enemy = DUNGEON_ENEMIES[0];
    const maxHp = 120 + player.level * 25;
    await client.query(
      `UPDATE endless_wallets
       SET wallet_coins = wallet_coins - $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, DUNGEON_ENTRY_FEE]
    );
    await client.query(
      `INSERT INTO endless_dungeon_state
        (world_id, user_id, run_number, dungeon_key, stage,
         player_hp, enemy_hp, status, cooldown_until)
       VALUES ($1, $2, $3, 'ashen_ruins', 1, $4, $5, 'active', NULL)
       ON CONFLICT (world_id, user_id) DO UPDATE
       SET run_number = EXCLUDED.run_number,
           dungeon_key = EXCLUDED.dungeon_key,
           stage = EXCLUDED.stage,
           player_hp = EXCLUDED.player_hp,
           enemy_hp = EXCLUDED.enemy_hp,
           status = EXCLUDED.status,
           cooldown_until = NULL,
           updated_at = NOW()`,
      [worldId, userId, runNumber, maxHp, enemy.maxHp]
    );
    return {
      entered: true,
      runNumber,
      maxHp,
      enemy,
      entryFee: DUNGEON_ENTRY_FEE
    };
  });
}
__name(enterDungeon, "enterDungeon");
async function getDungeonStatus(worldId, userId) {
  const result = await pool.query(
    `SELECT s.run_number, s.dungeon_key, s.stage, s.player_hp,
            s.enemy_hp, s.status, s.cooldown_until, p.level
     FROM endless_dungeon_state s
     JOIN endless_players p
       ON p.world_id = s.world_id AND p.user_id = s.user_id
     WHERE s.world_id = $1 AND s.user_id = $2
     LIMIT 1`,
    [worldId, userId]
  );
  const state = result.rows[0];
  if (!state) return null;
  const combatStats = getCombatStats([], state.level);
  return {
    ...state,
    maxHp: combatStats.maxHp,
    enemy: DUNGEON_ENEMIES[state.stage - 1] ?? null
  };
}
__name(getDungeonStatus, "getDungeonStatus");
async function fightDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const player = playerResult.rows[0];
    if (!player) {
      return { fought: false, reason: "not_registered" };
    }
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { fought: false, reason: "not_registered" };
    }
    const stateResult = await client.query(
      `SELECT run_number, dungeon_key, stage, player_hp, enemy_hp, status
       FROM endless_dungeon_state
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const state = stateResult.rows[0];
    if (!state || state.status !== "active") {
      return { fought: false, reason: "no_active_run" };
    }
    const actionResult = await client.query(
      `INSERT INTO endless_dungeon_actions
        (world_id, user_id, run_number, interaction_id, action)
       VALUES ($1, $2, $3, $4, 'fight')
       ON CONFLICT (world_id, user_id, interaction_id) DO NOTHING
       RETURNING id`,
      [worldId, userId, state.run_number, interactionId]
    );
    if (actionResult.rowCount === 0) {
      return { fought: false, reason: "duplicate_request" };
    }
    const enemy = DUNGEON_ENEMIES[state.stage - 1];
    if (state.dungeon_key !== "ashen_ruins" || !enemy) {
      throw new Error("Dungeon state references an unknown encounter.");
    }
    const equipmentResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId]
    );
    const petResult = await client.query(
      "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
      [worldId, userId]
    );
    const combatStats = getCombatStats(equipmentResult.rows, player.level, petResult.rows[0]);
    const attack = randomInt4(15 + player.level * 2, 25 + player.level * 2) + combatStats.attackBonus;
    const critical = randomInt4(1, 101) <= combatStats.critChance;
    const playerDamage = critical ? Math.floor(attack * 1.75) : attack;
    const enemyHp = Math.max(0, state.enemy_hp - playerDamage);
    const enemyDefeated = enemyHp === 0;
    const enemyDamage = enemyDefeated ? 0 : Math.max(
      1,
      randomInt4(enemy.minAttack, enemy.maxAttack + 1) - combatStats.defense
    );
    let playerHp = Math.max(0, state.player_hp - enemyDamage);
    let stage = state.stage;
    let nextEnemyHp = enemyHp;
    let status = "active";
    let cooldownUntil = null;
    let nextEnemy = null;
    let healing = 0;
    let xpAwarded = enemyDefeated ? enemy.xp : 0;
    let coinsAwarded = 0;
    let gemsAwarded = 0;
    if (enemyDefeated && state.stage === DUNGEON_ENEMIES.length) {
      status = "cleared";
      cooldownUntil = new Date(Date.now() + DUNGEON_COOLDOWN_MS);
      xpAwarded += DUNGEON_CLEAR_REWARD.bonusXp;
      coinsAwarded = Math.min(
        DUNGEON_CLEAR_REWARD.coins,
        MAX_BALANCE - wallet.wallet_coins
      );
      gemsAwarded = Math.min(
        DUNGEON_CLEAR_REWARD.gems,
        MAX_BALANCE - wallet.wallet_gems
      );
    } else if (playerHp === 0) {
      status = "defeated";
      cooldownUntil = new Date(Date.now() + DUNGEON_COOLDOWN_MS);
    } else if (enemyDefeated) {
      stage += 1;
      nextEnemy = DUNGEON_ENEMIES[stage - 1];
      nextEnemyHp = nextEnemy.maxHp;
      healing = Math.min(20, combatStats.maxHp - playerHp);
      playerHp += healing;
    }
    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "dungeon_clear_reward",
        idempotencyKey: `dungeon:${worldId}:${userId}:run:${state.run_number}:clear:coin`
      });
      if (!inserted) {
        throw new Error("Dungeon Coin reward idempotency check failed.");
      }
    }
    if (gemsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "gem",
        walletDelta: gemsAwarded,
        reason: "dungeon_clear_reward",
        idempotencyKey: `dungeon:${worldId}:${userId}:run:${state.run_number}:clear:gem`
      });
      if (!inserted) {
        throw new Error("Dungeon Gem reward idempotency check failed.");
      }
    }
    let resultingLevel = player.level;
    let levelsGained = 0;
    if (xpAwarded > 0) {
      const xpResult = applyXp(player.level, player.xp, xpAwarded);
      await client.query(
        `UPDATE endless_players
         SET level = $3, xp = $4, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2`,
        [worldId, userId, xpResult.level, xpResult.xp]
      );
      resultingLevel = xpResult.level;
      levelsGained = xpResult.levelsGained;
    }
    if (coinsAwarded > 0 || gemsAwarded > 0) {
      await client.query(
        `UPDATE endless_wallets
         SET wallet_coins = wallet_coins + $3,
             wallet_gems = wallet_gems + $4,
             updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2`,
        [worldId, userId, coinsAwarded, gemsAwarded]
      );
    }
    await client.query(
      `UPDATE endless_dungeon_state
       SET stage = $3, player_hp = $4, enemy_hp = $5, status = $6,
           cooldown_until = $7, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, stage, playerHp, nextEnemyHp, status, cooldownUntil]
    );
    return {
      fought: true,
      status,
      runNumber: state.run_number,
      stage,
      enemy,
      nextEnemy,
      playerDamage,
      critical,
      enemyDamage,
      playerHp,
      maxHp: combatStats.maxHp,
      enemyHp: nextEnemyHp,
      healing,
      xpAwarded,
      level: resultingLevel,
      levelsGained,
      coinsAwarded,
      gemsAwarded,
      cooldownUntil
    };
  });
}
__name(fightDungeon, "fightDungeon");
async function retreatDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    if (playerResult.rowCount === 0) {
      return { retreated: false, reason: "not_registered" };
    }
    const walletResult = await client.query(
      `SELECT user_id FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    if (walletResult.rowCount === 0) {
      return { retreated: false, reason: "not_registered" };
    }
    const stateResult = await client.query(
      `SELECT run_number, status
       FROM endless_dungeon_state
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    const state = stateResult.rows[0];
    if (!state || state.status !== "active") {
      return { retreated: false, reason: "no_active_run" };
    }
    const actionResult = await client.query(
      `INSERT INTO endless_dungeon_actions
        (world_id, user_id, run_number, interaction_id, action)
       VALUES ($1, $2, $3, $4, 'retreat')
       ON CONFLICT (world_id, user_id, interaction_id) DO NOTHING
       RETURNING id`,
      [worldId, userId, state.run_number, interactionId]
    );
    if (actionResult.rowCount === 0) {
      return { retreated: false, reason: "duplicate_request" };
    }
    const cooldownUntil = new Date(Date.now() + DUNGEON_COOLDOWN_MS);
    await client.query(
      `UPDATE endless_dungeon_state
       SET status = 'retreated', cooldown_until = $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, cooldownUntil]
    );
    return { retreated: true, cooldownUntil };
  });
}
__name(retreatDungeon, "retreatDungeon");
async function purchaseItem(input) {
  const item = getItemDefinition(input.itemKey);
  if (!item) {
    return { purchased: false, reason: "not_found" };
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) {
    return { purchased: false, reason: "invalid_quantity" };
  }
  const totalPrice = item.price.amount * input.quantity;
  const currency = item.price.currency;
  const walletColumn = CURRENCY_COLUMNS[currency].wallet;
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    if (playerResult.rowCount === 0) {
      return { purchased: false, reason: "not_registered" };
    }
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { purchased: false, reason: "not_registered" };
    }
    if (wallet[walletColumn] < totalPrice) {
      return { purchased: false, reason: "insufficient_funds" };
    }
    const inserted = await insertLedger(client, {
      worldId: input.worldId,
      userId: input.userId,
      currency,
      walletDelta: -totalPrice,
      reason: "shop_purchase",
      idempotencyKey: `shop:${input.worldId}:${input.userId}:${input.interactionId}`
    });
    if (!inserted) {
      return { purchased: false, reason: "duplicate_request" };
    }
    await client.query(
      `UPDATE endless_wallets
       SET ${walletColumn} = ${walletColumn} - $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, totalPrice]
    );
    await client.query(
      `INSERT INTO endless_inventory (world_id, user_id, item_key, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (world_id, user_id, item_key) DO UPDATE
       SET quantity = endless_inventory.quantity + EXCLUDED.quantity,
           updated_at = NOW()`,
      [input.worldId, input.userId, input.itemKey, input.quantity]
    );
    return { purchased: true, item, quantity: input.quantity, totalPrice };
  });
}
__name(purchaseItem, "purchaseItem");
async function getInventory(worldId, userId) {
  const playerResult = await pool.query(
    `SELECT user_id FROM endless_players
     WHERE world_id = $1 AND user_id = $2
     LIMIT 1`,
    [worldId, userId]
  );
  if (playerResult.rowCount === 0) {
    return null;
  }
  const [items, equipment] = await Promise.all([
    pool.query(
      `SELECT item_key, quantity
       FROM endless_inventory
       WHERE world_id = $1 AND user_id = $2
       ORDER BY item_key`,
      [worldId, userId]
    ),
    pool.query(
      `SELECT slot, item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2
       ORDER BY slot`,
      [worldId, userId]
    )
  ]);
  return { items: items.rows, equipment: equipment.rows };
}
__name(getInventory, "getInventory");
async function addInventoryItem(client, worldId, userId, itemKey) {
  await client.query(
    `INSERT INTO endless_inventory (world_id, user_id, item_key, quantity)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (world_id, user_id, item_key) DO UPDATE
     SET quantity = endless_inventory.quantity + 1, updated_at = NOW()`,
    [worldId, userId, itemKey]
  );
}
__name(addInventoryItem, "addInventoryItem");
async function equipItem(worldId, userId, itemKey) {
  const item = getItemDefinition(itemKey);
  if (!item || item.kind !== "equipment") {
    return { equipped: false, reason: "not_equipment" };
  }
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    if (playerResult.rowCount === 0) {
      return { equipped: false, reason: "not_registered" };
    }
    const inventoryResult = await client.query(
      `SELECT quantity
       FROM endless_inventory
       WHERE world_id = $1 AND user_id = $2 AND item_key = $3
       FOR UPDATE`,
      [worldId, userId, itemKey]
    );
    const ownedItem = inventoryResult.rows[0];
    if (!ownedItem || ownedItem.quantity < 1) {
      return { equipped: false, reason: "not_owned" };
    }
    const equipmentResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2 AND slot = $3
       FOR UPDATE`,
      [worldId, userId, item.slot]
    );
    const currentEquipment = equipmentResult.rows[0];
    if (currentEquipment?.item_key === itemKey) {
      return { equipped: false, reason: "already_equipped" };
    }
    if (ownedItem.quantity === 1) {
      await client.query(
        `DELETE FROM endless_inventory
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [worldId, userId, itemKey]
      );
    } else {
      await client.query(
        `UPDATE endless_inventory
         SET quantity = quantity - 1, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [worldId, userId, itemKey]
      );
    }
    if (currentEquipment) {
      await addInventoryItem(client, worldId, userId, currentEquipment.item_key);
    }
    await client.query(
      `INSERT INTO endless_equipment (world_id, user_id, slot, item_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (world_id, user_id, slot) DO UPDATE
       SET item_key = EXCLUDED.item_key, updated_at = NOW()`,
      [worldId, userId, item.slot, itemKey]
    );
    return {
      equipped: true,
      item,
      replaced: currentEquipment?.item_key ?? null
    };
  });
}
__name(equipItem, "equipItem");
async function unequipItem(worldId, userId, slot) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId]
    );
    if (playerResult.rowCount === 0) {
      return { unequipped: false, reason: "not_registered" };
    }
    const equipmentResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2 AND slot = $3
       FOR UPDATE`,
      [worldId, userId, slot]
    );
    const equipment = equipmentResult.rows[0];
    if (!equipment) {
      return { unequipped: false, reason: "empty_slot" };
    }
    await client.query(
      `DELETE FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2 AND slot = $3`,
      [worldId, userId, slot]
    );
    await addInventoryItem(client, worldId, userId, equipment.item_key);
    return {
      unequipped: true,
      item: getItemDefinition(equipment.item_key)
    };
  });
}
__name(unequipItem, "unequipItem");
async function useConsumable(input) {
  const item = getItemDefinition(input.itemKey);
  if (!item || item.kind !== "consumable" || !item.useXp) {
    return { used: false, reason: "not_usable" };
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 10) {
    return { used: false, reason: "invalid_quantity" };
  }
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId]
    );
    const player = playerResult.rows[0];
    if (!player) {
      return { used: false, reason: "not_registered" };
    }
    const inventoryResult = await client.query(
      `SELECT quantity
       FROM endless_inventory
       WHERE world_id = $1 AND user_id = $2 AND item_key = $3
       FOR UPDATE`,
      [input.worldId, input.userId, input.itemKey]
    );
    const inventoryItem = inventoryResult.rows[0];
    if (!inventoryItem || inventoryItem.quantity < input.quantity) {
      return { used: false, reason: "not_owned" };
    }
    const useResult = await client.query(
      `INSERT INTO endless_item_uses
        (world_id, user_id, interaction_id, item_key, quantity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (world_id, user_id, interaction_id) DO NOTHING
       RETURNING id`,
      [
        input.worldId,
        input.userId,
        input.interactionId,
        input.itemKey,
        input.quantity
      ]
    );
    if (useResult.rowCount === 0) {
      return { used: false, reason: "duplicate_request" };
    }
    if (inventoryItem.quantity === input.quantity) {
      await client.query(
        `DELETE FROM endless_inventory
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [input.worldId, input.userId, input.itemKey]
      );
    } else {
      await client.query(
        `UPDATE endless_inventory
         SET quantity = quantity - $4, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [input.worldId, input.userId, input.itemKey, input.quantity]
      );
    }
    const xpAwarded = item.useXp * input.quantity;
    const xpResult = applyXp(player.level, player.xp, xpAwarded);
    await client.query(
      `UPDATE endless_players
       SET level = $3, xp = $4, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, xpResult.level, xpResult.xp]
    );
    return {
      used: true,
      item,
      quantity: input.quantity,
      xpAwarded,
      level: xpResult.level,
      levelsGained: xpResult.levelsGained
    };
  });
}
__name(useConsumable, "useConsumable");
var handleEndless = createEndlessHandler({
  pool,
  inTransaction,
  insertLedger,
  applyXp,
  MAX_BALANCE
});
var handleGames = createGamesHandler({ pool, inTransaction, insertLedger });
async function getAchievementProgress(worldId, userId) {
  const playerResult = await pool.query(
    "SELECT level, xp FROM endless_players WHERE world_id = $1 AND user_id = $2 LIMIT 1",
    [worldId, userId]
  );
  const player = playerResult.rows[0];
  if (!player) return null;
  const [slotResult, betResult, collectionResult, dungeonResult, claimResult] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM endless_ledger WHERE world_id = $1 AND user_id = $2 AND reason = 'slots_payout'", [worldId, userId]),
    pool.query("SELECT COALESCE(SUM(ABS(wallet_delta)), 0)::int AS total FROM endless_ledger WHERE world_id = $1 AND user_id = $2 AND wallet_delta < 0 AND reason IN ('slots_bet', 'blackjack_bet', 'mines_bet', 'roulette_bet', 'crash_bet')", [worldId, userId]),
    pool.query("SELECT COUNT(*)::int AS count FROM endless_collection_animals WHERE world_id = $1 AND user_id = $2", [worldId, userId]),
    pool.query("SELECT COUNT(*)::int AS count FROM endless_dungeon_state WHERE world_id = $1 AND user_id = $2 AND status = 'cleared'", [worldId, userId]),
    pool.query("SELECT achievement_key FROM endless_achievement_claims WHERE world_id = $1 AND user_id = $2", [worldId, userId])
  ]);
  const values = {
    first_step: true,
    level_five: Number(player.level) >= 5,
    fortune_hunter: Number(slotResult.rows[0].count) >= 3,
    high_roller: Number(betResult.rows[0].total) >= 1e3,
    collector: Number(collectionResult.rows[0].count) >= 5,
    dungeon_master: Number(dungeonResult.rows[0].count) >= 1
  };
  return { player, values, claimed: new Set(claimResult.rows.map((row) => row.achievement_key)) };
}
__name(getAchievementProgress, "getAchievementProgress");
async function handleAchievements(interaction) {
  const worldId = await requireGuild(interaction, "Ba\u015Far\u0131m sistemi");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const progress = await getAchievementProgress(worldId, interaction.user.id);
  if (!progress) return interaction.editReply("\xD6nce `/start` ile ENDLESS karakterini olu\u015Ftur.");
  const action = interaction.options.getSubcommand();
  if (action === "show") {
    const lines = ACHIEVEMENTS.map((achievement2) => {
      const unlocked = progress.values[achievement2.key];
      const claimed = progress.claimed.has(achievement2.key);
      const state = claimed ? "\u{1F381} \xD6d\xFCl al\u0131nd\u0131" : unlocked ? "\u2705 Haz\u0131r \u2014 `/achievements claim` ile \xF6d\xFCl\xFC al" : "\u{1F512} Hen\xFCz tamamlanmad\u0131";
      return `${unlocked ? "\u{1F3C5}" : "\u25AB\uFE0F"} **${achievement2.title}** \u2014 ${achievement2.description}
   ${state} \xB7 \xD6d\xFCl: ${achievement2.rewardCoins} Coin + ${achievement2.rewardGems} Gem + ${achievement2.rewardXp} XP`;
    });
    return interaction.editReply(["**ENDLESS Ba\u015Far\u0131m Salonu**", `Seviyen: **${progress.player.level}** \xB7 XP: **${progress.player.xp}**`, "", ...lines].join("\n"));
  }
  const achievement = ACHIEVEMENTS.find((item) => item.key === interaction.options.getString("achievement", true));
  if (!achievement || !progress.values[achievement.key]) return interaction.editReply("Bu ba\u015Far\u0131m hen\xFCz tamamlanmad\u0131. \u0130lerlemeni `/achievements show` ile kontrol edebilirsin.");
  if (progress.claimed.has(achievement.key)) return interaction.editReply("Bu ba\u015Far\u0131m\u0131n \xF6d\xFCl\xFCn\xFC daha \xF6nce ald\u0131n.");
  const reward = await inTransaction(async (client) => {
    const claim = await client.query(
      "INSERT INTO endless_achievement_claims (world_id, user_id, achievement_key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING achievement_key",
      [worldId, interaction.user.id, achievement.key]
    );
    if (!claim.rows[0]) return { ok: false, reason: "already_claimed" };
    if (achievement.rewardCoins > 0) await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: achievement.rewardCoins, reason: "achievement_reward", idempotencyKey: `achievement:${worldId}:${interaction.user.id}:${achievement.key}:coin` });
    if (achievement.rewardGems > 0) await insertLedger(client, { worldId, userId: interaction.user.id, currency: "gem", walletDelta: achievement.rewardGems, reason: "achievement_reward", idempotencyKey: `achievement:${worldId}:${interaction.user.id}:${achievement.key}:gem` });
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, wallet_gems = wallet_gems + $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id, achievement.rewardCoins, achievement.rewardGems]);
    const playerResult = await client.query("SELECT level, xp FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
    const next = applyXp(Number(playerResult.rows[0].level), Number(playerResult.rows[0].xp), achievement.rewardXp);
    await client.query("UPDATE endless_players SET level = $3, xp = $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id, next.level, next.xp]);
    return { ok: true, level: next.level, levelsGained: next.levelsGained };
  });
  if (!reward.ok) return interaction.editReply("Bu ba\u015Far\u0131m\u0131n \xF6d\xFCl\xFC zaten al\u0131nm\u0131\u015F.");
  return interaction.editReply(`\u{1F3C5} **${achievement.title}** rozeti a\xE7\u0131ld\u0131! **${achievement.rewardCoins} Coin**, **${achievement.rewardGems} Gem** ve **${achievement.rewardXp} XP** kazand\u0131n.${reward.levelsGained ? ` Yeni seviyen: **${reward.level}**!` : ""}`);
}
__name(handleAchievements, "handleAchievements");
async function handlePet(interaction) {
  const worldId = await requireGuild(interaction, "Yolda\u015F sistemi");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  const action = interaction.options.getSubcommand();
  if (action === "show") {
    const result2 = await pool.query("SELECT species, pet_name, loyalty, adopted_at FROM endless_pets WHERE world_id = $1 AND user_id = $2 LIMIT 1", [worldId, interaction.user.id]);
    const pet = result2.rows[0];
    if (!pet) return interaction.editReply("Hen\xFCz bir yolda\u015F\u0131n yok. `/pet adopt` ile Endless ailesine yeni bir dost kat.");
    const species = PET_SPECIES[pet.species];
    const bar = `${"\u{1F7E9}".repeat(Math.ceil(Number(pet.loyalty) / 10))}${"\u2B1B".repeat(10 - Math.ceil(Number(pet.loyalty) / 10))}`;
    const perkPercent = companionRewardPercent(pet.species, pet.species === "slime" ? "prayerCoins" : pet.species === "owl" ? "xp" : "coins", pet.loyalty);
    const activePerk = pet.species === "dragon" ? `+${companionAttackBonus(pet.species, pet.loyalty)} hasar` : `+%${perkPercent}`;
    return interaction.editReply(`${species.emoji} **${pet.pet_name}** \xB7 ${species.label}
Sadakat: **${pet.loyalty}/100**
${bar}
Pasif bonus: *${species.bonus}*
\u015Eu an etkin: **${activePerk}**
Besleme: 24 saatte bir, 25 Coin.`);
  }
  if (action === "adopt") {
    const speciesKey = interaction.options.getString("species", true);
    const petName = interaction.options.getString("name", true).trim();
    const species = PET_SPECIES[speciesKey];
    const result2 = await inTransaction(async (client) => {
      const player = await client.query("SELECT 1 FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
      if (!player.rows[0]) return { ok: false, reason: "not_registered" };
      const inserted = await client.query("INSERT INTO endless_pets (world_id, user_id, species, pet_name) VALUES ($1, $2, $3, $4) ON CONFLICT (world_id, user_id) DO NOTHING RETURNING pet_name", [worldId, interaction.user.id, speciesKey, petName]);
      return inserted.rows[0] ? { ok: true } : { ok: false, reason: "already_has_pet" };
    });
    if (!result2.ok) return interaction.editReply(result2.reason === "not_registered" ? "\xD6nce `/start` ile karakter olu\u015Ftur." : "Zaten bir yolda\u015F\u0131n var. \xD6nce `/pet show` ile onu ziyaret et.");
    return interaction.editReply(`${species.emoji} **${petName}** art\u0131k senin Endless yolda\u015F\u0131n! Sadakati **1/100**. Onu b\xFCy\xFCtmek i\xE7in her g\xFCn /pet feed kullanabilirsin.`);
  }
  const result = await inTransaction(async (client) => {
    const petResult = await client.query("SELECT pet_name, loyalty, last_fed_at FROM endless_pets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
    if (!petResult.rows[0]) return { ok: false, reason: "no_pet" };
    if (Number(petResult.rows[0].loyalty) >= 100) return { ok: false, reason: "max_loyalty" };
    const feedReadyAt = petFeedReadyAt(petResult.rows[0].last_fed_at);
    if (feedReadyAt) return { ok: false, reason: "cooldown", feedReadyAt };
    const walletResult = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
    if (!walletResult.rows[0] || Number(walletResult.rows[0].wallet_coins) < 25) return { ok: false, reason: "insufficient_funds" };
    const ledgerInserted = await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: -25, reason: "pet_feed", idempotencyKey: `pet-feed:${interaction.id}` });
    if (!ledgerInserted) return { ok: false, reason: "duplicate" };
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - 25, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id]);
    const nextLoyalty = Math.min(100, Number(petResult.rows[0].loyalty) + 10);
    const updatedPet = await client.query("UPDATE endless_pets SET loyalty = $3, last_fed_at = NOW(), updated_at = NOW() WHERE world_id = $1 AND user_id = $2 RETURNING last_fed_at + INTERVAL '24 hours' AS feed_ready_at", [worldId, interaction.user.id, nextLoyalty]);
    return { ok: true, petName: petResult.rows[0].pet_name, loyalty: nextLoyalty, feedReadyAt: updatedPet.rows[0].feed_ready_at };
  });
  if (!result.ok) {
    if (result.reason === "no_pet") return interaction.editReply("\xD6nce `/pet adopt` ile bir yolda\u015F sahiplen.");
    if (result.reason === "max_loyalty") return interaction.editReply("Yolda\u015F\u0131n\u0131n sadakati zaten **100/100**; besleme i\xE7in Coin harcamana gerek yok.");
    if (result.reason === "cooldown") return interaction.editReply(`Yolda\u015F\u0131n\u0131 yeniden beslemek i\xE7in <t:${Math.ceil(new Date(result.feedReadyAt).getTime() / 1e3)}:R> bekle.`);
    if (result.reason === "duplicate") return interaction.editReply("Bu besleme iste\u011Fi daha \xF6nce i\u015Flendi.");
    return interaction.editReply("Yolda\u015F\u0131n\u0131 beslemek i\xE7in en az **25 Coin** gerekiyor.");
  }
  return interaction.editReply(`\u{1F356} **${result.petName}** mutlu mutlu yeme\u011Fini yedi! Sadakat: **${result.loyalty}/100**. Yeniden besleme <t:${Math.ceil(new Date(result.feedReadyAt).getTime() / 1e3)}:R> haz\u0131r.`);
}
__name(handlePet, "handlePet");
var WORLD_BOSS = { key: "ash_colossus", name: "K\xFCl Kolossusu", maxHp: 25e3 };
async function ensureWorldEvent(worldId) {
  await pool.query(
    "INSERT INTO endless_world_events (world_id, event_key, boss_name, max_hp, current_hp, status) VALUES ($1, $2, $3, $4, $4, 'active') ON CONFLICT (world_id) DO NOTHING",
    [worldId, WORLD_BOSS.key, WORLD_BOSS.name, WORLD_BOSS.maxHp]
  );
}
__name(ensureWorldEvent, "ensureWorldEvent");
async function handleWorldEvent(interaction) {
  const worldId = await requireGuild(interaction, "D\xFCnya Boss etkinli\u011Fi");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  await ensureWorldEvent(worldId);
  const action = interaction.options.getSubcommand();
  if (action === "status") {
    const [eventResult, contributionResult] = await Promise.all([
      pool.query("SELECT boss_name, max_hp, current_hp, status, started_at, defeated_at FROM endless_world_events WHERE world_id = $1 LIMIT 1", [worldId]),
      pool.query("SELECT COUNT(*)::int AS players, COALESCE(SUM(damage), 0)::int AS damage FROM endless_world_event_contributions WHERE world_id = $1", [worldId])
    ]);
    const event = eventResult.rows[0];
    const summary = contributionResult.rows[0];
    const percent = Math.max(0, Math.round(Number(event.current_hp) / Number(event.max_hp) * 100));
    const bar = `${"\u{1F7E5}".repeat(Math.max(1, Math.ceil(percent / 10)))}${"\u2B1B".repeat(10 - Math.max(1, Math.ceil(percent / 10)))}`;
    return interaction.editReply(`**${event.boss_name} \u2014 D\xFCnya Boss**
${bar}
Can: **${Number(event.current_hp).toLocaleString("tr-TR")} / ${Number(event.max_hp).toLocaleString("tr-TR")}** (%${percent})
Durum: **${event.status === "active" ? "Sava\u015F devam ediyor" : "Boss yenildi"}**
Kat\u0131lan oyuncu: **${summary.players}** \xB7 Toplam hasar: **${Number(summary.damage).toLocaleString("tr-TR")}**
Sald\u0131r\u0131 i\xE7in: "/event attack"`);
  }
  if (action === "leaderboard") {
    const result2 = await pool.query("SELECT user_id, damage, attacks FROM endless_world_event_contributions WHERE world_id = $1 ORDER BY damage DESC, attacks ASC LIMIT 10", [worldId]);
    if (!result2.rows.length) return interaction.editReply("Hen\xFCz kimse D\xFCnya Boss'a sald\u0131rmad\u0131. \u0130lk vuru\u015Fu sen yap!");
    const lines = result2.rows.map((row, index) => `${index + 1}. Oyuncu ${row.user_id} \u2014 **${Number(row.damage).toLocaleString("tr-TR")} hasar** \xB7 ${row.attacks} sald\u0131r\u0131`);
    return interaction.editReply({ content: ["**D\xFCnya Boss Katk\u0131 S\u0131ralamas\u0131**", ...lines].join("\n"), allowedMentions: { parse: [] } });
  }
  const result = await inTransaction(async (client) => {
    const eventResult = await client.query("SELECT boss_name, current_hp, status FROM endless_world_events WHERE world_id = $1 FOR UPDATE", [worldId]);
    const event = eventResult.rows[0];
    if (!event || event.status !== "active") return { ok: false, reason: "defeated", bossName: event?.boss_name ?? WORLD_BOSS.name };
    const playerResult = await client.query("SELECT level FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
    const walletResult = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
    if (!playerResult.rows[0] || !walletResult.rows[0]) return { ok: false, reason: "not_registered" };
    if (Number(walletResult.rows[0].wallet_coins) < 20) return { ok: false, reason: "insufficient_funds" };
    const ledgerInserted = await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: -20, reason: "world_event_attack", idempotencyKey: `world-event-attack:${interaction.id}` });
    if (!ledgerInserted) return { ok: false, reason: "duplicate" };
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - 20, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id]);
    const damage = randomInt4(35, 91) + Number(playerResult.rows[0].level) * 4;
    const nextHp = Math.max(0, Number(event.current_hp) - damage);
    const defeated = nextHp === 0;
    await client.query("UPDATE endless_world_events SET current_hp = $2, status = $3, defeated_at = CASE WHEN $3 = 'defeated' THEN NOW() ELSE defeated_at END WHERE world_id = $1", [worldId, nextHp, defeated ? "defeated" : "active"]);
    await client.query("INSERT INTO endless_world_event_contributions (world_id, user_id, damage, attacks) VALUES ($1, $2, $3, 1) ON CONFLICT (world_id, user_id) DO UPDATE SET damage = endless_world_event_contributions.damage + EXCLUDED.damage, attacks = endless_world_event_contributions.attacks + 1, updated_at = NOW()", [worldId, interaction.user.id, damage]);
    if (defeated) {
      await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: 1e3, reason: "world_event_boss_reward", idempotencyKey: `world-event-reward:${worldId}:${interaction.user.id}:${WORLD_BOSS.key}` });
      await insertLedger(client, { worldId, userId: interaction.user.id, currency: "gem", walletDelta: 5, reason: "world_event_boss_reward", idempotencyKey: `world-event-reward:${worldId}:${interaction.user.id}:${WORLD_BOSS.key}:gem` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + 1000, wallet_gems = wallet_gems + 5, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id]);
    }
    return { ok: true, damage, nextHp, defeated, bossName: event.boss_name };
  });
  if (!result.ok) {
    const messages = { not_registered: "\xD6nce `/start` ile karakter olu\u015Ftur.", insufficient_funds: "Boss'a sald\u0131rmak i\xE7in **20 Coin** gerekiyor.", duplicate: "Bu sald\u0131r\u0131 zaten i\u015Flendi.", defeated: `**${result.bossName}** zaten yenildi. Yeni etkinlik yak\u0131nda a\xE7\u0131lacak.` };
    return interaction.editReply(messages[result.reason]);
  }
  return interaction.editReply(result.defeated ? `\u{1F4A5} **${result.bossName}** yenildi! Senin son darben **${result.damage} hasar** verdi. Katk\u0131 \xF6d\xFCl\xFCn: **1.000 Coin + 5 Gem**!` : `\u2694\uFE0F **${result.bossName}**'a **${result.damage} hasar** verdin! Kalan can: **${result.nextHp.toLocaleString("tr-TR")}**. Sald\u0131r\u0131 bedeli: 20 Coin.`);
}
__name(handleWorldEvent, "handleWorldEvent");
async function handleArena(interaction) {
  const worldId = await requireGuild(interaction, "Arena");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  const action = interaction.options.getSubcommand();
  if (action === "stats") {
    const result2 = await pool.query("SELECT rating, wins, losses FROM endless_arena_stats WHERE world_id = $1 AND user_id = $2 LIMIT 1", [worldId, interaction.user.id]);
    const stats = result2.rows[0] ?? { rating: 1e3, wins: 0, losses: 0 };
    return interaction.editReply(`\u2694\uFE0F **Arena istatistiklerin**
Rating: **${stats.rating}**
Galibiyet: **${stats.wins}** \xB7 Ma\u011Flubiyet: **${stats.losses}**
Toplam ma\xE7: **${Number(stats.wins) + Number(stats.losses)}**`);
  }
  if (action === "leaderboard") {
    const result2 = await pool.query("SELECT s.user_id, s.rating, s.wins, s.losses, COALESCE(a.global_name, a.username, s.user_id) AS display_name FROM endless_arena_stats s LEFT JOIN endless_accounts a ON a.user_id = s.user_id WHERE s.world_id = $1 ORDER BY s.rating DESC, s.wins DESC LIMIT 10", [worldId]);
    if (!result2.rows.length) return interaction.editReply("Arena s\u0131ralamas\u0131 hen\xFCz bo\u015F. \u0130lk d\xFCelloyu sen ba\u015Flat!");
    const lines = result2.rows.map((row, index) => `${index + 1}. **${row.display_name}** \u2014 ${row.rating} rating \xB7 ${row.wins}G / ${row.losses}M`);
    return interaction.editReply({ content: ["**ENDLESS Arena S\u0131ralamas\u0131**", ...lines].join("\n"), allowedMentions: { parse: [] } });
  }
  const target = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  if (target.id === interaction.user.id) return interaction.editReply("Kendinle d\xFCello yapamazs\u0131n. Ba\u015Fka bir oyuncu se\xE7.");
  const result = await inTransaction(async (client) => {
    const ids = [interaction.user.id, target.id].sort();
    const players = await client.query("SELECT user_id, level FROM endless_players WHERE world_id = $1 AND user_id = ANY($2::text[]) FOR UPDATE", [worldId, ids]);
    const wallets = await client.query("SELECT user_id, wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = ANY($2::text[]) FOR UPDATE", [worldId, ids]);
    if (players.rows.length !== 2 || wallets.rows.length !== 2) return { ok: false, reason: "not_registered" };
    if (wallets.rows.some((row) => Number(row.wallet_coins) < amount)) return { ok: false, reason: "insufficient_funds" };
    const debitA = await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: -amount, reason: "arena_wager", idempotencyKey: `arena:${interaction.id}:${interaction.user.id}` });
    const debitB = await insertLedger(client, { worldId, userId: target.id, currency: "coin", walletDelta: -amount, reason: "arena_wager", idempotencyKey: `arena:${interaction.id}:${target.id}` });
    if (!debitA || !debitB) return { ok: false, reason: "duplicate" };
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id, amount]);
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, target.id, amount]);
    const levelOf = /* @__PURE__ */ __name((id) => Number(players.rows.find((row) => row.user_id === id).level), "levelOf");
    const scoreA = randomInt4(1, 101) + levelOf(interaction.user.id) * 10;
    const scoreB = randomInt4(1, 101) + levelOf(target.id) * 10;
    const winnerId = scoreA >= scoreB ? interaction.user.id : target.id;
    const loserId = winnerId === interaction.user.id ? target.id : interaction.user.id;
    const winnerScore = winnerId === interaction.user.id ? scoreA : scoreB;
    const loserScore = winnerId === interaction.user.id ? scoreB : scoreA;
    await insertLedger(client, { worldId, userId: winnerId, currency: "coin", walletDelta: amount * 2, reason: "arena_payout", idempotencyKey: `arena:${interaction.id}:payout` });
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, winnerId, amount * 2]);
    await client.query("INSERT INTO endless_arena_matches (world_id, interaction_id, winner_id, loser_id, wager, winner_score, loser_score) VALUES ($1, $2, $3, $4, $5, $6, $7)", [worldId, interaction.id, winnerId, loserId, amount, winnerScore, loserScore]);
    await client.query("INSERT INTO endless_arena_stats (world_id, user_id, rating, wins, losses) VALUES ($1, $2, 1025, 1, 0), ($1, $3, 985, 0, 1) ON CONFLICT (world_id, user_id) DO UPDATE SET rating = CASE WHEN endless_arena_stats.user_id = $2 THEN endless_arena_stats.rating + 25 ELSE GREATEST(0, endless_arena_stats.rating - 15) END, wins = endless_arena_stats.wins + CASE WHEN endless_arena_stats.user_id = $2 THEN 1 ELSE 0 END, losses = endless_arena_stats.losses + CASE WHEN endless_arena_stats.user_id = $3 THEN 1 ELSE 0 END, updated_at = NOW()", [worldId, winnerId, loserId]);
    return { ok: true, winnerId, winnerScore, loserScore };
  });
  if (!result.ok) {
    const messages = { not_registered: "Sen ve rakibin \xF6nce `/start` ile ayn\u0131 d\xFCnyada karakter olu\u015Fturmal\u0131.", insufficient_funds: "\u0130ki oyuncunun da bahis i\xE7in yeterli Coin'i olmal\u0131.", duplicate: "Bu d\xFCello zaten i\u015Flendi." };
    return interaction.editReply(messages[result.reason]);
  }
  const winnerName = result.winnerId === interaction.user.id ? "Sen" : target.globalName ?? target.username;
  return interaction.editReply(`\u2694\uFE0F **Arena d\xFCellosu tamamland\u0131!**
Senin skorun: **${result.winnerId === interaction.user.id ? result.winnerScore : result.loserScore}**
Rakibin skoru: **${result.winnerId === interaction.user.id ? result.loserScore : result.winnerScore}**
\u{1F3C6} Kazanan: **${winnerName}** \xB7 \xD6d\xFCl: **${(amount * 2).toLocaleString("tr-TR")} Coin**`);
}
__name(handleArena, "handleArena");
var helpText = [
  "**ENDLESS \u2014 Komut Rehberi**",
  "`/start` \u2014 Bu sunucunun d\xFCnyas\u0131nda karakter olu\u015Ftur.",
  "`/world status` \u2014 D\xFCnya ad\u0131n\u0131 ve macerac\u0131 say\u0131s\u0131n\u0131 g\xF6r.",
  "`/player profile show` \u2014 Karakter, seviye ve varl\u0131klar\u0131n\u0131 g\xF6r.",
  "`/player ranking leaderboard` \u2014 Level, Coin veya Gem s\u0131ralamas\u0131na bak.",
  "`/economy wallet balance` \u2014 C\xFCzdan bakiyeni g\xF6r.",
  "`/economy bank balance` \u2014 C\xFCzdan ve banka toplamlar\u0131n\u0131 g\xF6r.",
  "`/economy bank deposit` / `/economy bank withdraw` \u2014 Coin veya Gem aktar.",
  "`/adventure daily claim` \u2014 G\xFCnl\xFCk \xF6d\xFCl\xFCn\xFC al; seri bonusu kazan.",
  "`/adventure journey explore` \u2014 XP, ganimet ve rastlant\u0131sal ke\u015Fif olaylar\u0131 i\xE7in yola \xE7\u0131k.",
  "`/dungeon enter` \u2014 50 Coin ile K\xFCl Harabeleri'ne gir; \xFC\xE7 dalga ve boss'u yen.",
  "`/dungeon status` / `/dungeon fight` / `/dungeon retreat` \u2014 Zindan sava\u015F\u0131n\u0131 y\xF6net.",
  "`/quest board` \u2014 G\xFCnl\xFCk g\xF6revlerini ve ilerlemeni g\xF6r.",
  "`/quest claim` \u2014 Tamamlad\u0131\u011F\u0131n g\xF6revlerin \xF6d\xFCl\xFCn\xFC al.",
  "`/shop browse` / `/shop buy` \u2014 E\u015Fya katalo\u011Funu incele ve al\u0131\u015Fveri\u015F yap.",
  "`/inventory bag` \u2014 \xC7antandaki ve ku\u015Fan\u0131lm\u0131\u015F e\u015Fyalar\u0131 g\xF6r.",
  "`/inventory equip` / `/inventory unequip` \u2014 Ekipman bonuslar\u0131n\u0131 y\xF6net.",
  "`/inventory use` \u2014 T\xFCketilebilir e\u015Fyalar\u0131 kullan.",
  "`/fun coinflip` / `/fun dice` \u2014 Yaz\u0131-tura veya \xF6zelle\u015Ftirilebilir zar at.",
  "`/fun 8ball` / `/fun choose` \u2014 Kehanet al veya iki se\xE7enekten birini se\xE7.",
  "`/fun rps` / `/fun trivia` \u2014 Ta\u015F-ka\u011F\u0131t-makas ve mini trivia oyna.",
  "`/fun joke` / `/fun quote` / `/fun vibe` \u2014 \u015Eaka, s\xF6z veya g\xFCnl\xFCk enerji ke\u015Ffet.",
  "`/fun compliment` / `/fun roast` \u2014 Dost\xE7a iltifat et veya k\u0131r\u0131c\u0131 olmayan \u015Faka yap.",
  "`/fun ship` \u2014 \u0130ki oyuncunun e\u011Flenceli tak\u0131m uyumunu \xF6l\xE7.",
  "`/endless hunt` / `/endless zoo` \u2014 Hayvan avla, koleksiyonunu b\xFCy\xFCt ve \xF6d\xFCl kazan.",
  "`/endless give` / `/endless gamble` \u2014 Coin g\xF6nder veya kontroll\xFC oyun i\xE7i bahis yap.",
  "`/endless pray` / `/endless battle` \u2014 Dua \xF6d\xFCl\xFC al veya dost\xE7a sava\u015F yap.",
  "`/endless cookie` / `/endless curse` \u2014 Oyunculara sosyal ve tamamen e\u011Flencelik etkile\u015Fim g\xF6nder.",
  "`/games slots` \u2014 ENDLESS slot makinesinde Coin bahis yap.",
  "`/games blackjack` \u2014 Blackjack eli ba\u015Flat; `blackjack-status`, `blackjack-hit`, `blackjack-stand` veya `blackjack-cancel` ile y\xF6net. Elin veritaban\u0131nda saklan\u0131r.",
  "`/games mines` \u2014 1-9 aras\u0131ndan h\xFCcre se\xE7, may\u0131na basmadan \xF6d\xFCl kazan.",
  "`/games roulette` / `/games crash` \u2014 Renk ruleti veya patlamadan \xF6nce \xE7arpan yakalama oyunu.",
  "`/games daily-spin` \u2014 Veritaban\u0131na kaydedilen g\xFCnl\xFCk \xFCcretsiz \u015Eans \xC7ark\u0131 \xF6d\xFCl\xFCn\xFC al.",
  "`/social hug` / `/social kiss` / `/social cuddle` / `/social pat` / `/social highfive` / `/social boop` \u2014 \xD6zg\xFCn Endless animasyonlar\u0131 g\xF6nder.",
  "`/achievements show` / `/achievements claim` \u2014 Rozetlerini g\xF6r ve tek seferlik ba\u015Far\u0131 \xF6d\xFCllerini al.",
  "`/pet adopt` / `/pet show` / `/pet feed` \u2014 \xD6zg\xFCn bir Endless Yolda\u015F\u0131 sahiplen, isim ver ve sadakatini b\xFCy\xFCt.",
  "`/event status` / `/event attack` / `/event leaderboard` \u2014 Sunucunun ortak D\xFCnya Boss'una sald\u0131r ve katk\u0131 s\u0131ralamas\u0131na gir.",
  "`/arena duel` / `/arena stats` / `/arena leaderboard` \u2014 Coin bahisli PvP d\xFCellosu, rating ve Arena s\u0131ralamas\u0131.",
  "",
  "Her Discord sunucusu ayr\u0131 bir d\xFCnyad\u0131r. Karakterin ve ekonomin d\xFCnyaya \xF6zeldir. G\xFCnl\xFCk \xF6d\xFCl ve g\xF6revler UTC gece yar\u0131s\u0131nda yenilenir; ke\u015Fifler aras\u0131nda 5 dakika bekleme vard\u0131r."
].join("\n");
function currencyLabel(currency) {
  return CURRENCY_COLUMNS[currency]?.label ?? currency;
}
__name(currencyLabel, "currencyLabel");
function formatBalances(wallet) {
  return `C\xFCzdan: **${wallet.wallet_coins.toLocaleString("tr-TR")} Coin** \xB7 **${wallet.wallet_gems.toLocaleString("tr-TR")} Gem**
Banka: **${wallet.bank_coins.toLocaleString("tr-TR")} Coin** \xB7 **${wallet.bank_gems.toLocaleString("tr-TR")} Gem**`;
}
__name(formatBalances, "formatBalances");
function slotLabel(slot) {
  return EQUIPMENT_SLOTS.find((candidate) => candidate.value === slot)?.name ?? slot;
}
__name(slotLabel, "slotLabel");
async function sendPrivate(interaction, content) {
  const payload = { content, allowedMentions: { parse: [] } };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}
__name(sendPrivate, "sendPrivate");
async function requireGuild(interaction, label) {
  if (interaction.guildId) {
    return interaction.guildId;
  }
  await sendPrivate(
    interaction,
    `${label} yaln\u0131zca bir Discord sunucusunda kullan\u0131labilir.`
  );
  return null;
}
__name(requireGuild, "requireGuild");
async function handleStart(interaction) {
  const worldId = await requireGuild(interaction, "Karakter olu\u015Fturma");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const displayName = interaction.member?.displayName ?? interaction.user.globalName ?? interaction.user.username;
  const result = await createOrUpdatePlayer({
    worldId,
    worldName: interaction.guild.name,
    userId: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName ?? interaction.user.username,
    displayName
  });
  if (result.created) {
    await sendPrivate(
      interaction,
      `**${displayName}**, ENDLESS d\xFCnyas\u0131na ho\u015F geldin! Ba\u015Flang\u0131\xE7 bakiyen: **${STARTING_COINS} Coin** ve **${STARTING_GEMS} Gem**. \`/adventure journey explore\` ile ke\u015Ffe \xE7\u0131kabilirsin.`
    );
  } else if (result.walletCreated) {
    await sendPrivate(
      interaction,
      `Karakterin g\xFCncellendi. Ba\u015Flang\u0131\xE7 bakiyen: **${STARTING_COINS} Coin** ve **${STARTING_GEMS} Gem**.`
    );
  } else {
    await sendPrivate(
      interaction,
      `**${displayName}**, karakterin bu d\xFCnyada haz\u0131r. \`/help\` ile komutlar\u0131 g\xF6rebilirsin.`
    );
  }
}
__name(handleStart, "handleStart");
async function handleWorld(interaction) {
  const worldId = await requireGuild(interaction, "D\xFCnya komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const status = await getWorldStatus(worldId, interaction.guild.name);
  await sendPrivate(
    interaction,
    `**${interaction.guild.name}** d\xFCnyas\u0131nda **${status.playerCount.toLocaleString("tr-TR")}** macerac\u0131 var. Her sunucu ayr\u0131 bir ENDLESS d\xFCnyas\u0131d\u0131r.`
  );
}
__name(handleWorld, "handleWorld");
async function handlePlayer(interaction) {
  const worldId = await requireGuild(interaction, "Oyuncu komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();
  if (group === "profile") {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const profile = await getPlayerProfile(worldId, target.id);
    if (!profile) {
      await sendPrivate(
        interaction,
        target.id === interaction.user.id ? "Bu d\xFCnyada hen\xFCz karakterin yok. \xD6nce `/start` kullan." : `${target.username} bu d\xFCnyada hen\xFCz karakter olu\u015Fturmam\u0131\u015F.`
      );
      return;
    }
    await sendPrivate(
      interaction,
      [
        `**${profile.display_name}** \xB7 **Level ${profile.level}**`,
        `XP: **${profile.xp}/${profile.level * 100}**`,
        `C\xFCzdan: **${profile.wallet_coins.toLocaleString("tr-TR")} Coin** \xB7 **${profile.wallet_gems.toLocaleString("tr-TR")} Gem**`,
        `Banka: **${profile.bank_coins.toLocaleString("tr-TR")} Coin** \xB7 **${profile.bank_gems.toLocaleString("tr-TR")} Gem**`
      ].join("\n")
    );
    return;
  }
  const metric = interaction.options.getString("metric") ?? "level";
  const rows = await getLeaderboard(worldId, metric);
  if (rows.length === 0) {
    await sendPrivate(interaction, "Bu d\xFCnyan\u0131n s\u0131ralamas\u0131nda hen\xFCz oyuncu yok.");
    return;
  }
  const heading = metric === "coins" ? "Coin S\u0131ralamas\u0131" : metric === "gems" ? "Gem S\u0131ralamas\u0131" : "Level S\u0131ralamas\u0131";
  const valueFor = /* @__PURE__ */ __name((row) => metric === "coins" ? `${row.wallet_coins.toLocaleString("tr-TR")} Coin` : metric === "gems" ? `${row.wallet_gems.toLocaleString("tr-TR")} Gem` : `Level ${row.level} \xB7 ${row.xp} XP`, "valueFor");
  const lines = rows.map(
    (row, index) => `${index + 1}. **${row.display_name}** \u2014 ${valueFor(row)}`
  );
  await sendPrivate(interaction, [`**${heading}**`, ...lines].join("\n"));
}
__name(handlePlayer, "handlePlayer");
async function handleEconomy(interaction) {
  const worldId = await requireGuild(interaction, "Ekonomi komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();
  const action = interaction.options.getSubcommand();
  const wallet = await getWallet(worldId, interaction.user.id);
  if (!wallet) {
    await sendPrivate(interaction, "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.");
    return;
  }
  if (group === "wallet") {
    await sendPrivate(
      interaction,
      `C\xFCzdan\u0131nda **${wallet.wallet_coins.toLocaleString("tr-TR")} Coin** ve **${wallet.wallet_gems.toLocaleString("tr-TR")} Gem** var.`
    );
    return;
  }
  if (action === "balance") {
    await sendPrivate(interaction, formatBalances(wallet));
    return;
  }
  const result = await moveFunds({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id,
    action,
    currency: interaction.options.getString("currency", true),
    amount: interaction.options.getInteger("amount", true)
  });
  if (!result.ok) {
    const message = result.reason === "insufficient_funds" ? "Aktar\u0131lacak miktar kaynak bakiyenden fazla." : result.reason === "balance_limit" ? "Hedef bakiyen 2 milyar s\u0131n\u0131r\u0131n\u0131 a\u015Famaz." : result.reason === "duplicate_request" ? "Bu aktar\u0131m zaten i\u015Flendi." : "Miktar ge\xE7erli de\u011Fil.";
    await sendPrivate(interaction, message);
    return;
  }
  const verb = action === "deposit" ? "yat\u0131r\u0131ld\u0131" : "\xE7ekildi";
  const currency = interaction.options.getString("currency", true);
  const amount = interaction.options.getInteger("amount", true);
  await sendPrivate(
    interaction,
    `**${amount.toLocaleString("tr-TR")} ${currencyLabel(currency)}** ${verb}.
${formatBalances(result.wallet)}`
  );
}
__name(handleEconomy, "handleEconomy");
async function handleAdventure(interaction) {
  const worldId = await requireGuild(interaction, "Macera komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();
  if (group === "daily") {
    const result2 = await claimDailyReward(worldId, interaction.user.id);
    if (!result2.claimed) {
      const message = result2.reason === "already_claimed" ? "Bug\xFCnk\xFC g\xFCnl\xFCk \xF6d\xFCl\xFCn\xFC zaten ald\u0131n." : result2.reason === "balance_limit" ? "C\xFCzdan bakiyen \xF6d\xFCl alabilmek i\xE7in s\u0131n\u0131rda." : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.";
      await sendPrivate(interaction, message);
      return;
    }
    const gemText2 = result2.gemsAwarded > 0 ? ` ve **${result2.gemsAwarded} Gem**` : "";
    await sendPrivate(
      interaction,
      `G\xFCnl\xFCk \xF6d\xFCl\xFCn: **${result2.coinsAwarded} Coin**${gemText2}. Seri: **${result2.streak} g\xFCn**.`
    );
    return;
  }
  const result = await exploreWorld({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id
  });
  if (!result.explored) {
    const message = result.reason === "cooldown" ? `Bir sonraki ke\u015Ffin i\xE7in <t:${Math.ceil(new Date(result.cooldownUntil).getTime() / 1e3)}:R> bekle.` : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.";
    await sendPrivate(interaction, message);
    return;
  }
  const gemText = result.gemsAwarded > 0 ? ` ve **${result.gemsAwarded} Gem**` : "";
  const levelText = result.levelsGained > 0 ? ` Seviye atlad\u0131n: **Level ${result.level}**!` : "";
  const eventText = result.event ? ` **${result.event.title}:** ${result.event.description}` : "";
  await sendPrivate(
    interaction,
    `Ke\u015Fif tamamland\u0131: **${result.coinsAwarded} Coin**${gemText} ve **${result.xpAwarded} XP** kazand\u0131n.${eventText}${levelText} Sonraki ke\u015Fif <t:${Math.ceil(result.cooldownUntil.getTime() / 1e3)}:R> haz\u0131r.`
  );
}
__name(handleAdventure, "handleAdventure");
async function handleDungeon(interaction) {
  const worldId = await requireGuild(interaction, "Zindan komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const action = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  if (action === "status") {
    const state = await getDungeonStatus(worldId, userId);
    if (!state) {
      await sendPrivate(
        interaction,
        "K\xFCl Harabeleri'ne hen\xFCz girmedin. `/dungeon enter` ile 50 Coin kar\u015F\u0131l\u0131\u011F\u0131nda ba\u015Flayabilirsin."
      );
      return;
    }
    if (state.status === "active") {
      await sendPrivate(
        interaction,
        `**K\xFCl Harabeleri \xB7 ${state.enemy?.title ?? `Dalga ${state.stage}`}**
D\xFC\u015Fman: **${state.enemy?.name ?? "Bilinmeyen d\xFC\u015Fman"}** \xB7 HP **${state.enemy_hp}/${state.enemy?.maxHp ?? "?"}**
Sen: HP **${state.player_hp}/${state.maxHp}** \xB7 Ko\u015Fu **#${state.run_number}**
Sald\u0131rmak i\xE7in \`/dungeon fight\`, ayr\u0131lmak i\xE7in \`/dungeon retreat\`.`
      );
      return;
    }
    const stateLabel = {
      cleared: "Boss'u yendin",
      defeated: "Bu ko\u015Fuda yenildin",
      retreated: "\xD6nceki ko\u015Fudan \xE7ekildin"
    }[state.status] ?? "Aktif ko\u015Fu yok";
    const cooldownText = state.cooldown_until && new Date(state.cooldown_until).getTime() > Date.now() ? `Yeni giri\u015F <t:${Math.ceil(new Date(state.cooldown_until).getTime() / 1e3)}:R> haz\u0131r.` : "Yeni bir ko\u015Fuya girebilirsin.";
    await sendPrivate(
      interaction,
      `**K\xFCl Harabeleri \xB7 ${stateLabel}** \xB7 Son ko\u015Fu **#${state.run_number}**.
${cooldownText}`
    );
    return;
  }
  if (action === "enter") {
    const result2 = await enterDungeon(worldId, userId, interaction.id);
    if (!result2.entered) {
      const message = result2.reason === "already_active" ? "Zindanda zaten aktif bir ko\u015Fun var. `/dungeon status` ile durumunu g\xF6r." : result2.reason === "cooldown" ? `Bir sonraki giri\u015Fin i\xE7in <t:${Math.ceil(new Date(result2.cooldownUntil).getTime() / 1e3)}:R> bekle.` : result2.reason === "insufficient_funds" ? "Giri\u015F i\xE7in c\xFCzdan\u0131nda **50 Coin** olmal\u0131. Bankadaki Coin otomatik kullan\u0131lmaz." : result2.reason === "duplicate_request" ? "Bu zindan giri\u015F iste\u011Fi zaten i\u015Flendi." : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.";
      await sendPrivate(interaction, message);
      return;
    }
    await sendPrivate(
      interaction,
      `**K\xFCl Harabeleri'ne girdin!** Giri\u015F bedeli: **${result2.entryFee} Coin**. \u0130lk d\xFC\u015Fman **${result2.enemy.name}** \xB7 HP **${result2.enemy.maxHp}**. Senin HP'n **${result2.maxHp}**. Sald\u0131rmak i\xE7in \`/dungeon fight\` kullan.`
    );
    return;
  }
  if (action === "retreat") {
    const result2 = await retreatDungeon(worldId, userId, interaction.id);
    if (!result2.retreated) {
      const message = result2.reason === "duplicate_request" ? "Bu \xE7ekilme iste\u011Fi zaten i\u015Flendi." : result2.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "\xC7ekilebilece\u011Fin aktif bir zindan ko\u015Fun yok.";
      await sendPrivate(interaction, message);
      return;
    }
    await sendPrivate(
      interaction,
      `Zindandan \xE7ekildin. Giri\u015F bedeli iade edilmez; yeni ko\u015Fu <t:${Math.ceil(result2.cooldownUntil.getTime() / 1e3)}:R> haz\u0131r.`
    );
    return;
  }
  const result = await fightDungeon(worldId, userId, interaction.id);
  if (!result.fought) {
    const message = result.reason === "duplicate_request" ? "Bu sald\u0131r\u0131 iste\u011Fi zaten i\u015Flendi." : result.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "Aktif zindan ko\u015Fun yok. `/dungeon enter` ile ba\u015Flayabilirsin.";
    await sendPrivate(interaction, message);
    return;
  }
  const criticalText = result.critical ? " **Kritik vuru\u015F!**" : "";
  const xpText = result.xpAwarded > 0 ? ` **${result.xpAwarded} XP** kazand\u0131n.` : "";
  const levelText = result.levelsGained > 0 ? ` Seviye atlad\u0131n: **Level ${result.level}**!` : "";
  if (result.status === "cleared") {
    const rewards = [
      result.coinsAwarded > 0 ? `${result.coinsAwarded} Coin` : null,
      result.gemsAwarded > 0 ? `${result.gemsAwarded} Gem` : null,
      `${result.xpAwarded} XP`
    ].filter(Boolean);
    await sendPrivate(
      interaction,
      `**K\xFCl Ejderhas\u0131'n\u0131 yendin; zindan temizlendi!** ${result.playerDamage} hasar verdin${criticalText}.
\xD6d\xFCl: **${rewards.join(", ")}**.${levelText} Yeni ko\u015Fu <t:${Math.ceil(result.cooldownUntil.getTime() / 1e3)}:R> haz\u0131r.`
    );
    return;
  }
  if (result.status === "defeated") {
    await sendPrivate(
      interaction,
      `**${result.enemy.name}** kar\u015F\u0131s\u0131nda yenildin. Verdi\u011Fin hasar: **${result.playerDamage}**${criticalText} \xB7 Ald\u0131\u011F\u0131n hasar: **${result.enemyDamage}**. Giri\u015F bedeli iade edilmez; yeni ko\u015Fu <t:${Math.ceil(result.cooldownUntil.getTime() / 1e3)}:R> haz\u0131r.`
    );
    return;
  }
  if (result.nextEnemy) {
    await sendPrivate(
      interaction,
      `**${result.enemy.name}** yenildi! ${result.playerDamage} hasar verdin${criticalText}.${xpText}${levelText}
${result.healing > 0 ? `Dalga aras\u0131 **${result.healing} HP** yeniledin. ` : ""}S\u0131radaki d\xFC\u015Fman: **${result.nextEnemy.name}** \xB7 HP **${result.enemyHp}**. Senin HP'n **${result.playerHp}/${result.maxHp}**.`
    );
    return;
  }
  await sendPrivate(
    interaction,
    `**${result.enemy.name}**'a **${result.playerDamage} hasar** verdin${criticalText}; kar\u015F\u0131 sald\u0131r\u0131da **${result.enemyDamage} hasar** ald\u0131n.${xpText}${levelText}
Senin HP'n: **${result.playerHp}/${result.maxHp}** \xB7 D\xFC\u015Fman\u0131n HP'si: **${result.enemyHp}/${result.enemy.maxHp}**. Devam etmek i\xE7in \`/dungeon fight\` kullan.`
  );
}
__name(handleDungeon, "handleDungeon");
async function handleQuest(interaction) {
  const worldId = await requireGuild(interaction, "G\xF6rev komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  if (interaction.options.getSubcommand() === "board") {
    const board = await getDailyQuestBoard(worldId, interaction.user.id);
    if (!board) {
      await sendPrivate(interaction, "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur.");
      return;
    }
    const lines = board.quests.map((quest) => {
      const status = quest.claimed ? "\xF6d\xFCl al\u0131nd\u0131" : quest.progress >= quest.target ? "tamamland\u0131" : "devam ediyor";
      const progress = quest.activity === "bank_coin_deposit" ? `${quest.progress}/${quest.target} Coin` : `${quest.progress}/${quest.target}`;
      return `\u2022 **${quest.title}** \u2014 ${quest.description}
  \u0130lerleme: **${progress}** \xB7 ${status} \xB7 \xD6d\xFCl: ${quest.rewardCoins} Coin${quest.rewardGems ? `, ${quest.rewardGems} Gem` : ""}${quest.rewardXp ? `, ${quest.rewardXp} XP` : ""}`;
    });
    await sendPrivate(
      interaction,
      ["**G\xFCnl\xFCk G\xF6rev Panosu**", ...lines].join("\n")
    );
    return;
  }
  const result = await claimDailyQuest(
    worldId,
    interaction.user.id,
    interaction.options.getString("quest", true)
  );
  if (!result.claimed) {
    const message = result.reason === "incomplete" ? `Bu g\xF6rev hen\xFCz tamamlanmad\u0131 (**${result.progress}/${result.target}**).` : result.reason === "already_claimed" ? "Bu g\xF6revin \xF6d\xFCl\xFCn\xFC bug\xFCn zaten ald\u0131n." : result.reason === "balance_limit" ? "Bakiyelerin \xF6d\xFCl alabilmek i\xE7in s\u0131n\u0131rda." : result.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "Bu g\xF6rev bulunamad\u0131.";
    await sendPrivate(interaction, message);
    return;
  }
  const rewards = [
    result.coinsAwarded > 0 ? `${result.coinsAwarded} Coin` : null,
    result.gemsAwarded > 0 ? `${result.gemsAwarded} Gem` : null,
    result.xpAwarded > 0 ? `${result.xpAwarded} XP` : null
  ].filter(Boolean);
  const levelText = result.levelsGained > 0 ? ` Yeni seviyen: **${result.level}**!` : "";
  await sendPrivate(
    interaction,
    `**${result.title}** g\xF6revinin \xF6d\xFCl\xFC: ${rewards.join(", ")}.${levelText}`
  );
}
__name(handleQuest, "handleQuest");
async function handleShop(interaction) {
  const worldId = await requireGuild(interaction, "Market komutlar\u0131");
  if (!worldId) return;
  const action = interaction.options.getSubcommand();
  if (action === "browse") {
    const lines = catalogEntries.map(
      ([, item]) => `**${item.name}** \u2014 ${item.description}
Fiyat: **${itemPriceLabel(item)}**`
    );
    await sendPrivate(interaction, ["**ENDLESS Market**", ...lines].join("\n"));
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const result = await purchaseItem({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id,
    itemKey: interaction.options.getString("item", true),
    quantity: interaction.options.getInteger("quantity") ?? 1
  });
  if (!result.purchased) {
    const message = result.reason === "insufficient_funds" ? "Bu al\u0131\u015Fveri\u015F i\xE7in c\xFCzdan\u0131nda yeterli Coin veya Gem yok. Bankadaki para otomatik kullan\u0131lmaz." : result.reason === "duplicate_request" ? "Bu sat\u0131n alma zaten kaydedildi." : result.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "Bu e\u015Fya veya adet ge\xE7erli de\u011Fil.";
    await sendPrivate(interaction, message);
    return;
  }
  await sendPrivate(
    interaction,
    `**${result.quantity}\xD7 ${result.item.name}** sat\u0131n al\u0131nd\u0131. Toplam: **${result.totalPrice.toLocaleString("tr-TR")} ${currencyLabel(result.item.price.currency)}**. E\u015Fyan\u0131 g\xF6rmek i\xE7in \`/inventory bag\` kullan.`
  );
}
__name(handleShop, "handleShop");
async function handleInventory(interaction) {
  const worldId = await requireGuild(interaction, "\xC7anta komutlar\u0131");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const action = interaction.options.getSubcommand();
  if (action === "bag") {
    const inventory = await getInventory(worldId, interaction.user.id);
    if (!inventory) {
      await sendPrivate(interaction, "Bu d\xFCnyada karakterin yok. \xD6nce `/start` kullan.");
      return;
    }
    const equipmentLines = inventory.equipment.map((equipped) => {
      const item = getItemDefinition(equipped.item_key);
      return `\u2022 **${slotLabel(equipped.slot)}:** ${item?.name ?? equipped.item_key}`;
    });
    const itemLines = inventory.items.map((entry) => {
      const item = getItemDefinition(entry.item_key);
      return `\u2022 **${item?.name ?? entry.item_key}** \xD7${entry.quantity}${item ? ` \u2014 ${item.description}` : ""}`;
    });
    await sendPrivate(
      interaction,
      [
        "**Ekipman**",
        ...equipmentLines.length > 0 ? equipmentLines : ["\u2022 Hen\xFCz ekipman ku\u015Fanmad\u0131n."],
        "",
        "**\xC7anta**",
        ...itemLines.length > 0 ? itemLines : ["\u2022 \xC7anta bo\u015F. E\u015Fyalar i\xE7in `/shop browse` kullan."],
        "",
        "E\u015Fya ku\u015Fanmak i\xE7in `/inventory equip`; kullanmak i\xE7in `/inventory use`."
      ].join("\n")
    );
    return;
  }
  if (action === "equip") {
    const result2 = await equipItem(
      worldId,
      interaction.user.id,
      interaction.options.getString("item", true)
    );
    if (!result2.equipped) {
      const message = result2.reason === "not_owned" ? "Bu e\u015Fya \xE7antanda yok. `/shop browse` ile marketi incele." : result2.reason === "already_equipped" ? "Bu e\u015Fya zaten ku\u015Fan\u0131lm\u0131\u015F." : result2.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "Bu e\u015Fya ku\u015Fanabilir de\u011Fil.";
      await sendPrivate(interaction, message);
      return;
    }
    await sendPrivate(
      interaction,
      `**${result2.item.name}** ku\u015Fan\u0131ld\u0131.${result2.replaced ? " \xD6nceki ekipman \xE7antana geri kondu." : ""} Bonuslar\u0131 sonraki ke\u015Ffinde aktif olur.`
    );
    return;
  }
  if (action === "unequip") {
    const result2 = await unequipItem(
      worldId,
      interaction.user.id,
      interaction.options.getString("slot", true)
    );
    if (!result2.unequipped) {
      await sendPrivate(
        interaction,
        result2.reason === "empty_slot" ? "Bu ekipman yuvas\u0131 zaten bo\u015F." : "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur."
      );
      return;
    }
    await sendPrivate(
      interaction,
      `**${result2.item?.name ?? "Ekipman"}** \xE7\u0131kar\u0131ld\u0131 ve \xE7antana geri kondu.`
    );
    return;
  }
  const result = await useConsumable({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id,
    itemKey: interaction.options.getString("item", true),
    quantity: interaction.options.getInteger("quantity") ?? 1
  });
  if (!result.used) {
    const message = result.reason === "not_owned" ? "Bu e\u015Fyadan yeterli miktarda \xE7antanda yok." : result.reason === "duplicate_request" ? "Bu kullan\u0131m zaten i\u015Flendi." : result.reason === "not_registered" ? "\xD6nce `/start` ile bu d\xFCnyada karakter olu\u015Ftur." : "Bu t\xFCketilebilir e\u015Fya \u015Fu anda kullan\u0131lam\u0131yor.";
    await sendPrivate(interaction, message);
    return;
  }
  const levelText = result.levelsGained > 0 ? ` Yeni seviyen: **${result.level}**!` : "";
  await sendPrivate(
    interaction,
    `**${result.quantity}\xD7 ${result.item.name}** kullan\u0131ld\u0131. **${result.xpAwarded} XP** kazand\u0131n.${levelText}`
  );
}
__name(handleInventory, "handleInventory");
var handlers = {
  start: handleStart,
  world: handleWorld,
  player: handlePlayer,
  economy: handleEconomy,
  adventure: handleAdventure,
  dungeon: handleDungeon,
  quest: handleQuest,
  shop: handleShop,
  inventory: handleInventory,
  fun: handleFun,
  endless: handleEndless,
  games: handleGames,
  social: handleSocial,
  achievements: handleAchievements,
  pet: handlePet,
  event: handleWorldEvent,
  arena: handleArena,
  help: /* @__PURE__ */ __name(async (interaction) => sendPrivate(interaction, helpText), "help")
};
async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (!commandNames.has(interaction.commandName)) return;
  try {
    await handlers[interaction.commandName](interaction);
  } catch (error) {
    loggerError(error, {
      commandName: interaction.commandName,
      userId: interaction.user.id,
      guildId: interaction.guildId
    });
    const databaseUnavailable = ["42P01", "3F000", "57P01", "08001", "08006"].includes(error?.code);
    const message = databaseUnavailable ? "ENDLESS veritaban\u0131na eri\u015Femedi. Y\xF6netici ba\u011Flant\u0131 ayarlar\u0131n\u0131 ve PostgreSQL durumunu kontrol etmeli." : "Komut tamamlanamad\u0131. L\xFCtfen biraz sonra yeniden dene.";
    await sendPrivate(interaction, message).catch((replyError) => {
      loggerError(replyError, {
        commandName: interaction.commandName,
        operation: "send_command_error"
      });
    });
  }
}
__name(handleInteraction, "handleInteraction");
var app = express();
app.get("/api/healthz", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    loggerError(error, { route: "/api/healthz" });
    response.status(503).json({ status: "unavailable" });
  }
});
app.use((request, response) => {
  response.status(404).json({ error: "Not found" });
});
pool.on("error", (error) => {
  loggerError(error, { service: "postgres_pool" });
});
async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to start ENDLESS.");
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is required to start ENDLESS.");
  }
  const rawPort = process.env.PORT;
  if (!rawPort) {
    throw new Error("PORT environment variable is required.");
  }
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  await ensureDatabaseSchema();
  const server = app.listen(port, () => {
    logger.info({ port }, "API server listening");
  });
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });
  client.on(Events.Error, (error) => {
    loggerError(error, { service: "discord_client" });
  });
  try {
    await client.login(token);
    if (!client.user) {
      throw new Error("Discord connected without a bot user.");
    }
    const rest = new REST({ version: "10" }).setToken(token);
    const developmentGuildId = process.env.DISCORD_DEV_GUILD_ID?.trim();
    const route = developmentGuildId ? Routes.applicationGuildCommands(client.user.id, developmentGuildId) : Routes.applicationCommands(client.user.id);
    await rest.put(route, {
      body: commandData.map((command) => command.toJSON())
    });
    logger.info(
      {
        botUserId: client.user.id,
        commandScope: developmentGuildId ? "development-guild" : "global"
      },
      "ENDLESS Discord bot is ready"
    );
  } catch (error) {
    client.destroy();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    throw error;
  }
  let shuttingDown = false;
  const shutdown = /* @__PURE__ */ __name(async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down ENDLESS services");
    client.destroy();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }, "shutdown");
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}
__name(start, "start");
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(async (error) => {
    logger.fatal({ err: error }, "ENDLESS startup failed");
    await pool.end().catch((poolError) => {
      loggerError(poolError, { operation: "close_database_pool" });
    });
    process.exitCode = 1;
  });
}
export {
  addPercentBonus,
  blackjackOutcome,
  companionAttackBonus,
  companionRewardPercent,
  createBlackjack,
  createBlackjackDeck,
  gamesCommand,
  handValue,
  petFeedReadyAt
};
