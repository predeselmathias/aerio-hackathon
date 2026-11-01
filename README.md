# Aerio

**Aerio** este o aplicație web de planificare a zborurilor cu drone în România. Reunește o hartă cu zone de referință, un profil local de pilot și flotă, planificarea unui zbor și generarea automata a anexelor necesare pentru zbor.

> **Important:** Aerio este un prototip de planificare, nu o aplicație oficială AACR sau ROMATSA. Datele aeronautice incluse nu sunt live. Aplicația nu rezervă spațiu aerian, nu trimite cereri către autorități și nu acordă aprobări. Verifică întotdeauna informațiile și cerințele actuale din surse oficiale înainte de zbor.

## Cuprins

- [Funcționalități](#funcționalități)
- [Tutorial de utilizare](#tutorial-de-utilizare)
- [Tehnologii și arhitectură](#tehnologii-și-arhitectură)
- [Dependențe](#dependențe)
- [Cerințe de sistem](#cerințe-de-sistem)
- [Instalare și pornire locală](#instalare-și-pornire-locală)
- [Comenzi disponibile](#comenzi-disponibile)
- [Structura proiectului](#structura-proiectului)
- [Date locale și confidențialitate](#date-locale-și-confidențialitate)
- [Limitări și verificări înainte de zbor](#limitări-și-verificări-înainte-de-zbor)
- [Surse oficiale](#surse-oficiale)

## Funcționalități

### Panou principal

- Oferă acces rapid la hartă, planificarea unui zbor, profil și ghid.
- Prezintă pe scurt pașii de planificare și linkuri către surse oficiale.

### Hartă aeronautică

- Afișează un strat local cu zone ROMATSA pentru drone și permite comutarea între harta stradală OpenStreetMap și imaginile aeriene Esri.
- Permite adăugarea punctelor unui poligon, previzualizarea zonei, anularea ultimului punct, redesenarea și salvarea acesteia pentru cererea de zbor.
- După salvarea poligonului, aplicația revine la pagina de planificare.
- Afișează și poligoanele cererilor marcate local ca aprobate; această afișare nu confirmă o aprobare oficială.
- Oferă acces către serviciul oficial MApN AEROFOTO. Serviciul MApN se deschide separat; nu este integrat ca strat în hartă.

### Profil și flotă

- Păstrează local datele operatorului/pilotului, inclusiv numele, datele de contact și ID-ul de operator.
- Permite salvarea mai multor drone, cu poreclă, model, masă, clasă, model de cameră și rezoluție.
- Include modele și configurații de cameră prestabilite, precum și posibilitatea de a gestiona dronele din profil.
- Drona selectată este folosită la pregătirea cererii și la completarea câmpurilor relevante din Anexa 1.

### Planificarea cererii

- Folosește poligonul salvat, data, durata, scopul și drona selectată.
- Afișează intervale candidate între orele 08:00 și 20:00, în pași de 30 de minute, comparând planurile suprapuse salvate în baza de date a instalării curente.
- Identifică turnul TWR doar când contactele ROMATSA ale zonelor care intersectează poligonul indică fără ambiguitate un singur turn cunoscut.
- Colectează automat categoria, modul de operare (VLOS/BVLOS) și altitudinea maximă AGL în ft. Categoria propusă urmează regulile simplificate din interfață: A1 sub 250 g, A3 de la 250 g, iar A2 este disponibilă numai pentru drone C2 din intervalul de masă acceptat de formular.
- Cere o semnătură digitala fiecare cerere.
- Poate genera în browser un proiect PDF Anexa 1, precum și un rezumat al cererii și un fișier GeoJSON al poligonului.
- Poate deschide o ciornă de email către contactele extrase din zonele intersectate.
- Permite marcarea locală a unei cereri ca trimisă sau aprobarea ei înregistrată. Aceste acțiuni nu trimit emailuri și nu verifică aprobări reale(demo).

### Ghid și test de pregătire

- Include informații generale și linkuri utile pentru verificarea regulilor.
- Oferă întrebări de exercițiu pentru categoriile A1, A2 și A3, cu feedback și explicații.
- Testul este doar pentru exersare; nu este examen oficial și nu acordă un certificat.

### Limbă, temă și acces demo

- Interfața poate fi afișată în română sau engleză.
- Tema luminoasă/albă și tema întunecată pot fi schimbate din interfață.
- Ecranul de autentificare oferă acces la o sesiune demo locală.
- Formularul email/parolă este doar o interfață demonstrativă. Nu autentifică utilizatori și nu trimite sau salvează parola.

## Tutorial de utilizare

1. **Deschide aplicația.** La prima vizită, alege „Continuă cu contul demo”. Sesiunea demo se memorează în browserul curent.
2. **Completează profilul.** Introdu numele pilotului și ID-ul operatorului AACR, apoi salvează una sau mai multe drone în flotă. Pentru document, selectează clasa certificată corectă și completează detaliile camerei.
3. **Desenează zona de zbor.** Deschide harta, adaugă cel puțin trei puncte, verifică previzualizarea poligonului și salvează zona.
4. **Verifică zonele intersectate.** Consultă contactele și instrucțiunile afișate, apoi confirmă informațiile pe hărțile și documentele aeronautice oficiale. Pentru imagini, deschide separat MApN AEROFOTO.
5. **Completează planul.** În pagina „Flight request”, selectează drona, data, intervalul candidat și scopul. Verifică turnul TWR identificat automat. Completează categoria, modul VLOS/BVLOS și altitudinea AGL în ft.
6. **Semnează cererea.** Desenează semnătura în zona dedicată. Semnătura este asociată doar cererii respective și va apărea vizual în PDF.
7. **Generează documentele.** Pregătește pachetul local și descarcă PDF-ul Anexa 1 sau fișierele pachetului. Verifică fiecare câmp și atașează documentele necesare manual.
8. **Trimite prin canalele oficiale.** Dacă folosești ciorna de email, verifică destinatarul, atașează documentele și trimite mesajul tu. Actualizarea statusului în Aerio este doar locală.

## Tehnologii și arhitectură

### Frontend

- **Next.js App Router** pentru paginile aplicației și navigare.
- **React 19** pentru componente și interacțiunile interfeței.
- **TypeScript** cu verificare strictă a tipurilor.
- **React Leaflet și Leaflet** pentru hartă, poligoane și straturi geografice.
- **CSS global** pentru interfață, layout, teme și adaptarea la ecrane diferite; proiectul include și integrarea Tailwind CSS/PostCSS.
- **TanStack React Query** prin integrarea tRPC pentru cereri și cache în client.
- **pdf-lib și @pdf-lib/fontkit** pentru completarea locală a PDF-ului și încorporarea fontului pentru caractere românești.

### Backend

- **Next.js** găzduiește aplicația web și endpoint-ul API.
- **tRPC** oferă API tipizat între interfață și server.
- **Zod** validează datele primite de procedurile API.
- **Prisma ORM** accesează baza de date.
- **SQLite** stochează planurile de zbor folosite la verificarea suprapunerilor în această instalare.

### Bază de date și stocare

- Modelul `FlightPlan` păstrează data, intervalul, zona, drona, scopul și momentul creării.
- Profilul, semnăturile cererilor, limba, tema, sesiunea demo și statusurile locale sunt stocate în browser (`localStorage`).
- Nu există conturi reale, autentificare, sincronizare multi-utilizator sau serviciu de stocare cloud configurat.

## Dependențe

Versiunile declarate în `package.json` sunt folosite la instalare; lista de mai jos descrie rolul principal al fiecăreia.

### Dependențe de producție

| Pachet | Rol |
|---|---|
| `next` | Framework web, App Router și API routes |
| `react`, `react-dom` | Interfață și randare React |
| `@prisma/client` | Acces la baza de date prin Prisma |
| `@t3-oss/env-nextjs` | Utilitare pentru variabile de mediu Next.js |
| `@trpc/client`, `@trpc/react-query`, `@trpc/server` | API tRPC și integrarea cu React Query |
| `@tanstack/react-query` | Cache și gestionarea cererilor asincrone |
| `zod` | Validarea schemelor de intrare și a datelor |
| `superjson` | Serializarea datelor folosite de tRPC |
| `prisma` | Schema, clientul și comenzile pentru baza de date |
| `leaflet`, `react-leaflet` | Hărți și componente geografice |
| `pdf-lib`, `@pdf-lib/fontkit` | Completare PDF și încorporare fonturi |
| `server-only` | Protejarea modulelor destinate exclusiv serverului |

### Dependențe de dezvoltare

| Pachet | Rol |
|---|---|
| `typescript` | Compilator și verificare TypeScript |
| `eslint`, `eslint-config-next`, `typescript-eslint` | Analiză statică și reguli de cod |
| `prettier`, `prettier-plugin-tailwindcss` | Formatarea fișierelor |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/leaflet` | Definiții TypeScript pentru biblioteci |
| `@eslint/eslintrc` | Compatibilitate/configurare ESLint |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | Instrumente CSS incluse în setup-ul proiectului |

## Cerințe de sistem

- Node.js **22 LTS** (recomandat) sau Node.js **20.17+**.
- npm (proiectul declară `npm@11.6.2` ca manager de pachete).
- Git pentru clonarea depozitului.
- Acces la internet pentru instalarea pachetelor și încărcarea straturilor de hartă externe.

## Instalare și pornire locală

Comenzile următoare sunt valabile în PowerShell, Command Prompt sau terminalul VS Code.

1. Clonează depozitul și intră în directorul proiectului:

   ```powershell
   git clone https://github.com/RaulADR/Hackathon-SH2.git
   cd Hackathon-SH2
   ```

2. Creează fișierul local de configurare pornind de la exemplu:

   ```powershell
   Copy-Item .env.example .env
   ```

   Fișierul `.env.example` folosește `DATABASE_URL="file:./db.sqlite"`, potrivit pentru SQLite local. Nu publica fișierul `.env` și nu introduce secrete în `.env.example`.

3. Instalează dependențele:

   ```powershell
   npm install
   ```

   Scriptul `postinstall` generează clientul Prisma. Dacă este nevoie, îl poți genera manual:

   ```powershell
   npm run db:generate
   ```

4. Creează/actualizează schema SQLite locală:

   ```powershell
   npm run db:push
   ```

5. Pornește serverul de dezvoltare:

   ```powershell
   npm run dev
   ```

6. Deschide adresa afișată de Next.js, implicit [http://localhost:3000](http://localhost:3000). Dacă portul 3000 este ocupat:

   ```powershell
   npm run dev -- --port 3004
   ```

### Build pentru producție

```powershell
npm run build
npm run start
```

Serverul de producție folosește implicit portul 3000; se poate configura portul prin variabila de mediu `PORT`.

## Comenzi disponibile

| Comandă | Descriere |
|---|---|
| `npm run dev` | Pornește mediul Next.js de dezvoltare cu Turbopack |
| `npm run build` | Creează build-ul optimizat pentru producție |
| `npm run start` | Pornește build-ul de producție |
| `npm run preview` | Construiește și pornește aplicația pentru previzualizare |
| `npm run lint` | Rulează ESLint |
| `npm run typecheck` | Verifică tipurile TypeScript |
| `npm run check` | Rulează ESLint și TypeScript |
| `npm run format:check` | Verifică formatarea fișierelor |
| `npm run format:write` | Formatează fișierele acceptate de script |
| `npm run db:generate` | Generează clientul Prisma |
| `npm run db:push` | Aplică schema Prisma în baza de date configurată |
| `npm run db:migrate` | Aplică migrațiile Prisma versionate, dacă există |
| `npm run db:studio` | Deschide interfața Prisma Studio |

În configurația actuală nu există un director cu migrații versionate; pentru configurarea inițială sau actualizarea bazei SQLite locale folosește `npm run db:push`.

## Structura proiectului

```text
src/
  app/                    Pagini Next.js, layout-uri și componente client
    _components/           Hartă, semnătură, navigare și componente UI
    airspace/              Pagina hărții
    learn/                 Ghidul și testul de exercițiu
    login/                 Ecranul demo/autentificare demonstrativă
    profile/               Profilul local și flota de drone
    request/               Planificare și generare documente
  lib/                    Geometrie, drone, contacte TWR și PDF
  server/
    api/                   Routere și proceduri tRPC
    db.ts                  Inițializarea clientului Prisma
  styles/                 Stilurile aplicației și temele
  trpc/                   Integrarea React/server pentru tRPC
prisma/
  schema.prisma           Schema SQLite/Prisma
public/
  anexa1.pdf               Formularul PDF folosit ca șablon
  data/                    Setul ROMATSA inclus
  fonts/                   Font Noto Sans și licența lui
legacy/                    Prototipul static arhivat
```

## Date locale și confidențialitate

- Datele de profil și semnăturile sunt salvate în `localStorage` în browserul folosit. Ștergerea datelor site-ului din browser le poate elimina.
- Pachetele și statusurile locale sunt păstrate în browser. Planurile de bază pentru intervale (zonă, dată/oră, dronă și scop) sunt înregistrate în SQLite-ul serverului local.
- Semnătura desenată este o imagine inserată vizual în PDF; nu este semnătură digitală criptografică și nu verifică identitatea semnatarului.
- Sesiunea demo nu este un mecanism de autentificare sau control de acces.
- Înainte de o implementare publică sunt necesare autentificare reală, reguli de acces, protecție împotriva abuzului, politici de retenție a datelor și o configurație de producție securizată.

## Limitări și verificări înainte de zbor

- Setul ROMATSA din `public/data/romatsa-uav-zones.json` este o copie locală, nu un serviciu live. Verifică actualitatea și instrucțiunile zonei pe sursele oficiale.
- Datele incluse nu descriu limite CTR oficiale. Identificarea TWR este o mapare a contactelor zonelor care intersectează poligonul; dacă rezultatul este absent sau ambiguu, aplicația nu ghicește turnul și blochează generarea Anexa 1. Confirmă întotdeauna CTR-ul și turnul competent pe hărți și documente oficiale.
- Interogarea intervalelor verifică doar planurile din baza de date a instalării curente. Nu reflectă zboruri ale altor utilizatori, rezervări ale autorităților, NOTAM-uri sau disponibilitate reală.
- Datele de masă, modelele de drone, clasele și camerele prestabilite sunt ajutoare de configurare, nu specificații garantate. Verifică eticheta clasei și documentația aeronavei tale.
- Categoria A1/A2/A3 este o regulă simplificată pentru interfață. Eligibilitatea efectivă depinde de clasa și configurația aeronavei, condițiile operațiunii și reglementările în vigoare.
- Formularul PDF este o ciornă. Revizuiește toate câmpurile, unitățile, destinatarii și documentele înainte de transmiterea manuală. Aerio nu completează automat cerințe care nu sunt disponibile în profil sau în datele zonei.
- Linkurile de email deschid o ciornă în clientul de email al utilizatorului. Aerio nu trimite mesaje, nu rezervă spațiu aerian și nu verifică aprobări.
- Harta Esri/OSM depinde de servicii externe și de disponibilitatea conexiunii la internet.
- Informațiile din ghid și testul de exercițiu nu înlocuiesc legislația, instruirea, certificarea sau recomandările autorităților.

## Surse oficiale

- [Harta UAS ROMATSA](https://flightplan.romatsa.ro/init/drones)
- [MApN AEROFOTO](https://aerofoto.mapn.ro/)
- [Autoritatea Aeronautică Civilă Română (AACR)](https://www.caa.ro/)
- [EASA — Drone](https://www.easa.europa.eu/en/domains/civil-drones)
