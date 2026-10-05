import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";

const MAX_BET = 100_000;
const SOCIAL_COOLDOWN_MS = 2_000;
const socialCooldowns = new Map();
const blackjackSessions = new Map();
const ASSET_ROOT = fileURLToPath(new URL("./assets/gifs/", import.meta.url));
const SOCIAL_GIFS = Object.fromEntries(Object.keys({ hug: 1, kiss: 1, cuddle: 1, pat: 1, highfive: 1, boop: 1 }).map((name) => [name, `${ASSET_ROOT}/endless-${name}.gif`]));

const SLOTS = [
  { icon: "🍒", weight: 30, multiplier: 2 },
  { icon: "🍋", weight: 25, multiplier: 2 },
  { icon: "🔔", weight: 18, multiplier: 3 },
  { icon: "💎", weight: 10, multiplier: 5 },
  { icon: "🌙", weight: 7, multiplier: 8 },
  { icon: "♾️", weight: 2, multiplier: 20 },
];
const CARD_VALUES = { A: 11, K: 10, Q: 10, J: 10 };
const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["♠️", "♥️", "♦️", "♣️"];
const SOCIAL_LINES = {
  hug: ["🫂 Endless kollarını açıyor...", "🫂 Sıcak bir enerji yaklaşıyor...", "🫂 sarıldı! Sunucuya +100 neşe yayıldı."],
  kiss: ["💋 Endless yıldız tozunu hazırlıyor...", "💋 Minik bir kalp hedefe uçuyor...", "💋 tatlı bir öpücük gönderdi!"],
  cuddle: ["🧸 Battaniye modu etkin...", "🧸 Rahatlık seviyesi %99...", "🧸 ile sıcacık bir sarılma molası başladı."],
  pat: ["✨ Endless şefkat sensörünü açıyor...", "✨ Nazik bir dokunuş hazırlanıyor...", "✨ usulca okşadı: her şey yoluna girecek!"],
  highfive: ["🙌 Eller havaya...", "🙌 Zamanlama kilitlendi...", "🙌 ile kusursuz çak! Kombo tamamlandı."],
  boop: ["👉 Hedef kilitleniyor...", "👉 Minik bir dürtme yükleniyor...", "👉 burnuna tatlı bir pıt yaptı!"],
};

export const gamesCommand = new SlashCommandBuilder()
  .setName("games")
  .setDescription("ENDLESS'in özgün şans ve strateji oyunlarını aç.")
  .addSubcommand((sub) => sub.setName("slots").setDescription("ENDLESS slot makinesinde Coin dene.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktarı.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)))
  .addSubcommand((sub) => sub.setName("blackjack").setDescription("21'e yaklaş, dağıtıcıyı yen.").addIntegerOption((option) => option.setName("amount").setDescription("Yeni el için bahis miktarı.").setMinValue(1).setMaxValue(MAX_BET).setRequired(false)))
  .addSubcommand((sub) => sub.setName("blackjack-hit").setDescription("Blackjack eline bir kart çek."))
  .addSubcommand((sub) => sub.setName("blackjack-stand").setDescription("Blackjack elinde kal ve dağıtıcıyla karşılaştır."))
  .addSubcommand((sub) => sub.setName("blackjack-cancel").setDescription("Açık blackjack elini iptal et ve bahsi iade al."))
  .addSubcommand((sub) => sub.setName("mines").setDescription("Gizli mayınlardan kaçınarak ödül çarpanını büyüt.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktarı.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addIntegerOption((option) => option.setName("cell").setDescription("1-9 arasında bir hücre seç.").setMinValue(1).setMaxValue(9).setRequired(true)))
  .addSubcommand((sub) => sub.setName("roulette").setDescription("Kırmızı, siyah veya yeşil rulet rengi seç.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktarı.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addStringOption((option) => option.setName("color").setDescription("Tahmin edeceğin renk.").setRequired(true).addChoices({ name: "Kırmızı", value: "red" }, { name: "Siyah", value: "black" }, { name: "Yeşil", value: "green" })))
  .addSubcommand((sub) => sub.setName("crash").setDescription("Çarpan patlamadan önce güvenli kazancı yakala.").addIntegerOption((option) => option.setName("amount").setDescription("Bahis miktarı.").setMinValue(1).setMaxValue(MAX_BET).setRequired(true)).addNumberOption((option) => option.setName("cashout").setDescription("Hedef çarpan: 1.10 ile 5.00 arası.").setMinValue(1.1).setMaxValue(5).setRequired(true)))
  .addSubcommand((sub) => sub.setName("daily-spin").setDescription("Her gün bir kez Endless Şans Çarkı çevir."))
  .addSubcommand((sub) => sub.setName("help").setDescription("Oyunların nasıl oynandığını gör."));

export const socialCommand = new SlashCommandBuilder()
  .setName("social")
  .setDescription("ENDLESS'in özgün sosyal animasyonlarını gönder.")
  .addSubcommand((sub) => sub.setName("hug").setDescription("Bir oyuncuya sıcacık sarıl.").addUserOption((option) => option.setName("user").setDescription("Sarılacağın oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("kiss").setDescription("Bir oyuncuya tatlı bir öpücük gönder.").addUserOption((option) => option.setName("user").setDescription("Öpücük göndereceğin oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("cuddle").setDescription("Bir oyuncuyla şirin bir kucaklaşma başlat.").addUserOption((option) => option.setName("user").setDescription("Kucaklaşacağın oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("pat").setDescription("Bir oyuncuya moral veren nazik bir okşama gönder.").addUserOption((option) => option.setName("user").setDescription("Okşayacağın oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("highfive").setDescription("Bir oyuncuyla çak yap.").addUserOption((option) => option.setName("user").setDescription("Çak yapacağın oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("boop").setDescription("Bir oyuncunun burnuna tatlı bir pıt yap.").addUserOption((option) => option.setName("user").setDescription("Pıt yapacağın oyuncu.").setRequired(true)));

function userName(user) { return user?.globalName ?? user?.username ?? "gizemli oyuncu"; }
function keyFor(interaction) { return `${interaction.guildId}:${interaction.user.id}`; }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function animate(interaction, frames) {
  for (const frame of frames) {
    await interaction.editReply({ content: frame, allowedMentions: { parse: [] } });
    await sleep(260);
  }
}
function weightedSlot() {
  const total = SLOTS.reduce((sum, item) => sum + item.weight, 0);
  let roll = randomInt(1, total + 1);
  for (const item of SLOTS) { roll -= item.weight; if (roll <= 0) return item; }
  return SLOTS[0];
}
function drawCard() { return { rank: CARD_RANKS[randomInt(0, CARD_RANKS.length)], suit: CARD_SUITS[randomInt(0, CARD_SUITS.length)] }; }
function cardText(card) { return `${card.rank}${card.suit}`; }
function handValue(hand) {
  let value = hand.reduce((sum, card) => sum + (CARD_VALUES[card.rank] ?? Number(card.rank)), 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) { value -= 10; aces -= 1; }
  return value;
}
function handText(hand) { return hand.map(cardText).join(" "); }
function createBlackjack() { return { player: [drawCard(), drawCard()], dealer: [drawCard(), drawCard()], bet: 0 }; }
async function walletBet({ pool, inTransaction, insertLedger, worldId, userId, amount, reason, interactionId }) {
  return inTransaction(async (client) => {
    const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
    const wallet = result.rows[0];
    if (!wallet) return { ok: false, reason: "not_registered" };
    if (Number(wallet.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
    await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: -amount, reason, idempotencyKey: `games:${reason}:${interactionId}` });
    await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, amount]);
    return { ok: true };
  });
}
async function walletPayout({ pool, inTransaction, insertLedger, worldId, userId, amount, reason, interactionId }) {
  return inTransaction(async (client) => {
    const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
    if (!result.rows[0]) return { ok: false, reason: "not_registered" };
    await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: amount, reason, idempotencyKey: `games:${reason}:${interactionId}` });
    await client.query("UPDATE endless_wallets SET wallet_coins = LEAST(wallet_coins + $3, $4), updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, amount, 2_000_000_000]);
    return { ok: true };
  });
}
function notRegistered(result) { return result.reason === "not_registered" ? "Önce `/start` ile bu dünyada karakter oluştur." : ""; }

export function createGamesHandler({ pool, inTransaction, insertLedger }) {
  async function slots(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const debit = await walletBet({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "slots_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(notRegistered(debit) || "Bu bahis için yeterli Coin yok.");
    await animate(interaction, ["🎰 ENDLESS makinesi uyanıyor...", "🎰 Makaralar dönüyor...", "🎰 Şans çekirdeği kilitleniyor..."]);
    const reels = [weightedSlot(), weightedSlot(), weightedSlot()];
    const same = reels.every((item) => item.icon === reels[0].icon);
    const payout = same ? amount * reels[0].multiplier : 0;
    if (payout) await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: "slots_payout", interactionId: interaction.id });
    const line = reels.map((item) => item.icon).join(" │ ");
    return interaction.editReply(`${line}\n${payout ? `✨ **${reels[0].icon} ${reels[0].icon} ${reels[0].icon}**! **${payout.toLocaleString("tr-TR")} Coin** aldın.` : `Makaralar sustu. **${amount.toLocaleString("tr-TR")} Coin** gitti; tekrar denemek için şansını hazırla.`}`);
  }
  async function blackjackStart(interaction) {
    const key = keyFor(interaction);
    if (blackjackSessions.has(key)) return interaction.editReply("Zaten açık bir blackjack elin var. `/games blackjack-hit` veya `/games blackjack-stand` kullan.");
    const amount = interaction.options.getInteger("amount") ?? 0;
    if (amount < 1) return interaction.editReply("Yeni el başlatmak için `amount` belirtmelisin.");
    const debit = await walletBet({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "blackjack_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(notRegistered(debit) || "Bu el için yeterli Coin yok.");
    const hand = createBlackjack(); hand.bet = amount; blackjackSessions.set(key, hand);
    await animate(interaction, ["🃏 ENDLESS krupiyesi kartları karıyor...", "🃏 İlk kartlar dağıtılıyor...", "🃏 Hamleni seç: hit veya stand."]);
    return interaction.editReply(`**Blackjack**\nSen: ${handText(hand.player)} (**${handValue(hand.player)}**)\nDağıtıcı: ${cardText(hand.dealer[0])} ❓\nBahis: **${amount.toLocaleString("tr-TR")} Coin**\n
devam: "/games blackjack-hit" veya "/games blackjack-stand"`);
  }
  async function blackjackAction(interaction, action) {
    const key = keyFor(interaction); const hand = blackjackSessions.get(key);
    if (!hand) return interaction.editReply("Açık bir blackjack elin yok. `/games blackjack amount:50` ile başla.");
    if (action === "hit") { hand.player.push(drawCard()); if (handValue(hand.player) > 21) { blackjackSessions.delete(key); await animate(interaction, ["🃏 Yeni kart geliyor...", "💥 Elin 21'i aştı!"]); return interaction.editReply(`Sen: ${handText(hand.player)} (**${handValue(hand.player)}**) — **Battın.** ${hand.bet.toLocaleString("tr-TR")} Coin kaybedildi.`); } return interaction.editReply(`🃏 Kart çekildi: ${handText(hand.player)} (**${handValue(hand.player)}**)\nDağıtıcı: ${cardText(hand.dealer[0])} ❓\nHit veya stand seçebilirsin.`); }
    while (handValue(hand.dealer) < 17) hand.dealer.push(drawCard());
    const player = handValue(hand.player); const dealer = handValue(hand.dealer); const win = player > dealer || dealer > 21; const push = player === dealer;
    const payout = win ? hand.bet * 2 : push ? hand.bet : 0;
    blackjackSessions.delete(key);
    if (payout) await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: push ? "blackjack_push" : "blackjack_payout", interactionId: interaction.id });
    await animate(interaction, ["🃏 Dağıtıcı kartlarını açıyor...", "🃏 Sonuç hesaplanıyor..."]);
    return interaction.editReply(`**Blackjack sonucu**\nSen: ${handText(hand.player)} (**${player}**)\nDağıtıcı: ${handText(hand.dealer)} (**${dealer}**)\n${win ? `🏆 Kazandın! **${payout.toLocaleString("tr-TR")} Coin** aldın.` : push ? `🤝 Berabere! Bahsin **${hand.bet.toLocaleString("tr-TR")} Coin** iade edildi.` : `🌑 Bu eli dağıtıcı aldı. **${hand.bet.toLocaleString("tr-TR")} Coin** kaybedildi.`}`);
  }
  async function blackjackCancel(interaction) { const key = keyFor(interaction); const hand = blackjackSessions.get(key); if (!hand) return interaction.editReply("İade edilecek açık bir blackjack elin yok."); blackjackSessions.delete(key); await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: hand.bet, reason: "blackjack_cancel_refund", interactionId: interaction.id }); return interaction.editReply(`Blackjack eli iptal edildi; **${hand.bet.toLocaleString("tr-TR")} Coin** iade edildi.`); }
  async function mines(interaction) {
    const amount = interaction.options.getInteger("amount", true); const cell = interaction.options.getInteger("cell", true);
    const debit = await walletBet({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "mines_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(notRegistered(debit) || "Bu oyun için yeterli Coin yok.");
    await animate(interaction, ["💣 ENDLESS mayın tarlasını kuruyor...", "💣 Hücreler karıştırılıyor...", `💣 **${cell}** numaralı hücre açılıyor...`]);
    const minesSet = new Set(); while (minesSet.size < 3) minesSet.add(randomInt(1, 10));
    if (minesSet.has(cell)) return interaction.editReply(`💥 Hücre **${cell}** mayındı! **${amount.toLocaleString("tr-TR")} Coin** kaybedildi. Tahta: ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️`);
    const payout = Math.floor(amount * (1.55 + (cell % 3) * 0.2)); await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: "mines_payout", interactionId: interaction.id });
    return interaction.editReply(`✅ Hücre **${cell}** güvenli! **${payout.toLocaleString("tr-TR")} Coin** çekildi. Tahta: ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️ ▫️`);
  }

  // Rulette önce bahis cüzdandan güvenli transaction ile düşer; sonra tek bir renk çekilir.
  async function roulette(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const chosenColor = interaction.options.getString("color", true);
    const debit = await walletBet({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "roulette_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(notRegistered(debit) || "Rulet için yeterli Coin yok.");
    await animate(interaction, ["🎡 Endless ruleti hazırlanıyor...", "🎡 Top dönüyor...", "🎡 Renk kilitleniyor..."]);
    const number = randomInt(0, 37);
    const resultColor = number === 0 ? "green" : number <= 18 ? "red" : "black";
    const multiplier = resultColor === "green" ? 14 : 2;
    const payout = resultColor === chosenColor ? amount * multiplier : 0;
    if (payout) await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: "roulette_payout", interactionId: interaction.id });
    const labels = { red: "Kırmızı", black: "Siyah", green: "Yeşil" };
    return interaction.editReply(`🎡 Top **${number}** üzerinde durdu: **${labels[resultColor]}**.\n${payout ? `🏆 Tahminin tuttu! **${payout.toLocaleString("tr-TR")} Coin** kazandın.` : `🌑 Bu turda **${amount.toLocaleString("tr-TR")} Coin** kaybettin.`}`);
  }

  // Crash oyununda çarpanı baştan hedeflersin. Sistem rastgele patlama noktası üretir.
  async function crash(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const cashout = interaction.options.getNumber("cashout", true);
    const debit = await walletBet({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount, reason: "crash_bet", interactionId: interaction.id });
    if (!debit.ok) return interaction.editReply(notRegistered(debit) || "Crash için yeterli Coin yok.");
    await animate(interaction, ["🚀 Endless roketi kalkıyor...", "🚀 Çarpan yükseliyor...", `🚀 Hedef **x${cashout.toFixed(2)}** olarak ayarlandı...`]);
    const crashPoint = Math.round((1.1 + randomInt(0, 391) / 100) * 100) / 100;
    if (cashout > crashPoint) return interaction.editReply(`💥 Roket **x${crashPoint.toFixed(2)}** noktasında patladı. **${amount.toLocaleString("tr-TR")} Coin** kaybedildi.`);
    const payout = Math.floor(amount * cashout);
    await walletPayout({ pool, inTransaction, insertLedger, worldId: interaction.guildId, userId: interaction.user.id, amount: payout, reason: "crash_payout", interactionId: interaction.id });
    return interaction.editReply(`🚀 Zamanında çektin: **x${cashout.toFixed(2)}**! **${payout.toLocaleString("tr-TR")} Coin** hesabına geçti.`);
  }

  // Şans Çarkı kalıcıdır: aynı UTC gününde ikinci kez çevrilmesine veritabanı izin vermez.
  async function dailySpin(interaction) {
    const today = new Date().toISOString().slice(0, 10);
    const result = await inTransaction(async (client) => {
      const player = await client.query("SELECT 1 FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [interaction.guildId, interaction.user.id]);
      if (!player.rows[0]) return { ok: false, reason: "not_registered" };
      const rewardType = randomInt(1, 101) <= 12 ? "gem" : "coin";
      const rewardAmount = rewardType === "gem" ? randomInt(1, 4) : randomInt(75, 301);
      const inserted = await client.query("INSERT INTO endless_daily_spins (world_id, user_id, spin_date, reward_type, reward_amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (world_id, user_id, spin_date) DO NOTHING RETURNING reward_type, reward_amount", [interaction.guildId, interaction.user.id, today, rewardType, rewardAmount]);
      if (!inserted.rows[0]) return { ok: false, reason: "already_spun" };
      await insertLedger(client, { worldId: interaction.guildId, userId: interaction.user.id, currency: rewardType, walletDelta: rewardAmount, reason: "daily_spin", idempotencyKey: `daily-spin:${interaction.guildId}:${interaction.user.id}:${today}` });
      const column = rewardType === "gem" ? "wallet_gems" : "wallet_coins";
      await client.query(`UPDATE endless_wallets SET ${column} = LEAST(${column} + $3, $4), updated_at = NOW() WHERE world_id = $1 AND user_id = $2`, [interaction.guildId, interaction.user.id, rewardAmount, 2_000_000_000]);
      return { ok: true, rewardType, rewardAmount };
    });
    if (!result.ok) return interaction.editReply(result.reason === "not_registered" ? "Önce `/start` ile karakter oluştur." : "Bugünkü Şans Çarkı hakkını zaten kullandın. Yarın tekrar dön!");
    await animate(interaction, ["🎁 Endless Şans Çarkı açılıyor...", "🎁 Işıklar dönüyor...", "🎁 Ödül cebine ışınlanıyor..."]);
    return interaction.editReply(`🎁 Günlük ödülün hazır: **${result.rewardAmount} ${result.rewardType === "gem" ? "Gem" : "Coin"}**! Yarın yeniden gel.`);
  }
  return async function handleGames(interaction) {
    const action = interaction.options.getSubcommand(); await interaction.deferReply({ ephemeral: false });
    if (action === "help") return interaction.editReply("**ENDLESS Oyunları**\n`/games slots amount:50` — Slot\n`/games blackjack amount:50` — Blackjack başlat; sonra hit/stand kullan\n`/games mines amount:50 cell:4` — 1-9 hücre seç\n`/games roulette amount:50 color:red` — Rulet rengi tahmini\n`/games crash amount:50 cashout:2` — x2 olmadan önce güvenli çek\n`/games daily-spin` — Her gün bir kez ücretsiz çark\nBahisler Coin cüzdanından düşer; kazançlar otomatik eklenir.");
    if (action === "slots") return slots(interaction);
    if (action === "blackjack") return blackjackStart(interaction);
    if (action === "blackjack-hit") return blackjackAction(interaction, "hit");
    if (action === "blackjack-stand") return blackjackAction(interaction, "stand");
    if (action === "blackjack-cancel") return blackjackCancel(interaction);
    if (action === "mines") return mines(interaction);
    if (action === "roulette") return roulette(interaction);
    if (action === "crash") return crash(interaction);
    return dailySpin(interaction);
  };
}

export async function handleSocial(interaction) {
  const target = interaction.options.getUser("user", true);
  if (target.id === interaction.user.id) return interaction.reply({ content: "ENDLESS aynayla da etkileşim kurabilir ama bu hareketi başka bir oyuncuya gönderebilirsin.", allowedMentions: { parse: [] } });
  const key = `${interaction.guildId}:${interaction.user.id}`; const remaining = SOCIAL_COOLDOWN_MS - (Date.now() - (socialCooldowns.get(key) ?? 0));
  if (remaining > 0) return interaction.reply({ content: `Animasyon motoru nefesleniyor. **${Math.ceil(remaining / 1000)} saniye** bekle.`, ephemeral: true });
  socialCooldowns.set(key, Date.now()); const action = interaction.options.getSubcommand(); const frames = SOCIAL_LINES[action]; const name = userName(target);
  await interaction.deferReply();
  const personalized = frames.map((frame) => frame.replace("sarıldı", `**${name}** ile sarıldı`).replace("öpücük gönderdi", `**${name}** oyuncusuna öpücük gönderdi`).replace("bir kucaklaşma molası başladı", `**${name}** ile kucaklaşma molası başladı`).replace("usulca okşadı", `**${name}** oyuncusunu usulca okşadı`).replace("ile kusursuz çak", `**${name}** ile kusursuz çak`).replace("burnuna tatlı bir pıt yaptı", `**${name}** oyuncusunun burnuna tatlı bir pıt yaptı`));
  await animate(interaction, personalized);
  const gifPath = SOCIAL_GIFS[action];
  return interaction.editReply({
    content: `${personalized.at(-1)}\n🎞️ **Endless özel animasyonu**`,
    files: gifPath ? [new AttachmentBuilder(gifPath)] : [],
    allowedMentions: { parse: [] },
  });
}
