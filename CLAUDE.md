# Projekt: Studydrive-Klon

## Was ist das?
Eine Plattform, auf der Studierende Lernmaterialien (Skripte, Zusammenfassungen, Altklausuren) hochladen, durchsuchen und herunterladen können. Vergleichbar mit Studydrive.

## Tech-Stack
- **Frontend:** Next.js (React) mit TypeScript
- **Styling:** Tailwind CSS
- **Backend / DB / Auth / File-Storage:** Supabase (Postgres-Datenbank, Auth, Storage-Buckets für Datei-Uploads – alles in einem, spart eigenes Backend)
- **Hosting Frontend:** Vercel
- **Hosting Backend:** Supabase Cloud

Begründung: Next.js + Supabase ist der schnellste Weg zu einer produktionsreifen Webapp ohne eigenes Backend selbst zu bauen. Später per Capacitor auf iOS/Android portierbar (siehe unten).

## Datenbankschema (Postgres / Supabase)

### `users` (kommt automatisch über Supabase Auth, hier nur Zusatzfelder)
- `id` (uuid, PK, = auth.users.id)
- `display_name` (text)
- `university` (text, nullable)
- `created_at` (timestamp)

### `documents`
- `id` (uuid, PK)
- `title` (text)
- `description` (text, nullable)
- `subject` (text) – z.B. "BWL", "Maschinenbau"
- `university` (text)
- `document_type` (text) – enum: "Skript", "Zusammenfassung", "Klausur", "Übung"
- `file_url` (text) – Pfad im Supabase Storage Bucket
- `uploader_id` (uuid, FK → users.id)
- `download_count` (int, default 0)
- `created_at` (timestamp)

### `ratings`
- `id` (uuid, PK)
- `document_id` (uuid, FK → documents.id)
- `user_id` (uuid, FK → users.id)
- `stars` (int, 1–5)
- `comment` (text, nullable)
- `created_at` (timestamp)
- Unique constraint: (`document_id`, `user_id`) – ein User kann pro Dokument nur einmal bewerten

### `favorites` (optional, später)
- `user_id` (uuid, FK)
- `document_id` (uuid, FK)
- PK: (`user_id`, `document_id`)

## Ordnerstruktur (Next.js App Router)
```
studydrive-clone/
├── CLAUDE.md
├── app/
│   ├── page.tsx                 # Startseite / Dokumentenübersicht
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── upload/page.tsx
│   ├── document/[id]/page.tsx   # Detailansicht + Download + Bewertungen
│   └── layout.tsx
├── components/
│   ├── DocumentCard.tsx
│   ├── SearchFilter.tsx
│   ├── RatingStars.tsx
│   └── Navbar.tsx
├── lib/
│   └── supabase.ts              # Supabase Client Setup
├── supabase/
│   └── schema.sql               # DB-Schema als SQL zum Ausführen
├── public/
├── .env.local                   # Supabase Keys (NICHT ins Git!)
└── package.json
```

## Feature-Reihenfolge (bitte in dieser Reihenfolge umsetzen, nicht alles auf einmal)
1. Next.js-Projekt aufsetzen + Supabase-Verbindung herstellen
2. Auth: Registrierung / Login / Logout
3. Datei-Upload mit Metadaten (Titel, Fach, Uni, Dokumententyp) → Supabase Storage
4. Dokumentenübersicht mit Suche + Filter (Fach, Uni, Typ)
5. Detailseite mit Download-Funktion
6. Bewertungssystem (Sterne + Kommentar)
7. (Später) Freemium-Logik: X Uploads = mehr Downloads
8. (Später) Favoriten

## Konventionen
- TypeScript überall, keine `any`-Types wo vermeidbar
- Tailwind für Styling, keine separaten CSS-Dateien außer global.css
- Komponenten klein und wiederverwendbar halten
- Supabase Row Level Security (RLS) von Anfang an aktivieren, nicht erst am Ende
