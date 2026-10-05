import { randomInt } from "node:crypto";
import { SlashCommandBuilder } from "discord.js";
import { addPercentBonus, companionRewardPercent } from "./pet-perks.js";

const COOLDOWN_MS = 60 * 1_000;
const HUNT_REWARDS = {
  common: { label: "Sıradan", emoji: "🐌", coins: [12, 30], xp: 8 },
  uncommon: { label: "Sıradışı", emoji: "🐰", coins: [30, 70], xp: 16 },
  rare: { label: "Nadir", emoji: "🦊", coins: [75, 160], xp: 30 },
  epic: { label: "Epik", emoji: "🐉", coins: [180, 400], xp: 60 },
  legendary: { label: "Efsanevi", emoji: "🦄", coins: [500, 1_200], xp: 120 },
};
const ANIMALS = [
  ["common", "Sonsuz Salyangoz"], ["common", "Neşeli Arı"], ["common", "Piksel Böceği"],
  ["uncommon", "Gümüş Tavşan"], ["uncommon", "Kozmik Civciv"], ["uncommon", "Çöl Faresi"],
  ["rare", "Gece Tilkisi"], ["rare", "Kristal Kedi"], ["rare", "Yıldız Köpeği"],
  ["epic", "Kül Ejderhası"], ["epic", "Fırtına Balinası"],
  ["legendary", "Gökkuşağı Tekboynuzu"],
];
const FRIENDLY_BATTLES = [
  "kalkanıyla savunup son anda karşılık verdi",
  "mükemmel bir kritik hamle yaptı",
  "rakibini şaşırtan bir combo açtı",
  "şans zarını son saniyede kendi lehine çevirdi",
];

export const endlessCommand = new SlashCommandBuilder()
  .setName("endless")
  .setDescription("ENDLESS koleksiyon, sosyal eğlence ve riskli ödül merkezini aç.")
  .addSubcommand((sub) => sub.setName("hunt").setDescription("Rastgele bir hayvan avla, Coin ve XP kazan."))
  .addSubcommand((sub) => sub.setName("zoo").setDescription("Topladığın hayvanları ve koleksiyon ilerlemeni gör."))
  .addSubcommand((sub) => sub.setName("give").setDescription("Bir oyuncuya güvenli şekilde Coin gönder.").addUserOption((option) => option.setName("user").setDescription("Coin gönderilecek oyuncu.").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("Gönderilecek Coin miktarı.").setMinValue(1).setMaxValue(100000).setRequired(true)))
  .addSubcommand((sub) => sub.setName("gamble").setDescription("Coin yatır, şansın varsa iki katını kazan.").addIntegerOption((option) => option.setName("amount").setDescription("Risk edilecek Coin miktarı.").setMinValue(1).setMaxValue(100000).setRequired(true)))
  .addSubcommand((sub) => sub.setName("pray").setDescription("Şans tapınağında dua et, sürpriz ödül kazan."))
  .addSubcommand((sub) => sub.setName("battle").setDescription("Bir oyuncuyla zararsız dostça savaş yap.").addUserOption((option) => option.setName("user").setDescription("Dostça savaşılacak oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("cookie").setDescription("Bir oyuncuya sanal kurabiye gönder.").addUserOption((option) => option.setName("user").setDescription("Kurabiye gönderilecek oyuncu.").setRequired(true)))
  .addSubcommand((sub) => sub.setName("curse").setDescription("Bir oyuncuya tamamen eğlencelik şans laneti gönder.").addUserOption((option) => option.setName("user").setDescription("Şaka yapılacak oyuncu.").setRequired(true)));

function displayUser(user) {
  return user?.globalName ?? user?.username ?? "Gizemli oyuncu";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playAnimation(interaction, frames) {
  for (const frame of frames) {
    await interaction.editReply({ content: frame, allowedMentions: { parse: [] } });
    await sleep(220);
  }
}

function randomBetween([min, max]) {
  return randomInt(min, max + 1);
}

function rollRarity() {
  const roll = randomInt(1, 10_001) / 100;
  if (roll <= 0.5) return "legendary";
  if (roll <= 2.5) return "epic";
  if (roll <= 10) return "rare";
  if (roll <= 30) return "uncommon";
  return "common";
}

function randomAnimal() {
  const rarity = rollRarity();
  const candidates = ANIMALS.filter(([candidate]) => candidate === rarity);
  return { rarity, name: candidates[randomInt(0, candidates.length)][1] };
}

export function createEndlessHandler({ pool, inTransaction, insertLedger, applyXp, MAX_BALANCE }) {
  async function hunt(worldId, userId) {
    return inTransaction(async (client) => {
      const playerResult = await client.query(
        "SELECT level, xp FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId],
      );
      const player = playerResult.rows[0];
      const walletResult = await client.query(
        "SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId],
      );
      const wallet = walletResult.rows[0];
      if (!player || !wallet) return { ok: false, reason: "not_registered" };

      const petResult = await client.query(
        "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
        [worldId, userId],
      );
      const pet = petResult.rows[0];

      const now = new Date();
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      const stateResult = await client.query(
        "SELECT hunt_until FROM endless_collection_state WHERE world_id = $1 AND user_id = $2 FOR UPDATE",
        [worldId, userId],
      );
      const previous = stateResult.rows[0]?.hunt_until;
      if (previous && new Date(previous).getTime() > now.getTime()) return { ok: false, reason: "cooldown", cooldownUntil: previous };

      const animal = randomAnimal();
      const reward = HUNT_REWARDS[animal.rarity];
      const coins = Math.min(
        addPercentBonus(randomBetween(reward.coins), companionRewardPercent(pet?.species, "coins", pet?.loyalty)),
        MAX_BALANCE - Number(wallet.wallet_coins),
      );
      const xp = addPercentBonus(reward.xp, companionRewardPercent(pet?.species, "xp", pet?.loyalty));
      if (coins > 0) {
        await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: coins, reason: "endless_hunt", idempotencyKey: `endless:hunt:${worldId}:${userId}:${now.toISOString()}` });
      }
      const xpResult = applyXp(Number(player.level), Number(player.xp), xp);
      await client.query("UPDATE endless_players SET level = $3, xp = $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, xpResult.level, xpResult.xp]);
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, coins]);
      await client.query(
        `INSERT INTO endless_collection_state (world_id, user_id, hunt_until, pray_until, gamble_until)
         VALUES ($1, $2, $3, NULL, NULL)
         ON CONFLICT (world_id, user_id) DO UPDATE SET hunt_until = EXCLUDED.hunt_until, updated_at = NOW()`,
        [worldId, userId, cooldownUntil],
      );
      await client.query(
        `INSERT INTO endless_collection_animals (world_id, user_id, animal_key, rarity, quantity)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (world_id, user_id, animal_key) DO UPDATE SET quantity = endless_collection_animals.quantity + 1, updated_at = NOW()`,
        [worldId, userId, animal.name.toLowerCase().replaceAll(" ", "_"), animal.rarity],
      );
      return { ok: true, animal, reward, coins, xp, level: xpResult.level, levelsGained: xpResult.levelsGained, cooldownUntil };
    });
  }

  async function pray(worldId, userId) {
    return inTransaction(async (client) => {
      const walletResult = await client.query("SELECT wallet_coins, wallet_gems FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      if (!walletResult.rows[0]) return { ok: false, reason: "not_registered" };
      const petResult = await client.query("SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2", [worldId, userId]);
      const pet = petResult.rows[0];
      const now = new Date();
      const stateResult = await client.query("SELECT pray_until FROM endless_collection_state WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      const previous = stateResult.rows[0]?.pray_until;
      if (previous && new Date(previous).getTime() > now.getTime()) return { ok: false, reason: "cooldown", cooldownUntil: previous };
      const requestedCoins = addPercentBonus(randomInt(35, 151), companionRewardPercent(pet?.species, "prayerCoins", pet?.loyalty));
      const coins = Math.min(requestedCoins, MAX_BALANCE - Number(walletResult.rows[0].wallet_coins));
      const gems = randomInt(1, 101) <= 12 && Number(walletResult.rows[0].wallet_gems) < MAX_BALANCE ? 1 : 0;
      if (coins > 0) await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: coins, reason: "endless_pray", idempotencyKey: `endless:pray:${worldId}:${userId}:${now.toISOString()}` });
      if (gems > 0) await insertLedger(client, { worldId, userId, currency: "gem", walletDelta: gems, reason: "endless_pray", idempotencyKey: `endless:pray:${worldId}:${userId}:${now.toISOString()}:gem` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, wallet_gems = wallet_gems + $4, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, coins, gems]);
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      await client.query(`INSERT INTO endless_collection_state (world_id, user_id, hunt_until, pray_until, gamble_until) VALUES ($1, $2, NULL, $3, NULL) ON CONFLICT (world_id, user_id) DO UPDATE SET pray_until = EXCLUDED.pray_until, updated_at = NOW()`, [worldId, userId, cooldownUntil]);
      return { ok: true, coins, gems, cooldownUntil };
    });
  }

  async function give(worldId, userId, targetId, amount, interactionId) {
    if (userId === targetId) return { ok: false, reason: "self" };
    return inTransaction(async (client) => {
      const ids = [userId, targetId].sort();
      const result = await client.query("SELECT user_id, wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = ANY($2::text[]) FOR UPDATE", [worldId, ids]);
      if (result.rows.length !== 2) return { ok: false, reason: "not_registered" };
      const source = result.rows.find((row) => row.user_id === userId);
      if (Number(source.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
      await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: -amount, reason: "endless_give", idempotencyKey: `endless:give:${interactionId}:from` });
      await insertLedger(client, { worldId, userId: targetId, currency: "coin", walletDelta: amount, reason: "endless_give", idempotencyKey: `endless:give:${interactionId}:to` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins - $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, amount]);
      await client.query("UPDATE endless_wallets SET wallet_coins = LEAST(wallet_coins + $3, $4), updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, targetId, amount, MAX_BALANCE]);
      return { ok: true };
    });
  }

  async function gamble(worldId, userId, amount, interactionId) {
    return inTransaction(async (client) => {
      const result = await client.query("SELECT wallet_coins FROM endless_wallets WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, userId]);
      const wallet = result.rows[0];
      if (!wallet) return { ok: false, reason: "not_registered" };
      if (Number(wallet.wallet_coins) < amount) return { ok: false, reason: "insufficient_funds" };
      const jackpot = randomInt(1, 101) <= 4;
      const won = jackpot || randomInt(1, 101) <= 46;
      const payout = won ? amount * (jackpot ? 5 : 2) : 0;
      const delta = payout - amount;
      await insertLedger(client, { worldId, userId, currency: "coin", walletDelta: delta, reason: jackpot ? "endless_gamble_jackpot" : won ? "endless_gamble_win" : "endless_gamble_loss", idempotencyKey: `endless:gamble:${interactionId}` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + $3, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, userId, delta]);
      return { ok: true, won, jackpot, payout, delta };
    });
  }

  return async function handleEndless(interaction) {
    const worldId = interaction.guildId;
    if (!worldId) return interaction.reply({ content: "Bu komut yalnızca bir Discord sunucusunda kullanılabilir.", ephemeral: true });
    await interaction.deferReply({ ephemeral: false });
    const action = interaction.options.getSubcommand();
    if (["cookie", "curse", "battle"].includes(action)) {
      const target = interaction.options.getUser("user", true);
      const targetName = displayUser(target);
      await playAnimation(interaction, action === "battle"
        ? ["⚔️ Arena kapıları açılıyor...", `⚔️ **${targetName}** düelloya davet edildi...`, "⚔️ Zarlar atılıyor..."]
        : action === "cookie"
          ? ["🍪 Fırın ısınıyor...", `🍪 **${targetName}** için hamur hazırlanıyor...`, "🍪 Üzerine çikolata parçaları ekleniyor..."]
          : ["🌀 Lanet kitabı açılıyor...", `🌀 **${targetName}** için hedef seçiliyor...`, "🌀 Minik kaos hazırlanıyor..."]);
      const message = action === "cookie" ? `🍪 **${targetName}** oyuncusuna sıcacık bir kurabiye gönderildi!` : action === "curse" ? `🌀 **${targetName}** oyuncusuna tamamen eğlencelik bir şans laneti gönderildi. Etkisi 3 saniye sürer!` : `⚔️ **${displayUser(interaction.user)}**, **${targetName}** ile dostça savaşa girdi ve ${FRIENDLY_BATTLES[randomInt(0, FRIENDLY_BATTLES.length)]}. Sonuç: herkes kazandı!`;
      return interaction.editReply({ content: message, allowedMentions: { parse: [] } });
    }
    if (action === "zoo") {
      const result = await pool.query("SELECT animal_key, rarity, quantity FROM endless_collection_animals WHERE world_id = $1 AND user_id = $2 ORDER BY quantity DESC, rarity ASC LIMIT 20", [worldId, interaction.user.id]);
      if (!result.rows.length) return interaction.editReply("Hayvan koleksiyonun boş. `/endless hunt` ile ilk hayvanını bul!");
      const lines = result.rows.map((row) => `• **${row.animal_key.replaceAll("_", " ")}** — ${HUNT_REWARDS[row.rarity]?.emoji ?? "🐾"} ${HUNT_REWARDS[row.rarity]?.label ?? row.rarity} ×${row.quantity}`);
      return interaction.editReply(["**ENDLESS Hayvan Koleksiyonu**", ...lines, `Toplam farklı tür: **${result.rows.length}**`].join("\n"));
    }
    if (action === "hunt") {
      await playAnimation(interaction, ["🌲 ENDLESS ormanına giriliyor...", "🔎 İzler aranıyor...", "🏹 Yay geriliyor..."]);
      const result = await hunt(worldId, interaction.user.id);
      if (!result.ok) return interaction.editReply(result.reason === "cooldown" ? `Av cooldown'ı devam ediyor. <t:${Math.ceil(new Date(result.cooldownUntil).getTime() / 1000)}:R> sonra tekrar dene.` : "Önce `/start` ile bu dünyada karakter oluştur.");
      const levelText = result.levelsGained ? ` Level atladın: **${result.level}**!` : "";
      return interaction.editReply(`${result.reward.emoji} **${result.reward.label} ${result.animal.name}** buldun! **${result.coins} Coin** ve **${result.xp} XP** kazandın.${levelText} Yeni av <t:${Math.ceil(result.cooldownUntil.getTime() / 1000)}:R> hazır.`);
    }
    if (action === "pray") {
      await playAnimation(interaction, ["🕯️ Tapınak kapıları açılıyor...", "🙏 Dua gökyüzüne yükseliyor...", "✨ Şans kristali parlıyor..."]);
      const result = await pray(worldId, interaction.user.id);
      if (!result.ok) return interaction.editReply(result.reason === "cooldown" ? `Tapınak seni duydu. Yeni dua için <t:${Math.ceil(new Date(result.cooldownUntil).getTime() / 1000)}:R> bekle.` : "Önce `/start` ile bu dünyada karakter oluştur.");
      return interaction.editReply(`🙏 Dua kabul edildi! **${result.coins} Coin**${result.gems ? ` ve **${result.gems} Gem**` : ""} kazandın.`);
    }
    if (action === "give") {
      const target = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);
      await playAnimation(interaction, ["💸 Transfer hazırlanıyor...", `💸 **${amount.toLocaleString("tr-TR")} Coin** sayılıyor...`, "💸 Güvenli ledger kaydı oluşturuluyor..."]);
      const result = await give(worldId, interaction.user.id, target.id, amount, interaction.id);
      const message = result.reason === "self" ? "Kendine Coin gönderemezsin." : result.reason === "insufficient_funds" ? "Cüzdanında bu transfer için yeterli Coin yok." : result.reason === "not_registered" ? "İki oyuncunun da bu dünyada `/start` ile karakter oluşturması gerekiyor." : `💸 **${target.username}** oyuncusuna **${amount.toLocaleString("tr-TR")} Coin** gönderildi.`;
      return interaction.editReply(message);
    }
    const amount = interaction.options.getInteger("amount", true);
    await playAnimation(interaction, ["🎰 Makine hazırlanıyor...", "🎰 Makaralar dönüyor...", "🎰 Son sembol bekleniyor..."]);
    const result = await gamble(worldId, interaction.user.id, amount, interaction.id);
    if (!result.ok) return interaction.editReply(result.reason === "insufficient_funds" ? "Bu bahis için cüzdanında yeterli Coin yok." : "Önce `/start` ile bu dünyada karakter oluştur.");
    if (result.jackpot) return interaction.editReply(`🎰 **JACKPOT!** **${result.payout.toLocaleString("tr-TR")} Coin** kazandın!`);
    return interaction.editReply(result.won ? `🎲 Kazandın! **${result.payout.toLocaleString("tr-TR")} Coin** geri aldın.` : `🎲 Bu tur olmadı; **${amount.toLocaleString("tr-TR")} Coin** kaybettin. Şansını tekrar denemek için yeniden oyna.`);
  };
}
