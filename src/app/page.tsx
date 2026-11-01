"use client";

import Link from "next/link";
import { useRomanian } from "~/app/_components/language-context";
import { DroneIcon } from "~/app/_components/drone-icon";

export default function Home() {
  const ro = useRomanian();

  return (
    <section className="home-dashboard">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="hero-status">
            <i aria-hidden="true" />
            {ro
              ? "PLANIFICARE LOCALĂ · ROMÂNIA"
              : "LOCAL FLIGHT PLANNING · ROMANIA"}
          </span>
          <h2>
            {ro ? (
              <>
                Planifică zborul
                <span> cu mai multă claritate.</span>
              </>
            ) : (
              <>
                Plan your next flight
                <span> with a clearer picture.</span>
              </>
            )}
          </h2>
          <p>
            {ro
              ? "Verifică zonele de referință, trasează poligonul și pregătește detaliile zborului într-un singur loc."
              : "Review airspace references, draw your flight area and prepare the details in one place."}
          </p>
          <div className="home-hero-actions">
            <Link className="button button-primary" href="/request">
              {ro ? "Planifică un zbor" : "Plan a flight"}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="hero-drone-art" aria-hidden="true">
          <DroneIcon />
        </div>
        <div className="home-facts">
          <div>
            <span>{ro ? "SPAȚIU AERIAN" : "AIRSPACE"}</span>
            <strong>{ro ? "Referințe ROMATSA" : "ROMATSA references"}</strong>
          </div>
          <div>
            <span>{ro ? "ZONA TA" : "YOUR AREA"}</span>
            <strong>{ro ? "Poligon pe hartă" : "Drawn on the map"}</strong>
          </div>
          <div>
            <span>{ro ? "CERERE" : "REQUEST"}</span>
            <strong>{ro ? "Pregătită local" : "Prepared locally"}</strong>
          </div>
        </div>
      </section>

      <section
        className="overview-grid"
        aria-label={ro ? "Instrumente" : "Tools"}
      >
        <Link href="/airspace" className="feature-card">
          <span className="feature-icon">⌖</span>
          <span className="eyebrow">{ro ? "01 · HARTĂ" : "01 · MAP"}</span>
          <h2>{ro ? "Verifică zona" : "Check the area"}</h2>
          <p>
            {ro
              ? "Compară zona propusă cu stratul de referință ROMATSA și consultă AEROFOTO."
              : "Compare your proposed area with the ROMATSA reference layer and open AEROFOTO."}
          </p>
          <span className="card-link">
            {ro ? "Deschide harta →" : "Open map →"}
          </span>
        </Link>
        <Link href="/request" className="feature-card">
          <span className="feature-icon">↗</span>
          <span className="eyebrow">
            {ro ? "02 · PLANIFICARE" : "02 · PLANNING"}
          </span>
          <h2>{ro ? "Pregătește un zbor" : "Prepare a flight"}</h2>
          <p>
            {ro
              ? "Alege drona și un interval candidat verificat față de ciornele locale."
              : "Choose your drone and a candidate time checked against local drafts."}
          </p>
          <span className="card-link">
            {ro ? "Începe planificarea →" : "Start planning →"}
          </span>
        </Link>
        <Link href="/profile" className="feature-card">
          <span className="feature-icon">◎</span>
          <span className="eyebrow">
            {ro ? "03 · PROFIL" : "03 · PROFILE"}
          </span>
          <h2>{ro ? "Datele pilotului" : "Pilot details"}</h2>
          <p>
            {ro
              ? "Gestionează profilul local și dronele salvate pentru cereri."
              : "Manage your local profile and saved drones for flight requests."}
          </p>
          <span className="card-link">
            {ro ? "Editează profilul →" : "Edit profile →"}
          </span>
        </Link>
      </section>

      <div className="home-bottom-row">
        <section className="content-card home-checklist">
          <div className="section-heading">
            <span className="eyebrow">
              {ro ? "PLANIFICARE ZBOR" : "FLIGHT DESK"}
            </span>
            <h2>{ro ? "Pașii planificării" : "Planning flow"}</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>{ro ? "Desenează zona" : "Draw your area"}</strong>
                <p>
                  {ro
                    ? "Marchează punctele poligonului pe hartă."
                    : "Mark the polygon points on the map."}
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>
                  {ro ? "Verifică referințele" : "Check references"}
                </strong>
                <p>
                  {ro
                    ? "Consultă zonele ROMATSA și instrucțiunile oficiale."
                    : "Review ROMATSA zones and official instructions."}
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>
                  {ro ? "Pregătește cererea" : "Prepare your request"}
                </strong>
                <p>
                  {ro
                    ? "Alege drona și generează pachetul local."
                    : "Choose your drone and generate a local package."}
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="content-card home-guidance">
          <div>
            <span className="eyebrow">
              {ro ? "ÎNAINTE DE ZBOR" : "BEFORE YOU FLY"}
            </span>
            <h2>
              {ro
                ? "Confirmă detaliile din surse oficiale."
                : "Confirm details with official sources."}
            </h2>
            <p>
              {ro
                ? "Restricțiile se pot schimba. Aerio nu oferă date în timp real sau autorizare."
                : "Restrictions can change. Aerio does not provide live data or clearance."}
            </p>
          </div>
          <div className="notice notice-warning prominent-notice">
            {ro
              ? "Aerio este un instrument de planificare. Datele nu sunt în timp real, iar aplicația nu trimite cereri și nu acordă permisiunea de zbor."
              : "Aerio is a planning tool. Data is not live, and the app does not submit requests or grant permission to fly."}
          </div>
          <div className="external-links">
            <a
              href="https://flightplan.romatsa.ro/init/drones"
              target="_blank"
              rel="noreferrer"
            >
              {ro ? "Harta UAS ROMATSA ↗" : "ROMATSA UAS map ↗"}
            </a>
            <a
              href="https://aerofoto.mapn.ro/"
              target="_blank"
              rel="noreferrer"
            >
              MApN AEROFOTO ↗
            </a>
            <a href="https://www.caa.ro/" target="_blank" rel="noreferrer">
              {ro ? "AACR ↗" : "Romanian CAA (AACR) ↗"}
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}
