-- Studydrive-Klon: Datenbankschema
-- In der Supabase SQL-Konsole (Dashboard -> SQL Editor) ausfuehren

-- Zusatzfelder zu Supabase Auth Users
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  university text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select
  using (true);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Dokumente
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text not null,
  university text not null,
  document_type text not null check (document_type in ('Skript', 'Zusammenfassung', 'Klausur', 'Uebung')),
  file_url text not null,
  uploader_id uuid not null references public.users (id) on delete cascade,
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Documents are viewable by everyone"
  on public.documents for select
  using (true);

create policy "Authenticated users can upload documents"
  on public.documents for insert
  with check (auth.uid() = uploader_id);

create policy "Uploaders can update their own documents"
  on public.documents for update
  using (auth.uid() = uploader_id);

create policy "Uploaders can delete their own documents"
  on public.documents for delete
  using (auth.uid() = uploader_id);

-- Bewertungen
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Authenticated users can rate documents"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete
  using (auth.uid() = user_id);

-- Favoriten (optional, spaeter)
create table if not exists public.favorites (
  user_id uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  primary key (user_id, document_id)
);

alter table public.favorites enable row level security;

create policy "Users can view their own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can add their own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Legt bei der Registrierung automatisch ein public.users-Profil an
-- (display_name / university kommen aus supabase.auth.signUp({ options: { data: {...} } }))
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name, university)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'university'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage-Bucket fuer hochgeladene Dokumente (Skripte, Zusammenfassungen, Klausuren, Uebungen)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Anyone can view files in the documents bucket" on storage.objects;
create policy "Anyone can view files in the documents bucket"
  on storage.objects for select
  using (bucket_id = 'documents');

drop policy if exists "Authenticated users can upload to their own folder" on storage.objects;
create policy "Authenticated users can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own files" on storage.objects;
create policy "Users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Erhoeht den Download-Zaehler eines Dokuments, unabhaengig vom Uploader
-- (security definer, damit auch Nicht-Uploader herunterladen und zaehlen koennen)
create or replace function public.increment_download_count(doc_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.documents
  set download_count = download_count + 1
  where id = doc_id;
end;
$$;

grant execute on function public.increment_download_count(uuid) to anon, authenticated;

-- Freemium-Logik: jeder Nutzer startet mit 3 kostenlosen Downloads,
-- jeder eigene Upload schaltet 5 weitere Downloads frei.
alter table public.users
  add column if not exists download_credits int not null default 3;

create or replace function public.grant_upload_credits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.users
  set download_credits = download_credits + 5
  where id = new.uploader_id;
  return new;
end;
$$;

drop trigger if exists on_document_uploaded on public.documents;

create trigger on_document_uploaded
  after insert on public.documents
  for each row execute function public.grant_upload_credits();

-- Verbraucht beim Download eines fremden Dokuments ein Guthaben-Credit.
-- Eigene Dokumente sind immer kostenlos herunterladbar.
-- Gibt true zurueck bei Erfolg, false wenn keine Credits mehr uebrig sind.
create or replace function public.consume_download(doc_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_uploader_id uuid;
  v_credits int;
begin
  select uploader_id into v_uploader_id from public.documents where id = doc_id;

  if v_uploader_id is null then
    raise exception 'document_not_found';
  end if;

  if auth.uid() = v_uploader_id then
    update public.documents set download_count = download_count + 1 where id = doc_id;
    return true;
  end if;

  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select download_credits into v_credits
  from public.users
  where id = auth.uid()
  for update;

  if v_credits is null or v_credits <= 0 then
    return false;
  end if;

  update public.users set download_credits = download_credits - 1 where id = auth.uid();
  update public.documents set download_count = download_count + 1 where id = doc_id;

  return true;
end;
$$;

grant execute on function public.consume_download(uuid) to authenticated;

-- =====================================================================
-- Onboarding: Unis, Studiengaenge, Lernraeume (Fach-Lernraeume), Warteliste
-- =====================================================================

-- Universitaeten (phasierter Launch: nur is_active=true ist im Onboarding waehlbar)
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Studiengaenge je Uni
create table if not exists public.study_programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (university_id, name)
);

-- Onboarding-Felder + Admin-Flag an users
alter table public.users
  add column if not exists university_id uuid references public.universities (id),
  add column if not exists study_program_id uuid references public.study_programs (id),
  add column if not exists start_semester_type text check (start_semester_type in ('WiSe', 'SoSe')),
  add column if not exists start_semester_year int,
  add column if not exists degree_goal text check (degree_goal in ('Bachelor', 'Master')),
  add column if not exists avatar_url text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

alter table public.universities enable row level security;

create policy "Active universities are visible to everyone"
  on public.universities for select
  using (is_active = true);

create policy "Admins can manage universities"
  on public.universities for all
  using (public.is_admin())
  with check (public.is_admin());

alter table public.study_programs enable row level security;

create policy "Study programs are visible to everyone"
  on public.study_programs for select
  using (true);

create policy "Admins can manage study programs"
  on public.study_programs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Lernraeume: gehoeren zur Uni (nicht strikt an einen Studiengang gebunden),
-- damit z.B. "Mathe 1" von mehreren Studiengaengen geteilt werden kann.
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  name text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "Subjects are visible to everyone"
  on public.subjects for select
  using (true);

create policy "Authenticated users can create subjects"
  on public.subjects for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Admins can manage subjects"
  on public.subjects for all
  using (public.is_admin())
  with check (public.is_admin());

-- Verknuepfung: welche Lernraeume gehoeren ueblicherweise zu welchem
-- Studiengang in welchem Fachsemester (Grundlage fuer die Vorschlaege in Onboarding-Schritt 6)
create table if not exists public.study_program_subjects (
  study_program_id uuid not null references public.study_programs (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  semester int not null,
  primary key (study_program_id, subject_id, semester)
);

alter table public.study_program_subjects enable row level security;

create policy "Study program subjects are visible to everyone"
  on public.study_program_subjects for select
  using (true);

create policy "Authenticated users can link subjects to a study program"
  on public.study_program_subjects for insert
  to authenticated
  with check (true);

create policy "Admins can manage study program subjects"
  on public.study_program_subjects for all
  using (public.is_admin())
  with check (public.is_admin());

-- Welche Lernraeume ein Nutzer aktiv verfolgt (aus Onboarding-Schritt 6 oder spaeter manuell)
create table if not exists public.user_subjects (
  user_id uuid not null references public.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);

alter table public.user_subjects enable row level security;

create policy "Users can view their own subjects"
  on public.user_subjects for select
  using (auth.uid() = user_id);

create policy "Users can add their own subjects"
  on public.user_subjects for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own subjects"
  on public.user_subjects for delete
  using (auth.uid() = user_id);

-- Aggregierte Mitgliederzahl pro Lernraum, ohne einzelne Mitgliedschaften
-- oeffentlich zu machen (Grundlage fuer "meiste Nutzer zuerst" bei der Lernraum-Suche).
create or replace function public.subject_member_counts()
returns table (subject_id uuid, member_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select subject_id, count(*)::bigint as member_count
  from public.user_subjects
  group by subject_id;
$$;

grant execute on function public.subject_member_counts() to anon, authenticated;

-- Warteliste fuer noch nicht freigeschaltete Unis (Signal fuer die Launch-Reihenfolge)
create table if not exists public.university_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  university_name text not null,
  created_at timestamptz not null default now()
);

alter table public.university_waitlist enable row level security;

create policy "Anyone can join the waitlist"
  on public.university_waitlist for insert
  with check (true);

create policy "Admins can view the waitlist"
  on public.university_waitlist for select
  using (public.is_admin());

create policy "Admins can delete waitlist entries"
  on public.university_waitlist for delete
  using (public.is_admin());

-- Storage-Bucket fuer Profilbilder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Anyone can view avatar files" on storage.objects;
create policy "Anyone can view avatar files"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- Sicherheitsfix: "Users can update their own profile" erlaubt per RLS nur
-- die eigene ZEILE, aber keine Spalten-Einschraenkung. Ohne diesen Fix
-- koennte sich jeder eingeloggte Nutzer selbst is_admin=true oder beliebig
-- viele download_credits setzen. RLS kann Spalten nicht einschraenken,
-- daher hier Spalten-Rechte (GRANT) statt Policy.
-- =====================================================================
revoke update on public.users from authenticated;

grant update (
  display_name,
  university,
  avatar_url,
  university_id,
  study_program_id,
  start_semester_type,
  start_semester_year,
  degree_goal,
  onboarding_completed_at
) on public.users to authenticated;

-- =====================================================================
-- Dokumente an Lernraeume (subjects) anbinden, statt nur Freitext-Fach.
-- Die alten Freitext-Spalten (subject/university) bleiben bestehen und
-- werden weiterhin mitgefuellt (Anzeige-Fallback fuer alte Dokumente).
-- =====================================================================
alter table public.documents
  add column if not exists subject_id uuid references public.subjects (id);

-- =====================================================================
-- Anonymer Upload: Anzeige-Flag, das den echten Namen des Uploaders in
-- der UI durch "Anonymer Nutzer" ersetzt. uploader_id bleibt intern
-- gesetzt (fuer Credits, eigene-Dokument-Logik etc.), nur die Anzeige
-- wird maskiert.
-- =====================================================================
alter table public.documents
  add column if not exists is_anonymous boolean not null default false;

-- =====================================================================
-- Diskussion / Fragen: sowohl pro Lernraum (subject_id gesetzt) als auch
-- als allgemeine Community (subject_id = null). Flache Kommentare
-- (kein verschachteltes Threading), optional mit angehaengter Umfrage.
-- =====================================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  is_anonymous boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Posts are visible to everyone"
  on public.posts for select
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Authors can update their own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "Authors can delete their own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  is_anonymous boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "Comments are visible to everyone"
  on public.post_comments for select
  using (true);

create policy "Authenticated users can comment"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Authors can update their own comments"
  on public.post_comments for update
  using (auth.uid() = author_id);

create policy "Authors can delete their own comments"
  on public.post_comments for delete
  using (auth.uid() = author_id);

-- Umfragen: optional an einen Post angehaengt (ein Post -> maximal eine Umfrage)
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;

create policy "Polls are visible to everyone"
  on public.polls for select
  using (true);

create policy "Post authors can create a poll for their post"
  on public.polls for insert
  to authenticated
  with check (
    exists (
      select 1 from public.posts
      where posts.id = post_id and posts.author_id = auth.uid()
    )
  );

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  position int not null default 0
);

alter table public.poll_options enable row level security;

create policy "Poll options are visible to everyone"
  on public.poll_options for select
  using (true);

create policy "Poll owners can add options"
  on public.poll_options for insert
  to authenticated
  with check (
    exists (
      select 1 from public.polls
      join public.posts on posts.id = polls.post_id
      where polls.id = poll_id and posts.author_id = auth.uid()
    )
  );

-- Stimmen: nicht oeffentlich einsehbar (wer wie abgestimmt hat bleibt privat),
-- nur aggregierte Zaehlung ueber die Funktion unten. Ein Vote pro Nutzer/Umfrage.
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.poll_votes enable row level security;

create policy "Users can view their own vote"
  on public.poll_votes for select
  using (auth.uid() = user_id);

create policy "Users can cast their own vote"
  on public.poll_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can change their own vote"
  on public.poll_votes for update
  using (auth.uid() = user_id);

create or replace function public.poll_option_counts(p_poll_id uuid)
returns table (option_id uuid, vote_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select option_id, count(*)::bigint as vote_count
  from public.poll_votes
  where poll_id = p_poll_id
  group by option_id;
$$;

grant execute on function public.poll_option_counts(uuid) to anon, authenticated;

-- =====================================================================
-- Stories: verschwinden automatisch nach 24h (Select-Policy blendet
-- aeltere Zeilen aus, kein Cleanup-Job noetig fuer den Start).
-- =====================================================================
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.stories enable row level security;

create policy "Stories from the last 24h are visible to everyone"
  on public.stories for select
  using (created_at > now() - interval '24 hours');

create policy "Authenticated users can create stories"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Authors can delete their own stories"
  on public.stories for delete
  using (auth.uid() = author_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stories', 'stories', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Anyone can view story files" on storage.objects;
create policy "Anyone can view story files"
  on storage.objects for select
  using (bucket_id = 'stories');

drop policy if exists "Users can upload their own story" on storage.objects;
create policy "Users can upload their own story"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own story file" on storage.objects;
create policy "Users can delete their own story file"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'stories'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- Bilder in Posts
-- =====================================================================
alter table public.posts
  add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Anyone can view post images" on storage.objects;
create policy "Anyone can view post images"
  on storage.objects for select
  using (bucket_id = 'posts');

drop policy if exists "Users can upload their own post image" on storage.objects;
create policy "Users can upload their own post image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own post image" on storage.objects;
create policy "Users can delete their own post image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- Beitraege speichern (Bookmark)
-- =====================================================================
create table if not exists public.post_bookmarks (
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_bookmarks enable row level security;

create policy "Users can view their own bookmarks"
  on public.post_bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can add their own bookmarks"
  on public.post_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own bookmarks"
  on public.post_bookmarks for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- Professor + Pruefungstermin am Lernraum, von Studierenden pflegbar.
-- Spalten-Rechte statt Zeilen-Policy, damit nicht ueber denselben Weg
-- auch Name/Uni des Lernraums veraendert werden kann (vgl. Fix oben bei
-- public.users).
-- =====================================================================
alter table public.subjects
  add column if not exists professor_name text,
  add column if not exists next_exam_date date;

create policy "Authenticated users can edit professor and exam date"
  on public.subjects for update
  to authenticated
  using (true)
  with check (true);

grant update (professor_name, next_exam_date) on public.subjects to authenticated;

-- =====================================================================
-- Persoenlicher Stundenplan (rein privat, jeder pflegt seinen eigenen)
-- =====================================================================
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  category text not null default 'Sonstiges',
  event_date date not null,
  start_time time not null,
  end_time time not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.schedule_events enable row level security;

create policy "Users can view their own schedule"
  on public.schedule_events for select
  using (auth.uid() = user_id);

create policy "Users can add their own schedule events"
  on public.schedule_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own schedule events"
  on public.schedule_events for update
  using (auth.uid() = user_id);

create policy "Users can delete their own schedule events"
  on public.schedule_events for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- Stundenplan: wiederkehrende Termine uebers ganze Semester + Ausnahmen
-- (z.B. "diese eine Uebung faellt aus"), zusaetzlich zu Einzelterminen.
-- =====================================================================
alter table public.schedule_events
  alter column event_date drop not null;

alter table public.schedule_events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists day_of_week int,
  add column if not exists semester_start date,
  add column if not exists semester_end date;

alter table public.schedule_events
  drop constraint if exists schedule_events_shape_check;

alter table public.schedule_events
  add constraint schedule_events_shape_check check (
    (is_recurring = false and event_date is not null)
    or
    (is_recurring = true and day_of_week between 0 and 6
      and semester_start is not null and semester_end is not null)
  );

create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  schedule_event_id uuid not null references public.schedule_events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  exception_date date not null,
  created_at timestamptz not null default now(),
  unique (schedule_event_id, exception_date)
);

alter table public.schedule_exceptions enable row level security;

create policy "Users can view their own schedule exceptions"
  on public.schedule_exceptions for select
  using (auth.uid() = user_id);

create policy "Users can add their own schedule exceptions"
  on public.schedule_exceptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own schedule exceptions"
  on public.schedule_exceptions for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- Freunde-System (folgen), Grundlage fuer Personensuche und spaeter den
-- "Neu"-Feed-Tab.
-- =====================================================================
create table if not exists public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followed_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

alter table public.follows enable row level security;

create policy "Follows are visible to everyone"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- =====================================================================
-- Gruppen: eigenstaendiges Konzept, unabhaengig von Kursen/Lernraeumen
-- (Vereine, Hobby-Gruppen etc.), jede mit eigenem Feed + Mitgliedern.
-- university_id ist nur Kontext-Info ("Formula Student @ HSD"), schraenkt
-- die Mitgliedschaft NICHT ein - Gruppen sind uni-uebergreifend beitretbar.
-- =====================================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  university_id uuid references public.universities (id) on delete set null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Groups are visible to everyone"
  on public.groups for select
  using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Creators can update their own groups"
  on public.groups for update
  using (auth.uid() = created_by);

create policy "Creators can delete their own groups"
  on public.groups for delete
  using (auth.uid() = created_by);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "Group members are visible to everyone"
  on public.group_members for select
  using (true);

create policy "Users can join groups themselves"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups themselves"
  on public.group_members for delete
  using (auth.uid() = user_id);

-- Posts koennen jetzt auch einer Gruppe gehoeren (statt Lernraum oder
-- allgemeiner Community). Nie beides gleichzeitig.
alter table public.posts
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

alter table public.posts
  drop constraint if exists posts_single_scope_check;

alter table public.posts
  add constraint posts_single_scope_check check (
    not (subject_id is not null and group_id is not null)
  );

-- =====================================================================
-- Erinnerungen: Stundenplan-Eintraege koennen als "erinnere mich"
-- markiert werden, damit sie im Dashboard-Reminder-Widget auftauchen.
-- =====================================================================
alter table public.schedule_events
  add column if not exists remind_me boolean not null default false;

-- =====================================================================
-- Direktnachrichten: 1:1-Chat zwischen zwei Nutzern. user_a < user_b
-- (Text-Vergleich der uuids) sorgt dafuer, dass es pro Nutzerpaar nur
-- eine Konversation gibt, egal wer sie startet.
-- =====================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.users (id) on delete cascade,
  user_b uuid not null references public.users (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user_a <> user_b),
  constraint conversations_ordered_users check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.conversations enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Erstellung/Nachschlagen laeuft ausschliesslich ueber die Funktion unten,
-- daher keine Insert-Policy fuer normale Nutzer noetig.

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.direct_messages enable row level security;

create policy "Participants can view messages in their conversations"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "Participants can send messages in their conversations"
  on public.direct_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- "Gelesen"-Status wird ausschliesslich ueber mark_conversation_read()
-- gesetzt (keine generelle Update-Policy), damit niemand fremde
-- Nachrichteninhalte veraendern kann.

create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = other_user_id then
    raise exception 'cannot message yourself';
  end if;

  if me < other_user_id then
    a := me; b := other_user_id;
  else
    a := other_user_id; b := me;
  end if;

  select id into conv_id from public.conversations where user_a = a and user_b = b;

  if conv_id is null then
    insert into public.conversations (user_a, user_b) values (a, b) returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ) then
    raise exception 'not a participant';
  end if;

  update public.direct_messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.unread_message_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select dm.conversation_id, count(*)::bigint as unread_count
  from public.direct_messages dm
  join public.conversations c on c.id = dm.conversation_id
  where dm.sender_id <> auth.uid()
    and dm.read_at is null
    and (c.user_a = auth.uid() or c.user_b = auth.uid())
  group by dm.conversation_id;
$$;

grant execute on function public.unread_message_counts() to authenticated;

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_direct_message_created on public.direct_messages;
create trigger on_direct_message_created
  after insert on public.direct_messages
  for each row execute function public.touch_conversation_on_message();

-- Realtime fuer neue Nachrichten (Live-Update im Chat ohne Polling)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;

-- =====================================================================
-- Benachrichtigungen: neue Follower + Antworten auf eigene Beitraege.
-- Werden ausschliesslich per Trigger (security definer) erzeugt, damit
-- niemand Benachrichtigungen in fremdem Namen faelschen kann.
-- =====================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid references public.users (id) on delete set null,
  type text not null check (type in ('follow', 'comment')),
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

create policy "Recipients can view their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "Recipients can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id);

-- Erstellung laeuft ausschliesslich ueber die Trigger unten, daher keine
-- Insert-Policy fuer normale Nutzer noetig.

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.followed_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id from public.posts where id = new.post_id;

  if post_author_id is not null and post_author_id <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (post_author_id, new.author_id, 'comment', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_comment_created on public.post_comments;
create trigger on_comment_created
  after insert on public.post_comments
  for each row execute function public.notify_on_comment();

create or replace function public.unread_notification_count()
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(*)::bigint
  from public.notifications
  where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.unread_notification_count() to authenticated;

create or replace function public.mark_notifications_read()
returns void
language sql
security definer set search_path = public
as $$
  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.mark_notifications_read() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- =====================================================================
-- Likes auf Posts + Vorschaubild fuer Dokumente (Seite 1 als PNG,
-- clientseitig beim Upload gerendert, liegt im selben Storage-Ordner
-- wie die Datei selbst -> bestehende Storage-Policies reichen aus).
-- =====================================================================
alter table public.documents
  add column if not exists thumbnail_url text;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Likes are visible to everyone"
  on public.post_likes for select
  using (true);

create policy "Users can like posts themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike their own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in ('follow', 'comment', 'like'));

create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select author_id into post_author_id from public.posts where id = new.post_id;

  if post_author_id is not null and post_author_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (post_author_id, new.user_id, 'like', new.post_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_like_created on public.post_likes;
create trigger on_like_created
  after insert on public.post_likes
  for each row execute function public.notify_on_like();

create or replace function public.post_like_counts(p_post_ids uuid[])
returns table (post_id uuid, like_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select post_id, count(*)::bigint as like_count
  from public.post_likes
  where post_id = any(p_post_ids)
  group by post_id;
$$;

grant execute on function public.post_like_counts(uuid[]) to anon, authenticated;

create or replace function public.poll_option_counts_bulk(p_poll_ids uuid[])
returns table (poll_id uuid, option_id uuid, vote_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select poll_id, option_id, count(*)::bigint as vote_count
  from public.poll_votes
  where poll_id = any(p_poll_ids)
  group by poll_id, option_id;
$$;

grant execute on function public.poll_option_counts_bulk(uuid[]) to anon, authenticated;

-- =====================================================================
-- Username: eindeutiger Handle, getrennt vom frei aenderbaren Anzeigenamen.
-- Case-insensitive eindeutig (lower(username)), damit "Mara" und "mara"
-- nicht als zwei verschiedene Namen durchgehen.
-- =====================================================================
alter table public.users
  add column if not exists username text;

create unique index if not exists users_username_unique_idx
  on public.users (lower(username))
  where username is not null;

grant update (username) on public.users to authenticated;

-- =====================================================================
-- Post-Sichtbarkeit: "profile" (auf dem eigenen Profil + im "Neu"-Feed
-- der Follower sichtbar) vs. "uni" (im "Uni"-Feed sichtbar, nicht auf
-- dem Profil). Gilt nur fuer allgemeine Posts ohne Kurs/Gruppe -
-- Kurs- und Gruppen-Posts bleiben immer 'uni'.
-- =====================================================================
alter table public.posts
  add column if not exists scope text not null default 'uni' check (scope in ('profile', 'uni'));

-- =====================================================================
-- Gruppenchats: Konversationen bekommen beliebig viele Teilnehmer statt
-- fest user_a/user_b. 1:1-Chats sind einfach Gruppen mit is_group=false
-- und genau 2 Teilnehmern. Alte user_a/user_b-Spalten bleiben (ungenutzt)
-- bestehen, um Datenverlust zu vermeiden, werden aber nicht mehr gelesen.
-- =====================================================================
alter table public.conversations
  add column if not exists is_group boolean not null default false,
  add column if not exists name text,
  add column if not exists created_by uuid references public.users (id) on delete set null;

alter table public.conversations
  alter column user_a drop not null,
  alter column user_b drop not null;

alter table public.conversations drop constraint if exists conversations_distinct_users;
alter table public.conversations drop constraint if exists conversations_ordered_users;
alter table public.conversations drop constraint if exists conversations_user_a_user_b_key;

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- Bestehende 1:1-Konversationen in das neue Teilnehmer-Modell uebernehmen
insert into public.conversation_participants (conversation_id, user_id)
select id, user_a from public.conversations where user_a is not null
on conflict do nothing;

insert into public.conversation_participants (conversation_id, user_id)
select id, user_b from public.conversations where user_b is not null
on conflict do nothing;

alter table public.conversation_participants enable row level security;

-- Security-definer-Funktion statt direktem Self-Join in der Policy: eine
-- Policy auf conversation_participants, die conversation_participants
-- selbst per Subquery abfragt, loest bei Postgres eine RLS-Endlosschleife
-- aus ("infinite recursion detected in policy"). Die Funktion umgeht das,
-- weil sie mit den Rechten des Eigentuemers laeuft (RLS wird intern nicht
-- erneut ausgewertet).
create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists "Participants can view participant rows of their conversations" on public.conversation_participants;
create policy "Participants can view participant rows of their conversations"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

-- Teilnehmer werden ausschliesslich ueber die Funktionen unten eingetragen.

drop policy if exists "Participants can view their conversations" on public.conversations;
create policy "Participants can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can view messages in their conversations" on public.direct_messages;
create policy "Participants can view messages in their conversations"
  on public.direct_messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = direct_messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can send messages in their conversations" on public.direct_messages;
create policy "Participants can send messages in their conversations"
  on public.direct_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = direct_messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = other_user_id then
    raise exception 'cannot message yourself';
  end if;

  select cp1.conversation_id into conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where cp1.user_id = me and cp2.user_id = other_user_id and c.is_group = false
  limit 1;

  if conv_id is null then
    insert into public.conversations (is_group) values (false) returning id into conv_id;
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, me), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

create or replace function public.create_group_conversation(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  member_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'group name required';
  end if;

  insert into public.conversations (is_group, name, created_by)
  values (true, trim(p_name), me)
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, me)
  on conflict do nothing;

  foreach member_id in array p_member_ids loop
    if member_id <> me then
      insert into public.conversation_participants (conversation_id, user_id)
      values (conv_id, member_id)
      on conflict do nothing;
    end if;
  end loop;

  return conv_id;
end;
$$;

grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
  ) then
    raise exception 'not a participant';
  end if;

  update public.direct_messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.unread_message_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
security definer set search_path = public
stable
as $$
  select dm.conversation_id, count(*)::bigint as unread_count
  from public.direct_messages dm
  join public.conversation_participants cp
    on cp.conversation_id = dm.conversation_id and cp.user_id = auth.uid()
  where dm.sender_id <> auth.uid()
    and dm.read_at is null
  group by dm.conversation_id;
$$;

grant execute on function public.unread_message_counts() to authenticated;

-- =====================================================================
-- Gruppenchat verlassen/loeschen. Jeder Teilnehmer darf seine eigene
-- Teilnehmer-Zeile loeschen (= verlassen); nur der Ersteller einer
-- Gruppe darf die ganze Konversation loeschen (kaskadiert auf
-- conversation_participants + direct_messages). Faellt eine
-- Konversation dabei auf 0 Teilnehmer, wird sie automatisch
-- aufgeraeumt, egal wer zuletzt gegangen ist.
-- =====================================================================
create policy "Participants can leave their own conversations"
  on public.conversation_participants for delete
  using (auth.uid() = user_id);

create policy "Group creators can delete their groups"
  on public.conversations for delete
  using (is_group = true and created_by = auth.uid());

create or replace function public.cleanup_empty_conversation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = old.conversation_id
  ) then
    delete from public.conversations where id = old.conversation_id;
  end if;
  return old;
end;
$$;

drop trigger if exists on_participant_removed on public.conversation_participants;
create trigger on_participant_removed
  after delete on public.conversation_participants
  for each row execute function public.cleanup_empty_conversation();

-- =====================================================================
-- Werbung: eigene Banner (keine Drittanbieter-Werbenetzwerk-Integration,
-- die eigene Brand wirbt hier fuer sich selbst). "banner" = kleine
-- Anzeigen im Feed/auf Seiten, "gate" = Anzeige im Download-Freischalt-
-- Dialog. Nur Admins duerfen Anzeigen anlegen/aendern, sichtbar sind
-- fuer alle nur aktive Anzeigen.
-- =====================================================================
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  cta_label text,
  placement text not null default 'banner' check (placement in ('banner', 'gate')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

create policy "Active ads are visible to everyone"
  on public.ads for select
  using (is_active = true or public.is_admin());

create policy "Admins can manage ads"
  on public.ads for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "Anyone can view ad images" on storage.objects;
create policy "Anyone can view ad images"
  on storage.objects for select
  using (bucket_id = 'ads');

drop policy if exists "Admins can upload ad images" on storage.objects;
create policy "Admins can upload ad images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ads' and public.is_admin());

drop policy if exists "Admins can delete ad images" on storage.objects;
create policy "Admins can delete ad images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ads' and public.is_admin());

-- Download-Freischaltung: Werbung ersetzt die alte Credit-Sperre komplett.
-- Jeder eingeloggte Nutzer kann nach dem Werbe-Gate im Frontend
-- herunterladen, diese Funktion zaehlt nur noch mit. Das alte
-- Credit-System (consume_download, download_credits) bleibt in der DB
-- bestehen (fuer eine moegliche spaetere Premium-Stufe), wird aber vom
-- Download-Flow nicht mehr aufgerufen.
create or replace function public.record_download(doc_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.documents set download_count = download_count + 1 where id = doc_id;
  return true;
end;
$$;

grant execute on function public.record_download(uuid) to authenticated;

-- =====================================================================
-- Profil-Highlights: eine Story dauerhaft unter einem Titel anpinnen.
-- Angepinnte Stories bleiben ueber die 24h-Grenze hinaus sichtbar.
-- =====================================================================
alter table public.stories add column if not exists highlight_title text;

drop policy if exists "Stories from the last 24h are visible to everyone" on public.stories;
create policy "Recent or pinned stories are visible to everyone"
  on public.stories for select
  using (created_at > now() - interval '24 hours' or highlight_title is not null);

drop policy if exists "Authors can update their own stories" on public.stories;
create policy "Authors can update their own stories"
  on public.stories for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- =====================================================================
-- Gespeicherte Beitraege (Bookmark-Icon in der Post-Aktionsleiste)
-- =====================================================================
create table if not exists public.post_saves (
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_saves enable row level security;

create policy "Users manage their own saved posts"
  on public.post_saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- Landingpage-Warteliste: "name" ergaenzt das bestehende university_waitlist,
-- damit dieselbe Tabelle auch fuer die Fruehzugriff-Anmeldung auf der
-- Landingpage genutzt werden kann (Admin sieht beide Quellen gemeinsam).
-- =====================================================================
alter table public.university_waitlist add column if not exists name text;

-- =====================================================================
-- Korrektur: "post_saves" war eine versehentliche Dopplung von
-- "post_bookmarks" (gleicher Zweck: Beitrag speichern). Wir nutzen
-- durchgehend post_bookmarks und entfernen die doppelte Tabelle wieder.
-- =====================================================================
drop table if exists public.post_saves;

-- =====================================================================
-- Melden von Inhalten (einfaches Flag fuer Admins, keine volle
-- Moderations-Workflow-Engine)
-- =====================================================================
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'document')),
  target_id uuid not null,
  reason text not null default 'Nicht angegeben',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

create policy "Authenticated users can report content"
  on public.content_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy "Admins can view reports"
  on public.content_reports for select
  using (public.is_admin());

create policy "Admins can update reports"
  on public.content_reports for update
  using (public.is_admin());

create policy "Admins can delete reports"
  on public.content_reports for delete
  using (public.is_admin());

-- =====================================================================
-- Einfacher Spam-Schutz: begrenzt, wie viele Beitraege/Kommentare/
-- Nachrichten ein Nutzer in kurzer Zeit erstellen kann.
-- =====================================================================
create or replace function public.enforce_posts_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    select count(*) from public.posts
    where author_id = new.author_id
      and created_at > now() - interval '30 seconds'
  ) >= 5 then
    raise exception 'rate_limited: Bitte warte kurz, bevor du weitere Beiträge erstellst.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_posts_rate_limit on public.posts;
create trigger trg_posts_rate_limit
  before insert on public.posts
  for each row execute function public.enforce_posts_rate_limit();

create or replace function public.enforce_comments_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    select count(*) from public.post_comments
    where author_id = new.author_id
      and created_at > now() - interval '30 seconds'
  ) >= 8 then
    raise exception 'rate_limited: Bitte warte kurz, bevor du weitere Kommentare schreibst.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comments_rate_limit on public.post_comments;
create trigger trg_comments_rate_limit
  before insert on public.post_comments
  for each row execute function public.enforce_comments_rate_limit();

create or replace function public.enforce_messages_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    select count(*) from public.direct_messages
    where sender_id = new.sender_id
      and created_at > now() - interval '30 seconds'
  ) >= 20 then
    raise exception 'rate_limited: Bitte warte kurz, bevor du weitere Nachrichten schickst.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_rate_limit on public.direct_messages;
create trigger trg_messages_rate_limit
  before insert on public.direct_messages
  for each row execute function public.enforce_messages_rate_limit();
