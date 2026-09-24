-- Zytrix: PostgreSQL migration baseline (phase 1).
-- PostgreSQL >= 15. Run on a private database; never expose SQL credentials in frontend.
-- Legacy ids remain TEXT to allow lossless Firebase -> PostgreSQL migration.
BEGIN;
CREATE TABLE IF NOT EXISTS migration_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz, status text NOT NULL DEFAULT 'running',
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, zytrix_id text UNIQUE, email text,
  provider text, created_at timestamptz, last_login_at timestamptz,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_uidx ON users (lower(email)) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS profiles (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL, photo_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '', created_at timestamptz,
  username_updated_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 2 AND 30),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);
CREATE TABLE IF NOT EXISTS admins (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT false, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS channels (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS streams (
  id text PRIMARY KEY, streamer_uid text REFERENCES users(id) ON DELETE SET NULL,
  channel_uid text REFERENCES channels(user_id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '', category_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'offline', viewer_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT streams_viewer_count_nonnegative CHECK (viewer_count >= 0)
);
CREATE INDEX IF NOT EXISTS streams_live_idx ON streams(viewer_count DESC, id) WHERE status='live';
CREATE INDEX IF NOT EXISTS streams_streamer_idx ON streams(streamer_uid);
CREATE TABLE IF NOT EXISTS follows (
  follower_uid text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_uid text NOT NULL REFERENCES channels(user_id) ON DELETE CASCADE,
  followed_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(follower_uid, channel_uid),
  CONSTRAINT no_self_follow CHECK (follower_uid <> channel_uid)
);
CREATE TABLE IF NOT EXISTS watch_history (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_id text NOT NULL, last_watched_at timestamptz,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(user_id, stream_id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id text NOT NULL, stream_id text NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY(stream_id, id),
  CONSTRAINT chat_max_length CHECK (char_length(body) <= 2000)
);
CREATE INDEX IF NOT EXISTS chat_messages_latest_idx ON chat_messages(stream_id, created_at DESC, id);
CREATE TABLE IF NOT EXISTS chat_bans (
  stream_id text NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz, expires_at timestamptz,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY(stream_id,user_id)
);
CREATE TABLE IF NOT EXISTS chat_config (
  stream_id text PRIMARY KEY REFERENCES streams(id) ON DELETE CASCADE,
  pinned_message_id text, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS support_alerts (
  id text NOT NULL, stream_id text NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  transaction_id text, created_at timestamptz,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY(stream_id,id)
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0, total_sent bigint NOT NULL DEFAULT 0,
  total_received bigint NOT NULL DEFAULT 0, last_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_balances_nonnegative CHECK (balance >= 0 AND total_sent >= 0 AND total_received >= 0)
);
CREATE TABLE IF NOT EXISTS zy_coin_transactions (
  id text PRIMARY KEY, sender_uid text REFERENCES users(id) ON DELETE SET NULL,
  receiver_uid text REFERENCES users(id) ON DELETE SET NULL,
  amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  transaction_type text NOT NULL DEFAULT 'transfer',
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT transaction_positive CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS coin_tx_sender_idx ON zy_coin_transactions(sender_uid,created_at DESC);
CREATE INDEX IF NOT EXISTS coin_tx_receiver_idx ON zy_coin_transactions(receiver_uid,created_at DESC);
CREATE TABLE IF NOT EXISTS zy_coin_orders (
  id text PRIMARY KEY, user_id text REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', package_id text,
  coins bigint, price_cents bigint, provider_reference text UNIQUE,
  created_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS moderation_penalties (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  type text, active boolean NOT NULL DEFAULT false, expires_at timestamptz,
  legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS moderation_actions (
  id text PRIMARY KEY, actor_uid text REFERENCES users(id) ON DELETE SET NULL,
  target_uid text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY, reporter_uid text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id text PRIMARY KEY, user_id text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz, legacy jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- Collections with rapidly evolving or rarely queried shapes. Preserve source data losslessly.
-- Change these to typed tables after source-data audit.
CREATE TABLE IF NOT EXISTS legacy_documents (
  collection_path text NOT NULL, document_id text NOT NULL,
  data jsonb NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(collection_path, document_id)
);
-- Database-only atomic gift operation; invoke solely from authenticated/authorized backend.
-- Do not grant direct frontend write access to wallets or the transaction ledger.
CREATE OR REPLACE FUNCTION transfer_zy_coins(
  p_transaction_id text, p_sender text, p_receiver text, p_amount bigint
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  IF p_sender IS NULL OR p_receiver IS NULL OR p_sender = p_receiver OR p_amount < 1 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'invalid_transfer';
  END IF;
  -- Idempotency is checked before locks; a concurrent duplicate is caught by the ledger PK.
  IF EXISTS(SELECT 1 FROM zy_coin_transactions WHERE id = p_transaction_id) THEN
    RAISE EXCEPTION 'duplicate_transfer';
  END IF;
  -- Consistent lock ordering avoids cross-wallet deadlocks.
  PERFORM 1 FROM wallets WHERE user_id IN (p_sender,p_receiver) ORDER BY user_id FOR UPDATE;
  SELECT count(*) INTO n FROM wallets WHERE user_id IN (p_sender,p_receiver);
  IF n <> 2 THEN RAISE EXCEPTION 'missing_wallet'; END IF;
  UPDATE wallets SET balance=balance-p_amount, total_sent=total_sent+p_amount,
    last_transaction_id=p_transaction_id,updated_at=now()
    WHERE user_id=p_sender AND balance>=p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
  UPDATE wallets SET balance=balance+p_amount,total_received=total_received+p_amount,
    last_transaction_id=p_transaction_id,updated_at=now() WHERE user_id=p_receiver;
  INSERT INTO zy_coin_transactions(id,sender_uid,receiver_uid,amount,transaction_type)
    VALUES(p_transaction_id,p_sender,p_receiver,p_amount,'transfer');
END $$;
COMMIT;
