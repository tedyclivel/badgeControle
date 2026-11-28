-- Structures métier uniquement. Les RPC, déclencheurs de détection et politiques
-- détaillées sont introduits dans les étapes dédiées.

create type public.badge_status as enum ('ACTIVE', 'SUSPENDED', 'LOST', 'REVOKED');
create type public.qr_code_status as enum ('PREPARED', 'CONSUMED', 'CANCELLED');
create type public.qr_attempt_result as enum ('ACCEPTED', 'ALREADY_CONSUMED', 'EXPIRED', 'BADGE_INACTIVE', 'DEVICE_UNAUTHORIZED', 'CHECKPOINT_INVALID', 'CODE_NOT_FOUND');
create type public.clock_status as enum ('TRUSTED', 'CORRECTED', 'UNRELIABLE');
create type public.passage_validation_status as enum ('ACCEPTED', 'REJECTED', 'REVIEW');
create type public.passage_sync_status as enum ('RECEIVED', 'PROCESSED');
create type public.schedule_exception_type as enum ('HOLIDAY', 'EXCUSED_ABSENCE', 'EARLY_EXIT');
create type public.anomaly_type as enum ('MISSING', 'OUTSIDE_WINDOW', 'UNEXPECTED_CHECKPOINT', 'DUPLICATE_SCAN', 'UNRELIABLE_CLOCK', 'QR_DUPLICATION');
create type public.anomaly_status as enum ('OPEN', 'RESOLVED');
create type public.outgoing_message_status as enum ('PENDING', 'SIMULATED', 'SUPPRESSED', 'FAILED');
create type public.summary_source as enum ('MODEL', 'TEMPLATE');

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  agent_id uuid not null,
  label text not null check (char_length(trim(label)) between 2 and 120),
  active boolean not null default true,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id), unique (school_id, label),
  foreign key (agent_id, school_id) references public.profiles (id, school_id) on delete restrict
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  public_key jsonb not null check (jsonb_typeof(public_key) = 'object'),
  key_fingerprint text not null check (key_fingerprint ~ '^[0-9a-f]{64}$'),
  status public.badge_status not null default 'ACTIVE',
  issued_at timestamptz not null default now(), revoked_at timestamptz,
  replaces_badge_id uuid references public.badges (id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, school_id), unique (key_fingerprint),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete restrict
);
create unique index badges_one_active_per_student on public.badges (student_id) where status = 'ACTIVE';

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, badge_id uuid not null, sequence_number integer not null check (sequence_number > 0),
  signed_payload jsonb not null check (jsonb_typeof(signed_payload) = 'object'),
  signature_base64 text not null check (char_length(signature_base64) > 20),
  valid_from timestamptz not null, valid_until timestamptz not null,
  status public.qr_code_status not null default 'PREPARED', consumed_at timestamptz,
  consumer_device_id uuid, consumer_checkpoint_id uuid,
  created_at timestamptz not null default now(),
  check (valid_until > valid_from), check (valid_until <= valid_from + interval '5 minutes'),
  unique (id, school_id), unique (badge_id, sequence_number),
  foreign key (badge_id, school_id) references public.badges (id, school_id) on delete restrict,
  foreign key (consumer_device_id, school_id) references public.devices (id, school_id) on delete restrict,
  foreign key (consumer_checkpoint_id, school_id) references public.checkpoints (id, school_id) on delete restrict
);

create table public.qr_attempts (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, qr_code_id uuid not null,
  badge_id uuid not null, device_id uuid not null, checkpoint_id uuid not null, agent_id uuid not null,
  result public.qr_attempt_result not null, attempted_at timestamptz not null default now(),
  foreign key (qr_code_id, school_id) references public.qr_codes (id, school_id),
  foreign key (badge_id, school_id) references public.badges (id, school_id),
  foreign key (device_id, school_id) references public.devices (id, school_id),
  foreign key (checkpoint_id, school_id) references public.checkpoints (id, school_id),
  foreign key (agent_id, school_id) references public.profiles (id, school_id)
);

create table public.passages (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, student_id uuid not null,
  badge_id uuid not null, qr_code_id uuid not null, checkpoint_id uuid not null, device_id uuid not null, agent_id uuid not null,
  local_event_id uuid not null, challenge_id uuid not null, local_time timestamptz not null,
  server_received_at timestamptz not null default now(), effective_time timestamptz,
  clock_status public.clock_status not null default 'TRUSTED', validation_status public.passage_validation_status not null,
  sync_status public.passage_sync_status not null default 'RECEIVED', payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  proof jsonb not null default '{}'::jsonb check (jsonb_typeof(proof) = 'object'),
  unique (device_id, local_event_id), unique (device_id, challenge_id),
  foreign key (student_id, school_id) references public.students (id, school_id), foreign key (badge_id, school_id) references public.badges (id, school_id),
  foreign key (qr_code_id, school_id) references public.qr_codes (id, school_id), foreign key (checkpoint_id, school_id) references public.checkpoints (id, school_id),
  foreign key (device_id, school_id) references public.devices (id, school_id), foreign key (agent_id, school_id) references public.profiles (id, school_id)
);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools (id) on delete cascade,
  student_id uuid, day date not null, type public.schedule_exception_type not null,
  reason text check (reason is null or char_length(trim(reason)) <= 500), created_at timestamptz not null default now(),
  foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade,
  check ((type = 'HOLIDAY' and student_id is null) or (type <> 'HOLIDAY' and student_id is not null)),
  unique nulls not distinct (school_id, student_id, day, type)
);

create table public.anomalies (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, student_id uuid not null,
  passage_id uuid references public.passages (id) on delete set null, time_window_id uuid references public.time_windows (id) on delete set null,
  day date not null, type public.anomaly_type not null, status public.anomaly_status not null default 'OPEN',
  dedup_key text not null, detected_at timestamptz not null default now(), resolved_at timestamptz,
  unique (school_id, dedup_key), foreign key (student_id, school_id) references public.students (id, school_id)
);

create table public.outgoing_messages (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, student_id uuid not null, parent_id uuid not null,
  anomaly_id uuid not null references public.anomalies (id) on delete cascade, day date not null,
  text text not null check (char_length(trim(text)) between 1 and 500), status public.outgoing_message_status not null,
  suppression_reason text, created_at timestamptz not null default now(), unique (anomaly_id, parent_id),
  foreign key (student_id, school_id) references public.students (id, school_id), foreign key (parent_id, school_id) references public.profiles (id, school_id)
);

create table public.daily_summaries (
  id uuid primary key default gen_random_uuid(), school_id uuid not null, class_id uuid not null, day date not null,
  facts jsonb not null check (jsonb_typeof(facts) = 'object'), text text not null, source public.summary_source not null,
  fallback_reason text, request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'), created_at timestamptz not null default now(),
  unique (school_id, request_hash), foreign key (class_id, school_id) references public.classes (id, school_id)
);
create table public.ai_call_logs (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools (id) on delete cascade,
  summary_id uuid references public.daily_summaries (id) on delete set null, request_hash text not null, attempt smallint not null check (attempt between 1 and 2),
  model text not null, input_tokens integer not null check (input_tokens >= 0), output_tokens integer not null check (output_tokens >= 0),
  estimated_cost numeric(12,6) not null check (estimated_cost >= 0), status text not null, created_at timestamptz not null default now()
);
create table public.ai_budgets (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools (id) on delete cascade,
  period_start date not null, limit_amount numeric(12,6) not null check (limit_amount >= 0), reserved_amount numeric(12,6) not null default 0 check (reserved_amount >= 0),
  spent_amount numeric(12,6) not null default 0 check (spent_amount >= 0), currency char(3) not null default 'USD', unique (school_id, period_start)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null, action text not null, resource_type text not null, resource_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'), created_at timestamptz not null default now()
);

create index passages_student_time_idx on public.passages (school_id, student_id, effective_time);
create index anomalies_student_day_idx on public.anomalies (school_id, student_id, day);
create index outgoing_messages_limit_idx on public.outgoing_messages (student_id, day, status);

alter table public.devices enable row level security;
alter table public.badges enable row level security;
alter table public.qr_codes enable row level security;
alter table public.qr_attempts enable row level security;
alter table public.passages enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.anomalies enable row level security;
alter table public.outgoing_messages enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.ai_call_logs enable row level security;
alter table public.ai_budgets enable row level security;
alter table public.audit_logs enable row level security;
