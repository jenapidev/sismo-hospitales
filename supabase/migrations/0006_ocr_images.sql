-- Cache of images already sent to OCR, so each image is processed once (cost control).
create table ocr_images (
  drive_file_id text primary key,
  processed_at timestamptz not null default now(),
  records_found int not null default 0,
  status text not null default 'ok'   -- ok | no_list | error
);
alter table ocr_images enable row level security; -- service-role only (no anon policy)
