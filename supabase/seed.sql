-- Dev seed: same 6 trucks as the mock. Run after the migration.
insert into public.trucks (name, zone, status, queue_est, lat, lng) values
  ('Truck 01', 'สยามสแควร์', 'available', 3, 13.744696, 100.535389),
  ('Truck 02', 'MBK', 'busy', 8, 13.741983, 100.530296),
  ('Truck 03', 'จุฬาลงกรณ์ฯ', 'available', 1, 13.747182, 100.529833),
  ('Truck 04', 'สามย่าน', 'available', 4, 13.741079, 100.535667),
  ('Truck 05', 'เซ็นทรัลเวิลด์', 'available', 2, 13.746730, 100.538630),
  ('Truck 06', 'ลุมพินี', 'offline', 0, 13.740085, 100.532380);
