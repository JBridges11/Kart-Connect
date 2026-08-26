alter table karts add column if not exists chassis_stiffness text check (chassis_stiffness in ('Standard', 'Hard', 'Soft'));
alter table karts add column if not exists engines jsonb default '[]'::jsonb;
