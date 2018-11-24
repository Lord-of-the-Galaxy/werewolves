BEGIN TRANSACTION;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  user_id char(21) not null primary key,
  emoji varchar(18) not null unique,
  alive boolean not null default 1
);

COMMIT;
