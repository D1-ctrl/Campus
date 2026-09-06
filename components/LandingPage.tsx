import Link from "next/link";
import type { ReactNode } from "react";
import {
  Zap,
  GraduationCap,
  Heart,
  CalendarDays,
  Send,
  Pin,
  ArrowRight,
  Users,
  Sparkles,
} from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import WaitlistForm from "@/components/WaitlistForm";
import {
  FeedMockup,
  CourseMockup,
  FlashcardMockup,
  CommunityMockup,
  ScheduleMockup,
} from "@/components/LandingMockups";

const FAQ_ITEMS = [
  {
    question: "Ist Kampus kostenlos?",
    answer:
      "Ja. Alle Kernfunktionen sind kostenlos. Statt für Downloads zu bezahlen, schaust du dir bei Bedarf kurz eine Anzeige an – so bleibt Kampus für alle nutzbar.",
  },
  {
    question: "Welche Universitäten werden unterstützt?",
    answer:
      "Wir schalten laufend neue Universitäten frei. Ist deine Uni noch nicht dabei, trag dich unten in die Warteliste ein – wir melden uns, sobald es losgeht.",
  },
  {
    question: "Was ist der Unterschied zwischen Uni- und Profil-Beiträgen?",
    answer:
      "Uni-Beiträge landen im Uni-Feed und können einem Kurs oder einer Gruppe zugeordnet werden. Profil-Beiträge erscheinen nur bei dir und im Feed der Leute, die dir folgen.",
  },
  {
    question: "Wie funktioniert das Bewertungssystem für Dokumente?",
    answer:
      "Jedes hochgeladene Dokument kann mit Sternen und einem Kommentar bewertet werden – so siehst du auf einen Blick, welche Unterlagen wirklich hilfreich sind.",
  },
  {
    question: "Wann kommen die KI-Karteikarten?",
    answer:
      "Wir arbeiten daran, dass du aus deinen eigenen Unterlagen automatisch Lernfragen generieren kannst. Trag dich in die Warteliste ein, um es als Erste:r zu testen.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
        <div className="flex flex-col gap-5">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Weniger Chaos im Studium.{" "}
            <span className="text-accent">Gemeinsam einfacher lernen.</span>{" "}
            Nie wieder verlorene Unterlagen.
          </h1>
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Kampus ist die App für Studierende: Skripte und Altklausuren teilen,
            Kurse und Gruppen organisieren, mit Kommilitonen vernetzen – alles an
            einem Ort.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-full bg-[var(--foreground)] px-6 py-2.5 font-medium text-[var(--background)] transition-opacity hover:opacity-90"
            >
              Kostenlos registrieren
            </Link>
            <a
              href="#features"
              className="flex items-center gap-1.5 rounded-full border border-black/10 px-6 py-2.5 font-medium hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Features entdecken <ArrowRight size={15} strokeWidth={1.75} />
            </a>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <GraduationCap size={16} strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-medium">Studierende</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Lernmaterial teilen & finden
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Users size={16} strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-medium">Kommilitonen</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Vernetzen & gemeinsam lernen
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[var(--card)] p-3 dark:border-white/15">
          <FeedMockup />
        </div>
      </section>

      {/* Feature rows */}
      <section id="features" className="flex flex-col">
        <FeatureRow
          icon={Sparkles}
          title="KI-Karteikarten"
          badge="Bald verfügbar"
          description="Sag Tschüss zu stundenlangem Zusammenfassen. Die KI von Kampus verwandelt deine Unterlagen in Sekunden in Lernfragen."
          bullets={[
            { label: "Automatisch generiert:", text: "Vorlesungsfolie hochladen, sofort Karteikarten erhalten." },
            { label: "Gezieltes Wiederholen:", text: "Fragen passend zu deinem Stoff, nicht generisch." },
            { label: "Zeit gespart:", text: "Weniger Vorbereitung, mehr effektives Lernen." },
          ]}
          image={<FlashcardMockup />}
          tint="bg-accent/[.06]"
        />
        <FeatureRow
          icon={GraduationCap}
          title="Kurse & Gruppen"
          description="Dein Netzwerk pro Kurs für effizienteres Lernen und Zugang zu geteiltem Wissen."
          bullets={[
            { label: "Kurs-Feed:", text: "Alle Beiträge und Dokumente deines Kurses gebündelt." },
            { label: "Gruppen gründen:", text: "Organisiere Lerngruppen mit eigenem Feed und Chat." },
            { label: "Gemeinsam stärker:", text: "Profitiere vom Wissen deiner Kommilitonen." },
          ]}
          image={<CourseMockup />}
          reverse
        />
        <FeatureRow
          icon={Heart}
          title="Community mit Herz"
          description="Genieße eine aufgeräumte Lernerfahrung. Kein Chaos, keine Ablenkung – nur was für dich zählt."
          bullets={[
            { label: "Ein Klick zum Posten:", text: "Beitrag, Bild oder Umfrage ohne Umwege teilen." },
            { label: "Klare Trennung:", text: "Uni- und Profil-Beiträge bleiben getrennt." },
            { label: "Immer informiert:", text: "Echtzeit-Benachrichtigungen zu Kommentaren & Likes." },
          ]}
          image={<CommunityMockup />}
          tint="bg-accent/[.06]"
        />
      </section>

      {/* Clarity. Joy. Purpose. */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-6 py-16 text-center md:py-24">
        <div>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Klarheit. <span className="text-accent">Freude.</span> Fokus.
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Eine stressfreie Lernerfahrung, die für dich gemacht ist.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--card)] p-6">
            <Zap size={28} strokeWidth={1.5} className="text-accent" />
            <p className="font-semibold">Ein Klick zum Posten</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--card)] p-6">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-500">
              98 % passend
            </span>
            <p className="font-semibold">Passende Lerngruppen</p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--card)] p-6">
            <Send size={26} strokeWidth={1.5} className="text-accent" />
            <p className="font-semibold">Immer auf dem Laufenden</p>
          </div>
        </div>

        <a
          href="#waitlist"
          className="rounded-full bg-accent px-6 py-2.5 font-medium text-white transition-colors hover:bg-accent/90"
        >
          Jetzt registrieren
        </a>
      </section>

      {/* More features */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
        <ScheduleMockup />
        <div className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Mehr smarte <span className="text-accent">Features.</span> Über den
            Standard hinaus.
          </h2>
          <ul className="flex flex-col gap-4 text-sm">
            <li className="flex items-start gap-3">
              <CalendarDays size={18} strokeWidth={1.75} className="mt-0.5 text-accent" />
              <div>
                <p className="font-medium">Stundenplan & Dashboard</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Behalte Vorlesungen und Prüfungen im Blick.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Send size={18} strokeWidth={1.75} className="mt-0.5 text-accent" />
              <div>
                <p className="font-medium">Direkt- & Gruppenchats</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Chatte direkt mit Kommilitonen, einzeln oder in Gruppen.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Pin size={18} strokeWidth={1.75} className="mt-0.5 text-accent" />
              <div>
                <p className="font-medium">Profil-Highlights</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Zeige deine wichtigsten Momente dauerhaft auf deinem Profil.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <h2 className="mb-8 text-center text-3xl font-semibold">FAQs</h2>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="mx-auto w-full max-w-xl px-6 py-16 md:py-24">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">
            Organisiert studieren, <span className="text-accent">gemeinsam lernen.</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sichere dir jetzt deinen Frühzugriff – kostenlos.
          </p>
        </div>
        <WaitlistForm />
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 px-6 py-12 text-zinc-400">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-xl italic font-semibold text-white">Kampus</p>
            <p className="mt-1 text-sm">Dein Studium, digital organisiert.</p>
          </div>
          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-white">Produkt</p>
              <a href="#features" className="hover:text-white">
                Features
              </a>
              <a href="#waitlist" className="hover:text-white">
                Früh­zugriff
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-white">Konto</p>
              <Link href="/login" className="hover:text-white">
                Login
              </Link>
              <Link href="/register" className="hover:text-white">
                Registrieren
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Kampus. Alle Rechte vorbehalten.</span>
          <span className="flex gap-3">
            <Link href="/impressum" className="hover:text-white">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-white">
              Datenschutz
            </Link>
            <Link href="/nutzungsbedingungen" className="hover:text-white">
              Nutzungsbedingungen
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}

type FeatureRowProps = {
  icon: typeof Zap;
  title: string;
  description: string;
  bullets: { label: string; text: string }[];
  image: ReactNode;
  reverse?: boolean;
  tint?: string;
  badge?: string;
};

function FeatureRow({
  icon: Icon,
  title,
  description,
  bullets,
  image,
  reverse = false,
  tint,
  badge,
}: FeatureRowProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${tint ?? ""}`}>
      <div className={`flex items-center justify-center p-8 md:p-14 ${reverse ? "md:order-2" : ""}`}>
        <div className="w-full max-w-md">{image}</div>
      </div>
      <div className="flex flex-col justify-center gap-4 p-8 md:p-14">
        <Icon size={20} strokeWidth={1.75} className="text-accent" />
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold">{title}</h3>
          {badge && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        <ul className="flex flex-col gap-2 text-sm">
          {bullets.map((bullet) => (
            <li key={bullet.label} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              <span>
                <span className="font-medium">{bullet.label}</span> {bullet.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
