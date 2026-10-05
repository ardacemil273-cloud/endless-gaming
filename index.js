import "dotenv/config";
import { readFileSync } from "node:fs";
import express from "express";
import pg from "pg";
import pino from "pino";
import { randomInt } from "node:crypto";
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { funCommand, handleFun } from "./fun.js";
import { createEndlessHandler, endlessCommand } from "./endless-features.js";
// Oyunlar ayrı modülde tutulur; böylece yeni başlayan biri ekonomiyi ve oyun kurallarını
// index.js içindeki büyük Discord başlangıç dosyasından bağımsız okuyabilir.
import { createGamesHandler, gamesCommand, handleSocial, socialCommand } from "./games.js";
import { companionAttackBonus, companionRewardPercent, petFeedReadyAt } from "./pet-perks.js";

const { Pool } = pg;
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MAX_BALANCE = 2_000_000_000;
const STARTING_COINS = 100;
const STARTING_GEMS = 5;
const EXPLORE_COOLDOWN_MS = 5 * 60 * 1_000;

const CURRENCY_COLUMNS = {
  coin: { wallet: "wallet_coins", bank: "bank_coins", label: "Coin" },
  gem: { wallet: "wallet_gems", bank: "bank_gems", label: "Gem" },
};

const ITEM_CATALOG = {
  trail_blade: {
    name: "Kaşif Kılıcı",
    description: "Keşiflerde %12 daha fazla Coin ve savaşta +5 saldırı sağlar.",
    kind: "equipment",
    slot: "weapon",
    price: { currency: "coin", amount: 700 },
    effects: { coinBonusPercent: 12, attackBonus: 5 },
  },
  scout_cloak: {
    name: "İzci Pelerini",
    description: "Keşiflerde %15 daha fazla XP ve savaşta +3 savunma sağlar.",
    kind: "equipment",
    slot: "armor",
    price: { currency: "coin", amount: 650 },
    effects: { xpBonusPercent: 15, defenseBonus: 3 },
  },
  lucky_compass: {
    name: "Şans Pusulası",
    description: "Gem bulma ihtimalini ve kritik vuruş şansını 5 puan artırır.",
    kind: "equipment",
    slot: "charm",
    price: { currency: "gem", amount: 4 },
    effects: { gemChanceBonus: 5, critChanceBonus: 5 },
  },
  xp_tonic: {
    name: "Bilgi Toniği",
    description: "Kullanıldığında 50 XP verir.",
    kind: "consumable",
    price: { currency: "coin", amount: 180 },
    useXp: 50,
  },
};

const EQUIPMENT_SLOTS = [
  { name: "Silah", value: "weapon" },
  { name: "Zırh", value: "armor" },
  { name: "Tılsım", value: "charm" },
];

const DUNGEON_ENTRY_FEE = 50;
const DUNGEON_COOLDOWN_MS = 20 * 60 * 1_000;
const DUNGEON_CLEAR_REWARD = { coins: 240, gems: 2, bonusXp: 80 };
const DUNGEON_ENEMIES = [
  {
    name: "Kül Slime'ı",
    title: "1. Dalga",
    maxHp: 42,
    minAttack: 7,
    maxAttack: 11,
    xp: 18,
  },
  {
    name: "Harabe Bekçisi",
    title: "2. Dalga",
    maxHp: 72,
    minAttack: 9,
    maxAttack: 13,
    xp: 28,
  },
  {
    name: "Kül Ejderhası",
    title: "Boss",
    maxHp: 135,
    minAttack: 13,
    maxAttack: 18,
    xp: 60,
  },
];

const DAILY_QUESTS = [
  {
    key: "explore_three",
    title: "Haritacı",
    description: "Bugün 3 keşif tamamla.",
    activity: "explore",
    target: 3,
    rewardCoins: 160,
    rewardGems: 0,
    rewardXp: 40,
  },
  {
    key: "claim_daily",
    title: "Güne Başla",
    description: "Günlük ödülünü al.",
    activity: "daily_claim",
    target: 1,
    rewardCoins: 100,
    rewardGems: 1,
    rewardXp: 0,
  },
  {
    key: "bank_coin_250",
    title: "Geleceğe Yatırım",
    description: "Bankaya toplam 250 Coin yatır.",
    activity: "bank_coin_deposit",
    target: 250,
    rewardCoins: 120,
    rewardGems: 0,
    rewardXp: 30,
  },
];

// Başarımlar oyuncunun zaten yaptığı işleri veritabanından ölçer.
// Böylece bot yeniden başlasa da rozet ilerlemesi kaybolmaz.
const ACHIEVEMENTS = [
  { key: "first_step", title: "İlk Adım", description: "ENDLESS dünyasında karakter oluştur.", rewardCoins: 50, rewardGems: 1, rewardXp: 10 },
  { key: "level_five", title: "Çırak Kaşif", description: "5. seviyeye ulaş.", rewardCoins: 250, rewardGems: 2, rewardXp: 40 },
  { key: "fortune_hunter", title: "Şans Avcısı", description: "Slot oyununda 3 kez kazanç al.", rewardCoins: 300, rewardGems: 2, rewardXp: 50 },
  { key: "high_roller", title: "Büyük Oyuncu", description: "Oyunlarda toplam 1.000 Coin bahis yap.", rewardCoins: 350, rewardGems: 3, rewardXp: 60 },
  { key: "collector", title: "Koleksiyoncu", description: "En az 5 farklı hayvan türü keşfet.", rewardCoins: 400, rewardGems: 3, rewardXp: 70 },
  { key: "dungeon_master", title: "Zindan Ustası", description: "Kül Harabeleri'ni en az bir kez temizle.", rewardCoins: 500, rewardGems: 4, rewardXp: 100 },
];

const PET_SPECIES = {
  fox: { label: "Kristal Tilki", emoji: "🦊", bonus: "Keşif ve av Coin ödüllerine sadakatine göre +%1–10" },
  dragon: { label: "Kül Ejderhası", emoji: "🐉", bonus: "Zindan saldırılarına sadakatine göre +1–5 hasar" },
  owl: { label: "Bilge Baykuş", emoji: "🦉", bonus: "Keşif, av ve görev XP ödüllerine sadakatine göre +%1–10" },
  slime: { label: "Neşe Slime'ı", emoji: "🟢", bonus: "Dua Coin ödüllerine sadakatine göre +%1–10" },
};

function itemPriceLabel(item) {
  const currency = CURRENCY_COLUMNS[item.price.currency].label;
  return `${item.price.amount.toLocaleString("tr-TR")} ${currency}`;
}

function getItemDefinition(itemKey) {
  return Object.hasOwn(ITEM_CATALOG, itemKey) ? ITEM_CATALOG[itemKey] : null;
}

const catalogEntries = Object.entries(ITEM_CATALOG);
const equipmentChoices = catalogEntries
  .filter(([, item]) => item.kind === "equipment")
  .map(([key, item]) => ({ name: item.name, value: key }));
const consumableChoices = catalogEntries
  .filter(([, item]) => item.kind === "consumable")
  .map(([key, item]) => ({ name: item.name, value: key }));
const shopItemChoices = catalogEntries.map(([key, item]) => ({
  name: `${item.name} · ${itemPriceLabel(item)}`,
  value: key,
}));

const commandData = [
  new SlashCommandBuilder()
    .setName("start")
    .setDescription("Bu sunucuda kendi ENDLESS karakterini oluştur ve macerana başla."),
  new SlashCommandBuilder()
    .setName("world")
    .setDescription("Sunucunun ENDLESS dünyasını, oyuncu sayısını ve canlı durumunu gör.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Dünya adını ve toplam maceracı sayısını görüntüle."),
    ),
  new SlashCommandBuilder()
    .setName("player")
    .setDescription("Karakter profilini, seviyeni ve dünya sıralamasını incele.")
    .addSubcommandGroup((group) =>
      group
        .setName("profile")
        .setDescription("Senin veya seçtiğin oyuncunun karakter profilini görüntüle.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("show")
            .setDescription("Bir oyuncunun seviye, XP ve varlıklarını göster.")
            .addUserOption((option) =>
              option
                .setName("user")
                .setDescription("Profili görüntülenecek oyuncu.")
                .setRequired(false),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("ranking")
        .setDescription("Level, Coin veya Gem alanında en iyi oyuncuları gör.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("leaderboard")
            .setDescription("Dünyanın en iyi 10 oyuncusunu seçtiğin ölçüte göre sırala.")
            .addStringOption((option) =>
              option
                .setName("metric")
                .setDescription("Sıralama ölçütü.")
                .setRequired(false)
                .addChoices(
                  { name: "Level", value: "level" },
                  { name: "Cüzdan Coin", value: "coins" },
                  { name: "Cüzdan Gem", value: "gems" },
                ),
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Cüzdanını ve bankanı yönet.")
    .addSubcommandGroup((group) =>
      group
        .setName("wallet")
        .setDescription("Cüzdanındaki harcanabilir Coin ve Gem miktarını gör.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("balance")
            .setDescription("Anlık Coin ve Gem cüzdan bakiyeni hızlıca görüntüle."),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("bank")
        .setDescription("Birikimlerini güvenle yönet ve banka işlemlerini yap.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("balance")
            .setDescription("Cüzdan ve banka bakiyelerini göster."),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("deposit")
            .setDescription("Coin veya Gem biriktirmek için bankaya para yatır.")
            .addStringOption((option) =>
              option
                .setName("currency")
                .setDescription("Yatırılacak para birimi.")
                .setRequired(true)
                .addChoices(
                  { name: "Coin", value: "coin" },
                  { name: "Gem", value: "gem" },
                ),
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Yatırılacak miktar.")
                .setMinValue(1)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("withdraw")
            .setDescription("Harcamak için bankadaki Coin veya Gem paranı çek.")
            .addStringOption((option) =>
              option
                .setName("currency")
                .setDescription("Çekilecek para birimi.")
                .setRequired(true)
                .addChoices(
                  { name: "Coin", value: "coin" },
                  { name: "Gem", value: "gem" },
                ),
            )
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Çekilecek miktar.")
                .setMinValue(1)
                .setRequired(true),
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName("adventure")
    .setDescription("Günlük ödülünü al, keşfe çık ve macera XP’si kazan.")
    .addSubcommandGroup((group) =>
      group
        .setName("daily")
        .setDescription("Seri bonusunu koruyarak günlük ödülünü al.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("claim")
            .setDescription("Günlük Coin, Gem ve seri bonusunu kaçırmadan al."),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("journey")
        .setDescription("Cooldown sonunda yeniden keşfe çık ve rastgele olayları keşfet.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("explore")
            .setDescription("XP, Coin, Gem ve sürpriz olaylar için keşfe çık."),
        ),
    ),
  new SlashCommandBuilder()
    .setName("dungeon")
    .setDescription("Kül Harabeleri’nde üç dalgayı aş, boss’u yen ve büyük ödülü kap.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enter")
        .setDescription("50 Coin ödeyerek üç aşamalı Kül Harabeleri koşusunu başlat."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Mevcut dalga, HP, düşman ve cooldown durumunu kontrol et."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("fight")
        .setDescription("Düşmana saldır, hasar ver ve karşı saldırıya hazırlan."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("retreat")
        .setDescription("Koşuyu bırak; giriş bedeli iade edilmez ve cooldown başlar."),
    ),
  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Günlük hedeflerini tamamla, ilerlemeni gör ve ödülleri topla.")
    .addSubcommand((subcommand) =>
      subcommand.setName("board").setDescription("Bugünün görevlerini, ilerlemelerini ve ödüllerini listele."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("claim")
        .setDescription("Tamamladığın günlük görevin ödülünü güvenle teslim al.")
        .addStringOption((option) =>
          option
            .setName("quest")
            .setDescription("Ödülünü alacağın görev.")
            .setRequired(true)
            .addChoices(
              ...DAILY_QUESTS.map((quest) => ({
                name: quest.title,
                value: quest.key,
              })),
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Güçlü ekipmanları ve tüketilebilir eşyaları incele, satın al.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("browse")
        .setDescription("Tüm ekipmanları, etkilerini ve güncel fiyatlarını gör."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Cüzdanındaki para ile seçtiğin eşyadan satın al.")
        .addStringOption((option) =>
          option
            .setName("item")
            .setDescription("Satın alınacak eşya.")
            .setRequired(true)
            .addChoices(...shopItemChoices),
        )
        .addIntegerOption((option) =>
          option
            .setName("quantity")
            .setDescription("Adet (en fazla 10).")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false),
        ),
    ),
  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Envanterini düzenle, ekipman kuşan ve eşyalarını kullan.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bag")
        .setDescription("Çantandaki eşyaları ve aktif ekipman bonuslarını gör."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("equip")
        .setDescription("Sahip olduğun ekipmanı doğru slota kuşan ve bonus kazan.")
        .addStringOption((option) =>
          option
            .setName("item")
            .setDescription("Kuşanılacak ekipman.")
            .setRequired(true)
            .addChoices(...equipmentChoices),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unequip")
        .setDescription("Seçtiğin ekipman slotunu boşalt ve bonusu kaldır.")
        .addStringOption((option) =>
          option
            .setName("slot")
            .setDescription("Boşaltılacak yuva.")
            .setRequired(true)
            .addChoices(...EQUIPMENT_SLOTS),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("use")
        .setDescription("Tüketilebilir eşyanı kullanarak anında XP kazan.")
        .addStringOption((option) =>
          option
            .setName("item")
            .setDescription("Kullanılacak tüketilebilir eşya.")
            .setRequired(true)
            .addChoices(...consumableChoices),
        )
        .addIntegerOption((option) =>
          option
            .setName("quantity")
            .setDescription("Kullanılacak adet (en fazla 10).")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false),
        ),
    ),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Tüm ENDLESS oyun, ekonomi, macera ve eğlence komutlarını keşfet."),
  new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("Rozetlerini, ilerlemeni ve açılabilir başarımlarını gör.")
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("Tüm başarımlarını ve mevcut ilerlemeni listele."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("claim")
        .setDescription("Tamamladığın başarımın tek seferlik ödülünü al.")
        .addStringOption((option) =>
          option
            .setName("achievement")
            .setDescription("Ödülü alınacak başarım.")
            .setRequired(true)
            .addChoices(...ACHIEVEMENTS.map(({ key, title }) => ({ name: title, value: key }))),
        ),
    ),
  new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Kendi Endless Yoldaşını sahiplen, besle ve sadakatini artır.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("adopt")
        .setDescription("Bir yoldaş sahiplen ve ona isim ver.")
        .addStringOption((option) => option.setName("species").setDescription("Yoldaş türü.").setRequired(true).addChoices({ name: "Kristal Tilki", value: "fox" }, { name: "Kül Ejderhası", value: "dragon" }, { name: "Bilge Baykuş", value: "owl" }, { name: "Neşe Slime'ı", value: "slime" }))
        .addStringOption((option) => option.setName("name").setDescription("Yoldaşının adı.").setMinLength(2).setMaxLength(24).setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("show").setDescription("Yoldaşını ve sadakat seviyesini gör."))
    .addSubcommand((subcommand) => subcommand.setName("feed").setDescription("25 Coin harcayarak yoldaşının sadakatini artır.")),
  new SlashCommandBuilder()
    .setName("event")
    .setDescription("Sunucunun ortak Dünya Boss etkinliğine katıl.")
    .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Ortak bossun kalan canını ve etkinlik durumunu gör."))
    .addSubcommand((subcommand) => subcommand.setName("attack").setDescription("20 Coin ödeyip boss'a saldır ve katkı puanı kazan."))
    .addSubcommand((subcommand) => subcommand.setName("leaderboard").setDescription("Boss savaşındaki en yüksek hasar katkılarını gör.")),
  new SlashCommandBuilder()
    .setName("arena")
    .setDescription("ENDLESS Arena'da Coin bahisli PvP düellosuna çık.")
    .addSubcommand((subcommand) => subcommand.setName("duel").setDescription("Bir oyuncuyla bahisli düello yap.").addUserOption((option) => option.setName("user").setDescription("Düello rakibin.").setRequired(true)).addIntegerOption((option) => option.setName("amount").setDescription("İki oyuncunun da yatıracağı Coin.").setMinValue(10).setMaxValue(50_000).setRequired(true)))
    .addSubcommand((subcommand) => subcommand.setName("stats").setDescription("Arena galibiyetlerini, kayıplarını ve rating'ini gör."))
    .addSubcommand((subcommand) => subcommand.setName("leaderboard").setDescription("Sunucunun en iyi Arena oyuncularını gör.")),
  funCommand,
  endlessCommand,
  gamesCommand,
  socialCommand,
];

const commandNames = new Set(commandData.map((command) => command.name));

function loggerError(error, context) {
  logger.error(
    {
      err: error,
      errorCode: error?.code,
      databaseConstraint: error?.constraint,
      ...context,
    },
    error?.message ?? "Unhandled ENDLESS error",
  );
}

async function ensureDatabaseSchema() {
  const schemaUrl = new URL("./database/schema.sql", import.meta.url);
  const schema = readFileSync(schemaUrl, "utf8");
  await pool.query(schema);
  logger.info("PostgreSQL şeması doğrulandı.");
}

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

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
      input.idempotencyKey,
    ],
  );
  return result.rowCount === 1;
}

async function ensureDailyQuestRows(client, worldId, userId, questDate) {
  await client.query(
    `INSERT INTO endless_daily_quest_progress
      (world_id, user_id, quest_date, quest_key)
     VALUES
      ($1, $2, $3, 'explore_three'),
      ($1, $2, $3, 'claim_daily'),
      ($1, $2, $3, 'bank_coin_250')
     ON CONFLICT (world_id, user_id, quest_date, quest_key) DO NOTHING`,
    [worldId, userId, questDate],
  );
}

async function advanceDailyQuest(client, input) {
  const quest = DAILY_QUESTS.find(
    (candidate) => candidate.activity === input.activity,
  );
  if (!quest) {
    return;
  }

  await ensureDailyQuestRows(
    client,
    input.worldId,
    input.userId,
    input.questDate,
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
      quest.target,
    ],
  );
}

async function createOrUpdatePlayer(input) {
  return inTransaction(async (client) => {
    await client.query(
      `INSERT INTO endless_worlds (guild_id, name)
       VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE
       SET name = EXCLUDED.name, updated_at = NOW()`,
      [input.worldId, input.worldName],
    );
    await client.query(
      `INSERT INTO endless_accounts (user_id, username, global_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET username = EXCLUDED.username,
           global_name = EXCLUDED.global_name,
           updated_at = NOW()`,
      [input.userId, input.username, input.globalName],
    );

    const insertedPlayer = await client.query(
      `INSERT INTO endless_players (world_id, user_id, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (world_id, user_id) DO NOTHING
       RETURNING user_id`,
      [input.worldId, input.userId, input.displayName],
    );

    await client.query(
      `UPDATE endless_players
       SET display_name = $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, input.displayName],
    );

    const wallet = await client.query(
      `INSERT INTO endless_wallets
        (world_id, user_id, wallet_coins, wallet_gems)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (world_id, user_id) DO NOTHING
       RETURNING user_id`,
      [input.worldId, input.userId, STARTING_COINS, STARTING_GEMS],
    );

    if (wallet.rowCount === 1) {
      const ledgerEntries = [
        {
          currency: "coin",
          amount: STARTING_COINS,
          suffix: "coin",
        },
        {
          currency: "gem",
          amount: STARTING_GEMS,
          suffix: "gem",
        },
      ];
      for (const entry of ledgerEntries) {
        const inserted = await insertLedger(client, {
          worldId: input.worldId,
          userId: input.userId,
          currency: entry.currency,
          walletDelta: entry.amount,
          reason: "welcome_grant",
          idempotencyKey: `welcome:${input.worldId}:${input.userId}:${entry.suffix}`,
        });
        if (!inserted) {
          throw new Error("Welcome reward ledger idempotency check failed.");
        }
      }
    }

    return { created: insertedPlayer.rowCount === 1, walletCreated: wallet.rowCount === 1 };
  });
}

async function getWorldStatus(worldId, worldName) {
  return inTransaction(async (client) => {
    await client.query(
      `INSERT INTO endless_worlds (guild_id, name)
       VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE
       SET name = EXCLUDED.name, updated_at = NOW()`,
      [worldId, worldName],
    );
    const result = await client.query(
      `SELECT COUNT(*)::int AS player_count
       FROM endless_players
       WHERE world_id = $1`,
      [worldId],
    );
    return { playerCount: result.rows[0].player_count };
  });
}

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
    [worldId, userId],
  );
  return result.rows[0] ?? null;
}

async function getLeaderboard(worldId, metric) {
  const orderBy = {
    level: "p.level DESC, p.xp DESC",
    coins: "COALESCE(w.wallet_coins, 0) DESC, p.level DESC, p.xp DESC",
    gems: "COALESCE(w.wallet_gems, 0) DESC, p.level DESC, p.xp DESC",
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
    [worldId],
  );
  return result.rows;
}

async function getWallet(worldId, userId) {
  const result = await pool.query(
    `SELECT wallet_coins, bank_coins, wallet_gems, bank_gems
     FROM endless_wallets
     WHERE world_id = $1 AND user_id = $2
     LIMIT 1`,
    [worldId, userId],
  );
  return result.rows[0] ?? null;
}

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
      [input.worldId, input.userId],
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      return { ok: false, reason: "not_registered" };
    }

    const fromBalance =
      input.action === "deposit" ? wallet[columns.wallet] : wallet[columns.bank];
    const toBalance =
      input.action === "deposit" ? wallet[columns.bank] : wallet[columns.wallet];
    if (fromBalance < input.amount) {
      return { ok: false, reason: "insufficient_funds" };
    }
    if (toBalance + input.amount > MAX_BALANCE) {
      return { ok: false, reason: "balance_limit" };
    }

    const walletDelta =
      input.action === "deposit" ? -input.amount : input.amount;
    const bankDelta =
      input.action === "deposit" ? input.amount : -input.amount;
    const inserted = await insertLedger(client, {
      worldId: input.worldId,
      userId: input.userId,
      currency: input.currency,
      walletDelta,
      bankDelta,
      reason: `bank_${input.action}`,
      idempotencyKey: `bank:${input.worldId}:${input.userId}:${input.interactionId}`,
    });
    if (!inserted) {
      return { ok: false, reason: "duplicate_request" };
    }

    const nextWallet =
      input.action === "deposit" ? wallet[columns.wallet] - input.amount : wallet[columns.wallet] + input.amount;
    const nextBank =
      input.action === "deposit" ? wallet[columns.bank] + input.amount : wallet[columns.bank] - input.amount;
    await client.query(
      `UPDATE endless_wallets
       SET ${columns.wallet} = $3, ${columns.bank} = $4, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, nextWallet, nextBank],
    );

    if (input.action === "deposit" && input.currency === "coin") {
      await advanceDailyQuest(client, {
        worldId: input.worldId,
        userId: input.userId,
        questDate: utcDateString(),
        activity: "bank_coin_deposit",
        amount: input.amount,
      });
    }

    return { ok: true, wallet: { ...wallet, [columns.wallet]: nextWallet, [columns.bank]: nextBank } };
  });
}

async function claimDailyReward(worldId, userId) {
  const now = new Date();
  const claimDate = utcDateString(now);
  const yesterday = utcDateString(new Date(now.getTime() - 24 * 60 * 60 * 1_000));

  return inTransaction(async (client) => {
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
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
      [worldId, userId, claimDate],
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
      [worldId, userId, claimDate, streak, coinsAwarded, gemsAwarded],
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
        idempotencyKey: `daily:${worldId}:${userId}:${claimDate}:coin`,
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
        idempotencyKey: `daily:${worldId}:${userId}:${claimDate}:gem`,
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
      [worldId, userId, coinsAwarded, gemsAwarded],
    );
    await advanceDailyQuest(client, {
      worldId,
      userId,
      questDate: claimDate,
      activity: "daily_claim",
    });

    return {
      claimed: true,
      claimDate,
      streak,
      coinsAwarded,
      gemsAwarded,
    };
  });
}

async function getDailyQuestBoard(worldId, userId) {
  const questDate = utcDateString();
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       LIMIT 1`,
      [worldId, userId],
    );
    if (playerResult.rowCount === 0) {
      return null;
    }

    await ensureDailyQuestRows(client, worldId, userId, questDate);
    const progressResult = await client.query(
      `SELECT quest_key, progress, claimed_at
       FROM endless_daily_quest_progress
       WHERE world_id = $1 AND user_id = $2 AND quest_date = $3`,
      [worldId, userId, questDate],
    );
    const progressByKey = new Map(
      progressResult.rows.map((row) => [row.quest_key, row]),
    );

    return {
      questDate,
      quests: DAILY_QUESTS.map((quest) => {
        const progress = progressByKey.get(quest.key);
        return {
          ...quest,
          progress: progress?.progress ?? 0,
          claimed: Boolean(progress?.claimed_at),
        };
      }),
    };
  });
}

async function claimDailyQuest(worldId, userId, questKey) {
  const quest = DAILY_QUESTS.find((candidate) => candidate.key === questKey);
  if (!quest) {
    return { claimed: false, reason: "not_found" };
  }

  const now = new Date();
  const questDate = utcDateString(now);
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
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
      [worldId, userId],
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
      [worldId, userId, questDate, quest.key],
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
        target: quest.target,
      };
    }

    const petResult = await client.query(
      "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
      [worldId, userId],
    );
    const pet = petResult.rows[0];
    const xpAwarded = quest.rewardXp + Math.floor(
      quest.rewardXp * companionRewardPercent(pet?.species, "xp", pet?.loyalty) / 100,
    );
    const coinsAwarded = Math.min(
      quest.rewardCoins,
      MAX_BALANCE - wallet.wallet_coins,
    );
    const gemsAwarded = Math.min(
      quest.rewardGems,
      MAX_BALANCE - wallet.wallet_gems,
    );
    if (
      coinsAwarded === 0 &&
      gemsAwarded === 0 &&
      xpAwarded === 0
    ) {
      return { claimed: false, reason: "balance_limit" };
    }

    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId,
        userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "daily_quest_reward",
        idempotencyKey: `quest:${worldId}:${userId}:${questDate}:${quest.key}:coin`,
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
        idempotencyKey: `quest:${worldId}:${userId}:${questDate}:${quest.key}:gem`,
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
      [worldId, userId, coinsAwarded, gemsAwarded],
    );
    if (xpAwarded > 0) {
      await client.query(
        `UPDATE endless_players
         SET level = $3, xp = $4, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2`,
        [worldId, userId, xpResult.level, xpResult.xp],
      );
    }
    await client.query(
      `UPDATE endless_daily_quest_progress
       SET claimed_at = $5
       WHERE world_id = $1 AND user_id = $2
         AND quest_date = $3 AND quest_key = $4`,
      [worldId, userId, questDate, quest.key, now],
    );

    return {
      claimed: true,
      title: quest.title,
      coinsAwarded,
      gemsAwarded,
      xpAwarded,
      levelsGained: xpResult.levelsGained,
      level: xpResult.level,
    };
  });
}

async function exploreWorld(input) {
  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + EXPLORE_COOLDOWN_MS);

  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId],
    );
    const player = playerResult.rows[0];
    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId],
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
      [input.worldId, input.userId, now, cooldownUntil],
    );

    if (reservation.rowCount === 0) {
      const stateResult = await client.query(
        `SELECT cooldown_until
         FROM endless_adventure_state
         WHERE world_id = $1 AND user_id = $2
         LIMIT 1`,
        [input.worldId, input.userId],
      );
      return {
        explored: false,
        reason: "cooldown",
        cooldownUntil: stateResult.rows[0]?.cooldown_until ?? cooldownUntil,
      };
    }

    const equippedResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId],
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
      [input.worldId, input.userId],
    );
    const pet = petResult.rows[0];
    coinBonusPercent += companionRewardPercent(pet?.species, "coins", pet?.loyalty);
    xpBonusPercent += companionRewardPercent(pet?.species, "xp", pet?.loyalty);

    const eventRoll = randomInt(1, 101);
    const event =
      eventRoll <= 8
        ? {
            title: "Kadim erzak sandığı",
            description: "Yol kenarında bulduğun sandıkta fazladan 30 Coin vardı.",
            coins: 30,
            gems: 0,
            xp: 0,
          }
        : eventRoll <= 13
          ? {
              title: "Unutulmuş parşömen",
              description: "Eski parşömenin içindeki notlar sana 25 ek XP kazandırdı.",
              coins: 0,
              gems: 0,
              xp: 25,
            }
          : eventRoll <= 15
            ? {
                title: "Gem damarı",
                description: "Kayaların arasında parlayan bir Gem buldun.",
                coins: 0,
                gems: 1,
                xp: 0,
              }
            : null;
    const baseCoins = randomInt(25, 81);
    const requestedCoins = Math.floor(
      (baseCoins + (event?.coins ?? 0)) * (1 + coinBonusPercent / 100),
    );
    const coinsAwarded = Math.min(
      requestedCoins,
      MAX_BALANCE - wallet.wallet_coins,
    );
    const gemChance = Math.min(100, 5 + gemChanceBonus);
    const randomGem =
      randomInt(1, 101) <= gemChance && wallet.wallet_gems < MAX_BALANCE
        ? 1
        : 0;
    const gemsAwarded = Math.min(
      MAX_BALANCE - wallet.wallet_gems,
      randomGem + (event?.gems ?? 0),
    );
    const xpAwarded = Math.floor(
      (randomInt(15, 36) + (event?.xp ?? 0)) * (1 + xpBonusPercent / 100),
    );

    if (coinsAwarded > 0) {
      const inserted = await insertLedger(client, {
        worldId: input.worldId,
        userId: input.userId,
        currency: "coin",
        walletDelta: coinsAwarded,
        reason: "exploration_reward",
        idempotencyKey: `explore:${input.interactionId}:coin`,
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
        idempotencyKey: `explore:${input.interactionId}:gem`,
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
      [input.worldId, input.userId, xpResult.level, xpResult.xp],
    );
    await client.query(
      `UPDATE endless_wallets
       SET wallet_coins = wallet_coins + $3,
           wallet_gems = wallet_gems + $4,
           updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, coinsAwarded, gemsAwarded],
    );
    await advanceDailyQuest(client, {
      worldId: input.worldId,
      userId: input.userId,
      questDate: utcDateString(now),
      activity: "explore",
    });

    return {
      explored: true,
      coinsAwarded,
      gemsAwarded,
      xpAwarded,
      level: xpResult.level,
      levelsGained: xpResult.levelsGained,
      cooldownUntil,
      event,
    };
  });
}

function getCombatStats(equipmentRows, level, companion = null) {
  const stats = {
    attackBonus: 0,
    defenseBonus: 0,
    critChanceBonus: 0,
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
    critChance: Math.min(75, 5 + stats.critChanceBonus),
  };
}

async function enterDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
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
      [worldId, userId],
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
      [worldId, userId],
    );
    const state = stateResult.rows[0];
    if (state?.status === "active") {
      return { entered: false, reason: "already_active", state };
    }

    const now = new Date();
    if (
      state?.cooldown_until &&
      new Date(state.cooldown_until).getTime() > now.getTime()
    ) {
      return {
        entered: false,
        reason: "cooldown",
        cooldownUntil: state.cooldown_until,
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
      [worldId, userId, runNumber, interactionId],
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
      idempotencyKey: `dungeon:${worldId}:${userId}:run:${runNumber}:entry`,
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
      [worldId, userId, DUNGEON_ENTRY_FEE],
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
      [worldId, userId, runNumber, maxHp, enemy.maxHp],
    );

    return {
      entered: true,
      runNumber,
      maxHp,
      enemy,
      entryFee: DUNGEON_ENTRY_FEE,
    };
  });
}

async function getDungeonStatus(worldId, userId) {
  const result = await pool.query(
    `SELECT s.run_number, s.dungeon_key, s.stage, s.player_hp,
            s.enemy_hp, s.status, s.cooldown_until, p.level
     FROM endless_dungeon_state s
     JOIN endless_players p
       ON p.world_id = s.world_id AND p.user_id = s.user_id
     WHERE s.world_id = $1 AND s.user_id = $2
     LIMIT 1`,
    [worldId, userId],
  );
  const state = result.rows[0];
  if (!state) return null;
  const combatStats = getCombatStats([], state.level);
  return {
    ...state,
    maxHp: combatStats.maxHp,
    enemy: DUNGEON_ENEMIES[state.stage - 1] ?? null,
  };
}

async function fightDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
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
      [worldId, userId],
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
      [worldId, userId],
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
      [worldId, userId, state.run_number, interactionId],
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
      [worldId, userId],
    );
    const petResult = await client.query(
      "SELECT species, loyalty FROM endless_pets WHERE world_id = $1 AND user_id = $2",
      [worldId, userId],
    );
    const combatStats = getCombatStats(equipmentResult.rows, player.level, petResult.rows[0]);
    const attack = randomInt(15 + player.level * 2, 25 + player.level * 2)
      + combatStats.attackBonus;
    const critical = randomInt(1, 101) <= combatStats.critChance;
    const playerDamage = critical ? Math.floor(attack * 1.75) : attack;
    const enemyHp = Math.max(0, state.enemy_hp - playerDamage);
    const enemyDefeated = enemyHp === 0;
    const enemyDamage = enemyDefeated
      ? 0
      : Math.max(
          1,
          randomInt(enemy.minAttack, enemy.maxAttack + 1) -
            combatStats.defense,
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
        MAX_BALANCE - wallet.wallet_coins,
      );
      gemsAwarded = Math.min(
        DUNGEON_CLEAR_REWARD.gems,
        MAX_BALANCE - wallet.wallet_gems,
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
        idempotencyKey: `dungeon:${worldId}:${userId}:run:${state.run_number}:clear:coin`,
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
        idempotencyKey: `dungeon:${worldId}:${userId}:run:${state.run_number}:clear:gem`,
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
        [worldId, userId, xpResult.level, xpResult.xp],
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
        [worldId, userId, coinsAwarded, gemsAwarded],
      );
    }

    await client.query(
      `UPDATE endless_dungeon_state
       SET stage = $3, player_hp = $4, enemy_hp = $5, status = $6,
           cooldown_until = $7, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, stage, playerHp, nextEnemyHp, status, cooldownUntil],
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
      cooldownUntil,
    };
  });
}

async function retreatDungeon(worldId, userId, interactionId) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
    );
    if (playerResult.rowCount === 0) {
      return { retreated: false, reason: "not_registered" };
    }

    const walletResult = await client.query(
      `SELECT user_id FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
    );
    if (walletResult.rowCount === 0) {
      return { retreated: false, reason: "not_registered" };
    }

    const stateResult = await client.query(
      `SELECT run_number, status
       FROM endless_dungeon_state
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
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
      [worldId, userId, state.run_number, interactionId],
    );
    if (actionResult.rowCount === 0) {
      return { retreated: false, reason: "duplicate_request" };
    }

    const cooldownUntil = new Date(Date.now() + DUNGEON_COOLDOWN_MS);
    await client.query(
      `UPDATE endless_dungeon_state
       SET status = 'retreated', cooldown_until = $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [worldId, userId, cooldownUntil],
    );
    return { retreated: true, cooldownUntil };
  });
}

async function purchaseItem(input) {
  const item = getItemDefinition(input.itemKey);
  if (!item) {
    return { purchased: false, reason: "not_found" };
  }
  if (
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10
  ) {
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
      [input.worldId, input.userId],
    );
    if (playerResult.rowCount === 0) {
      return { purchased: false, reason: "not_registered" };
    }

    const walletResult = await client.query(
      `SELECT wallet_coins, wallet_gems
       FROM endless_wallets
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId],
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
      idempotencyKey: `shop:${input.worldId}:${input.userId}:${input.interactionId}`,
    });
    if (!inserted) {
      return { purchased: false, reason: "duplicate_request" };
    }

    await client.query(
      `UPDATE endless_wallets
       SET ${walletColumn} = ${walletColumn} - $3, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, totalPrice],
    );
    await client.query(
      `INSERT INTO endless_inventory (world_id, user_id, item_key, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (world_id, user_id, item_key) DO UPDATE
       SET quantity = endless_inventory.quantity + EXCLUDED.quantity,
           updated_at = NOW()`,
      [input.worldId, input.userId, input.itemKey, input.quantity],
    );

    return { purchased: true, item, quantity: input.quantity, totalPrice };
  });
}

async function getInventory(worldId, userId) {
  const playerResult = await pool.query(
    `SELECT user_id FROM endless_players
     WHERE world_id = $1 AND user_id = $2
     LIMIT 1`,
    [worldId, userId],
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
      [worldId, userId],
    ),
    pool.query(
      `SELECT slot, item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2
       ORDER BY slot`,
      [worldId, userId],
    ),
  ]);
  return { items: items.rows, equipment: equipment.rows };
}

async function addInventoryItem(client, worldId, userId, itemKey) {
  await client.query(
    `INSERT INTO endless_inventory (world_id, user_id, item_key, quantity)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (world_id, user_id, item_key) DO UPDATE
     SET quantity = endless_inventory.quantity + 1, updated_at = NOW()`,
    [worldId, userId, itemKey],
  );
}

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
      [worldId, userId],
    );
    if (playerResult.rowCount === 0) {
      return { equipped: false, reason: "not_registered" };
    }

    const inventoryResult = await client.query(
      `SELECT quantity
       FROM endless_inventory
       WHERE world_id = $1 AND user_id = $2 AND item_key = $3
       FOR UPDATE`,
      [worldId, userId, itemKey],
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
      [worldId, userId, item.slot],
    );
    const currentEquipment = equipmentResult.rows[0];
    if (currentEquipment?.item_key === itemKey) {
      return { equipped: false, reason: "already_equipped" };
    }

    if (ownedItem.quantity === 1) {
      await client.query(
        `DELETE FROM endless_inventory
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [worldId, userId, itemKey],
      );
    } else {
      await client.query(
        `UPDATE endless_inventory
         SET quantity = quantity - 1, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [worldId, userId, itemKey],
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
      [worldId, userId, item.slot, itemKey],
    );

    return {
      equipped: true,
      item,
      replaced: currentEquipment?.item_key ?? null,
    };
  });
}

async function unequipItem(worldId, userId, slot) {
  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT user_id FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [worldId, userId],
    );
    if (playerResult.rowCount === 0) {
      return { unequipped: false, reason: "not_registered" };
    }

    const equipmentResult = await client.query(
      `SELECT item_key
       FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2 AND slot = $3
       FOR UPDATE`,
      [worldId, userId, slot],
    );
    const equipment = equipmentResult.rows[0];
    if (!equipment) {
      return { unequipped: false, reason: "empty_slot" };
    }

    await client.query(
      `DELETE FROM endless_equipment
       WHERE world_id = $1 AND user_id = $2 AND slot = $3`,
      [worldId, userId, slot],
    );
    await addInventoryItem(client, worldId, userId, equipment.item_key);
    return {
      unequipped: true,
      item: getItemDefinition(equipment.item_key),
    };
  });
}

async function useConsumable(input) {
  const item = getItemDefinition(input.itemKey);
  if (!item || item.kind !== "consumable" || !item.useXp) {
    return { used: false, reason: "not_usable" };
  }
  if (
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10
  ) {
    return { used: false, reason: "invalid_quantity" };
  }

  return inTransaction(async (client) => {
    const playerResult = await client.query(
      `SELECT level, xp
       FROM endless_players
       WHERE world_id = $1 AND user_id = $2
       FOR UPDATE`,
      [input.worldId, input.userId],
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
      [input.worldId, input.userId, input.itemKey],
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
        input.quantity,
      ],
    );
    if (useResult.rowCount === 0) {
      return { used: false, reason: "duplicate_request" };
    }

    if (inventoryItem.quantity === input.quantity) {
      await client.query(
        `DELETE FROM endless_inventory
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [input.worldId, input.userId, input.itemKey],
      );
    } else {
      await client.query(
        `UPDATE endless_inventory
         SET quantity = quantity - $4, updated_at = NOW()
         WHERE world_id = $1 AND user_id = $2 AND item_key = $3`,
        [input.worldId, input.userId, input.itemKey, input.quantity],
      );
    }

    const xpAwarded = item.useXp * input.quantity;
    const xpResult = applyXp(player.level, player.xp, xpAwarded);
    await client.query(
      `UPDATE endless_players
       SET level = $3, xp = $4, updated_at = NOW()
       WHERE world_id = $1 AND user_id = $2`,
      [input.worldId, input.userId, xpResult.level, xpResult.xp],
    );

    return {
      used: true,
      item,
      quantity: input.quantity,
      xpAwarded,
      level: xpResult.level,
      levelsGained: xpResult.levelsGained,
    };
  });
}

const handleEndless = createEndlessHandler({
  pool,
  inTransaction,
  insertLedger,
  applyXp,
  MAX_BALANCE,
});

const handleGames = createGamesHandler({ pool, inTransaction, insertLedger });

async function getAchievementProgress(worldId, userId) {
  const playerResult = await pool.query(
    "SELECT level, xp FROM endless_players WHERE world_id = $1 AND user_id = $2 LIMIT 1",
    [worldId, userId],
  );
  const player = playerResult.rows[0];
  if (!player) return null;

  const [slotResult, betResult, collectionResult, dungeonResult, claimResult] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM endless_ledger WHERE world_id = $1 AND user_id = $2 AND reason = 'slots_payout'", [worldId, userId]),
    pool.query("SELECT COALESCE(SUM(ABS(wallet_delta)), 0)::int AS total FROM endless_ledger WHERE world_id = $1 AND user_id = $2 AND wallet_delta < 0 AND reason IN ('slots_bet', 'blackjack_bet', 'mines_bet', 'roulette_bet', 'crash_bet')", [worldId, userId]),
    pool.query("SELECT COUNT(*)::int AS count FROM endless_collection_animals WHERE world_id = $1 AND user_id = $2", [worldId, userId]),
    pool.query("SELECT COUNT(*)::int AS count FROM endless_dungeon_state WHERE world_id = $1 AND user_id = $2 AND status = 'cleared'", [worldId, userId]),
    pool.query("SELECT achievement_key FROM endless_achievement_claims WHERE world_id = $1 AND user_id = $2", [worldId, userId]),
  ]);
  const values = {
    first_step: true,
    level_five: Number(player.level) >= 5,
    fortune_hunter: Number(slotResult.rows[0].count) >= 3,
    high_roller: Number(betResult.rows[0].total) >= 1_000,
    collector: Number(collectionResult.rows[0].count) >= 5,
    dungeon_master: Number(dungeonResult.rows[0].count) >= 1,
  };
  return { player, values, claimed: new Set(claimResult.rows.map((row) => row.achievement_key)) };
}

async function handleAchievements(interaction) {
  const worldId = await requireGuild(interaction, "Başarım sistemi");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const progress = await getAchievementProgress(worldId, interaction.user.id);
  if (!progress) return interaction.editReply("Önce `/start` ile ENDLESS karakterini oluştur.");
  const action = interaction.options.getSubcommand();

  if (action === "show") {
    const lines = ACHIEVEMENTS.map((achievement) => {
      const unlocked = progress.values[achievement.key];
      const claimed = progress.claimed.has(achievement.key);
      const state = claimed ? "🎁 Ödül alındı" : unlocked ? "✅ Hazır — `/achievements claim` ile ödülü al" : "🔒 Henüz tamamlanmadı";
      return `${unlocked ? "🏅" : "▫️"} **${achievement.title}** — ${achievement.description}\n   ${state} · Ödül: ${achievement.rewardCoins} Coin + ${achievement.rewardGems} Gem + ${achievement.rewardXp} XP`;
    });
    return interaction.editReply(["**ENDLESS Başarım Salonu**", `Seviyen: **${progress.player.level}** · XP: **${progress.player.xp}**`, "", ...lines].join("\n"));
  }

  const achievement = ACHIEVEMENTS.find((item) => item.key === interaction.options.getString("achievement", true));
  if (!achievement || !progress.values[achievement.key]) return interaction.editReply("Bu başarım henüz tamamlanmadı. İlerlemeni `/achievements show` ile kontrol edebilirsin.");
  if (progress.claimed.has(achievement.key)) return interaction.editReply("Bu başarımın ödülünü daha önce aldın.");

  const reward = await inTransaction(async (client) => {
    const claim = await client.query(
      "INSERT INTO endless_achievement_claims (world_id, user_id, achievement_key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING achievement_key",
      [worldId, interaction.user.id, achievement.key],
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
  if (!reward.ok) return interaction.editReply("Bu başarımın ödülü zaten alınmış.");
  return interaction.editReply(`🏅 **${achievement.title}** rozeti açıldı! **${achievement.rewardCoins} Coin**, **${achievement.rewardGems} Gem** ve **${achievement.rewardXp} XP** kazandın.${reward.levelsGained ? ` Yeni seviyen: **${reward.level}**!` : ""}`);
}

async function handlePet(interaction) {
  const worldId = await requireGuild(interaction, "Yoldaş sistemi");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  const action = interaction.options.getSubcommand();

  if (action === "show") {
    const result = await pool.query("SELECT species, pet_name, loyalty, adopted_at FROM endless_pets WHERE world_id = $1 AND user_id = $2 LIMIT 1", [worldId, interaction.user.id]);
    const pet = result.rows[0];
    if (!pet) return interaction.editReply("Henüz bir yoldaşın yok. `/pet adopt` ile Endless ailesine yeni bir dost kat.");
    const species = PET_SPECIES[pet.species];
    const bar = `${"🟩".repeat(Math.ceil(Number(pet.loyalty) / 10))}${"⬛".repeat(10 - Math.ceil(Number(pet.loyalty) / 10))}`;
    const perkPercent = companionRewardPercent(pet.species, pet.species === "slime" ? "prayerCoins" : pet.species === "owl" ? "xp" : "coins", pet.loyalty);
    const activePerk = pet.species === "dragon"
      ? `+${companionAttackBonus(pet.species, pet.loyalty)} hasar`
      : `+%${perkPercent}`;
    return interaction.editReply(`${species.emoji} **${pet.pet_name}** · ${species.label}\nSadakat: **${pet.loyalty}/100**\n${bar}\nPasif bonus: *${species.bonus}*\nŞu an etkin: **${activePerk}**\nBesleme: 24 saatte bir, 25 Coin.`);
  }

  if (action === "adopt") {
    const speciesKey = interaction.options.getString("species", true);
    const petName = interaction.options.getString("name", true).trim();
    const species = PET_SPECIES[speciesKey];
    const result = await inTransaction(async (client) => {
      const player = await client.query("SELECT 1 FROM endless_players WHERE world_id = $1 AND user_id = $2 FOR UPDATE", [worldId, interaction.user.id]);
      if (!player.rows[0]) return { ok: false, reason: "not_registered" };
      const inserted = await client.query("INSERT INTO endless_pets (world_id, user_id, species, pet_name) VALUES ($1, $2, $3, $4) ON CONFLICT (world_id, user_id) DO NOTHING RETURNING pet_name", [worldId, interaction.user.id, speciesKey, petName]);
      return inserted.rows[0] ? { ok: true } : { ok: false, reason: "already_has_pet" };
    });
    if (!result.ok) return interaction.editReply(result.reason === "not_registered" ? "Önce `/start` ile karakter oluştur." : "Zaten bir yoldaşın var. Önce `/pet show` ile onu ziyaret et.");
    return interaction.editReply(`${species.emoji} **${petName}** artık senin Endless yoldaşın! Sadakati **1/100**. Onu büyütmek için her gün /pet feed kullanabilirsin.`);
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
    if (result.reason === "no_pet") return interaction.editReply("Önce `/pet adopt` ile bir yoldaş sahiplen.");
    if (result.reason === "max_loyalty") return interaction.editReply("Yoldaşının sadakati zaten **100/100**; besleme için Coin harcamana gerek yok.");
    if (result.reason === "cooldown") return interaction.editReply(`Yoldaşını yeniden beslemek için <t:${Math.ceil(new Date(result.feedReadyAt).getTime() / 1_000)}:R> bekle.`);
    if (result.reason === "duplicate") return interaction.editReply("Bu besleme isteği daha önce işlendi.");
    return interaction.editReply("Yoldaşını beslemek için en az **25 Coin** gerekiyor.");
  }
  return interaction.editReply(`🍖 **${result.petName}** mutlu mutlu yemeğini yedi! Sadakat: **${result.loyalty}/100**. Yeniden besleme <t:${Math.ceil(new Date(result.feedReadyAt).getTime() / 1_000)}:R> hazır.`);
}

const WORLD_BOSS = { key: "ash_colossus", name: "Kül Kolossusu", maxHp: 25_000 };

async function ensureWorldEvent(worldId) {
  await pool.query(
    "INSERT INTO endless_world_events (world_id, event_key, boss_name, max_hp, current_hp, status) VALUES ($1, $2, $3, $4, $4, 'active') ON CONFLICT (world_id) DO NOTHING",
    [worldId, WORLD_BOSS.key, WORLD_BOSS.name, WORLD_BOSS.maxHp],
  );
}

async function handleWorldEvent(interaction) {
  const worldId = await requireGuild(interaction, "Dünya Boss etkinliği");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  await ensureWorldEvent(worldId);
  const action = interaction.options.getSubcommand();

  if (action === "status") {
    const [eventResult, contributionResult] = await Promise.all([
      pool.query("SELECT boss_name, max_hp, current_hp, status, started_at, defeated_at FROM endless_world_events WHERE world_id = $1 LIMIT 1", [worldId]),
      pool.query("SELECT COUNT(*)::int AS players, COALESCE(SUM(damage), 0)::int AS damage FROM endless_world_event_contributions WHERE world_id = $1", [worldId]),
    ]);
    const event = eventResult.rows[0];
    const summary = contributionResult.rows[0];
    const percent = Math.max(0, Math.round((Number(event.current_hp) / Number(event.max_hp)) * 100));
    const bar = `${"🟥".repeat(Math.max(1, Math.ceil(percent / 10)))}${"⬛".repeat(10 - Math.max(1, Math.ceil(percent / 10)))}`;
    return interaction.editReply(`**${event.boss_name} — Dünya Boss**\n${bar}\nCan: **${Number(event.current_hp).toLocaleString("tr-TR")} / ${Number(event.max_hp).toLocaleString("tr-TR")}** (%${percent})\nDurum: **${event.status === "active" ? "Savaş devam ediyor" : "Boss yenildi"}**\nKatılan oyuncu: **${summary.players}** · Toplam hasar: **${Number(summary.damage).toLocaleString("tr-TR")}**\nSaldırı için: "/event attack"`);
  }

  if (action === "leaderboard") {
    const result = await pool.query("SELECT user_id, damage, attacks FROM endless_world_event_contributions WHERE world_id = $1 ORDER BY damage DESC, attacks ASC LIMIT 10", [worldId]);
    if (!result.rows.length) return interaction.editReply("Henüz kimse Dünya Boss'a saldırmadı. İlk vuruşu sen yap!");
    const lines = result.rows.map((row, index) => `${index + 1}. Oyuncu ${row.user_id} — **${Number(row.damage).toLocaleString("tr-TR")} hasar** · ${row.attacks} saldırı`);
    return interaction.editReply({ content: ["**Dünya Boss Katkı Sıralaması**", ...lines].join("\n"), allowedMentions: { parse: [] } });
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
    const damage = randomInt(35, 91) + Number(playerResult.rows[0].level) * 4;
    const nextHp = Math.max(0, Number(event.current_hp) - damage);
    const defeated = nextHp === 0;
    await client.query("UPDATE endless_world_events SET current_hp = $2, status = $3, defeated_at = CASE WHEN $3 = 'defeated' THEN NOW() ELSE defeated_at END WHERE world_id = $1", [worldId, nextHp, defeated ? "defeated" : "active"]);
    await client.query("INSERT INTO endless_world_event_contributions (world_id, user_id, damage, attacks) VALUES ($1, $2, $3, 1) ON CONFLICT (world_id, user_id) DO UPDATE SET damage = endless_world_event_contributions.damage + EXCLUDED.damage, attacks = endless_world_event_contributions.attacks + 1, updated_at = NOW()", [worldId, interaction.user.id, damage]);
    if (defeated) {
      await insertLedger(client, { worldId, userId: interaction.user.id, currency: "coin", walletDelta: 1_000, reason: "world_event_boss_reward", idempotencyKey: `world-event-reward:${worldId}:${interaction.user.id}:${WORLD_BOSS.key}` });
      await insertLedger(client, { worldId, userId: interaction.user.id, currency: "gem", walletDelta: 5, reason: "world_event_boss_reward", idempotencyKey: `world-event-reward:${worldId}:${interaction.user.id}:${WORLD_BOSS.key}:gem` });
      await client.query("UPDATE endless_wallets SET wallet_coins = wallet_coins + 1000, wallet_gems = wallet_gems + 5, updated_at = NOW() WHERE world_id = $1 AND user_id = $2", [worldId, interaction.user.id]);
    }
    return { ok: true, damage, nextHp, defeated, bossName: event.boss_name };
  });
  if (!result.ok) {
    const messages = { not_registered: "Önce `/start` ile karakter oluştur.", insufficient_funds: "Boss'a saldırmak için **20 Coin** gerekiyor.", duplicate: "Bu saldırı zaten işlendi.", defeated: `**${result.bossName}** zaten yenildi. Yeni etkinlik yakında açılacak.` };
    return interaction.editReply(messages[result.reason]);
  }
  return interaction.editReply(result.defeated ? `💥 **${result.bossName}** yenildi! Senin son darben **${result.damage} hasar** verdi. Katkı ödülün: **1.000 Coin + 5 Gem**!` : `⚔️ **${result.bossName}**'a **${result.damage} hasar** verdin! Kalan can: **${result.nextHp.toLocaleString("tr-TR")}**. Saldırı bedeli: 20 Coin.`);
}

async function handleArena(interaction) {
  const worldId = await requireGuild(interaction, "Arena");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: false });
  const action = interaction.options.getSubcommand();

  if (action === "stats") {
    const result = await pool.query("SELECT rating, wins, losses FROM endless_arena_stats WHERE world_id = $1 AND user_id = $2 LIMIT 1", [worldId, interaction.user.id]);
    const stats = result.rows[0] ?? { rating: 1000, wins: 0, losses: 0 };
    return interaction.editReply(`⚔️ **Arena istatistiklerin**\nRating: **${stats.rating}**\nGalibiyet: **${stats.wins}** · Mağlubiyet: **${stats.losses}**\nToplam maç: **${Number(stats.wins) + Number(stats.losses)}**`);
  }

  if (action === "leaderboard") {
    const result = await pool.query("SELECT s.user_id, s.rating, s.wins, s.losses, COALESCE(a.global_name, a.username, s.user_id) AS display_name FROM endless_arena_stats s LEFT JOIN endless_accounts a ON a.user_id = s.user_id WHERE s.world_id = $1 ORDER BY s.rating DESC, s.wins DESC LIMIT 10", [worldId]);
    if (!result.rows.length) return interaction.editReply("Arena sıralaması henüz boş. İlk düelloyu sen başlat!");
    const lines = result.rows.map((row, index) => `${index + 1}. **${row.display_name}** — ${row.rating} rating · ${row.wins}G / ${row.losses}M`);
    return interaction.editReply({ content: ["**ENDLESS Arena Sıralaması**", ...lines].join("\n"), allowedMentions: { parse: [] } });
  }

  const target = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  if (target.id === interaction.user.id) return interaction.editReply("Kendinle düello yapamazsın. Başka bir oyuncu seç.");
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
    const levelOf = (id) => Number(players.rows.find((row) => row.user_id === id).level);
    const scoreA = randomInt(1, 101) + levelOf(interaction.user.id) * 10;
    const scoreB = randomInt(1, 101) + levelOf(target.id) * 10;
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
    const messages = { not_registered: "Sen ve rakibin önce `/start` ile aynı dünyada karakter oluşturmalı.", insufficient_funds: "İki oyuncunun da bahis için yeterli Coin'i olmalı.", duplicate: "Bu düello zaten işlendi." };
    return interaction.editReply(messages[result.reason]);
  }
  const winnerName = result.winnerId === interaction.user.id ? "Sen" : target.globalName ?? target.username;
  return interaction.editReply(`⚔️ **Arena düellosu tamamlandı!**\nSenin skorun: **${result.winnerId === interaction.user.id ? result.winnerScore : result.loserScore}**\nRakibin skoru: **${result.winnerId === interaction.user.id ? result.loserScore : result.winnerScore}**\n🏆 Kazanan: **${winnerName}** · Ödül: **${(amount * 2).toLocaleString("tr-TR")} Coin**`);
}

const helpText = [
  "**ENDLESS — Komut Rehberi**",
  "`/start` — Bu sunucunun dünyasında karakter oluştur.",
  "`/world status` — Dünya adını ve maceracı sayısını gör.",
  "`/player profile show` — Karakter, seviye ve varlıklarını gör.",
  "`/player ranking leaderboard` — Level, Coin veya Gem sıralamasına bak.",
  "`/economy wallet balance` — Cüzdan bakiyeni gör.",
  "`/economy bank balance` — Cüzdan ve banka toplamlarını gör.",
  "`/economy bank deposit` / `/economy bank withdraw` — Coin veya Gem aktar.",
  "`/adventure daily claim` — Günlük ödülünü al; seri bonusu kazan.",
  "`/adventure journey explore` — XP, ganimet ve rastlantısal keşif olayları için yola çık.",
  "`/dungeon enter` — 50 Coin ile Kül Harabeleri'ne gir; üç dalga ve boss'u yen.",
  "`/dungeon status` / `/dungeon fight` / `/dungeon retreat` — Zindan savaşını yönet.",
  "`/quest board` — Günlük görevlerini ve ilerlemeni gör.",
  "`/quest claim` — Tamamladığın görevlerin ödülünü al.",
  "`/shop browse` / `/shop buy` — Eşya kataloğunu incele ve alışveriş yap.",
  "`/inventory bag` — Çantandaki ve kuşanılmış eşyaları gör.",
  "`/inventory equip` / `/inventory unequip` — Ekipman bonuslarını yönet.",
  "`/inventory use` — Tüketilebilir eşyaları kullan.",
  "`/fun coinflip` / `/fun dice` — Yazı-tura veya özelleştirilebilir zar at.",
  "`/fun 8ball` / `/fun choose` — Kehanet al veya iki seçenekten birini seç.",
  "`/fun rps` / `/fun trivia` — Taş-kağıt-makas ve mini trivia oyna.",
  "`/fun joke` / `/fun quote` / `/fun vibe` — Şaka, söz veya günlük enerji keşfet.",
  "`/fun compliment` / `/fun roast` — Dostça iltifat et veya kırıcı olmayan şaka yap.",
  "`/fun ship` — İki oyuncunun eğlenceli takım uyumunu ölç.",
  "`/endless hunt` / `/endless zoo` — Hayvan avla, koleksiyonunu büyüt ve ödül kazan.",
  "`/endless give` / `/endless gamble` — Coin gönder veya kontrollü oyun içi bahis yap.",
  "`/endless pray` / `/endless battle` — Dua ödülü al veya dostça savaş yap.",
  "`/endless cookie` / `/endless curse` — Oyunculara sosyal ve tamamen eğlencelik etkileşim gönder.",
  "`/games slots` — ENDLESS slot makinesinde Coin bahis yap.",
  "`/games blackjack` — Blackjack eli başlat; `blackjack-hit`, `blackjack-stand` veya `blackjack-cancel` ile yönet.",
  "`/games mines` — 1-9 arasından hücre seç, mayına basmadan ödül kazan.",
  "`/games roulette` / `/games crash` — Renk ruleti veya patlamadan önce çarpan yakalama oyunu.",
  "`/games daily-spin` — Veritabanına kaydedilen günlük ücretsiz Şans Çarkı ödülünü al.",
  "`/social hug` / `/social kiss` / `/social cuddle` / `/social pat` / `/social highfive` / `/social boop` — Özgün Endless animasyonları gönder.",
  "`/achievements show` / `/achievements claim` — Rozetlerini gör ve tek seferlik başarı ödüllerini al.",
  "`/pet adopt` / `/pet show` / `/pet feed` — Özgün bir Endless Yoldaşı sahiplen, isim ver ve sadakatini büyüt.",
  "`/event status` / `/event attack` / `/event leaderboard` — Sunucunun ortak Dünya Boss'una saldır ve katkı sıralamasına gir.",
  "`/arena duel` / `/arena stats` / `/arena leaderboard` — Coin bahisli PvP düellosu, rating ve Arena sıralaması.",
  "",
  "Her Discord sunucusu ayrı bir dünyadır. Karakterin ve ekonomin dünyaya özeldir. Günlük ödül ve görevler UTC gece yarısında yenilenir; keşifler arasında 5 dakika bekleme vardır.",
].join("\n");

function currencyLabel(currency) {
  return CURRENCY_COLUMNS[currency]?.label ?? currency;
}

function formatBalances(wallet) {
  return `Cüzdan: **${wallet.wallet_coins.toLocaleString("tr-TR")} Coin** · **${wallet.wallet_gems.toLocaleString("tr-TR")} Gem**\nBanka: **${wallet.bank_coins.toLocaleString("tr-TR")} Coin** · **${wallet.bank_gems.toLocaleString("tr-TR")} Gem**`;
}

function slotLabel(slot) {
  return EQUIPMENT_SLOTS.find((candidate) => candidate.value === slot)?.name ?? slot;
}

async function sendPrivate(interaction, content) {
  const payload = { content, allowedMentions: { parse: [] } };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}

async function requireGuild(interaction, label) {
  if (interaction.guildId) {
    return interaction.guildId;
  }
  await sendPrivate(
    interaction,
    `${label} yalnızca bir Discord sunucusunda kullanılabilir.`,
  );
  return null;
}

async function handleStart(interaction) {
  const worldId = await requireGuild(interaction, "Karakter oluşturma");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });

  const displayName =
    interaction.member?.displayName ??
    interaction.user.globalName ??
    interaction.user.username;
  const result = await createOrUpdatePlayer({
    worldId,
    worldName: interaction.guild.name,
    userId: interaction.user.id,
    username: interaction.user.username,
    globalName: interaction.user.globalName ?? interaction.user.username,
    displayName,
  });

  if (result.created) {
    await sendPrivate(
      interaction,
      `**${displayName}**, ENDLESS dünyasına hoş geldin! Başlangıç bakiyen: **${STARTING_COINS} Coin** ve **${STARTING_GEMS} Gem**. \`/adventure journey explore\` ile keşfe çıkabilirsin.`,
    );
  } else if (result.walletCreated) {
    await sendPrivate(
      interaction,
      `Karakterin güncellendi. Başlangıç bakiyen: **${STARTING_COINS} Coin** ve **${STARTING_GEMS} Gem**.`,
    );
  } else {
    await sendPrivate(
      interaction,
      `**${displayName}**, karakterin bu dünyada hazır. \`/help\` ile komutları görebilirsin.`,
    );
  }
}

async function handleWorld(interaction) {
  const worldId = await requireGuild(interaction, "Dünya komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const status = await getWorldStatus(worldId, interaction.guild.name);
  await sendPrivate(
    interaction,
    `**${interaction.guild.name}** dünyasında **${status.playerCount.toLocaleString("tr-TR")}** maceracı var. Her sunucu ayrı bir ENDLESS dünyasıdır.`,
  );
}

async function handlePlayer(interaction) {
  const worldId = await requireGuild(interaction, "Oyuncu komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();

  if (group === "profile") {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const profile = await getPlayerProfile(worldId, target.id);
    if (!profile) {
      await sendPrivate(
        interaction,
        target.id === interaction.user.id
          ? "Bu dünyada henüz karakterin yok. Önce `/start` kullan."
          : `${target.username} bu dünyada henüz karakter oluşturmamış.`,
      );
      return;
    }

    await sendPrivate(
      interaction,
      [
        `**${profile.display_name}** · **Level ${profile.level}**`,
        `XP: **${profile.xp}/${profile.level * 100}**`,
        `Cüzdan: **${profile.wallet_coins.toLocaleString("tr-TR")} Coin** · **${profile.wallet_gems.toLocaleString("tr-TR")} Gem**`,
        `Banka: **${profile.bank_coins.toLocaleString("tr-TR")} Coin** · **${profile.bank_gems.toLocaleString("tr-TR")} Gem**`,
      ].join("\n"),
    );
    return;
  }

  const metric = interaction.options.getString("metric") ?? "level";
  const rows = await getLeaderboard(worldId, metric);
  if (rows.length === 0) {
    await sendPrivate(interaction, "Bu dünyanın sıralamasında henüz oyuncu yok.");
    return;
  }
  const heading =
    metric === "coins"
      ? "Coin Sıralaması"
      : metric === "gems"
        ? "Gem Sıralaması"
        : "Level Sıralaması";
  const valueFor = (row) =>
    metric === "coins"
      ? `${row.wallet_coins.toLocaleString("tr-TR")} Coin`
      : metric === "gems"
        ? `${row.wallet_gems.toLocaleString("tr-TR")} Gem`
        : `Level ${row.level} · ${row.xp} XP`;
  const lines = rows.map(
    (row, index) =>
      `${index + 1}. **${row.display_name}** — ${valueFor(row)}`,
  );
  await sendPrivate(interaction, [`**${heading}**`, ...lines].join("\n"));
}

async function handleEconomy(interaction) {
  const worldId = await requireGuild(interaction, "Ekonomi komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();
  const action = interaction.options.getSubcommand();
  const wallet = await getWallet(worldId, interaction.user.id);
  if (!wallet) {
    await sendPrivate(interaction, "Önce `/start` ile bu dünyada karakter oluştur.");
    return;
  }

  if (group === "wallet") {
    await sendPrivate(
      interaction,
      `Cüzdanında **${wallet.wallet_coins.toLocaleString("tr-TR")} Coin** ve **${wallet.wallet_gems.toLocaleString("tr-TR")} Gem** var.`,
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
    amount: interaction.options.getInteger("amount", true),
  });
  if (!result.ok) {
    const message =
      result.reason === "insufficient_funds"
        ? "Aktarılacak miktar kaynak bakiyenden fazla."
        : result.reason === "balance_limit"
          ? "Hedef bakiyen 2 milyar sınırını aşamaz."
          : result.reason === "duplicate_request"
            ? "Bu aktarım zaten işlendi."
            : "Miktar geçerli değil.";
    await sendPrivate(interaction, message);
    return;
  }

  const verb = action === "deposit" ? "yatırıldı" : "çekildi";
  const currency = interaction.options.getString("currency", true);
  const amount = interaction.options.getInteger("amount", true);
  await sendPrivate(
    interaction,
    `**${amount.toLocaleString("tr-TR")} ${currencyLabel(currency)}** ${verb}.\n${formatBalances(result.wallet)}`,
  );
}

async function handleAdventure(interaction) {
  const worldId = await requireGuild(interaction, "Macera komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const group = interaction.options.getSubcommandGroup();
  if (group === "daily") {
    const result = await claimDailyReward(worldId, interaction.user.id);
    if (!result.claimed) {
      const message =
        result.reason === "already_claimed"
          ? "Bugünkü günlük ödülünü zaten aldın."
          : result.reason === "balance_limit"
            ? "Cüzdan bakiyen ödül alabilmek için sınırda."
            : "Önce `/start` ile bu dünyada karakter oluştur.";
      await sendPrivate(interaction, message);
      return;
    }

    const gemText =
      result.gemsAwarded > 0
        ? ` ve **${result.gemsAwarded} Gem**`
        : "";
    await sendPrivate(
      interaction,
      `Günlük ödülün: **${result.coinsAwarded} Coin**${gemText}. Seri: **${result.streak} gün**.`,
    );
    return;
  }

  const result = await exploreWorld({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id,
  });
  if (!result.explored) {
    const message =
      result.reason === "cooldown"
        ? `Bir sonraki keşfin için <t:${Math.ceil(new Date(result.cooldownUntil).getTime() / 1_000)}:R> bekle.`
        : "Önce `/start` ile bu dünyada karakter oluştur.";
    await sendPrivate(interaction, message);
    return;
  }

  const gemText =
    result.gemsAwarded > 0 ? ` ve **${result.gemsAwarded} Gem**` : "";
  const levelText =
    result.levelsGained > 0 ? ` Seviye atladın: **Level ${result.level}**!` : "";
  const eventText = result.event
    ? ` **${result.event.title}:** ${result.event.description}`
    : "";
  await sendPrivate(
    interaction,
    `Keşif tamamlandı: **${result.coinsAwarded} Coin**${gemText} ve **${result.xpAwarded} XP** kazandın.${eventText}${levelText} Sonraki keşif <t:${Math.ceil(result.cooldownUntil.getTime() / 1_000)}:R> hazır.`,
  );
}

async function handleDungeon(interaction) {
  const worldId = await requireGuild(interaction, "Zindan komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });

  const action = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  if (action === "status") {
    const state = await getDungeonStatus(worldId, userId);
    if (!state) {
      await sendPrivate(
        interaction,
        "Kül Harabeleri'ne henüz girmedin. `/dungeon enter` ile 50 Coin karşılığında başlayabilirsin.",
      );
      return;
    }
    if (state.status === "active") {
      await sendPrivate(
        interaction,
        `**Kül Harabeleri · ${state.enemy?.title ?? `Dalga ${state.stage}`}**\nDüşman: **${state.enemy?.name ?? "Bilinmeyen düşman"}** · HP **${state.enemy_hp}/${state.enemy?.maxHp ?? "?"}**\nSen: HP **${state.player_hp}/${state.maxHp}** · Koşu **#${state.run_number}**\nSaldırmak için \`/dungeon fight\`, ayrılmak için \`/dungeon retreat\`.`,
      );
      return;
    }

    const stateLabel = {
      cleared: "Boss'u yendin",
      defeated: "Bu koşuda yenildin",
      retreated: "Önceki koşudan çekildin",
    }[state.status] ?? "Aktif koşu yok";
    const cooldownText =
      state.cooldown_until &&
      new Date(state.cooldown_until).getTime() > Date.now()
        ? `Yeni giriş <t:${Math.ceil(new Date(state.cooldown_until).getTime() / 1_000)}:R> hazır.`
        : "Yeni bir koşuya girebilirsin.";
    await sendPrivate(
      interaction,
      `**Kül Harabeleri · ${stateLabel}** · Son koşu **#${state.run_number}**.\n${cooldownText}`,
    );
    return;
  }

  if (action === "enter") {
    const result = await enterDungeon(worldId, userId, interaction.id);
    if (!result.entered) {
      const message =
        result.reason === "already_active"
          ? "Zindanda zaten aktif bir koşun var. `/dungeon status` ile durumunu gör."
          : result.reason === "cooldown"
            ? `Bir sonraki girişin için <t:${Math.ceil(new Date(result.cooldownUntil).getTime() / 1_000)}:R> bekle.`
            : result.reason === "insufficient_funds"
              ? "Giriş için cüzdanında **50 Coin** olmalı. Bankadaki Coin otomatik kullanılmaz."
              : result.reason === "duplicate_request"
                ? "Bu zindan giriş isteği zaten işlendi."
                : "Önce `/start` ile bu dünyada karakter oluştur.";
      await sendPrivate(interaction, message);
      return;
    }

    await sendPrivate(
      interaction,
      `**Kül Harabeleri'ne girdin!** Giriş bedeli: **${result.entryFee} Coin**. İlk düşman **${result.enemy.name}** · HP **${result.enemy.maxHp}**. Senin HP'n **${result.maxHp}**. Saldırmak için \`/dungeon fight\` kullan.`,
    );
    return;
  }

  if (action === "retreat") {
    const result = await retreatDungeon(worldId, userId, interaction.id);
    if (!result.retreated) {
      const message =
        result.reason === "duplicate_request"
          ? "Bu çekilme isteği zaten işlendi."
          : result.reason === "not_registered"
            ? "Önce `/start` ile bu dünyada karakter oluştur."
            : "Çekilebileceğin aktif bir zindan koşun yok.";
      await sendPrivate(interaction, message);
      return;
    }
    await sendPrivate(
      interaction,
      `Zindandan çekildin. Giriş bedeli iade edilmez; yeni koşu <t:${Math.ceil(result.cooldownUntil.getTime() / 1_000)}:R> hazır.`,
    );
    return;
  }

  const result = await fightDungeon(worldId, userId, interaction.id);
  if (!result.fought) {
    const message =
      result.reason === "duplicate_request"
        ? "Bu saldırı isteği zaten işlendi."
        : result.reason === "not_registered"
          ? "Önce `/start` ile bu dünyada karakter oluştur."
          : "Aktif zindan koşun yok. `/dungeon enter` ile başlayabilirsin.";
    await sendPrivate(interaction, message);
    return;
  }

  const criticalText = result.critical ? " **Kritik vuruş!**" : "";
  const xpText =
    result.xpAwarded > 0 ? ` **${result.xpAwarded} XP** kazandın.` : "";
  const levelText =
    result.levelsGained > 0
      ? ` Seviye atladın: **Level ${result.level}**!`
      : "";

  if (result.status === "cleared") {
    const rewards = [
      result.coinsAwarded > 0 ? `${result.coinsAwarded} Coin` : null,
      result.gemsAwarded > 0 ? `${result.gemsAwarded} Gem` : null,
      `${result.xpAwarded} XP`,
    ].filter(Boolean);
    await sendPrivate(
      interaction,
      `**Kül Ejderhası'nı yendin; zindan temizlendi!** ${result.playerDamage} hasar verdin${criticalText}.\nÖdül: **${rewards.join(", ")}**.${levelText} Yeni koşu <t:${Math.ceil(result.cooldownUntil.getTime() / 1_000)}:R> hazır.`,
    );
    return;
  }

  if (result.status === "defeated") {
    await sendPrivate(
      interaction,
      `**${result.enemy.name}** karşısında yenildin. Verdiğin hasar: **${result.playerDamage}**${criticalText} · Aldığın hasar: **${result.enemyDamage}**. Giriş bedeli iade edilmez; yeni koşu <t:${Math.ceil(result.cooldownUntil.getTime() / 1_000)}:R> hazır.`,
    );
    return;
  }

  if (result.nextEnemy) {
    await sendPrivate(
      interaction,
      `**${result.enemy.name}** yenildi! ${result.playerDamage} hasar verdin${criticalText}.${xpText}${levelText}\n${result.healing > 0 ? `Dalga arası **${result.healing} HP** yeniledin. ` : ""}Sıradaki düşman: **${result.nextEnemy.name}** · HP **${result.enemyHp}**. Senin HP'n **${result.playerHp}/${result.maxHp}**.`,
    );
    return;
  }

  await sendPrivate(
    interaction,
    `**${result.enemy.name}**'a **${result.playerDamage} hasar** verdin${criticalText}; karşı saldırıda **${result.enemyDamage} hasar** aldın.${xpText}${levelText}\nSenin HP'n: **${result.playerHp}/${result.maxHp}** · Düşmanın HP'si: **${result.enemyHp}/${result.enemy.maxHp}**. Devam etmek için \`/dungeon fight\` kullan.`,
  );
}

async function handleQuest(interaction) {
  const worldId = await requireGuild(interaction, "Görev komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });

  if (interaction.options.getSubcommand() === "board") {
    const board = await getDailyQuestBoard(worldId, interaction.user.id);
    if (!board) {
      await sendPrivate(interaction, "Önce `/start` ile bu dünyada karakter oluştur.");
      return;
    }
    const lines = board.quests.map((quest) => {
      const status = quest.claimed
        ? "ödül alındı"
        : quest.progress >= quest.target
          ? "tamamlandı"
          : "devam ediyor";
      const progress =
        quest.activity === "bank_coin_deposit"
          ? `${quest.progress}/${quest.target} Coin`
          : `${quest.progress}/${quest.target}`;
      return `• **${quest.title}** — ${quest.description}\n  İlerleme: **${progress}** · ${status} · Ödül: ${quest.rewardCoins} Coin${quest.rewardGems ? `, ${quest.rewardGems} Gem` : ""}${quest.rewardXp ? `, ${quest.rewardXp} XP` : ""}`;
    });
    await sendPrivate(
      interaction,
      ["**Günlük Görev Panosu**", ...lines].join("\n"),
    );
    return;
  }

  const result = await claimDailyQuest(
    worldId,
    interaction.user.id,
    interaction.options.getString("quest", true),
  );
  if (!result.claimed) {
    const message =
      result.reason === "incomplete"
        ? `Bu görev henüz tamamlanmadı (**${result.progress}/${result.target}**).`
        : result.reason === "already_claimed"
          ? "Bu görevin ödülünü bugün zaten aldın."
          : result.reason === "balance_limit"
            ? "Bakiyelerin ödül alabilmek için sınırda."
            : result.reason === "not_registered"
              ? "Önce `/start` ile bu dünyada karakter oluştur."
              : "Bu görev bulunamadı.";
    await sendPrivate(interaction, message);
    return;
  }

  const rewards = [
    result.coinsAwarded > 0 ? `${result.coinsAwarded} Coin` : null,
    result.gemsAwarded > 0 ? `${result.gemsAwarded} Gem` : null,
    result.xpAwarded > 0 ? `${result.xpAwarded} XP` : null,
  ].filter(Boolean);
  const levelText =
    result.levelsGained > 0 ? ` Yeni seviyen: **${result.level}**!` : "";
  await sendPrivate(
    interaction,
    `**${result.title}** görevinin ödülü: ${rewards.join(", ")}.${levelText}`,
  );
}

async function handleShop(interaction) {
  const worldId = await requireGuild(interaction, "Market komutları");
  if (!worldId) return;
  const action = interaction.options.getSubcommand();

  if (action === "browse") {
    const lines = catalogEntries.map(
      ([, item]) =>
        `**${item.name}** — ${item.description}\nFiyat: **${itemPriceLabel(item)}**`,
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
    quantity: interaction.options.getInteger("quantity") ?? 1,
  });
  if (!result.purchased) {
    const message =
      result.reason === "insufficient_funds"
        ? "Bu alışveriş için cüzdanında yeterli Coin veya Gem yok. Bankadaki para otomatik kullanılmaz."
        : result.reason === "duplicate_request"
          ? "Bu satın alma zaten kaydedildi."
          : result.reason === "not_registered"
            ? "Önce `/start` ile bu dünyada karakter oluştur."
            : "Bu eşya veya adet geçerli değil.";
    await sendPrivate(interaction, message);
    return;
  }
  await sendPrivate(
    interaction,
    `**${result.quantity}× ${result.item.name}** satın alındı. Toplam: **${result.totalPrice.toLocaleString("tr-TR")} ${currencyLabel(result.item.price.currency)}**. Eşyanı görmek için \`/inventory bag\` kullan.`,
  );
}

async function handleInventory(interaction) {
  const worldId = await requireGuild(interaction, "Çanta komutları");
  if (!worldId) return;
  await interaction.deferReply({ ephemeral: true });
  const action = interaction.options.getSubcommand();

  if (action === "bag") {
    const inventory = await getInventory(worldId, interaction.user.id);
    if (!inventory) {
      await sendPrivate(interaction, "Bu dünyada karakterin yok. Önce `/start` kullan.");
      return;
    }

    const equipmentLines = inventory.equipment.map((equipped) => {
      const item = getItemDefinition(equipped.item_key);
      return `• **${slotLabel(equipped.slot)}:** ${item?.name ?? equipped.item_key}`;
    });
    const itemLines = inventory.items.map((entry) => {
      const item = getItemDefinition(entry.item_key);
      return `• **${item?.name ?? entry.item_key}** ×${entry.quantity}${item ? ` — ${item.description}` : ""}`;
    });
    await sendPrivate(
      interaction,
      [
        "**Ekipman**",
        ...(equipmentLines.length > 0
          ? equipmentLines
          : ["• Henüz ekipman kuşanmadın."]),
        "",
        "**Çanta**",
        ...(itemLines.length > 0
          ? itemLines
          : ["• Çanta boş. Eşyalar için `/shop browse` kullan."]),
        "",
        "Eşya kuşanmak için `/inventory equip`; kullanmak için `/inventory use`.",
      ].join("\n"),
    );
    return;
  }

  if (action === "equip") {
    const result = await equipItem(
      worldId,
      interaction.user.id,
      interaction.options.getString("item", true),
    );
    if (!result.equipped) {
      const message =
        result.reason === "not_owned"
          ? "Bu eşya çantanda yok. `/shop browse` ile marketi incele."
          : result.reason === "already_equipped"
            ? "Bu eşya zaten kuşanılmış."
            : result.reason === "not_registered"
              ? "Önce `/start` ile bu dünyada karakter oluştur."
              : "Bu eşya kuşanabilir değil.";
      await sendPrivate(interaction, message);
      return;
    }
    await sendPrivate(
      interaction,
      `**${result.item.name}** kuşanıldı.${result.replaced ? " Önceki ekipman çantana geri kondu." : ""} Bonusları sonraki keşfinde aktif olur.`,
    );
    return;
  }

  if (action === "unequip") {
    const result = await unequipItem(
      worldId,
      interaction.user.id,
      interaction.options.getString("slot", true),
    );
    if (!result.unequipped) {
      await sendPrivate(
        interaction,
        result.reason === "empty_slot"
          ? "Bu ekipman yuvası zaten boş."
          : "Önce `/start` ile bu dünyada karakter oluştur.",
      );
      return;
    }
    await sendPrivate(
      interaction,
      `**${result.item?.name ?? "Ekipman"}** çıkarıldı ve çantana geri kondu.`,
    );
    return;
  }

  const result = await useConsumable({
    worldId,
    userId: interaction.user.id,
    interactionId: interaction.id,
    itemKey: interaction.options.getString("item", true),
    quantity: interaction.options.getInteger("quantity") ?? 1,
  });
  if (!result.used) {
    const message =
      result.reason === "not_owned"
        ? "Bu eşyadan yeterli miktarda çantanda yok."
        : result.reason === "duplicate_request"
          ? "Bu kullanım zaten işlendi."
          : result.reason === "not_registered"
            ? "Önce `/start` ile bu dünyada karakter oluştur."
            : "Bu tüketilebilir eşya şu anda kullanılamıyor.";
    await sendPrivate(interaction, message);
    return;
  }

  const levelText =
    result.levelsGained > 0 ? ` Yeni seviyen: **${result.level}**!` : "";
  await sendPrivate(
    interaction,
    `**${result.quantity}× ${result.item.name}** kullanıldı. **${result.xpAwarded} XP** kazandın.${levelText}`,
  );
}

const handlers = {
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
  help: async (interaction) => sendPrivate(interaction, helpText),
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
      guildId: interaction.guildId,
    });
    const databaseUnavailable = ["42P01", "3F000", "57P01", "08001", "08006"].includes(error?.code);
    const message = databaseUnavailable
      ? "ENDLESS veritabanına erişemedi. Yönetici bağlantı ayarlarını ve PostgreSQL durumunu kontrol etmeli."
      : "Komut tamamlanamadı. Lütfen biraz sonra yeniden dene.";
    await sendPrivate(interaction, message).catch((replyError) => {
      loggerError(replyError, {
        commandName: interaction.commandName,
        operation: "send_command_error",
      });
    });
  }
}

const app = express();
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
    const route = developmentGuildId
      ? Routes.applicationGuildCommands(client.user.id, developmentGuildId)
      : Routes.applicationCommands(client.user.id);
    await rest.put(route, {
      body: commandData.map((command) => command.toJSON()),
    });
    logger.info(
      {
        botUserId: client.user.id,
        commandScope: developmentGuildId ? "development-guild" : "global",
      },
      "ENDLESS Discord bot is ready",
    );
  } catch (error) {
    client.destroy();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    throw error;
  }

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down ENDLESS services");
    client.destroy();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch(async (error) => {
  logger.fatal({ err: error }, "ENDLESS startup failed");
  await pool.end().catch((poolError) => {
    loggerError(poolError, { operation: "close_database_pool" });
  });
  process.exitCode = 1;
});
