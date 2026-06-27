-- Allow EUR as a currency for colectas (goal) and donaciones.
alter table colectas drop constraint if exists colectas_currency_check;
alter table colectas add constraint colectas_currency_check
  check (currency in ('Bs','USD','EUR'));

alter table donaciones drop constraint if exists donaciones_currency_check;
alter table donaciones add constraint donaciones_currency_check
  check (currency in ('Bs','USD','EUR'));
