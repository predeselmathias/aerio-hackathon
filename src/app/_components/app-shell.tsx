"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageContext } from "~/app/_components/language-context";

const links = [
  { href: "/", en: "Today", ro: "Astăzi", icon: "today" },
  { href: "/airspace", en: "Airspace", ro: "Spațiu aerian", icon: "map" },
  {
    href: "/request",
    en: "Flight request",
    ro: "Cerere de zbor",
    icon: "request",
  },
  { href: "/profile", en: "Profile", ro: "Profil", icon: "profile" },
  { href: "/learn", en: "Learn", ro: "Ghid", icon: "learn" },
];

function NavigationIcon({ name }: { name: string }) {
  if (name === "today") {
    return (
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    );
  }
  if (name === "map") {
    return (
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
        <path d="M9 4v14m6-12v14" />
      </svg>
    );
  }
  if (name === "request") {
    return (
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === "profile") {
    return (
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="3" />
        <circle cx="9.2" cy="11" r="2" />
        <path d="M6.5 16c.5-1.6 1.5-2.5 2.7-2.5s2.2.9 2.7 2.5M14 9.5h3m-3 3.5h3" />
      </svg>
    );
  }
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.6A2.6 2.6 0 0 1 6.6 3H20v15H6.6A2.6 2.6 0 0 0 4 20.6V5.6Z" />
      <path d="M8.5 7h7m-7 3.5h5" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [light, setLight] = useState(false);
  const [romanian, setRomanian] = useState(false);
  const [pilotName, setPilotName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [entryChecked, setEntryChecked] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("aerio.theme") === "light";
    const savedLanguage = localStorage.getItem("aerio.language") === "ro";
    setLight(savedTheme);
    setRomanian(savedLanguage);
    document.documentElement.dataset.theme = savedTheme ? "light" : "dark";
    document.documentElement.lang = savedLanguage ? "ro" : "en";

    const updatePilot = () => {
      try {
        const profile = JSON.parse(
          localStorage.getItem("aerio.profile") ?? "{}",
        ) as { name?: string; firstName?: string; lastName?: string };
        const fullName = [profile.firstName, profile.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        setPilotName(
          fullName.length > 0 ? fullName : (profile.name?.trim() ?? ""),
        );
      } catch (error) {
        console.error("Could not read the local pilot name.", error);
      }
    };
    const updateSession = () => {
      try {
        const session = JSON.parse(
          localStorage.getItem("aerio.session") ?? "null",
        ) as { mode?: string; email?: string } | null;
        setDemoEmail(session?.mode === "demo" ? (session.email ?? "") : "");
      } catch (error) {
        console.error("Could not read the local demo session.", error);
        setDemoEmail("");
      }
    };
    updatePilot();
    updateSession();
    window.addEventListener("aerio:profile-updated", updatePilot);
    window.addEventListener("aerio:session-updated", updateSession);
    return () => {
      window.removeEventListener("aerio:profile-updated", updatePilot);
      window.removeEventListener("aerio:session-updated", updateSession);
    };
  }, []);

  useEffect(() => {
    const storedSession = localStorage.getItem("aerio.session");
    let hasDemoSession = false;
    try {
      const session: unknown = storedSession ? JSON.parse(storedSession) : null;
      hasDemoSession =
        typeof session === "object" &&
        session !== null &&
        "mode" in session &&
        session.mode === "demo";
    } catch (error) {
      console.error("Could not validate the local demo session.", error);
    }
    const hasDemoAccess =
      localStorage.getItem("aerio.demoAccess") === "true" && hasDemoSession;
    if (!hasDemoAccess && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (hasDemoAccess && pathname === "/login") {
      router.replace("/");
      return;
    }
    setEntryChecked(true);
  }, [pathname, router]);

  function toggleTheme() {
    const next = !light;
    setLight(next);
    localStorage.setItem("aerio.theme", next ? "light" : "dark");
    document.documentElement.dataset.theme = next ? "light" : "dark";
  }

  function toggleLanguage() {
    const next = !romanian;
    setRomanian(next);
    localStorage.setItem("aerio.language", next ? "ro" : "en");
    document.documentElement.lang = next ? "ro" : "en";
  }

  function signOutDemo() {
    localStorage.removeItem("aerio.session");
    localStorage.removeItem("aerio.demoAccess");
    setDemoEmail("");
    setEntryChecked(false);
    window.dispatchEvent(new Event("aerio:session-updated"));
    router.replace("/login");
  }

  const pageTitles: Record<string, { en: string; ro: string }> = {
    "/": { en: "Today", ro: "Astăzi" },
    "/airspace": { en: "Airspace", ro: "Spațiu aerian" },
    "/request": { en: "Flight request", ro: "Cerere de zbor" },
    "/profile": { en: "Profile", ro: "Profil" },
    "/learn": { en: "Learn", ro: "Ghid" },
    "/login": { en: "Sign in", ro: "Autentificare" },
  };
  const title = pageTitles[pathname] ?? { en: "Aerio", ro: "Aerio" };

  if (!entryChecked) {
    return (
      <LanguageContext.Provider value={romanian}>
        <div className="entry-loading" aria-live="polite">
          Aerio
        </div>
      </LanguageContext.Provider>
    );
  }

  if (pathname === "/login") {
    return (
      <LanguageContext.Provider value={romanian}>
        <main className="standalone-login">{children}</main>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={romanian}>
      <div className="app-shell">
        <div className="flying-drone" aria-hidden="true">
          <img src="/drone-outline.svg" alt="" />
        </div>
        <div className="flying-drone drone-b" aria-hidden="true">
          <img src="/drone-purple.svg" alt="" />
        </div>
        <aside
          className="sidebar glass"
          aria-label={romanian ? "Navigare principală" : "Primary navigation"}
        >
          <Link className="brand" href="/" aria-label="Aerio home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.2 14 9l5.8 2-5.8 2-2 5.8-2-5.8L4.2 11 10 9l2-5.8Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="brand-text">
              <strong>Aerio</strong>
              <small>{romanian ? "Birou de zbor" : "Flight desk"}</small>
            </span>
          </Link>
          <nav
            className="main-nav"
            aria-label={romanian ? "Secțiuni" : "Sections"}
          >
            {links.map((link) => (
              <Link
                className={`nav-link ${pathname === link.href ? "active" : ""}`}
                href={link.href}
                key={link.href}
                aria-label={romanian ? link.ro : link.en}
                aria-current={pathname === link.href ? "page" : undefined}
              >
                <NavigationIcon name={link.icon} />
                <span>{romanian ? link.ro : link.en}</span>
              </Link>
            ))}
          </nav>
          <section className="sidebar-note">
            <p className="note-kicker">
              {romanian ? "PLANIFICARE ÎN ROMÂNIA" : "ROMANIA FLIGHT DESK"}
            </p>
            <p className="note-weather">
              {romanian ? "Planificare" : "Planning"}{" "}
              <span>{romanian ? "locală" : "only"}</span>
            </p>
            <div className="note-metrics">
              <span>{romanian ? "Fără date în timp real" : "No live data"}</span>
              <span>{romanian ? "Fără autorizare" : "No clearance"}</span>
            </div>
            <p className="note-meta">
              {romanian
                ? "Verifică sursele oficiale înainte de zbor."
                : "Check official sources before flying."}
            </p>
          </section>
          <div className="sidebar-foot">
            {demoEmail && (
              <div className="demo-session-indicator" role="status">
                <span className="demo-session-dot" aria-hidden="true" />
                <span>
                  <strong>{romanian ? "Sesiune demonstrativă" : "Demo session"}</strong>
                  <small>{demoEmail}</small>
                </span>
                <button type="button" onClick={signOutDemo}>
                  {romanian ? "Ieșire" : "Sign out"}
                </button>
              </div>
            )}
            <Link className="profile-link" href="/profile">
              <span className="avatar">
                {pilotName.trim()
                  ? pilotName
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                  : "A"}
              </span>
              <span className="profile-text">
                <strong>
                  {pilotName || (romanian ? "Profil pilot" : "Pilot profile")}
                </strong>
                <small>
                  {romanian ? "Dosar local" : "Local operator file"}
                </small>
              </span>
              <span className="profile-chevron" aria-hidden="true">
                ›
              </span>
            </Link>
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={
                light ? "Switch to dark theme" : "Switch to white theme"
              }
            >
              <span aria-hidden="true">{light ? "☾" : "☼"}</span>
              {light
                ? romanian
                  ? "Temă închisă"
                  : "Dark theme"
                : romanian
                  ? "Temă albă"
                  : "White theme"}
            </button>
          </div>
        </aside>
        <main className="main-content">
          <header className="topbar">
            <div className="page-head">
              <p className="eyebrow">
                {pathname === "/airspace"
                  ? romanian
                    ? "ROMATSA · DATE DE REFERINȚĂ"
                    : "ROMATSA · REFERENCE DATA"
                  : romanian
                    ? "AERIO · PLANIFICARE LOCALĂ"
                    : "AERIO · LOCAL PLANNING"}
              </p>
              <h1>{romanian ? title.ro : title.en}</h1>
            </div>
            <div className="topbar-actions">
              <span className="clearance-pill">
                <i aria-hidden="true" />
                {romanian
                  ? "Planificare · fără autorizare"
                  : "Planning only · no clearance"}
              </span>
              <button
                className="language-toggle"
                type="button"
                onClick={toggleLanguage}
                aria-label={
                  romanian ? "Switch to English" : "Switch to Romanian"
                }
              >
                {romanian ? "EN" : "RO"}
              </button>
            </div>
          </header>
          <div className="page-content">{children}</div>
        </main>
      </div>
    </LanguageContext.Provider>
  );
}
