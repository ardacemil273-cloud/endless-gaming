// =========================================================
//  ENDLESS v22 "FRESH START" — Tek Dosya Discord Universe Bot
//  Node 20+ • discord.js v14 • SQLite
//  Yeni: 10K başlangıç, Welcome Pack, Newbie Buff, Referral
// =========================================================
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ActivityType, MessageFlags } from 'discord.js';
import Database from 'better-sqlite3';
import path from 'node:path';

// ==================== CONFIG ====================
const CFG = {
  startCoin: 10000,                      // ⬅️ 500 → 10000
  startGem: 100,                          // ⬅️ YENİ: başlangıç gem
  welcomePack: {                          // ⬅️ YENİ: başlangıç seti
    items: [['hp_potion', 10], ['enchant_scroll', 3], ['wooden_sword', 1], ['leather_armor', 1], ['raw_herb', 5]],
    xp: 1000,
  },
  newbieDays: 7,                          // ⬅️ YENİ: koruma süresi (gün)
  newbieMult: 1.5,                        // ⬅️ YENİ: çarpan
  referralReward: { coin: 5000, gem: 20 },// ⬅️ YENİ: davet ödülü
  daily: [300, 800], streak: 100, cdDaily: 22 * 3600e3,  // ⬅️ arttırıldı
  taxTransfer: 0.03, taxMarket: 0.05, taxAuction: 0.04,
  xpBase: 100, maxLv: 100, maxPrestige: 10, maxTransfer: 5e6,
  transferDailyCap: 5e7, suspicious: 1e9,
  cd: { mine: 30e3, fish: 30e3, gather: 30e3, work: 60e3, hunt: 45e3, dungeon: 5 * 60e3, explore: 90e3, tower: 3 * 60e3, boss: 30e3, duel: 60e3, zone: 60e3, sail: 120e3 },
};
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const err = (...a) => console.error('[ERR]', ...a);
const fmt = (n) => Number(n ?? 0).toLocaleString('tr-TR');
const sec = (ms) => Math.ceil(ms / 1000);
const randI = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const randF = () => Math.random();
const now = () => Math.floor(Date.now() / 1000);
const currWeek = () => Math.floor(now() / (7 * 86400));
const today = () => new Date().toISOString().slice(0, 10);

// ==================== DB ====================
const db = new Database(path.resolve('./endless.sqlite'));
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  user_id TEXT PRIMARY KEY, username TEXT,
  cls TEXT DEFAULT 'wanderer', lv INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, prestige INTEGER DEFAULT 0,
  str INTEGER DEFAULT 5, agi INTEGER DEFAULT 5, int INTEGER DEFAULT 5, vit INTEGER DEFAULT 5, luck INTEGER DEFAULT 5,
  hp INTEGER DEFAULT 100, max_hp INTEGER DEFAULT 100, sp INTEGER DEFAULT 0, title TEXT,
  wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, kills INTEGER DEFAULT 0, bosses INTEGER DEFAULT 0,
  dungeons INTEGER DEFAULT 0, crafts INTEGER DEFAULT 0, enchants INTEGER DEFAULT 0,
  earned INTEGER DEFAULT 0, mmr INTEGER DEFAULT 1000, bp_claimed INTEGER DEFAULT 0,
  welcome_claimed INTEGER DEFAULT 0,
  transfer_daily INTEGER DEFAULT 0, transfer_day TEXT DEFAULT '',
  last_daily INTEGER DEFAULT 0, daily_streak INTEGER DEFAULT 0, last_work INTEGER DEFAULT 0,
  last_mine INTEGER DEFAULT 0, last_fish INTEGER DEFAULT 0, last_gather INTEGER DEFAULT 0,
  last_dungeon INTEGER DEFAULT 0, last_hunt INTEGER DEFAULT 0, last_explore INTEGER DEFAULT 0,
  last_tower INTEGER DEFAULT 0, last_duel INTEGER DEFAULT 0, last_zone INTEGER DEFAULT 0, last_sail INTEGER DEFAULT 0,
  tower_floor INTEGER DEFAULT 0, zone TEXT DEFAULT 'plains', npc_mem TEXT DEFAULT '{}',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS currencies (user_id TEXT PRIMARY KEY, coin INTEGER DEFAULT 0, gem INTEGER DEFAULT 0, bank INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, item_key TEXT, qty INTEGER DEFAULT 1, enchant INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_inv ON inventory(user_id);
CREATE TABLE IF NOT EXISTS equipment (user_id TEXT, slot TEXT, inv_id INTEGER, PRIMARY KEY(user_id, slot));
CREATE TABLE IF NOT EXISTS companions (user_id TEXT PRIMARY KEY, name TEXT, species TEXT, lv INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, mood INTEGER DEFAULT 100, loyalty INTEGER DEFAULT 50, stage INTEGER DEFAULT 1, last_talk INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS chains (user_id TEXT, chain_key TEXT, stage INTEGER DEFAULT 0, PRIMARY KEY(user_id, chain_key));
CREATE TABLE IF NOT EXISTS seasonals (user_id TEXT, event TEXT, claimed INTEGER DEFAULT 0, PRIMARY KEY(user_id, event));
CREATE TABLE IF NOT EXISTS cheat_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, kind TEXT, detail TEXT, at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS market (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, item_key TEXT, qty INTEGER DEFAULT 1, enchant INTEGER DEFAULT 0, price INTEGER, expires_at INTEGER);
CREATE TABLE IF NOT EXISTS auctions (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, item_key TEXT, qty INTEGER DEFAULT 1, enchant INTEGER DEFAULT 0, start_price INTEGER, top_bid INTEGER DEFAULT 0, top_bidder TEXT, ends_at INTEGER);
CREATE TABLE IF NOT EXISTS quests (user_id TEXT, key TEXT, prog INTEGER DEFAULT 0, claimed INTEGER DEFAULT 0, reset_at INTEGER, PRIMARY KEY(user_id, key));
CREATE TABLE IF NOT EXISTS guilds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, owner_id TEXT, bank_coin INTEGER DEFAULT 0, lv INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, wins INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS guild_members (guild_id INTEGER, user_id TEXT, rank TEXT DEFAULT 'member', PRIMARY KEY(guild_id, user_id));
CREATE TABLE IF NOT EXISTS ach (user_id TEXT, key TEXT, PRIMARY KEY(user_id, key));
CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, kind TEXT, amount INTEGER, currency TEXT, note TEXT, at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS wboss (id INTEGER PRIMARY KEY AUTOINCREMENT, boss_key TEXT, hp INTEGER, max_hp INTEGER, ends_at INTEGER, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS wboss_dmg (boss_id INTEGER, user_id TEXT, dmg INTEGER, PRIMARY KEY(boss_id, user_id));
CREATE TABLE IF NOT EXISTS collection (user_id TEXT, entry TEXT, PRIMARY KEY(user_id, entry));
CREATE TABLE IF NOT EXISTS bestiary (user_id TEXT, monster_key TEXT, kills INTEGER DEFAULT 0, PRIMARY KEY(user_id, monster_key));
CREATE TABLE IF NOT EXISTS friends (user_id TEXT, friend_id TEXT, PRIMARY KEY(user_id, friend_id));
CREATE TABLE IF NOT EXISTS marriages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_a TEXT, user_b TEXT, married_at INTEGER);
CREATE TABLE IF NOT EXISTS skills (user_id TEXT, skill_key TEXT, PRIMARY KEY(user_id, skill_key));
CREATE TABLE IF NOT EXISTS pets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, species TEXT, name TEXT, lv INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, stage INTEGER DEFAULT 1, g_str INTEGER, g_agi INTEGER, g_int INTEGER, g_vit INTEGER, g_luck INTEGER, gen INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS mounts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, mount_key TEXT, name TEXT, lv INTEGER DEFAULT 1, active INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS artifacts (user_id TEXT, art_key TEXT, PRIMARY KEY(user_id, art_key));
CREATE TABLE IF NOT EXISTS art_slots (user_id TEXT, slot INTEGER, art_key TEXT, PRIMARY KEY(user_id, slot));
CREATE TABLE IF NOT EXISTS ships (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, ship_key TEXT, name TEXT, active INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS islands (user_id TEXT, island_key TEXT, PRIMARY KEY(user_id, island_key));
CREATE TABLE IF NOT EXISTS farms (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, slot INTEGER, crop_key TEXT, planted INTEGER, ready INTEGER, UNIQUE(user_id, slot));
CREATE TABLE IF NOT EXISTS seeds (user_id TEXT, seed_key TEXT, qty INTEGER DEFAULT 0, PRIMARY KEY(user_id, seed_key));
CREATE TABLE IF NOT EXISTS buffs (user_id TEXT, buff_key TEXT, mult REAL, expires INTEGER, PRIMARY KEY(user_id, buff_key));
CREATE TABLE IF NOT EXISTS mail (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, receiver_id TEXT, subject TEXT, coin INTEGER DEFAULT 0, claimed INTEGER DEFAULT 0, at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id TEXT, referred_id TEXT UNIQUE, at INTEGER DEFAULT (strftime('%s','now')));
CREATE TABLE IF NOT EXISTS login_cal (user_id TEXT, day INTEGER, claimed INTEGER DEFAULT 0, mk TEXT, PRIMARY KEY(user_id, mk));
CREATE TABLE IF NOT EXISTS profile_colors (user_id TEXT PRIMARY KEY, color INTEGER DEFAULT 0x7b2cbf);
CREATE TABLE IF NOT EXISTS tutorial (user_id TEXT PRIMARY KEY, step INTEGER DEFAULT 0, done INTEGER DEFAULT 0);
`);

// ==================== DATA LAYER ====================
function ensure(u, un) {
  let p = db.prepare('SELECT * FROM players WHERE user_id=?').get(u);
  if (!p) {
    // İLK KEZ: Başlangıç parası + gem + welcome pack otomatik uygula
    db.prepare('INSERT INTO players (user_id, username) VALUES (?,?)').run(u, un ?? 'Unknown');
    db.prepare('INSERT INTO currencies (user_id, coin, gem) VALUES (?,?,?)').run(u, CFG.startCoin, CFG.startGem);
    db.prepare('INSERT INTO ledger (user_id, kind, amount, currency, note) VALUES (?,?,?,?,?)').run(u, 'welcome', CFG.startCoin, 'coin', 'Yeni oyuncu bonusu');
    db.prepare('INSERT INTO ledger (user_id, kind, amount, currency, note) VALUES (?,?,?,?,?)').run(u, 'welcome', CFG.startGem, 'gem', 'Yeni oyuncu gem');
    // Welcome pack item'ları
    for (const [k, q] of CFG.welcomePack.items) give(u, k, q);
    grantXp(u, CFG.welcomePack.xp);
    // Yeni oyuncu buff'ı
    const until = now() + CFG.newbieDays * 86400;
    db.prepare('INSERT OR REPLACE INTO buffs (user_id, buff_key, mult, expires) VALUES (?,?,?,?)').run(u, '_newbie_xp', CFG.newbieMult, until);
    db.prepare('INSERT OR REPLACE INTO buffs (user_id, buff_key, mult, expires) VALUES (?,?,?,?)').run(u, '_newbie_coin', CFG.newbieMult, until);
    db.prepare('INSERT OR REPLACE INTO buffs (user_id, buff_key, mult, expires) VALUES (?,?,?,?)').run(u, '_newbie', 1, until);
    db.prepare('INSERT OR IGNORE INTO tutorial (user_id, step, done) VALUES (?, 0, 0)').run(u);
    p = db.prepare('SELECT * FROM players WHERE user_id=?').get(u);
    log(`✨ Yeni oyuncu: ${un} (${u})`);
  } else if (un && p.username !== un) db.prepare('UPDATE players SET username=? WHERE user_id=?').run(un, u);
  return p;
}
const cur = (u) => db.prepare('SELECT * FROM currencies WHERE user_id=?').get(u);
function addCoin(u, amt, note = '') {
  if (Math.abs(amt) > CFG.suspicious) db.prepare('INSERT INTO cheat_log (user_id, kind, detail) VALUES (?,?,?)').run(u, 'big_coin', `${amt} on ${note}`);
  db.prepare('UPDATE currencies SET coin=coin+? WHERE user_id=?').run(amt, u);
  if (amt > 0) db.prepare('UPDATE players SET earned=earned+? WHERE user_id=?').run(amt, u);
  db.prepare('INSERT INTO ledger (user_id, kind, amount, currency, note) VALUES (?,?,?,?,?)').run(u, amt >= 0 ? 'in' : 'out', amt, 'coin', note);
}
const addGem = (u, amt) => db.prepare('UPDATE currencies SET gem=gem+? WHERE user_id=?').run(amt, u);
const xpFor = (lv) => Math.floor(CFG.xpBase * Math.pow(lv, 1.55) + 50 * lv);
function grantXp(u, amt) {
  const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(u);
  if (!p) return;
  amt = Math.floor(amt * (1 + marrBonus(u)) * getBuff(u, 'xp'));
  let { lv, xp } = p; xp += amt; let sp = 0; let lvUps = 0;
  while (lv < CFG.maxLv && xp >= xpFor(lv)) { xp -= xpFor(lv); lv++; sp += 3; lvUps++; }
  db.prepare('UPDATE players SET lv=?, xp=?, max_hp=?, sp=sp+? WHERE user_id=?').run(lv, xp, 100 + lv * 12, sp, u);
  // Milestone ödüller (her level up)
  if (lvUps > 0) {
    for (let n = p.lv + 1; n <= lv; n++) {
      const bonus = 100 + n * 50;
      addCoin(u, bonus, `milestone lv${n}`);
      if (n % 10 === 0) addGem(u, 5);
      if (n % 25 === 0) addGem(u, 25);
    }
  }
  const c = db.prepare('SELECT * FROM companions WHERE user_id=?').get(u);
  if (c) {
    let cxp = c.xp + Math.floor(amt * 0.5); let clv = c.lv; let cs = c.stage;
    while (clv < 50 && cxp >= clv * 200) { cxp -= clv * 200; clv++; if (clv >= 10 && cs === 1) cs = 2; if (clv >= 25 && cs === 2) cs = 3; if (clv >= 50 && cs === 3) cs = 4; }
    db.prepare('UPDATE companions SET lv=?, xp=?, stage=? WHERE user_id=?').run(clv, cxp, cs, u);
  }
}
function give(u, key, qty = 1, ench = 0) {
  const d = ITEMS[key];
  if (d?.stack !== false && ench === 0) {
    const e = db.prepare('SELECT id FROM inventory WHERE user_id=? AND item_key=? AND enchant=0 AND qty>0 LIMIT 1').get(u, key);
    if (e) { db.prepare('UPDATE inventory SET qty=qty+? WHERE id=?').run(qty, e.id); return; }
  }
  db.prepare('INSERT INTO inventory (user_id, item_key, qty, enchant) VALUES (?,?,?,?)').run(u, key, qty, ench);
}
function take(u, key, n) {
  let left = n;
  for (const r of db.prepare('SELECT * FROM inventory WHERE user_id=? AND item_key=? ORDER BY id').all(u, key)) {
    if (left <= 0) break;
    const t = Math.min(left, r.qty);
    if (r.qty === t) db.prepare('DELETE FROM inventory WHERE id=?').run(r.id);
    else db.prepare('UPDATE inventory SET qty=qty-? WHERE id=?').run(t, r.id);
    left -= t;
  }
}
const has = (u, k, n = 1) => db.prepare('SELECT COALESCE(SUM(qty),0) AS s FROM inventory WHERE user_id=? AND item_key=?').get(u, k).s >= n;
const isNewbie = (u) => !!db.prepare('SELECT 1 FROM buffs WHERE user_id=? AND buff_key=? AND expires>?').get(u, '_newbie', now());

// ==================== ITEMS ====================
const RARITY = { common: { w: 62, c: 0x9aa0a6, m: 1, i: '⚪' }, uncommon: { w: 24, c: 0x4caf50, m: 1.3, i: '🟢' }, rare: { w: 9, c: 0x2196f3, m: 1.75, i: '🔵' }, epic: { w: 3.5, c: 0x9c27b0, m: 2.5, i: '🟣' }, legendary: { w: 1.2, c: 0xff9800, m: 3.6, i: '🟠' }, mythic: { w: 0.25, c: 0xf44336, m: 5.2, i: '🔴' }, endless: { w: 0.05, c: 0x00e5ff, m: 8.5, i: '💠' } };
const ITEMS = {
  wooden_sword: { name: 'Tahta Kılıç', r: 'common', slot: 'weapon', atk: 4, price: 60, stack: false },
  iron_sword: { name: 'Demir Kılıç', r: 'uncommon', slot: 'weapon', atk: 12, price: 380, stack: false },
  steel_sword: { name: 'Çelik Kılıç', r: 'rare', slot: 'weapon', atk: 24, price: 1500, stack: false },
  shadow_dagger: { name: 'Gölge Hançeri', r: 'rare', slot: 'weapon', atk: 20, luck: 5, price: 1400, stack: false },
  aether_staff: { name: 'Aether Asası', r: 'epic', slot: 'weapon', atk: 34, int: 8, price: 5500, stack: false },
  void_blade: { name: 'Boşluk Kılıcı', r: 'epic', slot: 'weapon', atk: 42, price: 6200, stack: false },
  dragon_slayer: { name: 'Ejder Kıran', r: 'legendary', slot: 'weapon', atk: 66, str: 10, price: 24000, stack: false },
  endless_edge: { name: 'Endless Edge', r: 'mythic', slot: 'weapon', atk: 92, luck: 15, price: 90000, stack: false },
  infinity_glaive: { name: 'Infinity Glaive', r: 'endless', slot: 'weapon', atk: 140, str: 20, agi: 20, price: 500000, stack: false },
  leather_armor: { name: 'Deri Zırh', r: 'common', slot: 'armor', def: 5, price: 55, stack: false },
  chain_armor: { name: 'Zincir Zırh', r: 'uncommon', slot: 'armor', def: 12, price: 340, stack: false },
  plate_armor: { name: 'Plaka Zırh', r: 'rare', slot: 'armor', def: 24, vit: 6, price: 1300, stack: false },
  aether_armor: { name: 'Aether Zırh', r: 'epic', slot: 'armor', def: 40, vit: 10, price: 5000, stack: false },
  dragon_armor: { name: 'Ejder Zırhı', r: 'legendary', slot: 'armor', def: 62, vit: 18, price: 22000, stack: false },
  leather_cap: { name: 'Deri Kask', r: 'common', slot: 'helmet', def: 3, price: 40, stack: false },
  iron_helm: { name: 'Demir Miğfer', r: 'uncommon', slot: 'helmet', def: 8, price: 260, stack: false },
  dragon_helm: { name: 'Ejder Miğferi', r: 'legendary', slot: 'helmet', def: 28, vit: 8, price: 15000, stack: false },
  leather_boots: { name: 'Deri Bot', r: 'common', slot: 'boots', def: 2, agi: 3, price: 45, stack: false },
  swift_boots: { name: 'Çevik Bot', r: 'rare', slot: 'boots', def: 6, agi: 12, price: 1100, stack: false },
  dragon_boots: { name: 'Ejder Botu', r: 'legendary', slot: 'boots', def: 18, agi: 22, price: 14000, stack: false },
  ring_power: { name: 'Güç Yüzüğü', r: 'rare', slot: 'acc', str: 10, price: 900, stack: false },
  amulet_luck: { name: 'Şans Tılsımı', r: 'epic', slot: 'acc', luck: 18, price: 3800, stack: false },
  dragon_amulet: { name: 'Ejder Tılsımı', r: 'legendary', slot: 'acc', str: 8, agi: 8, int: 8, vit: 8, luck: 8, price: 19000, stack: false },
  raw_ore: { name: 'Ham Cevher', r: 'common', slot: 'mat', price: 20 },
  iron_ingot: { name: 'Demir Külçe', r: 'uncommon', slot: 'mat', price: 80 },
  steel_ingot: { name: 'Çelik Külçe', r: 'rare', slot: 'mat', price: 260 },
  raw_fish: { name: 'Çiğ Balık', r: 'common', slot: 'mat', price: 18 },
  raw_herb: { name: 'Şifalı Bitki', r: 'common', slot: 'mat', price: 15 },
  essence: { name: 'Essence', r: 'epic', slot: 'mat', price: 900 },
  dragon_scale: { name: 'Ejder Pulu', r: 'legendary', slot: 'mat', price: 3200 },
  void_dust: { name: 'Boşluk Tozu', r: 'mythic', slot: 'mat', price: 8000 },
  gem_shard: { name: 'Gem Parçası', r: 'rare', slot: 'mat', price: 500 },
  mythic_shard: { name: 'Mitik Parça', r: 'mythic', slot: 'mat', price: 15000 },
  eternal_ore: { name: 'Ebedi Cevher', r: 'endless', slot: 'mat', price: 50000 },
  phoenix_feather: { name: 'Anka Tüyü', r: 'mythic', slot: 'mat', price: 12000 },
  coral_pearl: { name: 'Mercan İncisi', r: 'legendary', slot: 'mat', price: 7000 },
  artifact_shard: { name: 'Eser Parçası', r: 'rare', slot: 'mat', price: 3500 },
  companion_egg: { name: 'Companion Yumurtası', r: 'epic', slot: 'special', price: 50000 },
  companion_food: { name: 'Companion Yemeği', r: 'rare', slot: 'consume', price: 800 },
  hp_potion: { name: 'Can İksiri', r: 'common', slot: 'consume', heal: 60, price: 40 },
  xp_potion: { name: 'XP İksiri', r: 'rare', slot: 'consume', xp: 200, price: 500 },
  enchant_scroll: { name: 'Büyü Parşömeni', r: 'rare', slot: 'consume', price: 800 },
  protection_scroll: { name: 'Koruma Parşömeni', r: 'epic', slot: 'consume', price: 2500 },
  luck_charm: { name: 'Şans Muskası', r: 'epic', slot: 'consume', price: 1200 },
  pumpkin: { name: 'Balkabağı', r: 'epic', slot: 'special', price: 3000 },
  snowflake: { name: 'Kar Tanesi', r: 'epic', slot: 'special', price: 3000 },
  heart_chocolate: { name: 'Kalpli Çikolata', r: 'epic', slot: 'special', price: 3000 },
};
function pickRarity(l = 0) { const a = Object.entries(RARITY).map(([k, v]) => [k, v.w * (1 + l / 200)]); const t = a.reduce((s, [, w]) => s + w, 0); let r = Math.random() * t; for (const [k, w] of a) if ((r -= w) <= 0) return k; return 'common'; }
function pickItem(rar) { const p = Object.entries(ITEMS).filter(([, v]) => v.r === rar && v.slot !== 'special'); if (!p.length) return null; return p[Math.floor(Math.random() * p.length)][0]; }

// ==================== COMPANIONS ====================
const COMP = { dragon: { name: 'Ejderha', i: '🐉', stages: ['🥚 Yumurta', '🐲 Yavru Ejder', '🐉 Genç Ejder', '🐲🐉 Kadim Ejder'] }, phoenix: { name: 'Anka', i: '🔥', stages: ['🥚 Yumurta', '🐣 Yavru Anka', '🔥 Genç Anka', '🔥✨ Ebedi Anka'] }, void_wolf: { name: 'Void Kurt', i: '🐺', stages: ['🥚 Yumurta', '🐶 Yavru Kurt', '🐺 Genç Kurt', '🌑 Void Kurt'] } };
const COMP_QUOTES = ['Bugün harika bir gün!', 'Seninle savaşmak istiyorum!', 'Bir şeyler yiyebilir miyim?', 'Yoruldum, uyuyabilir miyim?', 'Bugün güçlü hissediyorum!', 'Seni koruyacağım!'];

// ==================== CHAINS ====================
const CHAINS = {
  warrior: { name: 'Savaşçı Yolu', i: '⚔️', stages: [{ desc: '10 kill', track: 'kill', need: 10, rw: { coin: 500, xp: 100 } }, { desc: '50 kill', track: 'kill', need: 50, rw: { coin: 2000, xp: 500 } }, { desc: '200 kill', track: 'kill', need: 200, rw: { coin: 10000, gem: 5, xp: 2000 } }] },
  merchant: { name: 'Tüccar Yolu', i: '💰', stages: [{ desc: '10K earned', track: 'earned', need: 10000, rw: { coin: 500, xp: 100 } }, { desc: '100K', track: 'earned', need: 100000, rw: { coin: 5000, xp: 500 } }, { desc: '1M', track: 'earned', need: 1000000, rw: { gem: 20, xp: 3000 } }] },
  explorer: { name: 'Kaşif Yolu', i: '🗺️', stages: [{ desc: '5 zindan', track: 'dungeon', need: 5, rw: { coin: 500, xp: 100 } }, { desc: '20 zindan', track: 'dungeon', need: 20, rw: { coin: 3000, xp: 500 } }, { desc: '3 boss', track: 'boss_kill', need: 3, rw: { gem: 15, xp: 2000 } }] },
};

// ==================== SEASONAL ====================
const SEASONALS = { halloween: { name: '🎃 Cadılar Bayramı', start: '10-25', end: '11-02', drop: 'pumpkin', desc: 'Balkabağı topla!' }, christmas: { name: '🎄 Yılbaşı', start: '12-20', end: '01-02', drop: 'snowflake', desc: 'Kar tanesi topla!' }, valentine: { name: '💝 Sevgililer Günü', start: '02-10', end: '02-16', drop: 'heart_chocolate', desc: 'Kalpli çikolata topla!' } };
function activeSeasonal() { const d = new Date(); const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; for (const [k, e] of Object.entries(SEASONALS)) if (md >= e.start && md <= e.end) return { key: k, ...e }; return null; }

// ==================== MONSTERS / ZONES ====================
const MONS = {
  slime: { name: 'Yeşil Slime', hp: 30, atk: 6, def: 2, xp: 8, coin: [10, 30], loot: [['raw_herb', .5]], minLv: 1 },
  goblin: { name: 'Goblin', hp: 55, atk: 10, def: 4, xp: 15, coin: [20, 60], loot: [['raw_ore', .5]], minLv: 3 },
  wolf: { name: 'Kurt', hp: 80, atk: 14, def: 6, xp: 22, coin: [30, 90], loot: [['raw_fish', .5]], minLv: 6 },
  bandit: { name: 'Haydut', hp: 120, atk: 18, def: 10, xp: 35, coin: [60, 160], loot: [['iron_ingot', .4]], minLv: 10 },
  troll: { name: 'Trol', hp: 220, atk: 26, def: 16, xp: 60, coin: [120, 320], loot: [['steel_ingot', .35]], minLv: 18 },
  orc: { name: 'Ork', hp: 320, atk: 34, def: 22, xp: 90, coin: [180, 450], loot: [['steel_ingot', .4]], minLv: 25 },
  wraith: { name: 'Hayalet', hp: 380, atk: 44, def: 18, xp: 120, coin: [220, 600], loot: [['essence', .15]], minLv: 33 },
  vampire: { name: 'Vampir Lord', hp: 520, atk: 56, def: 30, xp: 180, coin: [350, 900], loot: [['essence', .25]], minLv: 42 },
  dragon_whelp: { name: 'Ejder Yavrusu', hp: 780, atk: 74, def: 44, xp: 260, coin: [500, 1300], loot: [['dragon_scale', .18]], minLv: 52 },
  void_spawn: { name: 'Boşluk Yaratığı', hp: 1100, atk: 92, def: 60, xp: 380, coin: [700, 1800], loot: [['void_dust', .12]], minLv: 65 },
  elder_demon: { name: 'Kadim Şeytan', hp: 1600, atk: 120, def: 78, xp: 520, coin: [1100, 2600], loot: [['dragon_scale', .25]], minLv: 78 },
  dragon_lord: { name: 'Ejder Lordu', hp: 2600, atk: 165, def: 100, xp: 900, coin: [1800, 4200], loot: [['void_dust', .3]], minLv: 92 },
  phoenix: { name: 'Anka Kuşu', hp: 3200, atk: 200, def: 120, xp: 1200, coin: [2500, 6000], loot: [['phoenix_feather', .3]], minLv: 95 },
};
const ZONES = {
  plains: { name: 'Yeşil Ovalar', i: '🌾', minLv: 1, cM: 1, xM: 1, mons: ['slime', 'goblin', 'wolf'], loot: [['raw_herb', .3]] },
  forest: { name: 'Karanlık Orman', i: '🌲', minLv: 10, cM: 1.3, xM: 1.4, mons: ['wolf', 'bandit', 'troll'], loot: [['essence', .1]] },
  mountains: { name: 'Ejder Dağları', i: '🏔️', minLv: 25, cM: 1.6, xM: 1.7, mons: ['troll', 'orc', 'dragon_whelp'], loot: [['dragon_scale', .08]] },
  wasteland: { name: 'Kıyamet Çölü', i: '🏜️', minLv: 42, cM: 2, xM: 2, mons: ['vampire', 'wraith', 'void_spawn'], loot: [['void_dust', .12]] },
  frozen: { name: 'Donmuş Diyar', i: '❄️', minLv: 60, cM: 2.3, xM: 2.3, mons: ['void_spawn', 'elder_demon'], loot: [['dragon_scale', .2]] },
  void: { name: 'Boşluk Alemi', i: '🌌', minLv: 78, cM: 3, xM: 3, mons: ['elder_demon', 'dragon_lord', 'phoenix'], loot: [['void_dust', .3], ['eternal_ore', .05]] },
};

// ==================== CLASSES / SKILLS / TITLES / ACH ====================
const CLASSES = { wanderer: { name: 'Gezgin', str: 5, agi: 5, int: 5, vit: 5, luck: 5 }, warrior: { name: 'Savaşçı', str: 14, agi: 4, int: 2, vit: 9, luck: 3 }, mage: { name: 'Büyücü', str: 2, agi: 4, int: 15, vit: 6, luck: 5 }, rogue: { name: 'Suikastçı', str: 7, agi: 14, int: 5, vit: 4, luck: 10 }, priest: { name: 'Rahip', str: 3, agi: 5, int: 11, vit: 12, luck: 6 }, ranger: { name: 'Avcı', str: 6, agi: 12, int: 5, vit: 6, luck: 11 } };
const SKILLS = { w_charge: { name: 'Hücum', cls: 'warrior', cost: 3, bonus: { atk: 15 } }, w_shield: { name: 'Kalkan', cls: 'warrior', cost: 3, bonus: { def: 20 } }, w_berserk: { name: 'Berserker', cls: 'warrior', cost: 5, bonus: { str: 12 } }, m_fire: { name: 'Ateş Topu', cls: 'mage', cost: 3, bonus: { atk: 20 } }, m_mana: { name: 'Mana Kalkanı', cls: 'mage', cost: 3, bonus: { def: 18 } }, m_meteor: { name: 'Meteor', cls: 'mage', cost: 5, bonus: { int: 15 } }, r_back: { name: 'Sırttan', cls: 'rogue', cost: 3, bonus: { atk: 25 } }, r_shadow: { name: 'Gölge Adım', cls: 'rogue', cost: 3, bonus: { agi: 15 } }, r_poison: { name: 'Zehir', cls: 'rogue', cost: 5, bonus: { luck: 20 } }, p_heal: { name: 'Şifa', cls: 'priest', cost: 3, bonus: { vit: 15 } }, p_bless: { name: 'Kutsama', cls: 'priest', cost: 3, bonus: { int: 12, vit: 8 } }, p_revive: { name: 'Diriliş', cls: 'priest', cost: 5, bonus: { vit: 25 } }, ra_multi: { name: 'Çoklu Ok', cls: 'ranger', cost: 3, bonus: { atk: 18 } }, ra_trap: { name: 'Tuzak', cls: 'ranger', cost: 3, bonus: { agi: 12, luck: 8 } }, ra_beast: { name: 'Vahşi Çağrı', cls: 'ranger', cost: 5, bonus: { agi: 20 } }, wa_adapt: { name: 'Uyum', cls: 'wanderer', cost: 2, bonus: { str: 5, agi: 5, int: 5, vit: 5, luck: 5 } } };
const TITLES = { novice: { name: 'Çaylak', cond: p => p.lv >= 5 }, adventurer: { name: 'Maceracı', cond: p => p.lv >= 20 }, veteran: { name: 'Kıdemli', cond: p => p.lv >= 50 }, legend: { name: 'Efsane', cond: p => p.lv >= 100 }, hunter: { name: 'Avcı', cond: p => p.kills >= 100 }, bosslayer: { name: 'Boss Kıran', cond: p => p.bosses >= 10 }, duelist: { name: 'Düellocu', cond: p => p.wins >= 50 }, ascended: { name: 'Yükselmiş', cond: p => p.prestige >= 1 }, god: { name: 'Endless Tanrısı', cond: p => p.prestige >= 10 }, founder: { name: 'Kurucu', cond: p => true }, companion_bond: { name: 'Companion Dostu', cond: p => db.prepare('SELECT 1 FROM companions WHERE user_id=? AND lv>=25').get(p.user_id) } };
const ACH = {
  first_day: { name: 'İlk Adım', desc: 'Kayıt ol', check: p => true, rw: { coin: 500, gem: 5, xp: 100 } },
  first_coin: { name: 'İlk Kuruş', desc: 'İlk coin', check: p => p.earned > 0, rw: { coin: 100, xp: 50 } },
  lv10: { name: 'Çaylak', desc: 'Lv10', check: p => p.lv >= 10, rw: { coin: 500, xp: 100 } },
  lv50: { name: 'Usta', desc: 'Lv50', check: p => p.lv >= 50, rw: { gem: 5, xp: 500 } },
  lv100: { name: 'Efsane', desc: 'Lv100', check: p => p.lv >= 100, rw: { gem: 20, xp: 2000 } },
  kill100: { name: 'Avcı', desc: '100 kill', check: p => p.kills >= 100, rw: { coin: 5000, xp: 1000 } },
  kill1000: { name: 'Kanlı Efsane', desc: '1000 kill', check: p => p.kills >= 1000, rw: { gem: 30, xp: 10000 } },
  boss1: { name: 'Boss Kıran', desc: 'İlk boss', check: p => p.bosses >= 1, rw: { coin: 3000, xp: 500 } },
  dungeon50: { name: 'Zindan Fatihi', desc: '50 zindan', check: p => p.dungeons >= 50, rw: { gem: 20, xp: 5000 } },
  craft100: { name: 'Baş Usta', desc: '100 craft', check: p => p.crafts >= 100, rw: { gem: 25, xp: 5000 } },
  win100: { name: 'Arena Ustası', desc: '100 win', check: p => p.wins >= 100, rw: { gem: 40, xp: 8000 } },
  rich1m: { name: 'Milyoner', desc: '1M earned', check: p => p.earned >= 1000000, rw: { gem: 50, xp: 8000 } },
  companion_tamer: { name: 'Evcilleştirici', desc: 'Companion sahibi ol', check: p => db.prepare('SELECT 1 FROM companions WHERE user_id=?').get(p.user_id), rw: { gem: 10, xp: 500 } },
};
const availTitles = (p) => Object.entries(TITLES).filter(([, t]) => { try { return t.cond(p); } catch { return false; } }).map(([k]) => k);

// ==================== QUESTS ====================
const QUESTS = {
  d_mine: { name: 'Madenden Dönüş', tgt: 5, type: 'daily', track: 'mine', rw: { coin: 250, xp: 60 } },
  d_fish: { name: 'Balıkçının Şafağı', tgt: 5, type: 'daily', track: 'fish', rw: { coin: 220, xp: 55 } },
  d_hunt: { name: 'Avcı', tgt: 5, type: 'daily', track: 'hunt', rw: { coin: 400, xp: 120 } },
  d_work: { name: 'Emekçi', tgt: 3, type: 'daily', track: 'work', rw: { coin: 300, xp: 70 } },
  w_dungeon: { name: 'Zindan Avcısı', tgt: 5, type: 'weekly', track: 'dungeon', rw: { coin: 2000, gem: 3, xp: 500 } },
  w_craft: { name: 'Usta Zanaatkâr', tgt: 10, type: 'weekly', track: 'craft', rw: { coin: 1500, gem: 2, xp: 400 } },
};
const qReset = (t) => { const n = now(); return t === 'daily' ? n + (86400 - (n % 86400)) : n + (7 * 86400 - (n % (7 * 86400))); };
function bumpQ(u, track, amt = 1) {
  for (const [k, q] of Object.entries(QUESTS)) {
    if (q.track !== track) continue;
    let r = db.prepare('SELECT * FROM quests WHERE user_id=? AND key=?').get(u, k);
    const n = now();
    if (!r || r.reset_at < n) db.prepare('INSERT OR REPLACE INTO quests (user_id, key, prog, claimed, reset_at) VALUES (?,?,?,0,?)').run(u, k, amt, qReset(q.type));
    else if (!r.claimed) db.prepare('UPDATE quests SET prog=prog+? WHERE user_id=? AND key=?').run(amt, u, k);
  }
  for (const [ck, ch] of Object.entries(CHAINS)) {
    let row = db.prepare('SELECT * FROM chains WHERE user_id=? AND chain_key=?').get(u, ck);
    if (!row) { db.prepare('INSERT INTO chains (user_id, chain_key, stage) VALUES (?,?,0)').run(u, ck); continue; }
    if (row.stage >= ch.stages.length) continue;
    const st = ch.stages[row.stage];
    if (!st || st.track !== track) continue;
    const key = `__chain_${ck}_${row.stage}`;
    const cr = db.prepare('SELECT entry FROM collection WHERE user_id=? AND entry LIKE ?').get(u, `${key}_%`);
    let c = cr ? Number(cr.entry.split('_').pop()) : 0; c += amt;
    db.prepare('DELETE FROM collection WHERE user_id=? AND entry LIKE ?').run(u, `${key}_%`);
    db.prepare('INSERT OR IGNORE INTO collection (user_id, entry) VALUES (?,?)').run(u, `${key}_${c}`);
    if (c >= st.need) {
      if (st.rw.coin) addCoin(u, st.rw.coin, 'chain');
      if (st.rw.gem) addGem(u, st.rw.gem);
      if (st.rw.xp) grantXp(u, st.rw.xp);
      db.prepare('UPDATE chains SET stage=stage+1 WHERE user_id=? AND chain_key=?').run(u, ck);
    }
  }
}
function checkAch(u) {
  const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(u);
  if (!p) return [];
  const out = [];
  for (const [k, a] of Object.entries(ACH)) {
    if (db.prepare('SELECT 1 FROM ach WHERE user_id=? AND key=?').get(u, k)) continue;
    if (a.check(p)) {
      db.prepare('INSERT INTO ach (user_id, key) VALUES (?,?)').run(u, k);
      if (a.rw.coin) addCoin(u, a.rw.coin, 'ach');
      if (a.rw.gem) addGem(u, a.rw.gem);
      if (a.rw.xp) grantXp(u, a.rw.xp);
      out.push(a);
    }
  }
  return out;
}

// ==================== STATS / COMBAT ====================
function equipped(u) { return db.prepare(`SELECT e.slot, i.* FROM equipment e JOIN inventory i ON i.id=e.inv_id WHERE e.user_id=?`).all(u); }
function getBuff(u, k) { const r = db.prepare('SELECT mult FROM buffs WHERE user_id=? AND buff_key=? AND expires>?').get(u, k, now()); return r?.mult ?? 1; }
function applyBuff(u, k, mult, dur) { db.prepare('INSERT OR REPLACE INTO buffs (user_id, buff_key, mult, expires) VALUES (?,?,?,?)').run(u, k, mult, now() + dur); }
function marrBonus(u) { const m = db.prepare('SELECT * FROM marriages WHERE user_a=? OR user_b=?').get(u, u); return m ? 0.1 : 0; }
function marrPartner(u) { const m = db.prepare('SELECT * FROM marriages WHERE user_a=? OR user_b=?').get(u, u); if (!m) return null; return m.user_a === u ? m.user_b : m.user_a; }
function applySkill(s, u) { for (const r of db.prepare('SELECT * FROM skills WHERE user_id=?').all(u)) { const sk = SKILLS[r.skill_key]; if (!sk) continue; for (const [st, v] of Object.entries(sk.bonus)) { if (st === 'atk') s.atk += v; else if (st === 'def') s.def += v; else s[st] = Math.max(1, (s[st] ?? 0) + v); } } }
function applyComp(s, u) { const c = db.prepare('SELECT * FROM companions WHERE user_id=?').get(u); if (!c) return; const bonus = Math.floor(c.lv * 0.8 * c.stage); s.atk += bonus; s.def += bonus; for (const k of ['str', 'agi', 'int', 'vit', 'luck']) s[k] = (s[k] ?? 0) + Math.floor(c.lv / 5); }
function computeStats(p) {
  let s = { str: p.str, agi: p.agi, int: p.int, vit: p.vit, luck: p.luck, atk: 0, def: 0 };
  for (const g of equipped(p.user_id)) { const it = ITEMS[g.item_key]; if (!it) continue; const m = 1 + (g.enchant ?? 0) * 0.08; if (it.atk) s.atk += Math.floor(it.atk * m); if (it.def) s.def += Math.floor(it.def * m); for (const k of ['str', 'agi', 'int', 'vit', 'luck']) if (it[k]) s[k] += it[k]; }
  const mt = db.prepare('SELECT * FROM mounts WHERE user_id=? AND active=1').get(p.user_id);
  if (mt) { const md = MOUNTS[mt.mount_key]; if (md?.bonus) for (const k of ['str', 'agi', 'int', 'vit', 'luck']) if (md.bonus[k]) s[k] += md.bonus[k]; s.atk += (mt.lv - 1) * 2; s.def += (mt.lv - 1) * 2; }
  const pM = 1 + p.prestige * 0.05;
  for (const k of ['str', 'agi', 'int', 'vit', 'luck']) s[k] = Math.floor(s[k] * pM);
  applySkill(s, p.user_id); applyComp(s, p.user_id);
  const mb = marrBonus(p.user_id);
  if (mb > 0) for (const k of ['str', 'agi', 'int', 'vit', 'luck']) s[k] = Math.floor(s[k] * (1 + mb));
  s.atk = Math.floor((s.atk + Math.floor(s.str * 1.5 + s.agi * 0.5)) * getBuff(p.user_id, 'atk'));
  s.def += Math.floor(s.vit * 1.2);
  s.maxHp = Math.floor((100 + p.lv * 12 + s.vit * 4) * getBuff(p.user_id, 'hp'));
  return s;
}
function simBattle(a, b) {
  let aHp = a.hp, dHp = b.hp; const lg = []; let t = 0;
  while (aHp > 0 && dHp > 0 && t < 40) {
    t++;
    const aD = Math.max(1, Math.floor(a.atk * (0.85 + randF() * 0.3)) - Math.floor(b.def * 0.55));
    dHp -= aD; lg.push(`⚔️ ${a.name} → ${aD}`);
    if (dHp <= 0) break;
    const dD = Math.max(1, Math.floor(b.atk * (0.85 + randF() * 0.3)) - Math.floor(a.def * 0.55));
    aHp -= dD; lg.push(`🛡️ ${b.name} → ${dD}`);
  }
  const w = aHp > 0 && dHp <= 0 ? 'a' : dHp > 0 && aHp <= 0 ? 'b' : 'draw';
  return { winner: w, aHp, dHp, log: lg };
}

// ==================== PETS / MOUNTS / SHIPS / ISLANDS / NPCS ====================
const PETS = [{ key: 'aetherfox', name: 'Aether Fox', g: { str: 3, agi: 8, int: 5, vit: 4, luck: 7 } }, { key: 'stonewolf', name: 'Stone Wolf', g: { str: 9, agi: 5, int: 3, vit: 8, luck: 3 } }, { key: 'voidcat', name: 'Void Cat', g: { str: 4, agi: 9, int: 8, vit: 3, luck: 8 } }];
const MOUNTS = { wood_horse: { name: 'Ahşap At', price: 2000, bonus: { agi: 5 } }, iron_steed: { name: 'Demir Küheylan', price: 12000, bonus: { agi: 12, str: 5 } }, shadow_panther: { name: 'Gölge Panter', price: 40000, bonus: { agi: 22, luck: 8 } }, dragon_mount: { name: 'Ejder Binek', price: 150000, bonus: { agi: 35, str: 15 } } };
const SHIPS = { raft: { name: 'Sal', price: 5000, lv: 1 }, sloop: { name: 'Tek Direkli', price: 25000, lv: 2 }, frigate: { name: 'Fırkateyn', price: 100000, lv: 3 }, galleon: { name: 'Kalyon', price: 500000, lv: 4 } };
const ISLANDS = { coral: { name: 'Mercan Adası', i: '🏝️', minLv: 1, ship: 'raft', reward: [500, 2000], loot: [['coral_pearl', .15], ['raw_fish', .4]], mons: ['slime'] }, whisper: { name: 'Fısıltı Adası', i: '🌫️', minLv: 15, ship: 'sloop', reward: [2000, 5000], loot: [['gem_shard', .2]], mons: ['bandit', 'wraith'] }, volcano: { name: 'Volkan Adası', i: '🌋', minLv: 45, ship: 'frigate', reward: [12000, 28000], loot: [['phoenix_feather', .1]], mons: ['dragon_whelp', 'vampire'] }, shadow: { name: 'Gölge Adası', i: '🌑', minLv: 60, ship: 'galleon', reward: [28000, 60000], loot: [['void_dust', .2]], mons: ['void_spawn', 'elder_demon'] } };
const NPCS = { kael: { name: 'Kael', title: 'Kılıç Ustası', i: '🗡️', kw: { kılıç: 'Bir kılıç uzantındır.', merhaba: 'Selam, savaşçı.' }, def: 'Sözlerini tart.' }, lyra: { name: 'Lyra', title: 'Gezgin Büyücü', i: '🔮', kw: { büyü: 'Büyü bilgi ister.', void: 'Void uyanıyor.', merhaba: 'Bir gezgin!' }, def: 'Söylediklerini duyuyorum.' }, rax: { name: 'Rax', title: 'Void Avcısı', i: '🌑', kw: { void: 'Void seni izliyor.', merhaba: '...Sen. Yine sen.' }, def: '...' } };

// ==================== RECIPES / CROPS ====================
const RECIPES = {
  iron_ingot: { needs: { raw_ore: 4 }, out: 'iron_ingot', qty: 1, xp: 15, coin: 20 },
  steel_ingot: { needs: { iron_ingot: 3, raw_ore: 2 }, out: 'steel_ingot', qty: 1, xp: 40, coin: 60 },
  hp_potion: { needs: { raw_herb: 3 }, out: 'hp_potion', qty: 2, xp: 10, coin: 5 },
  xp_potion: { needs: { raw_herb: 4, essence: 1 }, out: 'xp_potion', qty: 1, xp: 60, coin: 100 },
  enchant_scroll: { needs: { essence: 2, gem_shard: 1 }, out: 'enchant_scroll', qty: 1, xp: 80, coin: 200 },
  iron_sword: { needs: { iron_ingot: 3, raw_ore: 1 }, out: 'iron_sword', qty: 1, xp: 80, coin: 100 },
  steel_sword: { needs: { steel_ingot: 3, essence: 1 }, out: 'steel_sword', qty: 1, xp: 200, coin: 500 },
  dragon_armor: { needs: { dragon_scale: 5, essence: 4 }, out: 'dragon_armor', qty: 1, xp: 800, coin: 3000 },
  endless_edge: { needs: { void_dust: 10, dragon_scale: 10, mythic_shard: 3 }, out: 'endless_edge', qty: 1, xp: 3000, coin: 25000 },
  companion_food: { needs: { raw_herb: 5, essence: 1 }, out: 'companion_food', qty: 2, xp: 30, coin: 50 },
};
const CROPS = { seed_wheat: { name: 'Buğday', grow: 300, yield: [2, 5], xp: 30, out: 'raw_herb', i: '🌾' }, seed_carrot: { name: 'Havuç', grow: 600, yield: [2, 4], xp: 60, out: 'raw_herb', i: '🥕' } };

// ==================== GEM SHOP (YENİ) ====================
const GEM_SHOP = {
  luck_charm: { name: 'Şans Muskası', gem: 15 },
  enchant_scroll: { name: 'Büyü Parşömeni ×5', gem: 20, qty: 5 },
  protection_scroll: { name: 'Koruma Parşömeni', gem: 30 },
  companion_egg: { name: 'Companion Yumurtası', gem: 500 },
  mythic_shard: { name: 'Mitik Parça', gem: 100 },
  ancient_relic: { name: 'Kadim Eser', gem: 120 },
  phoenix_feather: { name: 'Anka Tüyü', gem: 80 },
};

// ==================== SESSIONS ====================
const tradeSess = new Map();
const raidSess = new Map();
const marrProp = new Map();
const pvpSess = new Map();
const cdMap = new Collection();
const spamMap = new Collection();
function spamming(u) { const t = Date.now(); const a = (spamMap.get(u) ?? []).filter(x => t - x < 3000); a.push(t); spamMap.set(u, a); return a.length > 6; }
const emb = (title, color = 0x5865f2) => new EmbedBuilder().setColor(color).setTitle(title).setFooter({ text: 'ENDLESS v22 • Fresh Start' }).setTimestamp();

// ==================== COMMANDS ====================
const cmds = [
  new SlashCommandBuilder().setName('endless').setDescription('Ana menü'),
  new SlashCommandBuilder().setName('yardım').setDescription('Komutlar'),
  new SlashCommandBuilder().setName('başlangıç').setDescription('Yeni oyuncu rehberi'),
  new SlashCommandBuilder().setName('profil').setDescription('Karakter kartı').addUserOption(o => o.setName('kullanıcı').setDescription('Oyuncu')),
  new SlashCommandBuilder().setName('envanter').setDescription('Çanta'),
  new SlashCommandBuilder().setName('sıralama').setDescription('Liderlik').addStringOption(o => o.setName('kategori').setDescription('Kategori').addChoices({ name: 'Level', value: 'level' }, { name: 'Coin', value: 'coin' }, { name: 'Kill', value: 'kills' })),
  new SlashCommandBuilder().setName('bakiye').setDescription('Bakiye'),
  new SlashCommandBuilder().setName('banka').setDescription('Banka').addSubcommand(s => s.setName('yatır').setDescription('Yatır').addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))).addSubcommand(s => s.setName('çek').setDescription('Çek').addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('transfer').setDescription('Coin gönder').addUserOption(o => o.setName('kullanıcı').setDescription('Hedef').setRequired(true)).addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('günlük').setDescription('Günlük ödül'),
  new SlashCommandBuilder().setName('takvim').setDescription('30 günlük login takvimi'),
  new SlashCommandBuilder().setName('çalış').setDescription('Çalış'),
  new SlashCommandBuilder().setName('sınıf').setDescription('Sınıf').addStringOption(o => o.setName('isim').setDescription('Sınıf').setRequired(true).addChoices(...Object.entries(CLASSES).map(([k, v]) => ({ name: v.name, value: k })))),
  new SlashCommandBuilder().setName('stat').setDescription('Stat').addStringOption(o => o.setName('stat').setDescription('Stat').setRequired(true).addChoices({ name: 'STR', value: 'str' }, { name: 'AGI', value: 'agi' }, { name: 'INT', value: 'int' }, { name: 'VIT', value: 'vit' }, { name: 'LUCK', value: 'luck' })).addIntegerOption(o => o.setName('miktar').setDescription('Puan').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('can').setDescription('HP'),
  new SlashCommandBuilder().setName('kuşan').setDescription('Kuşan').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('çıkar').setDescription('Çıkar').addStringOption(o => o.setName('slot').setDescription('Slot').setRequired(true).addChoices({ name: 'Silah', value: 'weapon' }, { name: 'Zırh', value: 'armor' }, { name: 'Kask', value: 'helmet' }, { name: 'Bot', value: 'boots' }, { name: 'Aksesuar', value: 'acc' })),
  new SlashCommandBuilder().setName('maden').setDescription('Maden'),
  new SlashCommandBuilder().setName('balık').setDescription('Balık'),
  new SlashCommandBuilder().setName('topla').setDescription('Bitki'),
  new SlashCommandBuilder().setName('av').setDescription('Av').addStringOption(o => o.setName('canavar').setDescription('Canavar').addChoices(...Object.entries(MONS).map(([k, v]) => ({ name: v.name, value: k })))),
  new SlashCommandBuilder().setName('bölge').setDescription('Bölge').addSubcommand(s => s.setName('gör').setDescription('Gör')).addSubcommand(s => s.setName('git').setDescription('Git').addStringOption(o => o.setName('bölge').setDescription('Bölge').setRequired(true).addChoices(...Object.entries(ZONES).map(([k, v]) => ({ name: v.name, value: k }))))),
  new SlashCommandBuilder().setName('bestiary').setDescription('Canavar günlüğü'),
  new SlashCommandBuilder().setName('zindan').setDescription('Zindan'),
  new SlashCommandBuilder().setName('kule').setDescription('Kule'),
  new SlashCommandBuilder().setName('boss').setDescription('World boss'),
  new SlashCommandBuilder().setName('düello').setDescription('Düello').addUserOption(o => o.setName('kullanıcı').setDescription('Rakip').setRequired(true)).addIntegerOption(o => o.setName('bahis').setDescription('Bahis').setMinValue(0)),
  new SlashCommandBuilder().setName('pvp').setDescription('Canlı PvP').addSubcommand(s => s.setName('başlat').setDescription('Meydan oku').addUserOption(o => o.setName('kullanıcı').setDescription('Rakip').setRequired(true)).addIntegerOption(o => o.setName('bahis').setDescription('Bahis').setMinValue(0))),
  new SlashCommandBuilder().setName('ranked').setDescription('Ranked').addSubcommand(s => s.setName('gir').setDescription('Maç')).addSubcommand(s => s.setName('profil').setDescription('Profil')),
  new SlashCommandBuilder().setName('market').setDescription('Pazar'),
  new SlashCommandBuilder().setName('sat').setDescription('Sat').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('fiyat').setDescription('Fiyat').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('satınal').setDescription('Al').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('büyüle').setDescription('Büyüle').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('kullan').setDescription('Kullan').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('miktar').setDescription('Adet').setMinValue(1)),
  new SlashCommandBuilder().setName('parçala').setDescription('Parçala').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('müzayede').setDescription('Müzayede').addSubcommand(s => s.setName('liste').setDescription('Liste')).addSubcommand(s => s.setName('aç').setDescription('Aç').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('başlangıç').setDescription('Başlangıç').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('süre').setDescription('Saat').setMinValue(1).setMaxValue(72))).addSubcommand(s => s.setName('teklif').setDescription('Teklif').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1)).addIntegerOption(o => o.setName('miktar').setDescription('Coin').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('craft').setDescription('Craft').addStringOption(o => o.setName('tarif').setDescription('Tarif').setRequired(true).addChoices(...Object.keys(RECIPES).map(k => ({ name: ITEMS[RECIPES[k].out].name, value: k })))),
  new SlashCommandBuilder().setName('tarifler').setDescription('Tarifler'),
  new SlashCommandBuilder().setName('çiftlik').setDescription('Çiftlik').addSubcommand(s => s.setName('gör').setDescription('Gör')).addSubcommand(s => s.setName('tohum_al').setDescription('Tohum al').addStringOption(o => o.setName('tohum').setDescription('Tohum').setRequired(true).addChoices(...Object.entries(CROPS).map(([k, v]) => ({ name: v.name, value: k })))).addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true).setMinValue(1).setMaxValue(20))).addSubcommand(s => s.setName('ek').setDescription('Ek').addIntegerOption(o => o.setName('slot').setDescription('1-6').setRequired(true).setMinValue(1).setMaxValue(6)).addStringOption(o => o.setName('tohum').setDescription('Tohum').setRequired(true).addChoices(...Object.entries(CROPS).map(([k, v]) => ({ name: v.name, value: k }))))).addSubcommand(s => s.setName('hasat').setDescription('Hasat').addIntegerOption(o => o.setName('slot').setDescription('Slot').setRequired(true).setMinValue(1).setMaxValue(6))).addSubcommand(s => s.setName('hasat_hepsi').setDescription('Hepsini hasat')),
  new SlashCommandBuilder().setName('bufflarım').setDescription('Aktif buff\'lar'),
  new SlashCommandBuilder().setName('posta').setDescription('Posta').addSubcommand(s => s.setName('gönder').setDescription('Gönder').addUserOption(o => o.setName('kullanıcı').setDescription('Alıcı').setRequired(true)).addStringOption(o => o.setName('konu').setDescription('Konu').setRequired(true).setMaxLength(80)).addIntegerOption(o => o.setName('coin').setDescription('Coin').setMinValue(0))).addSubcommand(s => s.setName('gelen').setDescription('Gelen')).addSubcommand(s => s.setName('oku').setDescription('Oku').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('arkadaş').setDescription('Arkadaş').addSubcommand(s => s.setName('ekle').setDescription('Ekle').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true))).addSubcommand(s => s.setName('liste').setDescription('Liste')),
  new SlashCommandBuilder().setName('evlen').setDescription('Evlilik').addSubcommand(s => s.setName('teklif').setDescription('Teklif').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true))).addSubcommand(s => s.setName('kabul').setDescription('Kabul').addUserOption(o => o.setName('kullanıcı').setDescription('Kişi').setRequired(true))),
  new SlashCommandBuilder().setName('kumar').setDescription('Kumar').addSubcommand(s => s.setName('yazıtura').setDescription('Yazı-tura').addIntegerOption(o => o.setName('bahis').setDescription('Bahis').setRequired(true).setMinValue(10).setMaxValue(100000)).addStringOption(o => o.setName('tahmin').setDescription('Tahmin').setRequired(true).addChoices({ name: 'Yazı', value: 'yazi' }, { name: 'Tura', value: 'tura' }))).addSubcommand(s => s.setName('slot').setDescription('Slot').addIntegerOption(o => o.setName('bahis').setDescription('Bahis').setRequired(true).setMinValue(10).setMaxValue(20000))),
  new SlashCommandBuilder().setName('pet').setDescription('Pet').addSubcommand(s => s.setName('sahiplen').setDescription('Sahiplen')).addSubcommand(s => s.setName('liste').setDescription('Liste')),
  new SlashCommandBuilder().setName('mount').setDescription('Mount').addSubcommand(s => s.setName('al').setDescription('Al').addStringOption(o => o.setName('tip').setDescription('Tip').setRequired(true).addChoices(...Object.entries(MOUNTS).map(([k, v]) => ({ name: v.name, value: k }))))).addSubcommand(s => s.setName('liste').setDescription('Liste')).addSubcommand(s => s.setName('seç').setDescription('Seç').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('gemi').setDescription('Gemi').addSubcommand(s => s.setName('al').setDescription('Al').addStringOption(o => o.setName('tip').setDescription('Tip').setRequired(true).addChoices(...Object.entries(SHIPS).map(([k, v]) => ({ name: v.name, value: k }))))).addSubcommand(s => s.setName('liste').setDescription('Liste')).addSubcommand(s => s.setName('seç').setDescription('Seç').addIntegerOption(o => o.setName('id').setDescription('ID').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('yelken').setDescription('Denize açıl').addSubcommand(s => s.setName('adalar').setDescription('Adalar')).addSubcommand(s => s.setName('git').setDescription('Git').addStringOption(o => o.setName('ada').setDescription('Ada').setRequired(true).addChoices(...Object.entries(ISLANDS).map(([k, v]) => ({ name: v.name, value: k }))))),
  new SlashCommandBuilder().setName('npc').setDescription('NPC').addSubcommand(s => s.setName('konuş').setDescription('Konuş').addStringOption(o => o.setName('npc').setDescription('NPC').setRequired(true).addChoices(...Object.entries(NPCS).map(([k, v]) => ({ name: v.name, value: k })))).addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true).setMaxLength(300))),
  new SlashCommandBuilder().setName('lonca').setDescription('Lonca').addSubcommand(s => s.setName('kur').setDescription('Kur').addStringOption(o => o.setName('isim').setDescription('İsim').setRequired(true).setMinLength(3).setMaxLength(24))).addSubcommand(s => s.setName('bilgi').setDescription('Bilgi')).addSubcommand(s => s.setName('katıl').setDescription('Katıl').addStringOption(o => o.setName('isim').setDescription('Ad').setRequired(true))).addSubcommand(s => s.setName('yatır').setDescription('Yatır').addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true).setMinValue(1))),
  new SlashCommandBuilder().setName('guildwar').setDescription('Lonca savaşı').addSubcommand(s => s.setName('başlat').setDescription('Başlat').addStringOption(o => o.setName('hedef').setDescription('Hedef lonca').setRequired(true))).addSubcommand(s => s.setName('bilgi').setDescription('Bilgi')),
  new SlashCommandBuilder().setName('görevler').setDescription('Görevler'),
  new SlashCommandBuilder().setName('görevtamamla').setDescription('Tamamla').addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)),
  new SlashCommandBuilder().setName('başarımlar').setDescription('Başarımlar'),
  new SlashCommandBuilder().setName('zincirler').setDescription('Başarım zincirleri'),
  new SlashCommandBuilder().setName('unvan').setDescription('Unvan').addSubcommand(s => s.setName('liste').setDescription('Liste')).addSubcommand(s => s.setName('seç').setDescription('Seç').addStringOption(o => o.setName('unvan').setDescription('Unvan').setRequired(true).addChoices(...Object.keys(TITLES).map(k => ({ name: TITLES[k].name, value: k }))))),
  new SlashCommandBuilder().setName('prestij').setDescription('Prestij'),
  new SlashCommandBuilder().setName('skill_tree').setDescription('Skill ağacı'),
  new SlashCommandBuilder().setName('koleksiyon').setDescription('Koleksiyon'),
  new SlashCommandBuilder().setName('çark').setDescription('Günlük çark'),
  new SlashCommandBuilder().setName('keşfet').setDescription('Keşfet'),
  new SlashCommandBuilder().setName('companion').setDescription('Companion').addSubcommand(s => s.setName('yumurta').setDescription('Yumurta al (50K coin)')).addSubcommand(s => s.setName('besle').setDescription('Besle')).addSubcommand(s => s.setName('sohbet').setDescription('Sohbet')).addSubcommand(s => s.setName('durum').setDescription('Durum')),
  new SlashCommandBuilder().setName('seasonal').setDescription('Sezonsal event'),
  new SlashCommandBuilder().setName('istatistik').setDescription('Detaylı istatistik'),
  new SlashCommandBuilder().setName('eser_kuşan').setDescription('Eser kuşan').addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)).addIntegerOption(o => o.setName('slot').setDescription('1-3').setRequired(true).setMinValue(1).setMaxValue(3)),
  new SlashCommandBuilder().setName('eser_listesi').setDescription('Eserlerin'),
  new SlashCommandBuilder().setName('eser_çıkar').setDescription('Eser çıkar').addIntegerOption(o => o.setName('slot').setDescription('Slot').setRequired(true).setMinValue(1).setMaxValue(3)),
  new SlashCommandBuilder().setName('gem_dükkan').setDescription('Gem ile özel item al').addStringOption(o => o.setName('item').setDescription('Item').setRequired(true).addChoices(...Object.keys(GEM_SHOP).map(k => ({ name: `${GEM_SHOP[k].name} (${GEM_SHOP[k].gem}💎)`, value: k })))),
  new SlashCommandBuilder().setName('renk').setDescription('Profil rengini seç').addIntegerOption(o => o.setName('hex').setDescription('Örn: 0x7b2cbf → 8089855').setRequired(true).setMinValue(0).setMaxValue(16777215)),
  new SlashCommandBuilder().setName('davet').setDescription('Referral sistemi').addSubcommand(s => s.setName('kullan').setDescription('Davet kodunu kullan').addUserOption(o => o.setName('davet_eden').setDescription('Seni davet eden').setRequired(true))).addSubcommand(s => s.setName('bilgi').setDescription('Davet bilgilerin')),
  new SlashCommandBuilder().setName('admin').setDescription('Admin').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('coin').setDescription('Coin').addUserOption(o => o.setName('kullanıcı').setDescription('Hedef').setRequired(true)).addIntegerOption(o => o.setName('miktar').setDescription('Miktar').setRequired(true)))
    .addSubcommand(s => s.setName('item').setDescription('Item').addUserOption(o => o.setName('kullanıcı').setDescription('Hedef').setRequired(true)).addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)).addIntegerOption(o => o.setName('adet').setDescription('Adet').setMinValue(1)))
    .addSubcommand(s => s.setName('eser').setDescription('Eser ver').addUserOption(o => o.setName('kullanıcı').setDescription('Hedef').setRequired(true)).addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)))
    .addSubcommand(s => s.setName('istatistik').setDescription('İstatistik'))
    .addSubcommand(s => s.setName('boss').setDescription('Boss spawn'))
    .addSubcommand(s => s.setName('cheat_log').setDescription('Şüpheli işlemler')),
].map(c => c.toJSON());

// ==================== CLIENT ====================
const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });
client.once('ready', async () => {
  log(`✅ ${client.user.tag} • ${client.guilds.cache.size} sunucu`);
  client.user.setActivity('ENDLESS v22 🌌', { type: ActivityType.Playing });
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try { if (process.env.GUILD_ID) await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), { body: cmds }); else await rest.put(Routes.applicationCommands(client.user.id), { body: cmds }); log('📦 Komutlar yüklendi'); } catch (e) { err('cmd:', e); }
});

// ==================== IMPLEMENTATIONS ====================
async function cHub(i) {
  const p = ensure(i.user.id, i.user.username);
  const newbie = isNewbie(i.user.id);
  const e = emb('🌌 ENDLESS v22', 0x7b2cbf).setDescription(`Hoş geldin **${p.username}**!${newbie ? '\n\n🛡️ **Yeni oyuncu koruması aktif:** XP ×1.5, Coin ×1.5' : ''}\n\nKategori seç:`);
  const r = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('hub_econ').setLabel('💰 Ekonomi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('hub_combat').setLabel('⚔️ Savaş').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('hub_social').setLabel('👥 Sosyal').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('hub_more').setLabel('🎮 Daha Fazla').setStyle(ButtonStyle.Secondary),
  );
  await i.reply({ embeds: [e], components: [r] });
}
async function handleHub(interaction, cat) {
  const txt = {
    econ: '`/bakiye` `/banka` `/transfer` `/günlük` `/takvim` `/çalış` `/market` `/sat` `/satınal` `/müzayede` `/kumar` `/gem_dükkan`',
    combat: '`/av` `/bölge` `/zindan` `/kule` `/boss` `/düello` `/pvp` `/ranked`',
    social: '`/lonca` `/guildwar` `/evlen` `/arkadaş` `/posta` `/npc` `/companion` `/davet`',
    more: '`/pet` `/mount` `/gemi` `/yelken` `/craft` `/çiftlik` `/görevler` `/başarımlar` `/zincirler` `/seasonal` `/istatistik` `/eser_listesi` `/skill_tree` `/renk`',
  }[cat] ?? '...';
  await interaction.reply({ content: txt, flags: MessageFlags.Ephemeral });
}
async function cBaşlangıç(i) {
  const p = ensure(i.user.id, i.user.username);
  const tut = db.prepare('SELECT * FROM tutorial WHERE user_id=?').get(i.user.id);
  const e = emb('🎓 ENDLESS Başlangıç Rehberi', 0x00c853)
    .setDescription(`Hoş geldin **${p.username}**! Sana ${fmt(CFG.startCoin)}💰 + ${CFG.startGem}💎 ve başlangıç seti verdik.`)
    .addFields(
      { name: '1️⃣ İlk Adım', value: '`/günlük` ile günlük ödülünü al.\n`/çalış` ile para kazan.' },
      { name: '2️⃣ Kaynak Topla', value: '`/maden`, `/balık`, `/topla` ile materyal topla.' },
      { name: '3️⃣ Savaş', value: '`/av` ile canavar öldür, XP kazan.\n`/zindan` ile zindana gir.' },
      { name: '4️⃣ Sınıf Seç', value: 'Lv5\'te `/sınıf` ile bir sınıf seç (Savaşçı, Büyücü, vb.)' },
      { name: '5️⃣ Ekipman', value: '`/craft` ile item üret, `/kuşan` ile kuşan.' },
      { name: '6️⃣ Sosyal', value: '`/lonca` kur, `/evlen` ile eş bul, `/davet` ile arkadaş davet et.' },
      { name: '🛡️ Yeni Oyuncu Koruması', value: `İlk **${CFG.newbieDays} gün**: XP ×${CFG.newbieMult}, Coin ×${CFG.newbieMult}` },
    );
  await i.reply({ embeds: [e] });
}
async function cHelp(i) {
  const e = emb('🌌 Yardım', 0x7b2cbf).addFields(
    { name: '💰 Ekonomi', value: '`/bakiye` `/banka` `/transfer` `/günlük` `/takvim` `/çalış` `/market` `/sat` `/satınal` `/müzayede` `/kumar` `/gem_dükkan`' },
    { name: '🎮 RPG', value: '`/sınıf` `/stat` `/can` `/kuşan` `/çıkar` `/prestij` `/skill_tree`' },
    { name: '⛏️ Kaynak', value: '`/maden` `/balık` `/topla`' },
    { name: '⚔️ Savaş', value: '`/av` `/bölge` `/zindan` `/kule` `/boss` `/düello` `/pvp` `/ranked`' },
    { name: '🎒 Item', value: '`/envanter` `/büyüle` `/kullan` `/parçala`' },
    { name: '🔨 Craft', value: '`/craft` `/tarifler`' },
    { name: '🐾 Pet/Mount', value: '`/pet` `/mount`' },
    { name: '⛵ Deniz', value: '`/gemi` `/yelken`' },
    { name: '🌾 Çiftlik', value: '`/çiftlik` `/bufflarım`' },
    { name: '🐉 Companion', value: '`/companion yumurta/besle/sohbet/durum`' },
    { name: '📜 Görev', value: '`/görevler` `/görevtamamla` `/npc`' },
    { name: '🏅 Meta', value: '`/profil` `/başarımlar` `/zincirler` `/unvan` `/sıralama` `/koleksiyon` `/çark` `/istatistik` `/renk`' },
    { name: '🏰 Sosyal', value: '`/lonca` `/guildwar` `/evlen` `/arkadaş` `/posta` `/davet`' },
    { name: '🎉 Event', value: '`/seasonal` `/keşfet`' },
    { name: '🔮 Eser', value: '`/eser_listesi` `/eser_kuşan` `/eser_çıkar`' },
    { name: '🎓 Rehber', value: '`/başlangıç`' },
  );
  await i.reply({ embeds: [e] });
}
async function cProfil(i) {
  const t = i.options.getUser('kullanıcı') ?? i.user;
  const p = ensure(t.id, t.username); const c = cur(t.id); const s = computeStats(p);
  const comp = db.prepare('SELECT * FROM companions WHERE user_id=?').get(t.id);
  const compStr = comp ? `${COMP[comp.species]?.i} Lv${comp.lv} (Stage ${comp.stage})` : 'Yok';
  const color = db.prepare('SELECT color FROM profile_colors WHERE user_id=?').get(t.id)?.color ?? 0x7b2cbf;
  const newbie = isNewbie(t.id);
  const nx = xpFor(p.lv); const pct = Math.min(1, p.xp / nx); const bar = '█'.repeat(Math.round(pct * 14)) + '░'.repeat(14 - Math.round(pct * 14));
  await i.reply({ embeds: [emb(`🌌 ${p.username} — ${CLASSES[p.cls]?.name}${newbie ? ' 🛡️' : ''}`, color).setThumbnail(t.displayAvatarURL())
    .addFields(
      { name: 'Lv', value: `**${p.lv}** (P${p.prestige})`, inline: true },
      { name: '💰', value: fmt(c.coin), inline: true },
      { name: '💎', value: fmt(c.gem), inline: true },
      { name: 'XP', value: `\`${bar}\` ${fmt(p.xp)}/${fmt(nx)}` },
      { name: '⚔️ ATK', value: `${s.atk}`, inline: true },
      { name: '🛡️ DEF', value: `${s.def}`, inline: true },
      { name: '❤️ HP', value: `${p.hp}/${s.maxHp}`, inline: true },
      { name: 'Kill', value: `${p.kills}`, inline: true },
      { name: 'Boss', value: `${p.bosses}`, inline: true },
      { name: 'W/L', value: `${p.wins}/${p.losses}`, inline: true },
      { name: '🐉 Companion', value: compStr },
      { name: '🗼 Kule', value: `Kat ${p.tower_floor}`, inline: true },
      { name: '💰 Kazanç', value: fmt(p.earned), inline: true },
    )] });
}
async function cEnv(i) { ensure(i.user.id, i.user.username); const rows = db.prepare('SELECT * FROM inventory WHERE user_id=? ORDER BY id DESC LIMIT 20').all(i.user.id); if (!rows.length) return i.reply({ content: '🎒 Boş.' }); const lines = rows.map(r => { const d = ITEMS[r.item_key]; return `${RARITY[d?.r ?? 'common'].i} \`#${r.id}\` **${d?.name}** ×${r.qty}${r.enchant ? ` +${r.enchant}` : ''}`; }).join('\n'); await i.reply({ embeds: [emb('🎒 Envanter', 0x2196f3).setDescription(lines)] }); }
async function cTop(i) { const cat = i.options.getString('kategori') ?? 'level'; const sort = { level: 'p.lv DESC', coin: 'c.coin DESC', kills: 'p.kills DESC' }[cat]; const rows = db.prepare(`SELECT p.username, p.lv, p.kills, c.coin FROM players p JOIN currencies c ON c.user_id=p.user_id ORDER BY ${sort} LIMIT 10`).all(); const lines = rows.map((r, i) => `${['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`} ${r.username} — Lv${r.lv} • ${fmt(r.coin)}💰`).join('\n') || 'Boş'; await i.reply({ embeds: [emb(`🏆 ${cat}`, 0xffd600).setDescription(lines)] }); }
async function cBal(i) { ensure(i.user.id, i.user.username); const c = cur(i.user.id); await i.reply({ embeds: [emb('💰 Bakiye', 0x00c853).addFields({ name: 'Cüzdan', value: fmt(c.coin), inline: true }, { name: 'Banka', value: fmt(c.bank), inline: true }, { name: 'Gem', value: fmt(c.gem), inline: true })] }); }
async function cBank(i) { ensure(i.user.id, i.user.username); const s = i.options.getSubcommand(); const a = i.options.getInteger('miktar'); const c = cur(i.user.id); if (s === 'yatır') { if (c.coin < a) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.prepare('UPDATE currencies SET coin=coin-?, bank=bank+? WHERE user_id=?').run(a, a, i.user.id); return i.reply({ content: `🏦 ${fmt(a)}` }); } if (c.bank < a) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.prepare('UPDATE currencies SET coin=coin+?, bank=bank-? WHERE user_id=?').run(a, a, i.user.id); await i.reply({ content: `💸 ${fmt(a)}` }); }
async function cTransfer(i) {
  const t = i.options.getUser('kullanıcı'); const a = i.options.getInteger('miktar');
  if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
  if (a > CFG.maxTransfer) return i.reply({ content: '❌ Max aşıldı', flags: MessageFlags.Ephemeral });
  const me = ensure(i.user.id, i.user.username); ensure(t.id, t.username);
  if (me.transfer_day !== today()) db.prepare('UPDATE players SET transfer_daily=0, transfer_day=? WHERE user_id=?').run(today(), i.user.id);
  const cd = db.prepare('SELECT transfer_daily FROM players WHERE user_id=?').get(i.user.id).transfer_daily;
  if (cd + a > CFG.transferDailyCap) return i.reply({ content: '❌ Günlük limit', flags: MessageFlags.Ephemeral });
  if (cur(i.user.id).coin < a) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
  const tax = Math.floor(a * CFG.taxTransfer); const net = a - tax;
  db.transaction(() => { addCoin(i.user.id, -a, 'transfer'); addCoin(t.id, net, 'transfer'); db.prepare('UPDATE players SET transfer_daily=transfer_daily+? WHERE user_id=?').run(a, i.user.id); })();
  await i.reply({ content: `✅ ${fmt(net)} gönderildi (vergi ${fmt(tax)})` });
}
async function cDaily(i) {
  const p = ensure(i.user.id, i.user.username);
  const d = Date.now() - p.last_daily * 1000;
  if (d < CFG.cdDaily) return i.reply({ content: `⏳ ${Math.ceil((CFG.cdDaily - d) / 3600000)} sa.`, flags: MessageFlags.Ephemeral });
  const st = d < 48 * 3600000 ? p.daily_streak + 1 : 1;
  const total = randI(CFG.daily[0], CFG.daily[1]) + (st - 1) * CFG.streak;
  const gemBonus = st % 7 === 0 ? 5 : st % 30 === 0 ? 50 : 0;
  db.transaction(() => { addCoin(i.user.id, total, 'daily'); if (gemBonus) addGem(i.user.id, gemBonus); db.prepare('UPDATE players SET last_daily=?, daily_streak=? WHERE user_id=?').run(now(), st, i.user.id); grantXp(i.user.id, 50); })();
  const u = checkAch(i.user.id);
  await i.reply({ content: `🎁 ${fmt(total)} coin (Seri ${st}) +50XP${gemBonus ? ` +${gemBonus}💎` : ''}${u.length ? ' 🏅' : ''}` });
}
async function cTakvim(i) {
  ensure(i.user.id, i.user.username);
  const mk = new Date().toISOString().slice(0, 7);
  const r = db.prepare('SELECT * FROM login_cal WHERE user_id=? AND mk=?').get(i.user.id, mk);
  const day = (r?.day ?? 0) + (r?.claimed ? 0 : 1) || 1;
  if (day > 30) return i.reply({ content: '🎉 Bu ay tamam!', flags: MessageFlags.Ephemeral });
  const rewards = [
    { d: 1, c: 300 }, { d: 2, c: 500 }, { d: 3, x: 100 }, { d: 4, c: 1000 }, { d: 5, g: 2 },
    { d: 7, c: 3000, x: 500 }, { d: 10, g: 10 }, { d: 15, c: 10000, g: 20 }, { d: 20, g: 50, c: 20000 }, { d: 30, c: 100000, g: 200 },
  ];
  const todayReward = rewards.find(x => x.d === day);
  if (!r?.claimed && todayReward) {
    db.transaction(() => {
      if (todayReward.c) addCoin(i.user.id, todayReward.c, 'cal');
      if (todayReward.g) addGem(i.user.id, todayReward.g);
      if (todayReward.x) grantXp(i.user.id, todayReward.x);
      db.prepare('INSERT OR REPLACE INTO login_cal (user_id, day, claimed, mk) VALUES (?,?,1,?)').run(i.user.id, day, mk);
    })();
  } else {
    db.prepare('INSERT OR REPLACE INTO login_cal (user_id, day, claimed, mk) VALUES (?,?,?,?)').run(i.user.id, day, r?.claimed ?? 0, mk);
  }
  const lines = rewards.map(rr => `${day >= rr.d ? '✅' : '🔒'} Gün ${rr.d}: ${rr.c ? `${fmt(rr.c)}💰 ` : ''}${rr.g ? `${rr.g}💎 ` : ''}${rr.x ? `${rr.x}XP` : ''}`).join('\n');
  await i.reply({ embeds: [emb(`📅 Aylık Takvim — Gün ${day}/30`, 0x6a1b9a).setDescription(lines)] });
}
async function cWork(i) { const p = ensure(i.user.id, i.user.username); const d = Date.now() - p.last_work * 1000; if (d < CFG.cd.work) return i.reply({ content: `⏳ ${sec(CFG.cd.work - d)} sn.`, flags: MessageFlags.Ephemeral }); const coin = Math.floor((30 + p.lv * 10 + randI(0, 50)) * getBuff(i.user.id, 'coin')); const xp = 10 + Math.floor(p.lv / 2); db.transaction(() => { addCoin(i.user.id, coin, 'work'); grantXp(i.user.id, xp); db.prepare('UPDATE players SET last_work=? WHERE user_id=?').run(now(), i.user.id); bumpQ(i.user.id, 'work', 1); })(); await i.reply({ content: `💼 ${fmt(coin)} coin + ${xp} XP` }); }
async function cClass(i) { const cls = i.options.getString('isim'); ensure(i.user.id, i.user.username); const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); if (p.lv < 5) return i.reply({ content: '❌ Lv5', flags: MessageFlags.Ephemeral }); if (p.cls !== 'wanderer') return i.reply({ content: '❌ Seçili', flags: MessageFlags.Ephemeral }); const s = CLASSES[cls]; db.prepare('UPDATE players SET cls=?, str=?, agi=?, int=?, vit=?, luck=? WHERE user_id=?').run(cls, s.str, s.agi, s.int, s.vit, s.luck, i.user.id); await i.reply({ content: `✨ ${s.name}` }); }
async function cStat(i) { const st = i.options.getString('stat'); const a = i.options.getInteger('miktar'); const p = ensure(i.user.id, i.user.username); if (p.sp < a) return i.reply({ content: `❌ ${p.sp} pt`, flags: MessageFlags.Ephemeral }); db.prepare(`UPDATE players SET ${st}=${st}+?, sp=sp-? WHERE user_id=?`).run(a, a, i.user.id); await i.reply({ content: `✅ +${a} ${st.toUpperCase()}` }); }
async function cHp(i) { const p = ensure(i.user.id, i.user.username); const s = computeStats(p); if (p.hp >= s.maxHp) return i.reply({ content: `❤️ Dolu: ${p.hp}/${s.maxHp}` }); const h = 50 + p.lv * 5; const nh = Math.min(s.maxHp, p.hp + h); db.prepare('UPDATE players SET hp=? WHERE user_id=?').run(nh, i.user.id); await i.reply({ content: `💖 +${nh - p.hp} HP → ${nh}/${s.maxHp}` }); }
async function cEquip(i) { const id = i.options.getInteger('id'); ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const d = ITEMS[r.item_key]; if (!d?.slot || !['weapon', 'armor', 'helmet', 'boots', 'acc'].includes(d.slot)) return i.reply({ content: '❌ Kuşanılamaz', flags: MessageFlags.Ephemeral }); db.prepare('DELETE FROM equipment WHERE user_id=? AND slot=?').run(i.user.id, d.slot); db.prepare('INSERT INTO equipment (user_id, slot, inv_id) VALUES (?,?,?)').run(i.user.id, d.slot, id); await i.reply({ content: `✅ ${d.name}` }); }
async function cUnequip(i) { const slot = i.options.getString('slot'); ensure(i.user.id, i.user.username); const r = db.prepare('DELETE FROM equipment WHERE user_id=? AND slot=?').run(i.user.id, slot); if (!r.changes) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); await i.reply({ content: '✅' }); }

const GATHER = {
  mine: { cd: 'mine', items: [{ k: 'raw_ore', min: 1, max: 3, c: 1, xp: 14, coin: [10, 45] }, { k: 'iron_ingot', min: 1, max: 1, c: .35, xp: 25, coin: [30, 80] }, { k: 'steel_ingot', min: 1, max: 1, c: .08, xp: 50, coin: [80, 180] }, { k: 'gem_shard', min: 1, max: 1, c: .04, xp: 40, coin: [100, 300] }, { k: 'eternal_ore', min: 1, max: 1, c: .005, xp: 200, coin: [500, 1500] }] },
  fish: { cd: 'fish', items: [{ k: 'raw_fish', min: 1, max: 3, c: 1, xp: 12, coin: [8, 35] }, { k: 'coral_pearl', min: 1, max: 1, c: .015, xp: 80, coin: [200, 600] }] },
  gather: { cd: 'gather', items: [{ k: 'raw_herb', min: 1, max: 3, c: 1, xp: 12, coin: [8, 35] }, { k: 'essence', min: 1, max: 1, c: .06, xp: 60, coin: [200, 500] }, { k: 'phoenix_feather', min: 1, max: 1, c: .003, xp: 250, coin: [600, 1800] }] },
};
async function doGather(i, act) {
  const p = ensure(i.user.id, i.user.username); const g = GATHER[act]; const cdF = `last_${g.cd}`;
  const d = Date.now() - p[cdF] * 1000; const cdMs = CFG.cd[g.cd];
  if (d < cdMs) return i.reply({ content: `⏳ ${sec(cdMs - d)} sn.`, flags: MessageFlags.Ephemeral });
  let coin = 0, xp = 0, list = []; const luck = computeStats(p).luck;
  for (const r of g.items) { if (randF() > r.c * (1 + luck / 300) * getBuff(i.user.id, 'luck')) continue; const q = randI(r.min, r.max); give(i.user.id, r.k, q); db.prepare('INSERT OR IGNORE INTO collection (user_id, entry) VALUES (?,?)').run(i.user.id, r.k); list.push(`${q}× ${ITEMS[r.k].name}`); coin += randI(r.coin[0], r.coin[1]); xp += r.xp; }
  coin = Math.floor(coin * getBuff(i.user.id, 'coin'));
  const s = activeSeasonal(); let seasonDrop = null;
  if (s && randF() < 0.1) { give(i.user.id, s.drop, 1); seasonDrop = ITEMS[s.drop].name; }
  db.transaction(() => { if (coin) addCoin(i.user.id, coin, act); if (xp) grantXp(i.user.id, xp); db.prepare(`UPDATE players SET ${cdF}=? WHERE user_id=?`).run(now(), i.user.id); bumpQ(i.user.id, act, 1); })();
  await i.reply({ content: `⛏️ ${fmt(coin)} coin +${xp}XP\n${list.join(', ') || 'yok'}${seasonDrop ? `\n🎉 ${seasonDrop}!` : ''}` });
}
async function cHunt(i) {
  const p = ensure(i.user.id, i.user.username); const d = Date.now() - p.last_hunt * 1000;
  if (d < CFG.cd.hunt) return i.reply({ content: `⏳ ${sec(CFG.cd.hunt - d)} sn.`, flags: MessageFlags.Ephemeral });
  let k = i.options.getString('canavar'); const av = Object.entries(MONS).filter(([, m]) => m.minLv <= p.lv);
  if (!k) k = av[Math.floor(Math.random() * av.length)][0];
  const m = MONS[k]; const s = computeStats(p);
  const res = simBattle({ name: p.username, hp: p.hp, atk: s.atk, def: s.def }, { name: m.name, hp: m.hp, atk: m.atk, def: m.def });
  const w = res.winner === 'a'; let coin = 0, xp = 0, drops = [];
  if (w) {
    coin = randI(m.coin[0], m.coin[1]); xp = m.xp;
    for (const [kk, c] of m.loot) if (randF() < c * (1 + s.luck / 300)) { give(i.user.id, kk, 1); db.prepare('INSERT OR IGNORE INTO collection (user_id, entry) VALUES (?,?)').run(i.user.id, kk); drops.push(ITEMS[kk].name); }
    const b = db.prepare('SELECT * FROM bestiary WHERE user_id=? AND monster_key=?').get(i.user.id, k);
    if (b) db.prepare('UPDATE bestiary SET kills=kills+1 WHERE user_id=? AND monster_key=?').run(i.user.id, k);
    else db.prepare('INSERT INTO bestiary (user_id, monster_key, kills) VALUES (?,?,1)').run(i.user.id, k);
  }
  coin = Math.floor(coin * getBuff(i.user.id, 'coin'));
  db.transaction(() => { if (w) { addCoin(i.user.id, coin, 'hunt'); grantXp(i.user.id, xp); db.prepare('UPDATE players SET last_hunt=?, hp=?, kills=kills+1 WHERE user_id=?').run(now(), Math.max(1, res.aHp), i.user.id); bumpQ(i.user.id, 'hunt', 1); } else db.prepare('UPDATE players SET last_hunt=?, hp=? WHERE user_id=?').run(now(), Math.max(1, res.aHp), i.user.id); })();
  const e = emb(w ? `⚔️ Zafer: ${m.name}` : `☠️ Yenilgi: ${m.name}`, w ? 0x4caf50 : 0xf44336).setDescription(res.log.slice(-6).join('\n')).addFields({ name: 'HP', value: `${Math.max(0, res.aHp)}/${s.maxHp}`, inline: true });
  if (w) e.addFields({ name: 'Ödül', value: `${fmt(coin)}💰 ${xp}XP\n${drops.join(', ') || 'yok'}` });
  const u = checkAch(i.user.id); if (u.length) e.addFields({ name: '🏅', value: u.map(a => a.name).join(', ') });
  await i.reply({ embeds: [e] });
}
async function cZone(i) { const s = i.options.getSubcommand(); const p = ensure(i.user.id, i.user.username); if (s === 'gör') { const lines = Object.entries(ZONES).map(([k, z]) => `${p.lv >= z.minLv ? '✅' : '🔒'} ${z.i} **${z.name}**${p.zone === k ? ' ⬅️' : ''}`).join('\n'); return i.reply({ embeds: [emb('🗺️ Harita', 0x00695c).setDescription(lines)] }); } const k = i.options.getString('bölge'); const z = ZONES[k]; if (p.lv < z.minLv) return i.reply({ content: `❌ Lv${z.minLv}`, flags: MessageFlags.Ephemeral }); db.prepare('UPDATE players SET zone=? WHERE user_id=?').run(k, i.user.id); await i.reply({ content: `${z.i} ${z.name}` }); }
async function cBest(i) { ensure(i.user.id, i.user.username); const rows = db.prepare('SELECT * FROM bestiary WHERE user_id=?').all(i.user.id); const map = new Map(rows.map(r => [r.monster_key, r.kills])); const lines = Object.entries(MONS).map(([k, m]) => { const c = map.get(k) ?? 0; return `${c > 0 ? '✅' : '❓'} **${c > 0 ? m.name : '???'}** — ${c} kill`; }).join('\n'); await i.reply({ embeds: [emb(`📖 Bestiary (${rows.length}/${Object.keys(MONS).length})`, 0x6a1b9a).setDescription(lines)] }); }
const DUNGEONS = [{ n: 'Yeraltı Mahzeni', min: 1, rw: [300, 800], gem: .10, m: 'goblin' }, { n: 'Kayıp Harabeler', min: 12, rw: [800, 1800], gem: .18, m: 'bandit' }, { n: 'Boşluk Dibi', min: 28, rw: [1800, 4000], gem: .30, m: 'wraith' }, { n: 'Void Realm', min: 50, rw: [4500, 9000], gem: .50, m: 'void_spawn' }, { n: 'Ebedi Katedral', min: 95, rw: [20000, 50000], gem: 1, m: 'phoenix' }];
async function cDungeon(i) {
  const p = ensure(i.user.id, i.user.username); const d = Date.now() - p.last_dungeon * 1000;
  if (d < CFG.cd.dungeon) return i.reply({ content: `⏳ ${sec(CFG.cd.dungeon - d)} sn.`, flags: MessageFlags.Ephemeral });
  const av = DUNGEONS.filter(x => p.lv >= x.min); const dn = av[Math.floor(Math.random() * av.length)]; const m = MONS[dn.m]; const s = computeStats(p);
  const res = simBattle({ name: p.username, hp: p.hp, atk: s.atk * 1.2, def: s.def }, { name: m.name, hp: m.hp * 2, atk: m.atk * 1.15, def: m.def * 1.2 });
  const w = res.winner === 'a'; let coin = 0, xp = 0, drops = [], gems = 0;
  if (w) { coin = randI(dn.rw[0], dn.rw[1]); xp = 60 + dn.min * 6; if (randF() < dn.gem) gems = 1 + Math.floor(randF() * 3); for (let n = 0; n < 2; n++) { const r = pickRarity(s.luck); const kk = pickItem(r); if (kk) { give(i.user.id, kk, 1); drops.push(ITEMS[kk].name); } } if (randF() < .05) { give(i.user.id, 'artifact_shard', 1); drops.push('Eser Parçası!'); } }
  db.transaction(() => { if (w) { addCoin(i.user.id, coin, 'dungeon'); if (gems) addGem(i.user.id, gems); grantXp(i.user.id, xp); db.prepare('UPDATE players SET last_dungeon=?, hp=?, dungeons=dungeons+1 WHERE user_id=?').run(now(), Math.max(1, res.aHp), i.user.id); bumpQ(i.user.id, 'dungeon', 1); } else db.prepare('UPDATE players SET last_dungeon=?, hp=1 WHERE user_id=?').run(now(), i.user.id); })();
  const e = emb(w ? `🏰 ${dn.n}` : `💀 ${dn.n}`, w ? 0x6a1b9a : 0x444444).setDescription(res.log.slice(-6).join('\n'));
  if (w) e.addFields({ name: 'Ödül', value: `${fmt(coin)}💰${gems ? ` ${gems}💎` : ''} ${xp}XP\n${drops.join(', ')}` });
  const u = checkAch(i.user.id); if (u.length) e.addFields({ name: '🏅', value: u.map(a => a.name).join(', ') });
  await i.reply({ embeds: [e] });
}
async function cTower(i) { const p = ensure(i.user.id, i.user.username); const d = Date.now() - p.last_tower * 1000; if (d < CFG.cd.tower) return i.reply({ content: `⏳ ${sec(CFG.cd.tower - d)} sn.`, flags: MessageFlags.Ephemeral }); const fl = p.tower_floor + 1; const scale = 1 + (fl - 1) * 0.18; const s = computeStats(p); const res = simBattle({ name: p.username, hp: p.hp, atk: s.atk, def: s.def }, { name: `Kat ${fl}`, hp: Math.floor(80 * scale), atk: Math.floor(12 * scale), def: Math.floor(5 * scale) }); const w = res.winner === 'a'; let coin = 0, xp = 0; if (w) { coin = 100 * fl + randI(0, fl * 30); xp = 30 + fl * 8; } db.transaction(() => { if (w) { addCoin(i.user.id, coin, 'tower'); grantXp(i.user.id, xp); db.prepare('UPDATE players SET tower_floor=?, hp=?, last_tower=? WHERE user_id=?').run(fl, Math.max(1, res.aHp), now(), i.user.id); if (fl % 10 === 0) addGem(i.user.id, 2); } else db.prepare('UPDATE players SET hp=1, last_tower=? WHERE user_id=?').run(now(), i.user.id); })(); await i.reply({ content: `${w ? `🗼 Kat ${fl} geçildi! +${fmt(coin)}💰 +${xp}XP` : `🗼 Kat ${fl} düştün`}` }); }
async function cBoss(i) {
  const p = ensure(i.user.id, i.user.username); let b = db.prepare('SELECT * FROM wboss WHERE active=1 AND ends_at>? ORDER BY id DESC LIMIT 1').get(now());
  if (!b) { const keys = ['dragon_lord', 'phoenix', 'elder_demon']; const k = keys[currWeek() % keys.length]; const m = MONS[k]; const hp = m.hp * 25; db.prepare('INSERT INTO wboss (boss_key, hp, max_hp, ends_at) VALUES (?,?,?,?)').run(k, hp, hp, now() + 3600); b = db.prepare('SELECT * FROM wboss WHERE active=1').get(); }
  const d = Date.now() - p.last_hunt * 1000; if (d < CFG.cd.boss) return i.reply({ content: '⏳', flags: MessageFlags.Ephemeral });
  const m = MONS[b.boss_key]; const s = computeStats(p); const dmg = Math.max(1, Math.floor(s.atk * (1 + randF()) * 1.2)); const nh = Math.max(0, b.hp - dmg);
  db.transaction(() => { db.prepare('UPDATE wboss SET hp=? WHERE id=?').run(nh, b.id); db.prepare('INSERT INTO wboss_dmg (boss_id, user_id, dmg) VALUES (?,?,?) ON CONFLICT(boss_id, user_id) DO UPDATE SET dmg=dmg+?').run(b.id, i.user.id, dmg, dmg); db.prepare('UPDATE players SET last_hunt=? WHERE user_id=?').run(now(), i.user.id); if (nh === 0) { db.prepare('UPDATE wboss SET active=0 WHERE id=?').run(b.id); const top = db.prepare('SELECT user_id, dmg FROM wboss_dmg WHERE boss_id=? ORDER BY dmg DESC LIMIT 5').all(b.id); for (let k = 0; k < top.length; k++) { const mult = 5 - k; const r = top[k]; addCoin(r.user_id, 5000 * mult, 'boss'); addGem(r.user_id, 5 * mult); grantXp(r.user_id, 1000 * mult); db.prepare('UPDATE players SET bosses=bosses+1 WHERE user_id=?').run(r.user_id); bumpQ(r.user_id, 'boss_kill', 1); } } })();
  await i.reply({ content: `⚔️ ${m.name}: ${fmt(dmg)} hasar! HP: ${fmt(nh)}/${fmt(b.max_hp)}` });
}
async function cDuel(i) { const t = i.options.getUser('kullanıcı'); const bet = i.options.getInteger('bahis') ?? 0; if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const me = ensure(i.user.id, i.user.username); const them = ensure(t.id, t.username); const d = Date.now() - me.last_duel * 1000; if (d < CFG.cd.duel) return i.reply({ content: '⏳', flags: MessageFlags.Ephemeral }); if (bet > 0 && (cur(i.user.id).coin < bet || cur(t.id).coin < bet)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const aS = computeStats(me), bS = computeStats(them); const res = simBattle({ name: me.username, hp: aS.maxHp, atk: aS.atk, def: aS.def }, { name: them.username, hp: bS.maxHp, atk: bS.atk, def: bS.def }); const w = res.winner === 'a'; db.transaction(() => { if (bet > 0) { if (w) { addCoin(i.user.id, bet, 'duel'); addCoin(t.id, -bet, 'duel'); } else if (res.winner === 'b') { addCoin(t.id, bet, 'duel'); addCoin(i.user.id, -bet, 'duel'); } } if (w) db.prepare('UPDATE players SET wins=wins+1, last_duel=? WHERE user_id=?').run(now(), i.user.id); else if (res.winner === 'b') db.prepare('UPDATE players SET wins=wins+1 WHERE user_id=?').run(t.id); db.prepare('UPDATE players SET losses=losses+1 WHERE user_id=?').run(w ? t.id : i.user.id); })(); const e = emb(`⚔️ ${me.username} vs ${them.username}`, w ? 0x4caf50 : 0xf44336).setDescription(res.log.slice(-8).join('\n')).addFields({ name: me.username, value: `${Math.max(0, res.aHp)}/${aS.maxHp}`, inline: true }, { name: them.username, value: `${Math.max(0, res.dHp)}/${bS.maxHp}`, inline: true }); await i.reply({ embeds: [e] }); }
async function cPvp(i) {
  const sub = i.options.getSubcommand();
  if (sub === 'başlat') {
    const t = i.options.getUser('kullanıcı'); const bet = i.options.getInteger('bahis') ?? 0;
    if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
    ensure(i.user.id, i.user.username); ensure(t.id, t.username);
    if (bet > 0 && (cur(i.user.id).coin < bet || cur(t.id).coin < bet)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
    const a = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); const b = db.prepare('SELECT * FROM players WHERE user_id=?').get(t.id);
    const aS = computeStats(a), bS = computeStats(b);
    const sid = `pvp_${i.user.id}_${Date.now()}`;
    pvpSess.set(sid, { a: i.user.id, b: t.id, aN: a.username, bN: b.username, aHp: aS.maxHp, bHp: bS.maxHp, aM: aS.maxHp, bM: bS.maxHp, aA: aS.atk, bA: bS.atk, aD: aS.def, bD: bS.def, bet, turn: 'a', log: [], exp: Date.now() + 15 * 60e3 });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`pvpA_${sid}`).setLabel('⚔️ Saldır').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId(`pvpD_${sid}`).setLabel('🛡️ Savun').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`pvpS_${sid}`).setLabel('✨ Özel').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`pvpF_${sid}`).setLabel('🏃 Kaç').setStyle(ButtonStyle.Secondary));
    const e = emb(`⚔️ CANLI PVP: ${a.username} vs ${b.username}`, 0xb71c1c).setDescription(`${a.username}: ${aS.maxHp}HP\n${b.username}: ${bS.maxHp}HP\n\nSıra: ${a.username}`);
    return i.reply({ content: `<@${t.id}> meydan okundu!`, embeds: [e], components: [row] });
  }
}
async function pvpBtn(interaction, act, sid) {
  const s = pvpSess.get(sid);
  if (!s) return interaction.reply({ content: '❌', flags: MessageFlags.Ephemeral });
  if (Date.now() > s.exp) { pvpSess.delete(sid); return interaction.reply({ content: '⏳', flags: MessageFlags.Ephemeral }); }
  const meId = s.turn === 'a' ? s.a : s.b;
  if (interaction.user.id !== meId) return interaction.reply({ content: '❌ Sıra sende değil.', flags: MessageFlags.Ephemeral });
  if (act === 'F') { const other = s.turn === 'a' ? s.b : s.a; pvpSess.delete(sid); if (s.bet > 0) db.transaction(() => { addCoin(meId, -s.bet, 'pvp'); addCoin(other, s.bet, 'pvp'); })(); return interaction.update({ content: `🏃 Kaçtı! <@${other}> kazandı.`, embeds: [], components: [] }); }
  const isA = s.turn === 'a'; const atk = isA ? s.aA : s.bA; const def = isA ? s.bD : s.aD; const name = isA ? s.aN : s.bN;
  let res = '';
  if (act === 'A') { const dmg = Math.max(1, Math.floor(atk * (0.85 + randF() * 0.4)) - Math.floor(def * 0.5)); if (isA) s.bHp = Math.max(0, s.bHp - dmg); else s.aHp = Math.max(0, s.aHp - dmg); res = `⚔️ ${name} **${dmg}** hasar!`; }
  else if (act === 'D') { const h = Math.floor(atk * 0.3); if (isA) s.aHp = Math.min(s.aM, s.aHp + h); else s.bHp = Math.min(s.bM, s.bHp + h); res = `🛡️ ${name} +${h}HP`; }
  else if (act === 'S') { const crit = randF() < 0.35; const dmg = Math.max(1, Math.floor(atk * (crit ? 2.5 : 1.5)) - Math.floor(def * 0.3)); if (isA) s.bHp = Math.max(0, s.bHp - dmg); else s.aHp = Math.max(0, s.aHp - dmg); res = `✨ ${name} ${crit ? '**KRİTİK** ' : ''}**${dmg}**!`; }
  s.log.push(res); if (s.log.length > 8) s.log.shift();
  if (s.aHp <= 0 || s.bHp <= 0) { const w = s.aHp > 0 ? s.a : s.b; const l = s.aHp > 0 ? s.b : s.a; db.transaction(() => { if (s.bet > 0) { addCoin(w, s.bet, 'pvp'); addCoin(l, -s.bet, 'pvp'); } db.prepare('UPDATE players SET wins=wins+1 WHERE user_id=?').run(w); db.prepare('UPDATE players SET losses=losses+1 WHERE user_id=?').run(l); })(); pvpSess.delete(sid); return interaction.update({ content: '', embeds: [emb('🏆 PVP Bitti!', 0x4caf50).setDescription(s.log.join('\n')).addFields({ name: '🏆 Kazanan', value: `<@${w}>` })], components: [] }); }
  s.turn = isA ? 'b' : 'a'; const next = s.turn === 'a' ? s.a : s.b;
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`pvpA_${sid}`).setLabel('⚔️ Saldır').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId(`pvpD_${sid}`).setLabel('🛡️ Savun').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`pvpS_${sid}`).setLabel('✨ Özel').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`pvpF_${sid}`).setLabel('🏃 Kaç').setStyle(ButtonStyle.Secondary));
  const e = emb('⚔️ PVP', 0xb71c1c).setDescription(s.log.join('\n') + `\n\nSıra: <@${next}>`).addFields({ name: s.aN, value: `${Math.max(0, s.aHp)}/${s.aM}`, inline: true }, { name: s.bN, value: `${Math.max(0, s.bHp)}/${s.bM}`, inline: true });
  return interaction.update({ embeds: [e], components: [row] });
}
async function cRanked(i) { const sub = i.options.getSubcommand(); const me = ensure(i.user.id, i.user.username); if (sub === 'gir') { const d = Date.now() - me.last_duel * 1000; if (d < CFG.cd.duel) return i.reply({ content: '⏳', flags: MessageFlags.Ephemeral }); const opp = db.prepare('SELECT * FROM players WHERE user_id != ? AND lv BETWEEN ? AND ? AND lv >= 5 ORDER BY RANDOM() LIMIT 1').get(i.user.id, Math.max(1, me.lv - 7), me.lv + 7); if (!opp) return i.reply({ content: '❌ Rakip yok', flags: MessageFlags.Ephemeral }); const aS = computeStats(me), bS = computeStats(opp); const res = simBattle({ name: me.username, hp: aS.maxHp, atk: aS.atk, def: aS.def }, { name: opp.username, hp: bS.maxHp, atk: bS.atk, def: bS.def }); const w = res.winner === 'a'; const elo = w ? randI(15, 30) : -randI(10, 25); const newMmr = Math.max(0, (me.mmr ?? 1000) + elo); db.transaction(() => { db.prepare('UPDATE players SET mmr=? WHERE user_id=?').run(newMmr, i.user.id); if (w) { db.prepare('UPDATE players SET wins=wins+1, last_duel=? WHERE user_id=?').run(now(), i.user.id); addCoin(i.user.id, 500, 'ranked'); } else db.prepare('UPDATE players SET losses=losses+1, last_duel=? WHERE user_id=?').run(now(), i.user.id); })(); const e = emb('🏅 Ranked', w ? 0x4caf50 : 0xf44336).setDescription(res.log.slice(-6).join('\n')).addFields({ name: 'Sonuç', value: w ? '🏆' : '💀', inline: true }, { name: 'Elo', value: `${elo >= 0 ? '+' : ''}${elo}`, inline: true }, { name: 'MMR', value: `${newMmr}`, inline: true }); return i.reply({ embeds: [e] }); } if (sub === 'profil') { const m = me.mmr ?? 1000; return i.reply({ embeds: [emb('🏅 Ranked', 0xffd600).addFields({ name: 'MMR', value: `${m}`, inline: true }, { name: 'W/L', value: `${me.wins}/${me.losses}`, inline: true })] }); } }
async function cMarket(i) { const rows = db.prepare('SELECT * FROM market WHERE expires_at>? ORDER BY id DESC LIMIT 15').all(now()); if (!rows.length) return i.reply({ content: '🛒 Boş.' }); const lines = rows.map(r => `\`#${r.id}\` **${ITEMS[r.item_key]?.name}** ×${r.qty} — **${fmt(r.price)}**`).join('\n'); await i.reply({ embeds: [emb('🛒 Pazar', 0xffa000).setDescription(lines)] }); }
async function cSell(i) { const id = i.options.getInteger('id'); const p = i.options.getInteger('fiyat'); ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (db.prepare('SELECT 1 FROM equipment WHERE inv_id=?').get(id)) return i.reply({ content: '❌ Kuşanılmış', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('DELETE FROM inventory WHERE id=?').run(id); db.prepare('INSERT INTO market (seller_id, item_key, qty, enchant, price, expires_at) VALUES (?,?,?,?,?,?)').run(i.user.id, r.item_key, r.qty, r.enchant, p, now() + 7 * 86400); })(); await i.reply({ content: `🏷️ ${ITEMS[r.item_key].name} → ${fmt(p)}` }); }
async function cBuy(i) { const id = i.options.getInteger('id'); const r = db.prepare('SELECT * FROM market WHERE id=?').get(id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (r.seller_id === i.user.id) return i.reply({ content: '❌ Kendi ilanın', flags: MessageFlags.Ephemeral }); if (r.expires_at < now()) { db.prepare('DELETE FROM market WHERE id=?').run(id); return i.reply({ content: '❌ Süre doldu', flags: MessageFlags.Ephemeral }); } ensure(i.user.id, i.user.username); if (cur(i.user.id).coin < r.price) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const tax = Math.floor(r.price * CFG.taxMarket); const net = r.price - tax; db.transaction(() => { addCoin(i.user.id, -r.price, 'buy'); addCoin(r.seller_id, net, 'sell'); give(i.user.id, r.item_key, r.qty, r.enchant); db.prepare('DELETE FROM market WHERE id=?').run(id); })(); await i.reply({ content: `✅ ${ITEMS[r.item_key].name}` }); }
async function cEnchant(i) { const id = i.options.getInteger('id'); ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const d = ITEMS[r.item_key]; if (!d?.slot || !['weapon', 'armor', 'helmet', 'boots', 'acc'].includes(d.slot)) return i.reply({ content: '❌ Büyülenemez', flags: MessageFlags.Ephemeral }); if (r.enchant >= 15) return i.reply({ content: '❌ Max +15', flags: MessageFlags.Ephemeral }); if (!has(i.user.id, 'enchant_scroll', 1)) return i.reply({ content: '❌ Parşömen yok', flags: MessageFlags.Ephemeral }); const cur2 = r.enchant; let ch = 1 - cur2 * 0.06; if (cur2 >= 10) ch = Math.max(0.15, ch); if (cur2 >= 13) ch = Math.max(0.08, ch); const w = randF() < ch; let nl = cur2; if (w) nl = cur2 + 1; else if (cur2 >= 10 && randF() < .35) nl = Math.max(0, cur2 - 1); db.transaction(() => { take(i.user.id, 'enchant_scroll', 1); db.prepare('UPDATE inventory SET enchant=? WHERE id=?').run(nl, id); if (w) db.prepare('UPDATE players SET enchants=enchants+1 WHERE user_id=?').run(i.user.id); })(); const u = checkAch(i.user.id); if (w) await i.reply({ content: `✨ +${cur2} → +${nl} (%${Math.round(ch * 100)})${u.length ? ' 🏅' : ''}` }); else await i.reply({ content: `💥 Başarısız (%${Math.round(ch * 100)})${nl < cur2 ? ` → +${nl}` : ''}` }); }
async function cUse(i) { const id = i.options.getInteger('id'); const q = i.options.getInteger('miktar') ?? 1; ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r || r.qty < q) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const d = ITEMS[r.item_key]; if (d?.slot !== 'consume') return i.reply({ content: '❌ Kullanılamaz', flags: MessageFlags.Ephemeral }); const heal = d.heal ? d.heal * q : 0; const xp = d.xp ? d.xp * q : 0; const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); const s = computeStats(p); db.transaction(() => { if (r.qty === q) db.prepare('DELETE FROM inventory WHERE id=?').run(id); else db.prepare('UPDATE inventory SET qty=qty-? WHERE id=?').run(q, id); if (heal) db.prepare('UPDATE players SET hp=MIN(?, hp+?) WHERE user_id=?').run(s.maxHp, heal, i.user.id); if (xp) grantXp(i.user.id, xp); })(); await i.reply({ content: `✅ ${q}× ${d.name}` }); }
async function cDis(i) { const id = i.options.getInteger('id'); ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const d = ITEMS[r.item_key]; if (db.prepare('SELECT 1 FROM equipment WHERE inv_id=?').get(id)) return i.reply({ content: '❌ Kuşanılmış', flags: MessageFlags.Ephemeral }); const mult = RARITY[d.r].m; const raw = Math.max(1, Math.floor(mult * 2)); const refund = Math.floor((d.price ?? 50) * 0.15 * mult); db.transaction(() => { db.prepare('DELETE FROM inventory WHERE id=?').run(id); give(i.user.id, 'raw_ore', raw); if (refund) addCoin(i.user.id, refund, 'dis'); })(); await i.reply({ content: `🔨 ${d.name} → ${raw}× Ham Cevher + ${fmt(refund)}💰` }); }
async function cAuction(i) { const s = i.options.getSubcommand(); if (s === 'liste') { const rows = db.prepare('SELECT * FROM auctions WHERE ends_at>? ORDER BY ends_at ASC LIMIT 10').all(now()); if (!rows.length) return i.reply({ content: '🏛️ Boş' }); const lines = rows.map(a => { const c = a.top_bid > 0 ? `**${fmt(a.top_bid)}**` : `Başlangıç: **${fmt(a.start_price)}**`; const l = Math.max(0, a.ends_at - now()); return `\`#${a.id}\` **${ITEMS[a.item_key].name}** ×${a.qty}\n> ${c} • ${Math.floor(l / 3600)}s`; }).join('\n'); return i.reply({ embeds: [emb('🏛️ Müzayede', 0xb71c1c).setDescription(lines)] }); } if (s === 'aç') { const id = i.options.getInteger('id'); const start = i.options.getInteger('başlangıç'); const h = i.options.getInteger('süre') ?? 24; ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM inventory WHERE id=? AND user_id=?').get(id, i.user.id); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (db.prepare('SELECT 1 FROM equipment WHERE inv_id=?').get(id)) return i.reply({ content: '❌ Kuşanılmış', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('DELETE FROM inventory WHERE id=?').run(id); db.prepare('INSERT INTO auctions (seller_id, item_key, qty, enchant, start_price, ends_at) VALUES (?,?,?,?,?,?)').run(i.user.id, r.item_key, r.qty, r.enchant, start, now() + h * 3600); })(); return i.reply({ content: '🏛️ Açıldı' }); } if (s === 'teklif') { const id = i.options.getInteger('id'); const amt = i.options.getInteger('miktar'); ensure(i.user.id, i.user.username); const a = db.prepare('SELECT * FROM auctions WHERE id=?').get(id); if (!a || a.ends_at <= now()) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (a.seller_id === i.user.id) return i.reply({ content: '❌ Kendi müzayeden', flags: MessageFlags.Ephemeral }); const min = Math.max(a.start_price, a.top_bid + Math.max(1, Math.floor(a.top_bid * .05))); if (amt < min) return i.reply({ content: `❌ Min: ${fmt(min)}`, flags: MessageFlags.Ephemeral }); if (cur(i.user.id).coin < amt) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.transaction(() => { if (a.top_bidder) addCoin(a.top_bidder, a.top_bid, 'refund'); addCoin(i.user.id, -amt, 'bid'); db.prepare('UPDATE auctions SET top_bid=?, top_bidder=? WHERE id=?').run(amt, i.user.id, id); })(); return i.reply({ content: `💸 ${fmt(amt)}` }); } }
async function cCraft(i) { const k = i.options.getString('tarif'); const r = RECIPES[k]; if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(i.user.id, i.user.username); for (const [kk, n] of Object.entries(r.needs)) if (!has(i.user.id, kk, n)) return i.reply({ content: `❌ Eksik: ${ITEMS[kk].name}`, flags: MessageFlags.Ephemeral }); db.transaction(() => { for (const [kk, n] of Object.entries(r.needs)) take(i.user.id, kk, n); give(i.user.id, r.out, r.qty); if (r.coin) addCoin(i.user.id, -r.coin, 'craft'); if (r.xp) grantXp(i.user.id, r.xp); db.prepare('UPDATE players SET crafts=crafts+1 WHERE user_id=?').run(i.user.id); bumpQ(i.user.id, 'craft', 1); })(); const u = checkAch(i.user.id); await i.reply({ content: `🔨 ${ITEMS[r.out].name} ×${r.qty}! +${r.xp}XP${u.length ? ' 🏅' : ''}` }); }
async function cRecipes(i) { const lines = Object.entries(RECIPES).map(([k, r]) => { const need = Object.entries(r.needs).map(([kk, v]) => `${v}× ${ITEMS[kk].name}`).join(', '); return `**${ITEMS[r.out].name}**\n> ${need}`; }).join('\n\n'); await i.reply({ embeds: [emb('📖 Tarifler', 0x8d6e63).setDescription(lines.slice(0, 4000))] }); }
async function cFarm(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'gör') { const slots = db.prepare('SELECT * FROM farms WHERE user_id=? ORDER BY slot').all(i.user.id); const lines = []; for (let x = 1; x <= 6; x++) { const r = slots.find(y => y.slot === x); if (!r) { lines.push(`\`${x}\` ⬜ Boş`); continue; } const c = CROPS[r.crop_key]; lines.push(`\`${x}\` ${c?.i} **${c?.name}** ${r.ready <= now() ? '✅' : `⏳ ${Math.floor((r.ready - now()) / 60)}dk`}`); } const seeds = db.prepare('SELECT * FROM seeds WHERE user_id=? AND qty>0').all(i.user.id); return i.reply({ embeds: [emb('🌾 Çiftlik', 0x4caf50).addFields({ name: 'Slotlar', value: lines.join('\n') }, { name: 'Tohumlar', value: seeds.map(x => `${CROPS[x.seed_key]?.name}: **${x.qty}**`).join(' • ') || 'Yok' })] }); } if (s === 'tohum_al') { const k = i.options.getString('tohum'); const q = i.options.getInteger('adet'); const price = k === 'seed_wheat' ? 50 : 80; const total = price * q; if (cur(i.user.id).coin < total) return i.reply({ content: `❌ ${fmt(total)}💰`, flags: MessageFlags.Ephemeral }); db.transaction(() => { addCoin(i.user.id, -total, 'seed'); const r = db.prepare('SELECT * FROM seeds WHERE user_id=? AND seed_key=?').get(i.user.id, k); if (r) db.prepare('UPDATE seeds SET qty=qty+? WHERE user_id=? AND seed_key=?').run(q, i.user.id, k); else db.prepare('INSERT INTO seeds (user_id, seed_key, qty) VALUES (?,?,?)').run(i.user.id, k, q); })(); return i.reply({ content: `🌱 ${q}× ${CROPS[k].name}` }); } if (s === 'ek') { const slot = i.options.getInteger('slot'); const k = i.options.getString('tohum'); const c = CROPS[k]; if (db.prepare('SELECT 1 FROM farms WHERE user_id=? AND slot=?').get(i.user.id, slot)) return i.reply({ content: '❌ Dolu', flags: MessageFlags.Ephemeral }); if ((db.prepare('SELECT qty FROM seeds WHERE user_id=? AND seed_key=?').get(i.user.id, k)?.qty ?? 0) < 1) return i.reply({ content: '❌ Tohum yok', flags: MessageFlags.Ephemeral }); db.transaction(() => { const sd = db.prepare('SELECT * FROM seeds WHERE user_id=? AND seed_key=?').get(i.user.id, k); if (sd.qty === 1) db.prepare('DELETE FROM seeds WHERE user_id=? AND seed_key=?').run(i.user.id, k); else db.prepare('UPDATE seeds SET qty=qty-1 WHERE user_id=? AND seed_key=?').run(i.user.id, k); db.prepare('INSERT INTO farms (user_id, slot, crop_key, planted, ready) VALUES (?,?,?,?,?)').run(i.user.id, slot, k, now(), now() + c.grow); })(); return i.reply({ content: `${c.i} Ekildi (${Math.floor(c.grow / 60)} dk)` }); } if (s === 'hasat') { const slot = i.options.getInteger('slot'); const r = db.prepare('SELECT * FROM farms WHERE user_id=? AND slot=?').get(i.user.id, slot); if (!r) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (r.ready > now()) return i.reply({ content: `⏳ ${Math.floor((r.ready - now()) / 60)}dk`, flags: MessageFlags.Ephemeral }); return harvest(i, r); } if (s === 'hasat_hepsi') { const rows = db.prepare('SELECT * FROM farms WHERE user_id=? AND ready<=?').all(i.user.id, now()); if (!rows.length) return i.reply({ content: '❌ Hazır yok', flags: MessageFlags.Ephemeral }); let out = [], coin = 0, xp = 0; for (const r of rows) { const c = CROPS[r.crop_key]; const q = randI(c.yield[0], c.yield[1]); give(i.user.id, c.out, q); db.prepare('DELETE FROM farms WHERE user_id=? AND slot=?').run(i.user.id, r.slot); xp += c.xp; coin += c.xp * 3; out.push(`${q}× ${ITEMS[c.out].name}`); } db.transaction(() => { addCoin(i.user.id, coin, 'harvest'); grantXp(i.user.id, xp); })(); return i.reply({ content: `🌾 ${out.join(', ')}\n+${fmt(coin)}💰 +${xp}XP` }); } }
function harvest(i, r) { const c = CROPS[r.crop_key]; const q = randI(c.yield[0], c.yield[1]); const coin = c.xp * 3; db.transaction(() => { give(i.user.id, c.out, q); addCoin(i.user.id, coin, 'harvest'); grantXp(i.user.id, c.xp); db.prepare('DELETE FROM farms WHERE user_id=? AND slot=?').run(i.user.id, r.slot); })(); return i.reply({ content: `${c.i} ${q}× ${ITEMS[c.out].name} +${fmt(coin)}💰 +${c.xp}XP` }); }
async function cBuffs(i) { ensure(i.user.id, i.user.username); const rows = db.prepare('SELECT * FROM buffs WHERE user_id=? AND expires>?').all(i.user.id, now()); if (!rows.length) return i.reply({ content: '❌ Aktif buff yok' }); const lines = rows.map(b => `⚡ **${b.buff_key.toUpperCase()}** ×${b.mult} — ${Math.floor((b.expires - now()) / 60)}dk`); await i.reply({ embeds: [emb('⚡ Buff\'lar', 0xff9800).setDescription(lines.join('\n'))] }); }
async function cMail(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'gönder') { const t = i.options.getUser('kullanıcı'); if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(t.id, t.username); const sub = i.options.getString('konu'); const coin = i.options.getInteger('coin') ?? 0; if (coin > 0 && cur(i.user.id).coin < coin) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.transaction(() => { if (coin > 0) addCoin(i.user.id, -coin, 'mail'); db.prepare('INSERT INTO mail (sender_id, receiver_id, subject, coin) VALUES (?,?,?,?)').run(i.user.id, t.id, sub, coin); })(); return i.reply({ content: `📮 ${t.username}'e gönderildi` }); } if (s === 'gelen') { const rows = db.prepare('SELECT * FROM mail WHERE receiver_id=? AND claimed=0 ORDER BY id DESC LIMIT 15').all(i.user.id); if (!rows.length) return i.reply({ content: '📭 Boş' }); const lines = rows.map(r => `\`#${r.id}\` **${r.subject}** — <@${r.sender_id}>${r.coin ? ` • ${fmt(r.coin)}💰` : ''}`).join('\n'); return i.reply({ embeds: [emb('📬 Gelen', 0x5c6bc0).setDescription(lines)] }); } if (s === 'oku') { const id = i.options.getInteger('id'); const m = db.prepare('SELECT * FROM mail WHERE id=? AND receiver_id=?').get(id, i.user.id); if (!m) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (m.claimed) return i.reply({ content: '✅', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('UPDATE mail SET claimed=1 WHERE id=?').run(id); if (m.coin) addCoin(i.user.id, m.coin, 'mail'); })(); await i.reply({ content: `📬 +${fmt(m.coin)}💰` }); } }
async function cFriend(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'ekle') { const t = i.options.getUser('kullanıcı'); if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(t.id, t.username); if (db.prepare('SELECT 1 FROM friends WHERE user_id=? AND friend_id=?').get(i.user.id, t.id)) return i.reply({ content: '✅', flags: MessageFlags.Ephemeral }); db.prepare('INSERT INTO friends (user_id, friend_id) VALUES (?,?)').run(i.user.id, t.id); return i.reply({ content: `🤝 ${t.username}` }); } const rows = db.prepare('SELECT friend_id FROM friends WHERE user_id=?').all(i.user.id); if (!rows.length) return i.reply({ content: '👥 Yok' }); const lines = rows.map(r => { const u = db.prepare('SELECT username, lv FROM players WHERE user_id=?').get(r.friend_id); return `• **${u?.username}** Lv${u?.lv}`; }).join('\n'); await i.reply({ embeds: [emb('👥 Arkadaşlar', 0x3949ab).setDescription(lines)] }); }
async function cMarry(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'teklif') { const t = i.options.getUser('kullanıcı'); if (t.bot || t.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(t.id, t.username); if (db.prepare('SELECT * FROM marriages WHERE user_a=? OR user_b=?').get(i.user.id, i.user.id)) return i.reply({ content: '❌ Evlisin', flags: MessageFlags.Ephemeral }); if (db.prepare('SELECT * FROM marriages WHERE user_a=? OR user_b=?').get(t.id, t.id)) return i.reply({ content: '❌ O kişi evli', flags: MessageFlags.Ephemeral }); marrProp.set([i.user.id, t.id].sort().join('-'), { from: i.user.id, to: t.id, exp: Date.now() + 5 * 60e3 }); return i.reply({ content: `💍 \`/evlen kabul kullanıcı:${i.user.username}\`` }); } const t = i.options.getUser('kullanıcı'); const key = [i.user.id, t.id].sort().join('-'); const p = marrProp.get(key); if (!p || p.to !== i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const cost = 50000; if (cur(p.from).coin < cost || cur(i.user.id).coin < cost) return i.reply({ content: `❌ ${fmt(cost)}💰`, flags: MessageFlags.Ephemeral }); db.transaction(() => { addCoin(p.from, -cost, 'marriage'); addCoin(i.user.id, -cost, 'marriage'); db.prepare('INSERT INTO marriages (user_a, user_b, married_at) VALUES (?,?,?)').run(p.from, i.user.id, now()); addGem(p.from, 10); addGem(i.user.id, 10); })(); marrProp.delete(key); await i.reply({ content: `💍💐 Evlendiniz! +10💎 +10% XP` }); }
async function cGamble(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); const ck = `${i.user.id}:casino`; if (Date.now() - (cdMap.get(ck) ?? 0) < 3000) return i.reply({ content: '⏳', flags: MessageFlags.Ephemeral }); cdMap.set(ck, Date.now()); const bet = i.options.getInteger('bahis'); if (cur(i.user.id).coin < bet) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (s === 'yazıtura') { const pk = i.options.getString('tahmin'); const r = randF() < 0.5 ? 'yazi' : 'tura'; const w = pk === r; const pay = w ? Math.floor(bet * 1.9) : -bet; addCoin(i.user.id, pay, 'casino'); return i.reply({ embeds: [emb('🪙', w ? 0x4caf50 : 0xf44336).setDescription(`Sonuç: **${r === 'yazi' ? 'Yazı' : 'Tura'}**\n${w ? `🏆 +${fmt(pay)}` : `💀 -${fmt(bet)}`}`)] }); } if (s === 'slot') { const sym = ['🍒', '🍋', '💎', '7️⃣', '⭐', '🔔', '🍀']; const r = [0, 1, 2].map(() => sym[Math.floor(Math.random() * sym.length)]); const m3 = r[0] === r[1] && r[1] === r[2]; const m2 = !m3 && (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]); let pay = -bet; let msg = '💀'; if (m3) { pay = bet * 10; msg = '🎉 JACKPOT!'; } else if (m2) { pay = Math.floor(bet * 1.5); msg = '✨'; } addCoin(i.user.id, pay, 'casino'); return i.reply({ embeds: [emb('🎰', pay > 0 ? 0x4caf50 : 0xf44336).setDescription(`**${r.join(' | ')}**\n${msg}\n${pay > 0 ? `🏆 +${fmt(pay)}` : `💀 -${fmt(bet)}`}`)] }); } }
async function cPet(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'sahiplen') { const cost = 1500; if (cur(i.user.id).coin < cost) return i.reply({ content: `❌ ${cost}💰`, flags: MessageFlags.Ephemeral }); const sp = PETS[Math.floor(Math.random() * PETS.length)]; const g = b => b + randI(0, 20); db.transaction(() => { addCoin(i.user.id, -cost, 'pet'); db.prepare('INSERT INTO pets (user_id, species, name, g_str, g_agi, g_int, g_vit, g_luck) VALUES (?,?,?,?,?,?,?,?)').run(i.user.id, sp.key, sp.name, g(sp.g.str), g(sp.g.agi), g(sp.g.int), g(sp.g.vit), g(sp.g.luck)); })(); return i.reply({ content: `🐾 ${sp.name}!` }); } const rows = db.prepare('SELECT * FROM pets WHERE user_id=?').all(i.user.id); if (!rows.length) return i.reply({ content: '🐾 Yok' }); const lines = rows.map(p => `\`#${p.id}\` **${p.name}** Lv${p.lv} Stage ${p.stage}`).join('\n'); await i.reply({ embeds: [emb('🐾 Petlerim', 0x8e24aa).setDescription(lines)] }); }
async function cMount(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'al') { const k = i.options.getString('tip'); const m = MOUNTS[k]; if (cur(i.user.id).coin < m.price) return i.reply({ content: `❌ ${fmt(m.price)}💰`, flags: MessageFlags.Ephemeral }); db.transaction(() => { addCoin(i.user.id, -m.price, 'mount'); db.prepare('INSERT INTO mounts (user_id, mount_key, name) VALUES (?,?,?)').run(i.user.id, k, m.name); })(); return i.reply({ content: `🐴 ${m.name}!` }); } if (s === 'liste') { const rows = db.prepare('SELECT * FROM mounts WHERE user_id=?').all(i.user.id); if (!rows.length) return i.reply({ content: '🐴 Yok' }); const lines = rows.map(r => `\`#${r.id}\` **${r.name}** ${r.active ? '⭐' : ''}`).join('\n'); return i.reply({ embeds: [emb('🐴', 0x4e342e).setDescription(lines)] }); } const id = i.options.getInteger('id'); if (!db.prepare('SELECT 1 FROM mounts WHERE id=? AND user_id=?').get(id, i.user.id)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('UPDATE mounts SET active=0 WHERE user_id=?').run(i.user.id); db.prepare('UPDATE mounts SET active=1 WHERE id=?').run(id); })(); await i.reply({ content: '⭐' }); }
async function cShip(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'al') { const k = i.options.getString('tip'); const d = SHIPS[k]; if (cur(i.user.id).coin < d.price) return i.reply({ content: `❌ ${fmt(d.price)}💰`, flags: MessageFlags.Ephemeral }); if (db.prepare('SELECT 1 FROM ships WHERE user_id=? AND ship_key=?').get(i.user.id, k)) return i.reply({ content: '✅ Zaten var', flags: MessageFlags.Ephemeral }); db.transaction(() => { addCoin(i.user.id, -d.price, 'ship'); db.prepare('INSERT INTO ships (user_id, ship_key, name) VALUES (?,?,?)').run(i.user.id, k, d.name); })(); return i.reply({ content: `⛵ ${d.name}!` }); } if (s === 'liste') { const rows = db.prepare('SELECT * FROM ships WHERE user_id=?').all(i.user.id); if (!rows.length) return i.reply({ content: '⛵ Yok' }); const lines = rows.map(r => `\`#${r.id}\` **${r.name}** ${r.active ? '⭐' : ''}`).join('\n'); return i.reply({ embeds: [emb('⛵ Gemilerim', 0x0277bd).setDescription(lines)] }); } const id = i.options.getInteger('id'); if (!db.prepare('SELECT 1 FROM ships WHERE id=? AND user_id=?').get(id, i.user.id)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('UPDATE ships SET active=0 WHERE user_id=?').run(i.user.id); db.prepare('UPDATE ships SET active=1 WHERE id=?').run(id); })(); await i.reply({ content: '⭐' }); }
async function cSail(i) { const s = i.options.getSubcommand(); const p = ensure(i.user.id, i.user.username); if (s === 'adalar') { const disc = new Set(db.prepare('SELECT island_key FROM islands WHERE user_id=?').all(i.user.id).map(r => r.island_key)); const lines = Object.entries(ISLANDS).map(([k, isl]) => `${p.lv >= isl.minLv ? (disc.has(k) ? '✅' : '🔓') : '🔒'} ${isl.i} **${isl.name}** — ${SHIPS[isl.ship].name}`).join('\n'); return i.reply({ embeds: [emb('🏝️ Adalar', 0x0097a7).setDescription(lines)] }); } const k = i.options.getString('ada'); const isl = ISLANDS[k]; if (p.lv < isl.minLv) return i.reply({ content: `❌ Lv${isl.minLv}`, flags: MessageFlags.Ephemeral }); const ship = db.prepare('SELECT * FROM ships WHERE user_id=? AND active=1').get(i.user.id); if (!ship) return i.reply({ content: '❌ Aktif gemi yok', flags: MessageFlags.Ephemeral }); if (SHIPS[ship.ship_key].lv < SHIPS[isl.ship].lv) return i.reply({ content: `❌ ${SHIPS[isl.ship].name} gerek`, flags: MessageFlags.Ephemeral }); const d = Date.now() - p.last_sail * 1000; if (d < CFG.cd.sail) return i.reply({ content: `⏳ ${sec(CFG.cd.sail - d)} sn.`, flags: MessageFlags.Ephemeral }); const st = computeStats(p); const mk = isl.mons[Math.floor(Math.random() * isl.mons.length)]; const m = MONS[mk]; const res = simBattle({ name: p.username, hp: p.hp, atk: st.atk, def: st.def }, { name: m.name, hp: Math.floor(m.hp * 1.3), atk: Math.floor(m.atk * 1.1), def: m.def }); const w = res.winner === 'a'; let coin = 0, xp = 0, drops = [], gems = 0; if (w) { coin = randI(isl.reward[0], isl.reward[1]); xp = 80 + isl.minLv * 6; if (randF() < 0.3) gems = 1 + Math.floor(randF() * 3); for (const [kk, c] of isl.loot) if (randF() < c * (1 + st.luck / 300)) { give(i.user.id, kk, 1); db.prepare('INSERT OR IGNORE INTO collection (user_id, entry) VALUES (?,?)').run(i.user.id, kk); drops.push(ITEMS[kk].name); } if (!db.prepare('SELECT 1 FROM islands WHERE user_id=? AND island_key=?').get(i.user.id, k)) db.prepare('INSERT INTO islands (user_id, island_key) VALUES (?,?)').run(i.user.id, k); } db.transaction(() => { if (w) { addCoin(i.user.id, coin, 'sail'); if (gems) addGem(i.user.id, gems); grantXp(i.user.id, xp); } db.prepare('UPDATE players SET last_sail=?, hp=? WHERE user_id=?').run(now(), Math.max(1, res.aHp), i.user.id); })(); const e = emb(`${isl.i} ${isl.name} — ${w ? '⚔️' : '💀'} ${m.name}`, w ? 0x0097a7 : 0x444444).setDescription(res.log.slice(-6).join('\n')).addFields({ name: 'HP', value: `${Math.max(0, res.aHp)}/${st.maxHp}`, inline: true }); if (w) e.addFields({ name: 'Ödül', value: `${fmt(coin)}💰${gems ? ` ${gems}💎` : ''} ${xp}XP\n${drops.join(', ') || 'yok'}` }); await i.reply({ embeds: [e] }); }
async function cNPC(i) { ensure(i.user.id, i.user.username); const k = i.options.getString('npc'); const msg = i.options.getString('mesaj'); const n = NPCS[k]; if (!n) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); let mem = {}; try { mem = JSON.parse(p.npc_mem ?? '{}'); } catch {} mem[k] = (mem[k] ?? 0) + 1; const m = msg.toLowerCase(); let rep = n.def; for (const [kw, r] of Object.entries(n.kw)) if (m.includes(kw)) { rep = r; break; } if (rep === n.def && m.includes('?')) rep = `${n.name} düşündü... "${n.def}"`; db.transaction(() => { db.prepare('UPDATE players SET npc_mem=? WHERE user_id=?').run(JSON.stringify(mem), i.user.id); if (mem[k] <= 3) grantXp(i.user.id, 25); })(); await i.reply({ embeds: [emb(`${n.i} ${n.name}`, 0x455a64).setDescription(`**Sen:** ${msg}\n\n**${n.name}:** ${rep}`)] }); }
async function cGuild(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); if (s === 'kur') { const name = i.options.getString('isim'); if (db.prepare('SELECT 1 FROM guild_members WHERE user_id=?').get(i.user.id)) return i.reply({ content: '❌ Zaten loncadasın', flags: MessageFlags.Ephemeral }); if (cur(i.user.id).coin < 10000) return i.reply({ content: '❌ 10K💰', flags: MessageFlags.Ephemeral }); try { db.transaction(() => { addCoin(i.user.id, -10000, 'guild'); const r = db.prepare('INSERT INTO guilds (name, owner_id) VALUES (?,?)').run(name, i.user.id); db.prepare('INSERT INTO guild_members (guild_id, user_id, rank) VALUES (?,?,?)').run(r.lastInsertRowid, i.user.id, 'owner'); })(); return i.reply({ content: `🏰 ${name}!` }); } catch { return i.reply({ content: '❌ İsim alınmış', flags: MessageFlags.Ephemeral }); } } if (s === 'bilgi') { const g = db.prepare(`SELECT g.* FROM guilds g JOIN guild_members m ON m.guild_id=g.id WHERE m.user_id=?`).get(i.user.id); if (!g) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const n = db.prepare('SELECT COUNT(*) AS n FROM guild_members WHERE guild_id=?').get(g.id).n; return i.reply({ embeds: [emb(`🏰 ${g.name}`, 0x00897b).addFields({ name: 'Kurucu', value: `<@${g.owner_id}>`, inline: true }, { name: 'Üye', value: `${n}`, inline: true }, { name: 'Banka', value: `${fmt(g.bank_coin)}💰` })] }); } if (s === 'katıl') { const name = i.options.getString('isim'); if (db.prepare('SELECT 1 FROM guild_members WHERE user_id=?').get(i.user.id)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const g = db.prepare('SELECT * FROM guilds WHERE name=?').get(name); if (!g) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.prepare('INSERT INTO guild_members (guild_id, user_id) VALUES (?,?)').run(g.id, i.user.id); return i.reply({ content: `✅ ${g.name}` }); } if (s === 'yatır') { const a = i.options.getInteger('miktar'); const g = db.prepare(`SELECT g.* FROM guilds g JOIN guild_members m ON m.guild_id=g.id WHERE m.user_id=?`).get(i.user.id); if (!g) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (cur(i.user.id).coin < a) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.transaction(() => { addCoin(i.user.id, -a, 'guild'); db.prepare('UPDATE guilds SET bank_coin=bank_coin+? WHERE id=?').run(a, g.id); })(); return i.reply({ content: `🏦 ${fmt(a)}💰` }); } }
async function cGuildWar(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); const g = db.prepare(`SELECT g.* FROM guilds g JOIN guild_members m ON m.guild_id=g.id WHERE m.user_id=?`).get(i.user.id); if (!g) return i.reply({ content: '❌ Lonca gerekli', flags: MessageFlags.Ephemeral }); if (s === 'başlat') { if (g.owner_id !== i.user.id) return i.reply({ content: '❌ Sadece kurucu', flags: MessageFlags.Ephemeral }); const name = i.options.getString('hedef'); const enemy = db.prepare('SELECT * FROM guilds WHERE name=?').get(name); if (!enemy || enemy.id === g.id) return i.reply({ content: '❌ Geçersiz hedef', flags: MessageFlags.Ephemeral }); const my = db.prepare('SELECT user_id FROM guild_members WHERE guild_id=?').all(g.id); const en = db.prepare('SELECT user_id FROM guild_members WHERE guild_id=?').all(enemy.id); if (my.length < 2 || en.length < 2) return i.reply({ content: '❌ Her iki lonca 2+ üye gerek', flags: MessageFlags.Ephemeral }); let s1 = 0, s2 = 0; const logs = []; const max = Math.min(my.length, en.length, 10); for (let n = 0; n < max; n++) { const a = db.prepare('SELECT * FROM players WHERE user_id=?').get(my[n].user_id); const b = db.prepare('SELECT * FROM players WHERE user_id=?').get(en[n].user_id); const aS = computeStats(a), bS = computeStats(b); const res = simBattle({ name: a.username, hp: aS.maxHp, atk: aS.atk, def: aS.def }, { name: b.username, hp: bS.maxHp, atk: bS.atk, def: bS.def }); if (res.winner === 'a') { s1++; logs.push(`✅ ${a.username} > ${b.username}`); } else if (res.winner === 'b') { s2++; logs.push(`❌ ${a.username} < ${b.username}`); } else logs.push(`➖ ${a.username} = ${b.username}`); } const win = s1 > s2 ? g.id : s2 > s1 ? enemy.id : null; if (win) db.prepare('UPDATE guilds SET bank_coin=bank_coin+100000, wins=wins+1 WHERE id=?').run(win); const wName = win === g.id ? g.name : win === enemy.id ? enemy.name : 'Berabere'; const e = emb(`⚔️ ${g.name} vs ${enemy.name}`, win === g.id ? 0x4caf50 : win ? 0xf44336 : 0xffd600).setDescription(logs.join('\n')).addFields({ name: g.name, value: `${s1} galibiyet`, inline: true }, { name: enemy.name, value: `${s2} galibiyet`, inline: true }, { name: '🏆 Kazanan', value: win ? `**${wName}** (+100K💰)` : 'Berabere' }); return i.reply({ embeds: [e] }); } if (s === 'bilgi') return i.reply({ embeds: [emb(`⚔️ ${g.name}`, 0xb71c1c).addFields({ name: 'Zafer', value: `${g.wins}`, inline: true }, { name: 'Banka', value: `${fmt(g.bank_coin)}💰`, inline: true })] }); }
async function cQuests(i) { ensure(i.user.id, i.user.username); const lines = Object.entries(QUESTS).map(([k, q]) => { const p = db.prepare('SELECT * FROM quests WHERE user_id=? AND key=?').get(i.user.id, k); return `**${q.name}** \`${k}\` [${q.type}]\n${p?.claimed ? '✅' : '⏳'} ${p?.prog ?? 0}/${q.tgt} → ${fmt(q.rw.coin)}💰 ${q.rw.xp}XP`; }).join('\n\n'); await i.reply({ embeds: [emb('📜 Görevler', 0xffb300).setDescription(lines)] }); }
async function cQComplete(i) { const k = i.options.getString('key'); const q = QUESTS[k]; if (!q) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(i.user.id, i.user.username); const r = db.prepare('SELECT * FROM quests WHERE user_id=? AND key=?').get(i.user.id, k); if (!r || r.prog < q.tgt) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); if (r.claimed) return i.reply({ content: '✅', flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('UPDATE quests SET claimed=1 WHERE user_id=? AND key=?').run(i.user.id, k); addCoin(i.user.id, q.rw.coin, 'quest'); if (q.rw.gem) addGem(i.user.id, q.rw.gem); grantXp(i.user.id, q.rw.xp); })(); await i.reply({ content: `🎉 ${q.name}!` }); }
async function cAch(i) { ensure(i.user.id, i.user.username); const u = new Set(db.prepare('SELECT key FROM ach WHERE user_id=?').all(i.user.id).map(r => r.key)); const lines = Object.entries(ACH).map(([k, a]) => `${u.has(k) ? '✅' : '🔒'} **${a.name}** — ${a.desc}`).join('\n'); await i.reply({ embeds: [emb(`🏅 (${u.size}/${Object.keys(ACH).length})`, 0xffab00).setDescription(lines.slice(0, 4000))] }); }
async function cChains(i) { ensure(i.user.id, i.user.username); const lines = Object.entries(CHAINS).map(([k, c]) => { const r = db.prepare('SELECT * FROM chains WHERE user_id=? AND chain_key=?').get(i.user.id, k); const stage = r?.stage ?? 0; const st = c.stages[stage]; const prog = db.prepare('SELECT entry FROM collection WHERE user_id=? AND entry LIKE ?').get(i.user.id, `__chain_${k}_${stage}_%`); const c2 = prog ? Number(prog.entry.split('_').pop()) : 0; return `${c.i} **${c.name}**\n> Aşama ${stage + 1}/${c.stages.length}: ${st ? st.desc + ` (${c2}/${st.need})` : 'Tamamlandı!'}`; }).join('\n\n'); await i.reply({ embeds: [emb('🔗 Başarım Zincirleri', 0xffab00).setDescription(lines)] }); }
async function cTitle(i) { const s = i.options.getSubcommand(); const p = ensure(i.user.id, i.user.username); if (s === 'liste') { const a = new Set(availTitles(p)); const lines = Object.entries(TITLES).map(([k, t]) => `${a.has(k) ? '✅' : '🔒'} **${t.name}**`).join('\n'); return i.reply({ embeds: [emb('🎖️ Unvanlar', 0x6a1b9a).setDescription(lines)] }); } const k = i.options.getString('unvan'); if (!TITLES[k] || !availTitles(p).includes(k)) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); db.prepare('UPDATE players SET title=? WHERE user_id=?').run(k, i.user.id); await i.reply({ content: `🎖️ ${TITLES[k].name}` }); }
async function cPrestige(i) { const p = ensure(i.user.id, i.user.username); if (p.lv < CFG.maxLv) return i.reply({ content: `❌ Lv${CFG.maxLv}`, flags: MessageFlags.Ephemeral }); if (p.prestige >= CFG.maxPrestige) return i.reply({ content: '❌ Max', flags: MessageFlags.Ephemeral }); const np = p.prestige + 1; db.transaction(() => { db.prepare(`UPDATE players SET lv=1, xp=0, prestige=?, str=5, agi=5, int=5, vit=5, luck=5, hp=100, max_hp=100, sp=0, cls='wanderer' WHERE user_id=?`).run(np, i.user.id); addGem(i.user.id, 25); })(); await i.reply({ content: `👑 PRESTİJ ${np}! +${np * 5}%` }); }
async function cSkillTree(i) { ensure(i.user.id, i.user.username); const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); if (p.cls === 'wanderer') return i.reply({ content: '❌ Sınıf seç', flags: MessageFlags.Ephemeral }); const unlocked = new Set(db.prepare('SELECT skill_key FROM skills WHERE user_id=?').all(i.user.id).map(r => r.skill_key)); const my = Object.entries(SKILLS).filter(([, s]) => s.cls === p.cls); const row = new ActionRowBuilder(); for (const [k, s] of my) row.addComponents(new ButtonBuilder().setCustomId(`sk_${k}`).setLabel(s.name).setStyle(unlocked.has(k) ? ButtonStyle.Success : p.sp >= s.cost ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(unlocked.has(k) || p.sp < s.cost)); await i.reply({ embeds: [emb(`🌟 ${p.cls} — ${p.sp} pt`, 0x7b1fa2)], components: [row] }); }
async function skBtn(interaction, key) { const sk = SKILLS[key]; if (!sk) return interaction.reply({ content: '❌', flags: MessageFlags.Ephemeral }); const p = ensure(interaction.user.id, interaction.user.username); if (db.prepare('SELECT 1 FROM skills WHERE user_id=? AND skill_key=?').get(interaction.user.id, key)) return interaction.reply({ content: '✅', flags: MessageFlags.Ephemeral }); if (p.sp < sk.cost) return interaction.reply({ content: `❌ ${sk.cost}pt`, flags: MessageFlags.Ephemeral }); db.transaction(() => { db.prepare('UPDATE players SET sp=sp-? WHERE user_id=?').run(sk.cost, interaction.user.id); db.prepare('INSERT INTO skills (user_id, skill_key) VALUES (?,?)').run(interaction.user.id, key); })(); await interaction.reply({ content: `✨ ${sk.name}!`, flags: MessageFlags.Ephemeral }); }
async function cCollect(i) { ensure(i.user.id, i.user.username); const d = new Set(db.prepare('SELECT entry FROM collection WHERE user_id=? AND entry NOT LIKE ?').all(i.user.id, '__%').map(r => r.entry)); const items = Object.entries(ITEMS).slice(0, 40).map(([k, it]) => d.has(k) ? `✅ ${RARITY[it.r].i} ${it.name}` : '❓ ???').join('\n'); await i.reply({ embeds: [emb(`📖 Koleksiyon (${d.size}/${Object.keys(ITEMS).length})`, 0x8e24aa).setDescription(items.slice(0, 1500))] }); }
const WHEEL = [{ w: 25, n: '100💰', run: u => addCoin(u, 100, 'wheel') }, { w: 20, n: '500💰', run: u => addCoin(u, 500, 'wheel') }, { w: 15, n: '1000💰', run: u => addCoin(u, 1000, 'wheel') }, { w: 10, n: '5000💰', run: u => addCoin(u, 5000, 'wheel') }, { w: 8, n: '200XP', run: u => grantXp(u, 200) }, { w: 7, n: '1💎', run: u => addGem(u, 1) }, { w: 5, n: '5💎', run: u => addGem(u, 5) }, { w: 2, n: '10K💰', run: u => addCoin(u, 10000, 'wheel') }, { w: 1, n: '50K+25💎', run: u => { addCoin(u, 50000, 'wheel'); addGem(u, 25); } }];
async function cWheel(i) { ensure(i.user.id, i.user.username); const w = db.prepare('SELECT * FROM buffs WHERE user_id=? AND buff_key=?').get(i.user.id, '_wheel'); const d = (w?.expires ?? 0) - now(); if (d > 0) return i.reply({ content: `⏳ ${Math.ceil(d / 3600)}sa`, flags: MessageFlags.Ephemeral }); const total = WHEEL.reduce((s, x) => s + x.w, 0); let r = Math.random() * total; let pr = WHEEL[0]; for (const p of WHEEL) if ((r -= p.w) <= 0) { pr = p; break; } db.transaction(() => { pr.run(i.user.id); applyBuff(i.user.id, '_wheel', 0, 22 * 3600); })(); await i.reply({ embeds: [emb('🎡', 0xff9800).setDescription(`Sonuç: **${pr.n}**`)] }); }
const EXPLORE = [{ w: 30, n: 'Seyyar Satıcı', run: (u) => { const c = randI(30, 200); addCoin(u, c, 'explore'); return `${fmt(c)} coin.`; } }, { w: 20, n: 'Hazine', run: (u, p) => { const k = pickItem(pickRarity(p.luck)); if (k) { give(u, k, 1); db.prepare('INSERT OR IGNORE INTO collection (user_id, entry) VALUES (?,?)').run(u, k); return `${ITEMS[k].name}!`; } return 'Boş.'; } }, { w: 15, n: 'Pusu', run: (u, p) => { const dmg = randI(20, 60); const pl = db.prepare('SELECT * FROM players WHERE user_id=?').get(u); const nh = Math.max(1, pl.hp - dmg); db.prepare('UPDATE players SET hp=? WHERE user_id=?').run(nh, u); return `${dmg} hasar.`; } }, { w: 10, n: 'Parşömen', run: (u) => { give(u, 'enchant_scroll', 1); return 'Büyü Parşömeni!'; } }, { w: 8, n: 'Ruh', run: (u) => { grantXp(u, 200); return '+200 XP!'; } }, { w: 5, n: 'Gem', run: (u) => { addGem(u, 1); return '1💎!'; } }, { w: 4, n: 'Ejder Pulu', run: (u) => { give(u, 'dragon_scale', 1); return 'Ejder Pulu!'; } }, { w: 2, n: 'Void Tozu', run: (u) => { give(u, 'void_dust', 1); return 'Void Tozu!'; } }, { w: 1, n: 'Eser Parçası', run: (u) => { give(u, 'artifact_shard', 1); return '💠 Eser Parçası!'; } }];
async function cExplore(i) { const p = ensure(i.user.id, i.user.username); const d = Date.now() - p.last_explore * 1000; if (d < CFG.cd.explore) return i.reply({ content: `⏳ ${sec(CFG.cd.explore - d)} sn.`, flags: MessageFlags.Ephemeral }); const total = EXPLORE.reduce((s, x) => s + x.w, 0); let r = Math.random() * total; let ev = EXPLORE[0]; for (const e of EXPLORE) if ((r -= e.w) <= 0) { ev = e; break; } const res = ev.run(i.user.id, { ...p, luck: computeStats(p).luck }); db.prepare('UPDATE players SET last_explore=? WHERE user_id=?').run(now(), i.user.id); await i.reply({ embeds: [emb(`🗺️ ${ev.n}`, 0x00bcd4).setDescription(res)] }); }
async function cCompanion(i) { const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username); let c = db.prepare('SELECT * FROM companions WHERE user_id=?').get(i.user.id); if (s === 'yumurta') { if (c) return i.reply({ content: '❌ Zaten var', flags: MessageFlags.Ephemeral }); const cost = 50000; if (cur(i.user.id).coin < cost) return i.reply({ content: `❌ ${fmt(cost)}💰`, flags: MessageFlags.Ephemeral }); const sp = ['dragon', 'phoenix', 'void_wolf'][Math.floor(Math.random() * 3)]; db.transaction(() => { addCoin(i.user.id, -cost, 'companion'); db.prepare('INSERT INTO companions (user_id, name, species) VALUES (?,?,?)').run(i.user.id, COMP[sp].name, sp); })(); const u = checkAch(i.user.id); return i.reply({ embeds: [emb('🐉 Companion Doğdu!', 0x00c853).setDescription(`${COMP[sp].i} **${COMP[sp].name}**\n\nBesle: \`/companion besle\`${u.length ? `\n🏅 ${u.map(a => a.name).join(', ')}` : ''}`)] }); } if (!c) return i.reply({ content: '❌ Önce yumurta al', flags: MessageFlags.Ephemeral }); const sp = COMP[c.species]; if (s === 'durum') { const stage = sp.stages[c.stage - 1] ?? sp.stages[0]; const bonus = Math.floor(c.lv * 0.8 * c.stage); return i.reply({ embeds: [emb(`${sp.i} ${c.name}`, 0x7b2cbf).addFields({ name: 'Aşama', value: stage, inline: true }, { name: 'Lv', value: `${c.lv}`, inline: true }, { name: 'Mood', value: `💗 ${c.mood}/100`, inline: true }, { name: 'Loyalty', value: `⭐ ${c.loyalty}/100`, inline: true }, { name: 'Bonus', value: `+${bonus} ATK/DEF`, inline: true })] }); } if (s === 'besle') { if (!has(i.user.id, 'companion_food', 1)) return i.reply({ content: '❌ Companion yemeği gerek', flags: MessageFlags.Ephemeral }); take(i.user.id, 'companion_food', 1); const nm = Math.min(100, c.mood + 20); const nl = Math.min(100, c.loyalty + 5); let nx = c.xp + 100; let nlv = c.lv; let ns = c.stage; while (nlv < 50 && nx >= nlv * 200) { nx -= nlv * 200; nlv++; if (nlv >= 10 && ns === 1) ns = 2; if (nlv >= 25 && ns === 2) ns = 3; if (nlv >= 50 && ns === 3) ns = 4; } db.prepare('UPDATE companions SET mood=?, loyalty=?, xp=?, lv=?, stage=? WHERE user_id=?').run(nm, nl, nx, nlv, ns, i.user.id); return i.reply({ content: `🍖 ${c.name} yedi! Mood +20, Loyalty +5${ns > c.stage ? `\n✨ **EVRİM: ${sp.stages[ns - 1]}!**` : nlv > c.lv ? `\n⬆️ Lv${nlv}!` : ''}` }); } if (s === 'sohbet') { const cd = now() - c.last_talk; if (cd < 3600) return i.reply({ content: `⏳ ${Math.ceil((3600 - cd) / 60)}dk`, flags: MessageFlags.Ephemeral }); const q = COMP_QUOTES[Math.floor(Math.random() * COMP_QUOTES.length)]; db.prepare('UPDATE companions SET mood=MIN(100, mood+3), last_talk=? WHERE user_id=?').run(now(), i.user.id); return i.reply({ embeds: [emb(`${sp.i} ${c.name}`, 0x7b2cbf).setDescription(`*"${q}"*`).setFooter({ text: 'Mood +3' })] }); } }
async function cSeasonal(i) { const s = activeSeasonal(); if (!s) return i.reply({ embeds: [emb('🎉 Sezonsal Event', 0x7b1fa2).setDescription('Aktif event yok.\n\n**Yaklaşan:**\n🎃 Cadılar Bayramı\n🎄 Yılbaşı\n💝 Sevgililer Günü')] }); ensure(i.user.id, i.user.username); const prog = db.prepare('SELECT * FROM seasonals WHERE user_id=? AND event=?').get(i.user.id, s.key); const drop = db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM inventory WHERE user_id=? AND item_key=?').get(i.user.id, s.drop).n; const need = 10; const claimed = prog?.claimed ?? 0; const e = emb(`${s.name}`, 0xffd600).setDescription(`${s.desc}\n\nToplanan: **${drop}/${need}** ${ITEMS[s.drop].name}`).addFields({ name: 'Ödül', value: claimed ? '✅ Aldın' : drop >= need ? '🎁 Hazır!' : 'Toplamaya devam' }); if (!claimed && drop >= need) { db.transaction(() => { take(i.user.id, s.drop, need); addCoin(i.user.id, 50000, 'seasonal'); addGem(i.user.id, 10); grantXp(i.user.id, 5000); give(i.user.id, 'enchant_scroll', 5); if (prog) db.prepare('UPDATE seasonals SET claimed=1 WHERE user_id=? AND event=?').run(i.user.id, s.key); else db.prepare('INSERT INTO seasonals (user_id, event, claimed) VALUES (?,?,1)').run(i.user.id, s.key); })(); e.addFields({ name: '🎁 ÖDÜL!', value: '+50.000💰 +10💎 +5.000XP +5× Parşömen' }); } await i.reply({ embeds: [e] }); }
async function cStats(i) { ensure(i.user.id, i.user.username); const p = db.prepare('SELECT * FROM players WHERE user_id=?').get(i.user.id); const totalItems = db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM inventory WHERE user_id=?').get(i.user.id).n; const unique = db.prepare('SELECT COUNT(DISTINCT item_key) AS n FROM inventory WHERE user_id=?').get(i.user.id).n; const pets = db.prepare('SELECT COUNT(*) AS n FROM pets WHERE user_id=?').get(i.user.id).n; const isl = db.prepare('SELECT COUNT(*) AS n FROM islands WHERE user_id=?').get(i.user.id).n; const comp = db.prepare('SELECT * FROM companions WHERE user_id=?').get(i.user.id); const spouse = marrPartner(i.user.id); const s = computeStats(p); const age = Math.floor((now() - p.created_at) / 86400); const e = emb(`📊 İstatistik — ${p.username}`, 0x37474f).addFields({ name: '📅 Hesap Yaşı', value: `${age} gün${isNewbie(i.user.id) ? ' 🛡️ Yeni' : ''}`, inline: true }, { name: '💰 Toplam Kazanç', value: fmt(p.earned), inline: true }, { name: '⚔️ Kill', value: `${fmt(p.kills)}`, inline: true }, { name: '👑 Boss', value: `${fmt(p.bosses)}`, inline: true }, { name: '🏰 Zindan', value: `${fmt(p.dungeons)}`, inline: true }, { name: '🛠️ Craft', value: `${fmt(p.crafts)}`, inline: true }, { name: '✨ Enchant', value: `${fmt(p.enchants)}`, inline: true }, { name: '🎒 Item', value: `${fmt(totalItems)} (${unique} çeşit)`, inline: true }, { name: '🐾 Pet', value: `${pets}`, inline: true }, { name: '🏝️ Ada', value: `${isl}`, inline: true }, { name: '💍 Eş', value: spouse ? `<@${spouse}>` : 'Yok', inline: true }, { name: '🐉 Companion', value: comp ? `Lv${comp.lv} (${COMP[comp.species]?.name})` : 'Yok', inline: true }, { name: '⚔️/🛡️', value: `${s.atk}/${s.def}`, inline: true }); await i.reply({ embeds: [e] }); }
async function cArtEquip(i) { const k = i.options.getString('key'); const slot = i.options.getInteger('slot'); ensure(i.user.id, i.user.username); if (!db.prepare('SELECT 1 FROM artifacts WHERE user_id=? AND art_key=?').get(i.user.id, k)) return i.reply({ content: '❌ Bu eserin yok', flags: MessageFlags.Ephemeral }); db.prepare('INSERT OR REPLACE INTO art_slots (user_id, slot, art_key) VALUES (?,?,?)').run(i.user.id, slot, k); await i.reply({ content: `🔮 Slot ${slot}: ${k}` }); }
async function cArtList(i) { ensure(i.user.id, i.user.username); const owned = db.prepare('SELECT art_key FROM artifacts WHERE user_id=?').all(i.user.id); if (!owned.length) return i.reply({ content: '🔮 Eserin yok' }); const lines = owned.map(r => `\`${r.art_key}\``).join('\n'); await i.reply({ embeds: [emb('🔮 Eserlerim', 0x6a1b9a).setDescription(lines)] }); }
async function cArtUnequip(i) { const slot = i.options.getInteger('slot'); const r = db.prepare('DELETE FROM art_slots WHERE user_id=? AND slot=?').run(i.user.id, slot); if (!r.changes) return i.reply({ content: '❌ Slot boş', flags: MessageFlags.Ephemeral }); await i.reply({ content: `✅ Slot ${slot} boşaltıldı` }); }
async function cGemShop(i) {
  const k = i.options.getString('item');
  const item = GEM_SHOP[k];
  if (!item) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
  ensure(i.user.id, i.user.username);
  const c = cur(i.user.id);
  if (c.gem < item.gem) return i.reply({ content: `❌ ${item.gem}💎 gerek (sen: ${c.gem}💎)`, flags: MessageFlags.Ephemeral });
  db.transaction(() => {
    addGem(i.user.id, -item.gem);
    give(i.user.id, k, item.qty ?? 1);
  })();
  await i.reply({ content: `✅ **${item.name}** alındı! (-${item.gem}💎)` });
}
async function cRenk(i) {
  const hex = i.options.getInteger('hex');
  ensure(i.user.id, i.user.username);
  db.prepare('INSERT OR REPLACE INTO profile_colors (user_id, color) VALUES (?,?)').run(i.user.id, hex);
  await i.reply({ content: `🎨 Profil rengin güncellendi: \`#${hex.toString(16).padStart(6, '0')}\`` });
}
async function cDavet(i) {
  const s = i.options.getSubcommand(); ensure(i.user.id, i.user.username);
  if (s === 'kullan') {
    const ref = i.options.getUser('davet_eden');
    if (ref.bot || ref.id === i.user.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
    ensure(ref.id, ref.username);
    if (db.prepare('SELECT 1 FROM referrals WHERE referred_id=?').get(i.user.id)) return i.reply({ content: '❌ Zaten davet kullandın', flags: MessageFlags.Ephemeral });
    const age = Math.floor((now() - db.prepare('SELECT created_at FROM players WHERE user_id=?').get(i.user.id).created_at) / 86400);
    if (age > 7) return i.reply({ content: '❌ Sadece 7 günden yeni hesaplar davet kullanabilir', flags: MessageFlags.Ephemeral });
    db.transaction(() => {
      db.prepare('INSERT INTO referrals (referrer_id, referred_id) VALUES (?,?)').run(ref.id, i.user.id);
      addCoin(ref.id, CFG.referralReward.coin, 'referral');
      addGem(ref.id, CFG.referralReward.gem);
      addCoin(i.user.id, 5000, 'referral bonus');
      addGem(i.user.id, 20);
    })();
    return i.reply({ content: `🤝 **${ref.username}**'in davetini kullandın!\nOna: +${fmt(CFG.referralReward.coin)}💰 +${CFG.referralReward.gem}💎\nSana: +5000💰 +20💎` });
  }
  const rows = db.prepare('SELECT referred_id FROM referrals WHERE referrer_id=?').all(i.user.id);
  const totalCoin = rows.length * CFG.referralReward.coin;
  const totalGem = rows.length * CFG.referralReward.gem;
  return i.reply({ embeds: [emb('🤝 Davet Bilgileri', 0x00c853).addFields({ name: 'Toplam Davet', value: `${rows.length}`, inline: true }, { name: 'Kazanç', value: `${fmt(totalCoin)}💰 ${totalGem}💎`, inline: true })] });
}
async function cAdmin(i) {
  const s = i.options.getSubcommand();
  if (s === 'coin') { const u = i.options.getUser('kullanıcı'); const a = i.options.getInteger('miktar'); ensure(u.id, u.username); addCoin(u.id, a, 'admin'); return i.reply({ content: `✅ ${u.username}: ${a >= 0 ? '+' : ''}${fmt(a)}`, flags: MessageFlags.Ephemeral }); }
  if (s === 'item') { const u = i.options.getUser('kullanıcı'); const k = i.options.getString('key'); const q = i.options.getInteger('adet') ?? 1; if (!ITEMS[k]) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral }); ensure(u.id, u.username); give(u.id, k, q); return i.reply({ content: `✅ ${q}× ${ITEMS[k].name}`, flags: MessageFlags.Ephemeral }); }
  if (s === 'eser') { const u = i.options.getUser('kullanıcı'); const k = i.options.getString('key'); ensure(u.id, u.username); db.prepare('INSERT OR IGNORE INTO artifacts (user_id, art_key) VALUES (?,?)').run(u.id, k); return i.reply({ content: `✅ ${u.username}: ${k}`, flags: MessageFlags.Ephemeral }); }
  if (s === 'istatistik') {
    const stats = {};
    for (const t of ['players', 'inventory', 'market', 'guilds', 'pets', 'marriages', 'bestiary', 'artifacts', 'ships', 'islands', 'farms', 'mail', 'companions', 'referrals']) stats[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    return i.reply({ embeds: [emb('📊 İstatistik', 0x37474f).addFields(
      { name: '👤 Oyuncu', value: `${stats.players}`, inline: true },
      { name: '🎒 Item', value: `${stats.inventory}`, inline: true },
      { name: '🛒 Pazar', value: `${stats.market}`, inline: true },
      { name: '🏰 Lonca', value: `${stats.guilds}`, inline: true },
      { name: '🐾 Pet', value: `${stats.pets}`, inline: true },
      { name: '💍 Evlilik', value: `${stats.marriages}`, inline: true },
      { name: '📖 Bestiary', value: `${stats.bestiary}`, inline: true },
      { name: '🔮 Eser', value: `${stats.artifacts}`, inline: true },
      { name: '⛵ Gemi', value: `${stats.ships}`, inline: true },
      { name: '🏝️ Ada', value: `${stats.islands}`, inline: true },
      { name: '🐉 Companion', value: `${stats.companions}`, inline: true },
      { name: '🤝 Davet', value: `${stats.referrals}`, inline: true },
    )], flags: MessageFlags.Ephemeral });
  }
  if (s === 'boss') {
    const keys = ['dragon_lord', 'phoenix', 'elder_demon']; const k = keys[Math.floor(Math.random() * 3)]; const m = MONS[k]; const hp = m.hp * 25;
    db.prepare('UPDATE wboss SET active=0 WHERE active=1').run();
    db.prepare('INSERT INTO wboss (boss_key, hp, max_hp, ends_at) VALUES (?,?,?,?)').run(k, hp, hp, now() + 3600);
    return i.reply({ content: `👹 **${m.name}** spawn!`, flags: MessageFlags.Ephemeral });
  }
  if (s === 'cheat_log') {
    const rows = db.prepare('SELECT * FROM cheat_log ORDER BY at DESC LIMIT 20').all();
    if (!rows.length) return i.reply({ content: '✅ Şüpheli işlem yok.', flags: MessageFlags.Ephemeral });
    const lines = rows.map(r => `<@${r.user_id}> — ${r.kind}: ${r.detail}`).join('\n');
    return i.reply({ embeds: [emb('🚨 Şüpheli', 0xb71c1c).setDescription(lines)], flags: MessageFlags.Ephemeral });
  }
}

// ==================== INTERACTION HANDLER ====================
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const id = interaction.customId;
    try {
      if (id.startsWith('hub_')) return handleHub(interaction, id.slice(4));
      if (id.startsWith('sk_')) return skBtn(interaction, id.slice(3));
      if (id.startsWith('pvpA_') || id.startsWith('pvpD_') || id.startsWith('pvpS_') || id.startsWith('pvpF_')) return pvpBtn(interaction, id[3], id.slice(5));
    } catch (e) { err('btn:', e); }
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  try {
    if (spamming(interaction.user.id)) return interaction.reply({ content: '🚫', flags: MessageFlags.Ephemeral });
    const map = {
      'endless': cHub, 'yardım': cHelp, 'başlangıç': cBaşlangıç, 'profil': cProfil, 'envanter': cEnv, 'sıralama': cTop,
      'bakiye': cBal, 'banka': cBank, 'transfer': cTransfer, 'günlük': cDaily, 'takvim': cTakvim, 'çalış': cWork,
      'sınıf': cClass, 'stat': cStat, 'can': cHp, 'kuşan': cEquip, 'çıkar': cUnequip,
      'maden': (i) => doGather(i, 'mine'), 'balık': (i) => doGather(i, 'fish'), 'topla': (i) => doGather(i, 'gather'),
      'av': cHunt, 'bölge': cZone, 'bestiary': cBest, 'zindan': cDungeon, 'kule': cTower, 'boss': cBoss,
      'düello': cDuel, 'pvp': cPvp, 'ranked': cRanked,
      'market': cMarket, 'sat': cSell, 'satınal': cBuy, 'büyüle': cEnchant, 'kullan': cUse, 'parçala': cDis,
      'müzayede': cAuction, 'craft': cCraft, 'tarifler': cRecipes,
      'çiftlik': cFarm, 'bufflarım': cBuffs,
      'posta': cMail, 'arkadaş': cFriend, 'evlen': cMarry, 'kumar': cGamble,
      'pet': cPet, 'mount': cMount, 'gemi': cShip, 'yelken': cSail, 'npc': cNPC,
      'lonca': cGuild, 'guildwar': cGuildWar,
      'görevler': cQuests, 'görevtamamla': cQComplete,
      'başarımlar': cAch, 'zincirler': cChains, 'unvan': cTitle, 'prestij': cPrestige,
      'skill_tree': cSkillTree, 'koleksiyon': cCollect, 'çark': cWheel, 'keşfet': cExplore,
      'companion': cCompanion, 'seasonal': cSeasonal, 'istatistik': cStats,
      'eser_kuşan': cArtEquip, 'eser_listesi': cArtList, 'eser_çıkar': cArtUnequip,
      'gem_dükkan': cGemShop, 'renk': cRenk, 'davet': cDavet,
      'admin': cAdmin,
    };
    const fn = map[interaction.commandName];
    if (!fn) return interaction.reply({ content: '❓', flags: MessageFlags.Ephemeral });
    return fn(interaction);
  } catch (e) {
    err('cmd:', e);
    if (!interaction.replied && !interaction.deferred) interaction.reply({ content: '❌ Hata', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

// ==================== SCHEDULERS ====================
setInterval(() => { try { db.prepare('DELETE FROM market WHERE expires_at<?').run(now()); } catch (e) { err(e); } }, 30 * 60e3);
setInterval(() => { try { db.prepare('DELETE FROM buffs WHERE expires<? AND buff_key NOT IN (?, ?, ?)').run(now(), '_wheel', '_newbie', '_newbie_xp'); } catch (e) { err(e); } }, 5 * 60e3);
setInterval(() => {
  try {
    const b = db.prepare('SELECT * FROM wboss WHERE active=1 AND ends_at<?').get(now());
    if (b) db.prepare('UPDATE wboss SET active=0 WHERE id=?').run(b.id);
    if (!db.prepare('SELECT * FROM wboss WHERE active=1').get()) {
      if (randF() < 0.5) {
        const keys = ['dragon_lord', 'phoenix', 'elder_demon']; const k = keys[currWeek() % keys.length]; const m = MONS[k]; const hp = m.hp * 25;
        db.prepare('INSERT INTO wboss (boss_key, hp, max_hp, ends_at) VALUES (?,?,?,?)').run(k, hp, hp, now() + 3600);
        log(`🐲 ${m.name} spawn`);
      }
    }
  } catch (e) { err(e); }
}, 4 * 3600e3);
setInterval(() => {
  try {
    const ex = db.prepare('SELECT * FROM auctions WHERE ends_at<=?').all(now());
    for (const a of ex) {
      if (a.top_bidder && a.top_bid > 0) { const tax = Math.floor(a.top_bid * CFG.taxAuction); db.transaction(() => { addCoin(a.seller_id, a.top_bid - tax, 'auction'); give(a.top_bidder, a.item_key, a.qty, a.enchant); })(); }
      else give(a.seller_id, a.item_key, a.qty, a.enchant);
      db.prepare('DELETE FROM auctions WHERE id=?').run(a.id);
    }
  } catch (e) { err(e); }
}, 5 * 60e3);

// ==================== LOGIN ====================
if (!process.env.DISCORD_TOKEN) { err('❌ DISCORD_TOKEN eksik!'); process.exit(1); }
process.on('unhandledRejection', (e) => err('unhandledRejection:', e));
process.on('uncaughtException', (e) => err('uncaughtException:', e));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { log('👋'); try { db.close(); } catch {} client.destroy().finally(() => process.exit(0)); });
client.login(process.env.DISCORD_TOKEN);
