-- ENDLESS PostgreSQL schema
-- Run once against DATABASE_URL before starting the bot.

CREATE TABLE IF NOT EXISTS endless_worlds (
  guild_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS endless_accounts (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  global_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS endless_players (
  world_id TEXT NOT NULL REFERENCES endless_worlds(guild_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES endless_accounts(user_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

CREATE TABLE IF NOT EXISTS endless_wallets (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wallet_coins BIGINT NOT NULL DEFAULT 0 CHECK (wallet_coins >= 0),
  bank_coins BIGINT NOT NULL DEFAULT 0 CHECK (bank_coins >= 0),
  wallet_gems BIGINT NOT NULL DEFAULT 0 CHECK (wallet_gems >= 0),
  bank_gems BIGINT NOT NULL DEFAULT 0 CHECK (bank_gems >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS endless_ledger (
  id BIGSERIAL PRIMARY KEY,
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('coin', 'gem')),
  wallet_delta BIGINT NOT NULL DEFAULT 0,
  bank_delta BIGINT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS endless_daily_claims (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  claim_date DATE NOT NULL,
  streak INTEGER NOT NULL CHECK (streak >= 1),
  coins_awarded BIGINT NOT NULL DEFAULT 0,
  gems_awarded BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, claim_date)
);

CREATE TABLE IF NOT EXISTS endless_daily_quest_progress (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  quest_date DATE NOT NULL,
  quest_key TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (world_id, user_id, quest_date, quest_key)
);

CREATE TABLE IF NOT EXISTS endless_adventure_state (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cooldown_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

CREATE TABLE IF NOT EXISTS endless_dungeon_state (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  run_number INTEGER NOT NULL DEFAULT 0,
  dungeon_key TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1,
  player_hp INTEGER NOT NULL,
  enemy_hp INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cleared', 'defeated', 'retreated')),
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

CREATE TABLE IF NOT EXISTS endless_dungeon_actions (
  id BIGSERIAL PRIMARY KEY,
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  run_number INTEGER NOT NULL,
  interaction_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('enter', 'fight', 'retreat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (world_id, user_id, interaction_id)
);

CREATE TABLE IF NOT EXISTS endless_inventory (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, item_key)
);

CREATE TABLE IF NOT EXISTS endless_equipment (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('weapon', 'armor', 'charm')),
  item_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, slot),
  UNIQUE (world_id, user_id, item_key)
);

CREATE TABLE IF NOT EXISTS endless_item_uses (
  id BIGSERIAL PRIMARY KEY,
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  interaction_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (world_id, user_id, interaction_id)
);

CREATE INDEX IF NOT EXISTS endless_players_world_level_idx ON endless_players (world_id, level DESC, xp DESC);
CREATE INDEX IF NOT EXISTS endless_ledger_player_idx ON endless_ledger (world_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS endless_quest_date_idx ON endless_daily_quest_progress (world_id, user_id, quest_date);

-- One-time compatibility migration from the previous internal table names.
DO $$
BEGIN
  IF to_regclass('public.endless_owo_state') IS NOT NULL AND to_regclass('public.endless_collection_state') IS NULL THEN
    ALTER TABLE endless_owo_state RENAME TO endless_collection_state;
  END IF;
  IF to_regclass('public.endless_owo_animals') IS NOT NULL AND to_regclass('public.endless_collection_animals') IS NULL THEN
    ALTER TABLE endless_owo_animals RENAME TO endless_collection_animals;
  END IF;
END $$;

-- ENDLESS collection and social systems.
-- These tables contain original ENDLESS implementations, not copied source code.
CREATE TABLE IF NOT EXISTS endless_collection_state (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  hunt_until TIMESTAMPTZ,
  pray_until TIMESTAMPTZ,
  gamble_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS endless_collection_animals (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  animal_key TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, animal_key),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

-- Her oyuncu günde yalnızca bir kez ücretsiz Endless Şans Çarkı çevirebilir.
-- Tarihi veritabanında tuttuğumuz için bot yeniden başlasa bile hak sıfırlanmaz.
CREATE TABLE IF NOT EXISTS endless_daily_spins (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  spin_date DATE NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('coin', 'gem')),
  reward_amount BIGINT NOT NULL CHECK (reward_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, spin_date),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

-- Bir başarımın ödülü aynı oyuncuya aynı dünyada yalnızca bir kez verilir.
CREATE TABLE IF NOT EXISTS endless_achievement_claims (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id, achievement_key),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

-- Her oyuncunun her dünyada bir adet özgün yoldaşı olur.
CREATE TABLE IF NOT EXISTS endless_pets (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('fox', 'dragon', 'owl', 'slime')),
  pet_name TEXT NOT NULL,
  loyalty INTEGER NOT NULL DEFAULT 1 CHECK (loyalty BETWEEN 1 AND 100),
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id),
  FOREIGN KEY (world_id, user_id) REFERENCES endless_players(world_id, user_id) ON DELETE CASCADE
);

-- Sunucudaki bütün oyuncuların birlikte savaştığı ortak Dünya Boss'u.
CREATE TABLE IF NOT EXISTS endless_world_events (
  world_id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  boss_name TEXT NOT NULL,
  max_hp INTEGER NOT NULL CHECK (max_hp > 0),
  current_hp INTEGER NOT NULL CHECK (current_hp >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'defeated')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  defeated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS endless_world_event_contributions (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  damage BIGINT NOT NULL DEFAULT 0 CHECK (damage >= 0),
  attacks INTEGER NOT NULL DEFAULT 0 CHECK (attacks >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

-- Coin bahisli Arena düellolarının kalıcı rating ve galibiyet istatistikleri.
CREATE TABLE IF NOT EXISTS endless_arena_stats (
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000 CHECK (rating >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (world_id, user_id)
);

CREATE TABLE IF NOT EXISTS endless_arena_matches (
  id BIGSERIAL PRIMARY KEY,
  world_id TEXT NOT NULL,
  interaction_id TEXT NOT NULL UNIQUE,
  winner_id TEXT NOT NULL,
  loser_id TEXT NOT NULL,
  wager BIGINT NOT NULL CHECK (wager > 0),
  winner_score INTEGER NOT NULL,
  loser_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS endless_collection_animals_rarity_idx ON endless_collection_animals (world_id, user_id, rarity);
