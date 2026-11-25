-- Optional wide backdrop image behind a release card; the cover is used (blurred) when unset.
alter table public.releases add column background_url text;
