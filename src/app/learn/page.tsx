"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRomanian } from "~/app/_components/language-context";

type ExamCategory = "general" | "A1" | "A2" | "A3";
type Question = {
  category: ExamCategory;
  en: { prompt: string; options: string[]; explanation: string };
  ro: { prompt: string; options: string[]; explanation: string };
  answer: number;
};

const questionBank: Question[] = [
  {
    category: "general",
    en: {
      prompt: "What is the usual maximum height in the Open category?",
      options: [
        "150 m above take-off point",
        "120 m from the closest point of the Earth's surface",
        "There is no general height limit",
      ],
      explanation:
        "The Open category limit is generally 120 m from the closest point of the Earth's surface, subject to exceptions and local restrictions.",
    },
    ro: {
      prompt: "Care este limita uzuală de înălțime în categoria Open?",
      options: [
        "150 m deasupra punctului de decolare",
        "120 m față de cel mai apropiat punct al suprafeței terestre",
        "Nu există o limită generală de înălțime",
      ],
      explanation:
        "Limita categoriei Open este, în general, 120 m față de cel mai apropiat punct al suprafeței terestre, cu excepții și restricții locale.",
    },
    answer: 1,
  },
  {
    category: "general",
    en: {
      prompt: "What does VLOS require during a standard Open-category flight?",
      options: [
        "Watch only the live video feed",
        "Stay within mobile-network coverage",
        "Keep the drone in direct visual line of sight",
      ],
      explanation:
        "The remote pilot must maintain direct visual line of sight unless an applicable approved exception allows otherwise.",
    },
    ro: {
      prompt:
        "Ce presupune VLOS în timpul unui zbor obișnuit din categoria Open?",
      options: [
        "Urmărirea exclusivă a transmisiei video",
        "Menținerea dronei în raza rețelei mobile",
        "Păstrarea dronei în câmp vizual direct",
      ],
      explanation:
        "Pilotul trebuie să mențină contactul vizual direct, cu excepția cazului în care se aplică o derogare aprobată.",
    },
    answer: 2,
  },
  {
    category: "general",
    en: {
      prompt: "May an Open-category drone be flown over an assembly of people?",
      options: ["Yes, below 30 m", "No", "Yes, if the drone is under 900 g"],
      explanation:
        "Flying over assemblies of people is not allowed in the Open category.",
    },
    ro: {
      prompt:
        "Poate o dronă din categoria Open să zboare deasupra unei adunări de persoane?",
      options: ["Da, sub 30 m", "Nu", "Da, dacă drona cântărește sub 900 g"],
      explanation:
        "Zborul deasupra adunărilor de persoane nu este permis în categoria Open.",
    },
    answer: 1,
  },
  {
    category: "A1",
    en: {
      prompt: "Which statement applies to A1 flights near uninvolved people?",
      options: [
        "Flying over people is always allowed",
        "Do not plan to fly over uninvolved people; never fly over an assembly",
        "A 150 m distance from every person is required",
      ],
      explanation:
        "A1 rules depend on the aircraft class. Do not plan to overfly uninvolved people, and never fly over an assembly.",
    },
    ro: {
      prompt:
        "Ce regulă se aplică zborurilor A1 în apropierea persoanelor neimplicate?",
      options: [
        "Zborul deasupra persoanelor este întotdeauna permis",
        "Nu planifica zborul deasupra persoanelor neimplicate; nu zbura niciodată peste o adunare",
        "Este necesară o distanță de 150 m față de fiecare persoană",
      ],
      explanation:
        "Regulile A1 depind de clasa aeronavei. Nu planifica zborul deasupra persoanelor neimplicate și nu zbura peste o adunare.",
    },
    answer: 1,
  },
  {
    category: "A1",
    en: {
      prompt:
        "What should a remote pilot do if uninvolved people enter the planned A1 flight area?",
      options: [
        "Continue the route because the flight was planned",
        "Take steps to avoid them and keep the flight safe",
        "Increase altitude to pass over them",
      ],
      explanation:
        "The remote pilot remains responsible for safety and should avoid people; never use extra altitude to overfly an assembly.",
    },
    ro: {
      prompt:
        "Ce ar trebui să facă pilotul dacă persoane neimplicate intră în zona planificată pentru A1?",
      options: [
        "Să continue traseul deoarece zborul a fost planificat",
        "Să le evite și să mențină zborul în siguranță",
        "Să urce pentru a trece pe deasupra lor",
      ],
      explanation:
        "Pilotul rămâne responsabil pentru siguranță și trebuie să evite persoanele; nu folosi altitudinea pentru a survola o adunare.",
    },
    answer: 1,
  },
  {
    category: "A2",
    en: {
      prompt:
        "What is the standard horizontal separation from uninvolved people for A2?",
      options: ["5 m in every situation", "30 m", "150 m"],
      explanation:
        "A2 normally requires at least 30 m horizontal separation. A reduced distance can apply only under defined conditions, including low-speed mode and risk assessment.",
    },
    ro: {
      prompt:
        "Care este distanța orizontală standard față de persoanele neimplicate pentru A2?",
      options: ["5 m în orice situație", "30 m", "150 m"],
      explanation:
        "A2 necesită în mod normal cel puțin 30 m. Distanța redusă se poate aplica numai în condiții definite, inclusiv modul de viteză redusă și evaluarea riscului.",
    },
    answer: 1,
  },
  {
    category: "A2",
    en: {
      prompt:
        "What additional remote-pilot qualification is associated with A2?",
      options: [
        "No training or examination",
        "A valid A2 remote-pilot certificate of competency",
        "A commercial airline pilot licence",
      ],
      explanation:
        "A2 requires the applicable remote-pilot competency training and certificate; this practice quiz is not that qualification.",
    },
    ro: {
      prompt: "Ce calificare suplimentară a pilotului este asociată cu A2?",
      options: [
        "Nicio instruire sau examinare",
        "Certificat de competență A2 valabil pentru pilotul la distanță",
        "Licență de pilot de linie",
      ],
      explanation:
        "A2 necesită instruirea și certificatul de competență aplicabile; acest test de exercițiu nu reprezintă calificarea.",
    },
    answer: 1,
  },
  {
    category: "A3",
    en: {
      prompt:
        "How far must an A3 operation generally be from residential, commercial, industrial or recreational areas?",
      options: ["At least 30 m", "At least 150 m", "No separation is required"],
      explanation:
        "A3 operations generally require at least 150 m from those areas and must not endanger uninvolved people.",
    },
    ro: {
      prompt:
        "La ce distanță trebuie să fie, în general, o operațiune A3 față de zone rezidențiale, comerciale, industriale sau recreative?",
      options: [
        "Cel puțin 30 m",
        "Cel puțin 150 m",
        "Nu este necesară nicio distanță",
      ],
      explanation:
        "Operațiunile A3 necesită, în general, cel puțin 150 m față de aceste zone și nu trebuie să pună în pericol persoane neimplicate.",
    },
    answer: 1,
  },
  {
    category: "A3",
    en: {
      prompt: "Who may be present in the A3 operational area?",
      options: [
        "Any number of uninvolved people",
        "Only people watching the drone",
        "No uninvolved people may be expected in the area affected by the flight",
      ],
      explanation:
        "A3 is intended for operations where no uninvolved people are expected within the area affected by the flight.",
    },
    ro: {
      prompt: "Cine poate fi prezent în zona operațională A3?",
      options: [
        "Oricâte persoane neimplicate",
        "Doar persoane care urmăresc drona",
        "Nu trebuie să fie prezente persoane neimplicate în zona afectată de zbor",
      ],
      explanation:
        "A3 este destinat operațiunilor în care nu sunt așteptate persoane neimplicate în zona afectată de zbor.",
    },
    answer: 2,
  },
];

export default function LearnPage() {
  const ro = useRomanian();
  const [category, setCategory] = useState<"all" | "A1" | "A2" | "A3">("all");
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const questions = useMemo(
    () =>
      questionBank.filter(
        (question) =>
          category === "all" ||
          question.category === "general" ||
          question.category === category,
      ),
    [category],
  );
  const score = answers.reduce(
    (total, answer, index) =>
      total + (answer === questions[index]?.answer ? 1 : 0),
    0,
  );

  function startExam() {
    setAnswers(questions.map(() => -1));
    setSubmitted(false);
  }

  return (
    <>
      <p className="route-description">
        {ro
          ? "O listă inițială pentru planificare. Confirmă regulile și restricțiile curente din sursele oficiale."
          : "A starting checklist for planning. Confirm the rules and current restrictions with official sources."}
      </p>
      <div className="notice notice-warning prominent-notice">
        {ro
          ? "Acest ghid este informativ, nu reprezintă consultanță juridică sau autorizație. Cerințele depind de aeronavă, operațiune, spațiul aerian și regulile actuale din România/UE."
          : "This guide is informational, not legal advice or authorization. Requirements depend on the aircraft, operation, airspace and current Romanian/EU rules."}
      </div>
      <section className="content-card exam-card">
        <div className="section-heading">
          <span className="eyebrow">
            {ro
              ? "EXERCIȚIU · NU ESTE EXAMEN OFICIAL"
              : "PRACTICE · NOT AN OFFICIAL EXAM"}
          </span>
          <h2>
            {ro
              ? "Sesiune de test pentru categoria deschisă"
              : "Open category practice session"}
          </h2>
        </div>
        <p className="muted">
          {ro
            ? "Alege A1, A2, A3 sau un test mixt. Răspunde la toate întrebările, apoi verifică scorul și explicațiile."
            : "Choose A1, A2, A3, or a mixed test. Answer every question, then review your score and explanations."}
        </p>
        <div className="exam-controls">
          <label className="field">
            <span>{ro ? "Tematica testului" : "Test topic"}</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as typeof category);
                setAnswers([]);
                setSubmitted(false);
              }}
            >
              <option value="all">
                {ro ? "Mixt · A1, A2, A3" : "Mixed · A1, A2, A3"}
              </option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="A3">A3</option>
            </select>
          </label>
          <button
            className="button button-primary"
            type="button"
            onClick={startExam}
          >
            {answers.length > 0
              ? ro
                ? "Reîncepe sesiunea"
                : "Restart session"
              : ro
                ? "Începe testul"
                : "Start practice test"}
          </button>
        </div>
        {answers.length > 0 && (
          <div className="exam-questions">
            {questions.map((question, questionIndex) => {
              const content = ro ? question.ro : question.en;
              return (
                <fieldset
                  className="exam-question"
                  key={`${question.category}-${questionIndex}`}
                >
                  <legend>
                    <span>
                      {question.category === "general"
                        ? ro
                          ? "GENERAL"
                          : "GENERAL"
                        : question.category}
                    </span>
                    {questionIndex + 1}. {content.prompt}
                  </legend>
                  <div className="exam-options">
                    {content.options.map((option, optionIndex) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={`question-${questionIndex}`}
                          checked={answers[questionIndex] === optionIndex}
                          disabled={submitted}
                          onChange={() =>
                            setAnswers((current) =>
                              current.map((answer, index) =>
                                index === questionIndex ? optionIndex : answer,
                              ),
                            )
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {submitted && (
                    <p
                      className={
                        answers[questionIndex] === question.answer
                          ? "exam-correct"
                          : "exam-incorrect"
                      }
                    >
                      {answers[questionIndex] === question.answer
                        ? ro
                          ? "Corect."
                          : "Correct."
                        : ro
                          ? "Răspuns corect:"
                          : "Correct answer:"}{" "}
                      {content.options[question.answer]} — {content.explanation}
                    </p>
                  )}
                </fieldset>
              );
            })}
            {!submitted ? (
              <button
                className="button button-success"
                type="button"
                disabled={answers.some((answer) => answer < 0)}
                onClick={() => setSubmitted(true)}
              >
                {ro ? "Finalizează testul" : "Submit answers"}
              </button>
            ) : (
              <p className="exam-score" role="status">
                {ro
                  ? `Scor: ${score} din ${questions.length}. Acesta este un exercițiu, nu o certificare.`
                  : `Score: ${score} of ${questions.length}. This is practice, not a certification.`}
              </p>
            )}
          </div>
        )}
        <p className="small-note">
          {ro
            ? "Întrebările sunt pentru recapitulare, nu reproduc examenul AACR/EASA. Verifică regulile și materialele oficiale actuale."
            : "Questions are for revision and do not reproduce the AACR/EASA exam. Check current official rules and training materials."}
        </p>
      </section>
      <section className="guidance-grid">
        <article className="content-card guidance-card">
          <span className="guidance-number">01</span>
          <h2>
            {ro
              ? "Înregistrarea operatorului și dronei"
              : "Operator and drone registration"}
          </h2>
          <p>
            {ro
              ? "Înregistrează-te ca operator la AACR când este necesar și afișează ID-ul pe aeronavă. Vizitatorii trebuie să confirme la AACR recunoașterea înregistrării din țara de origine."
              : "Register as an operator with AACR when required and display your operator ID on the aircraft. Visitors should confirm recognition of their home-country registration with AACR before operating in Romania."}
          </p>
          <a href="https://www.caa.ro/" target="_blank" rel="noreferrer">
            AACR ↗
          </a>
        </article>
        <article className="content-card guidance-card">
          <span className="guidance-number">02</span>
          <h2>
            {ro
              ? "Verifică spațiul aerian și restricțiile"
              : "Check airspace and restrictions"}
          </h2>
          <p>
            {ro
              ? "Folosește harta actuală ROMATSA și verifică NOTAM/AIP. O zonă restricționată poate necesita aprobări separate; urmează contactele și documentele indicate pentru fiecare zonă."
              : "Use ROMATSA’s current drone map and check NOTAMs/AIP. A restricted area can require separate permissions; follow the contact and documents shown for each zone."}
          </p>
          <a
            href="https://flightplan.romatsa.ro/init/drones"
            target="_blank"
            rel="noreferrer"
          >
            {ro ? "Harta UAS ROMATSA ↗" : "ROMATSA UAS map ↗"}
          </a>
        </article>
        <article className="content-card guidance-card">
          <span className="guidance-number">03</span>
          <h2>{ro ? "Spațiu aerian controlat" : "Controlled airspace"}</h2>
          <p>
            {ro
              ? "Dacă este necesar, coordonează-te cu serviciile de trafic aerian și depune planul de zbor cerut. Contactează turnul de control înainte de zbor când instrucțiunile aplicabile o cer."
              : "Where required, coordinate with the relevant air traffic services and submit the necessary flight plan. Contact the control tower before flight when the applicable instructions require it."}
          </p>
          <a href="https://www.romatsa.ro/" target="_blank" rel="noreferrer">
            ROMATSA ↗
          </a>
        </article>
        <article className="content-card guidance-card">
          <span className="guidance-number">04</span>
          <h2>{ro ? "Fotografiere și MApN" : "Photography and MApN"}</h2>
          <p>
            {ro
              ? "Aprobarea foto/video MApN se aplică în zonele restricționate sau militare relevante; verifică instrucțiunile actuale ROMATSA. AEROFOTO este serviciul oficial MApN."
              : "MApN photo/video approval applies in the relevant restricted or military areas; check the current ROMATSA zone instructions. AEROFOTO is MApN’s official service."}
          </p>
          <a href="https://aerofoto.mapn.ro/" target="_blank" rel="noreferrer">
            MApN AEROFOTO ↗
          </a>
        </article>
        <article className="content-card guidance-card">
          <span className="guidance-number">05</span>
          <h2>
            {ro
              ? "Persoane și contact vizual"
              : "People and visual line of sight"}
          </h2>
          <p>
            {ro
              ? "Păstrează contactul vizual direct și respectă regulile categoriei aplicabile. Nu zbura deasupra mulțimilor sau zonelor dens populate fără autorizație ori excepție valabilă."
              : "Maintain visual line of sight and comply with the applicable category rules. Do not fly over crowds or densely populated areas unless a valid authorization or exception applies."}
          </p>
          <a
            href="https://www.easa.europa.eu/en/domains/civil-drones-rpas"
            target="_blank"
            rel="noreferrer"
          >
            {ro ? "Reguli EASA pentru drone ↗" : "EASA drone rules ↗"}
          </a>
        </article>
        <article className="content-card guidance-card">
          <span className="guidance-number">06</span>
          <h2>{ro ? "Asigurare și greutate" : "Insurance and weight"}</h2>
          <p>
            {ro
              ? "Verifică obligațiile de asigurare pentru aeronavă și operațiune. Cerințele românești pot viza dronele de peste 20 kg; confirmă regula actuală cu AACR și asigurătorul."
              : "Check insurance obligations for your aircraft and operation. Romanian requirements can apply to drones above 20 kg; verify the current rule with AACR and your insurer."}
          </p>
          <Link href="/profile">
            {ro
              ? "Pregătește datele pilotului →"
              : "Keep your pilot details ready →"}
          </Link>
        </article>
      </section>
      <p className="small-note">
        {ro
          ? "Linkurile sunt oferite ca referință. Aerio nu verifică aceste pagini în timp real; consultă întotdeauna publicațiile oficiale actuale înainte de zbor."
          : "Source links are provided for convenience. Aerio does not validate these pages in real time; always check the official, current publication before flying."}
      </p>
    </>
  );
}
