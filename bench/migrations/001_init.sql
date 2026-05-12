-- ShoeBench MySQL schema (mirrors the SQLite cache schema).
-- Run once on the target MySQL server:
--   mysql -u <user> -p <db_name> < bench/migrations/001_init.sql

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS vision_responses (
  cache_key         VARCHAR(192) NOT NULL PRIMARY KEY,
  model             VARCHAR(128) NOT NULL,
  shoe_id           VARCHAR(64)  NOT NULL,
  prompt_hash       VARCHAR(64)  NOT NULL,
  response_text     MEDIUMTEXT   NOT NULL,
  input_tokens      INT          NULL,
  output_tokens     INT          NULL,
  total_tokens      INT          NULL,
  cost              DOUBLE       NULL,
  latency_ms        INT          NULL,
  created_at        BIGINT       NOT NULL,
  image_width       INT          NULL,
  image_height      INT          NULL,
  image_size_bytes  INT          NULL,
  KEY idx_model_shoe (model, shoe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS excluded_models (
  model       VARCHAR(128) NOT NULL PRIMARY KEY,
  reason      VARCHAR(64)  NOT NULL,
  error_text  MEDIUMTEXT   NULL,
  created_at  BIGINT       NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS judge_evaluations (
  cache_key             VARCHAR(64)  NOT NULL PRIMARY KEY,
  vision_response_text  MEDIUMTEXT   NOT NULL,
  ground_truth_brand    VARCHAR(128) NOT NULL,
  ground_truth_model    VARCHAR(256) NOT NULL,
  aliases               MEDIUMTEXT   NOT NULL,        -- JSON array
  tier                  VARCHAR(32)  NOT NULL,
  score                 INT          NOT NULL,
  confidence            VARCHAR(32)  NOT NULL,
  reasoning             MEDIUMTEXT   NOT NULL,
  brand_match           TINYINT(1)   NOT NULL,
  model_match           TINYINT(1)   NOT NULL,
  judge_model           VARCHAR(128) NOT NULL,
  judge_prompt_version  VARCHAR(32)  NOT NULL,
  rubric_version        VARCHAR(32)  NOT NULL,
  raw_judge_response    MEDIUMTEXT   NOT NULL,
  input_tokens          INT          NULL,
  output_tokens         INT          NULL,
  total_tokens          INT          NULL,
  cost                  DOUBLE       NULL,
  latency_ms            INT          NULL,
  created_at            BIGINT       NOT NULL,
  KEY idx_judge_model (judge_model),
  KEY idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
