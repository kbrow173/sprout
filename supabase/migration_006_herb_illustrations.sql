-- Migration 006: give basil/rosemary/thyme/parsley/chives/mint their own
-- illustration variants instead of sharing one generic 'herb' icon — they
-- were visually identical (user-flagged: "the plants don't resemble the
-- plants they are trying to portray"). components/PlantIllustration.tsx and
-- lib/anthropic.ts's ILLUSTRATION_KEYS now support the six new keys; this
-- backfills rows that were created before those keys existed.
--
-- Two tables need it: species_care (the care knowledge base) AND plants
-- (which denormalizes illustration_key at add-time so a plant keeps its
-- look even if its species record changes later — see schema.sql's comment
-- on that column). Updating only species_care would leave every
-- already-added plant showing the old shared icon forever.
--
-- Idempotent: every UPDATE is guarded by `illustration_key = 'herb'`, so a
-- second run is a no-op, and a row someone has since hand-customized away
-- from 'herb' is left alone.

update species_care set illustration_key = 'basil'
  where lower(scientific_name) = 'ocimum basilicum' and illustration_key = 'herb';
update species_care set illustration_key = 'rosemary'
  where lower(scientific_name) = 'salvia rosmarinus' and illustration_key = 'herb';
update species_care set illustration_key = 'thyme'
  where lower(scientific_name) = 'thymus vulgaris' and illustration_key = 'herb';
update species_care set illustration_key = 'parsley'
  where lower(scientific_name) = 'petroselinum crispum' and illustration_key = 'herb';
update species_care set illustration_key = 'chives'
  where lower(scientific_name) = 'allium schoenoprasum' and illustration_key = 'herb';
-- Genus-prefix match (not one exact name): covers spearmint, peppermint, and
-- any other Mentha species Claude generates on demand, e.g. "Mentha × piperita".
update species_care set illustration_key = 'mint'
  where lower(scientific_name) like 'mentha%' and illustration_key = 'herb';

update plants set illustration_key = 'basil'
  where lower(scientific_name) = 'ocimum basilicum' and illustration_key = 'herb';
update plants set illustration_key = 'rosemary'
  where lower(scientific_name) = 'salvia rosmarinus' and illustration_key = 'herb';
update plants set illustration_key = 'thyme'
  where lower(scientific_name) = 'thymus vulgaris' and illustration_key = 'herb';
update plants set illustration_key = 'parsley'
  where lower(scientific_name) = 'petroselinum crispum' and illustration_key = 'herb';
update plants set illustration_key = 'chives'
  where lower(scientific_name) = 'allium schoenoprasum' and illustration_key = 'herb';
update plants set illustration_key = 'mint'
  where lower(scientific_name) like 'mentha%' and illustration_key = 'herb';
