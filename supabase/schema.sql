create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'user_id'
  ) then
    alter table public.products add column user_id uuid;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'user_id'
  ) then
    alter table public.transactions add column user_id uuid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'products'
      and constraint_name = 'products_user_id_fkey'
  ) then
    alter table public.products
      add constraint products_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'transactions'
      and constraint_name = 'transactions_user_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'transactions'
      and constraint_name = 'transactions_product_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_product_id_fkey
      foreign key (product_id) references public.products(id) on delete cascade;
  end if;
end
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  status text not null check (status in ('Good', 'Low', 'Critical')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'products'
      and constraint_type = 'UNIQUE'
      and constraint_name = 'products_name_key'
  ) then
    alter table public.products drop constraint products_name_key;
  end if;
end
$$;

create unique index if not exists products_user_id_name_key on public.products (user_id, lower(name));
create index if not exists products_user_id_idx on public.products (user_id);
create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_product_id_idx on public.transactions (product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "products read/write" on public.products;
create policy "products read/write"
on public.products
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "transactions read/write" on public.transactions;
create policy "transactions read/write"
on public.transactions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "transactions read own product" on public.transactions;
create policy "transactions read own product"
on public.transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.products
    where public.products.id = transactions.product_id
      and public.products.user_id = auth.uid()
  )
);
