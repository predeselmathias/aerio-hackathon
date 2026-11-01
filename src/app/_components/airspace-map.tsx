"use client";

import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon as GeoPolygon,
} from "geojson";
import { useEffect, useMemo, useState } from "react";

import { useRomanian } from "~/app/_components/language-context";
import { extractEmailAddresses } from "~/lib/contacts";
import {
  areasOverlap,
  geoJsonRingToLatLng,
  type LatLngPoint,
} from "~/lib/geometry";

type ZoneProperties = {
  zone_id?: string;
  lower_lim?: string;
  upper_lim?: string;
  contact?: string;
};
type ZoneFeature = Feature<GeoPolygon | MultiPolygon, ZoneProperties>;
type ApprovedArea = { id: string; area: LatLngPoint[] };
const AREA_KEY = "aerio.flightArea";
const APPROVED_KEY = "aerio.approvedPlans";

function readArea(): LatLngPoint[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(AREA_KEY) ?? "[]");
    if (Array.isArray(stored) && stored.length >= 3)
      return stored as LatLngPoint[];
  } catch (error) {
    console.error("Could not read the saved flight area.", error);
  }
  return [];
}

function readApprovedAreas(): ApprovedArea[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(APPROVED_KEY) ?? "[]",
    );
    if (Array.isArray(stored)) return stored as ApprovedArea[];
  } catch (error) {
    console.error("Could not read locally recorded approvals.", error);
  }
  return [];
}

function DrawingClicks({
  drawing,
  onPoint,
}: {
  drawing: boolean;
  onPoint: (point: LatLngPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (drawing) onPoint([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function ringsFor(feature: ZoneFeature): LatLngPoint[][] {
  if (feature.geometry.type === "Polygon") {
    const ring = feature.geometry.coordinates[0];
    return ring ? [geoJsonRingToLatLng(ring)] : [];
  }
  return feature.geometry.coordinates.flatMap((polygon) => {
    const ring = polygon[0];
    return ring ? [geoJsonRingToLatLng(ring)] : [];
  });
}

export function AirspaceMap() {
  const ro = useRomanian();
  const router = useRouter();
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<LatLngPoint[]>([]);
  const [area, setArea] = useState<LatLngPoint[]>([]);
  const [approved, setApproved] = useState<ApprovedArea[]>([]);
  const [zones, setZones] = useState<FeatureCollection<
    GeoPolygon | MultiPolygon,
    ZoneProperties
  > | null>(null);
  const [zoneError, setZoneError] = useState("");
  const [satellite, setSatellite] = useState(false);
  const [romatsaVisible, setRomatsaVisible] = useState(true);

  useEffect(() => {
    setArea(readArea());
    setApproved(readApprovedAreas());
    void fetch("/data/romatsa-uav-zones.json")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`ROMATSA data request failed (${response.status}).`);
        return (await response.json()) as FeatureCollection<
          GeoPolygon | MultiPolygon,
          ZoneProperties
        >;
      })
      .then(setZones)
      .catch((error: unknown) => {
        console.error(
          "Unable to load the bundled ROMATSA zone dataset.",
          error,
        );
        setZoneError(
          "ROMATSA zone data could not be loaded. Verify current restrictions on the official map.",
        );
      });
  }, []);

  const intersectingZones = useMemo(() => {
    if (!zones || area.length < 3) return [];
    return zones.features.filter((feature) =>
      ringsFor(feature).some((ring) => areasOverlap(area, ring)),
    );
  }, [zones, area]);

  function finishArea() {
    if (points.length < 3) return;
    setArea(points);
    setPoints([]);
    setDrawing(false);
    localStorage.setItem(AREA_KEY, JSON.stringify(points));
    router.push("/request");
  }

  function clearArea() {
    setArea([]);
    setPoints([]);
    setDrawing(false);
    localStorage.removeItem(AREA_KEY);
  }

  return (
    <div className="map-layout">
      <section
        className="map-panel"
        aria-label="Interactive Romania airspace map"
      >
        <div className="map-toolbar">
          <div className="map-tools">
            {!drawing ? (
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setDrawing(true);
                  setPoints([]);
                }}
              >
                {area.length >= 3
                  ? ro
                    ? "Redesenează zona"
                    : "Redraw area"
                  : ro
                    ? "Începe selectarea zonei"
                    : "Start drawing area"}
              </button>
            ) : (
              <button
                className="button button-danger"
                type="button"
                onClick={() => {
                  setDrawing(false);
                  setPoints([]);
                }}
              >
                {ro ? "Anulează desenarea" : "Cancel drawing"}
              </button>
            )}
            <button
              className="button button-quiet"
              type="button"
              disabled={!drawing || points.length === 0}
              onClick={() => setPoints((previous) => previous.slice(0, -1))}
            >
              {ro ? "Înapoi un punct" : "Undo last point"}
            </button>
            {drawing && (
              <button
                className="button button-success"
                type="button"
                disabled={points.length < 3}
                onClick={finishArea}
              >
                {ro ? "Folosește zona și continuă" : "Use this area & continue"}
              </button>
            )}
            {!drawing && area.length >= 3 && (
              <button
                className="button button-quiet"
                type="button"
                onClick={clearArea}
              >
                {ro ? "Șterge zona" : "Clear area"}
              </button>
            )}
            <span className="draw-status" aria-live="polite">
              {drawing
                ? ro
                  ? `${points.length} puncte · apasă pe hartă pentru a continua`
                  : `${points.length} points · click the map to continue`
                : area.length >= 3
                  ? ro
                    ? "Zona este salvată. Continuă cu cererea de zbor."
                    : "Area saved. Continue with your flight request."
                  : ro
                    ? "Adaugă cel puțin 3 puncte pentru a contura zona."
                    : "Draw at least 3 points to outline your proposed area."}
            </span>
          </div>
          <div className="map-toolbar-layers">
            <div
              className="segmented"
              role="group"
              aria-label={ro ? "Straturi hartă" : "Map layers"}
            >
              <button
                className="seg"
                type="button"
                aria-pressed={romatsaVisible}
                onClick={() => setRomatsaVisible(!romatsaVisible)}
              >
                {ro ? "Zone ROMATSA" : "ROMATSA zones"}
              </button>
              <button
                className="seg"
                type="button"
                aria-pressed={satellite}
                onClick={() => setSatellite(!satellite)}
              >
                {satellite
                  ? ro
                    ? "Hartă stradală"
                    : "Street map"
                  : ro
                    ? "Imagine aeriană"
                    : "Aerial imagery"}
              </button>
            </div>
            <a
              className="map-source-link"
              href="https://aerofoto.mapn.ro/"
              target="_blank"
              rel="noreferrer"
            >
              MApN AEROFOTO ↗
            </a>
          </div>
        </div>
        <div className="map-source-row">
          <p className="map-source-note">
            {zoneError
              ? ro
                ? "Datele ROMATSA nu s-au încărcat. Verifică harta oficială."
                : zoneError
              : zones
                ? ro
                  ? "Zone ROMATSA UAS restricționate · nu reprezintă o autorizare completă."
                  : "ROMATSA restricted UAS zones · not a complete airspace clearance."
                : ro
                  ? "Se încarcă zonele ROMATSA…"
                  : "Loading ROMATSA UAS zones…"}{" "}
            <a
              href="https://flightplan.romatsa.ro/init/drones"
              target="_blank"
              rel="noreferrer"
            >
              {ro ? "Sursă oficială" : "Official source"}
            </a>
          </p>
        </div>
        <MapContainer
          center={[45.85, 24.95]}
          zoom={6}
          minZoom={5}
          maxZoom={18}
          maxBounds={[
            [43.35, 19.65],
            [48.55, 30.15],
          ]}
          maxBoundsViscosity={0.75}
          scrollWheelZoom
          className="map-canvas"
        >
          {satellite ? (
            <TileLayer
              attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}
          {zones && romatsaVisible && (
            <GeoJSON
              data={zones}
              style={{
                color: "#9370ff",
                weight: 1.5,
                fillColor: "#8058e8",
                fillOpacity: 0.18,
              }}
            />
          )}
          {area.length >= 3 && !drawing && (
            <Polygon
              positions={area}
              pathOptions={{ color: "#27c69a", fillOpacity: 0.14, weight: 3 }}
            />
          )}
          {drawing && points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: "#36d8a3",
                fillColor: "#36d8a3",
                fillOpacity: 0.24,
                weight: 3,
                dashArray: "8 6",
              }}
            />
          )}
          {points.length > 1 && (
            <Polyline
              positions={points}
              pathOptions={{ color: "#27c69a", dashArray: "7 6" }}
            />
          )}
          {points.map((point, index) => (
            <CircleMarker
              key={`${point[0]}-${point[1]}-${index}`}
              center={point}
              radius={6}
              pathOptions={{
                color: "#fff",
                fillColor: "#27c69a",
                fillOpacity: 1,
              }}
            />
          ))}
          {approved.map((plan) => (
            <Polygon
              key={plan.id}
              positions={plan.area}
              pathOptions={{
                color: "#50bd75",
                fillColor: "#50bd75",
                fillOpacity: 0.22,
                weight: 2,
              }}
            />
          ))}
          <DrawingClicks
            drawing={drawing}
            onPoint={(point) => setPoints((previous) => [...previous, point])}
          />
        </MapContainer>
        <div className="map-legend">
          <span>
            <i className="legend-purple" />{" "}
            {ro ? "Zonă ROMATSA de referință" : "ROMATSA reference zone"}
          </span>
          <span>
            <i className="legend-green" />{" "}
            {ro
              ? "Ciorna ta / aprobare înregistrată local"
              : "Your draft / locally recorded approval"}
          </span>
        </div>
      </section>
      <aside className="map-side-panel">
        <div className="section-heading">
          <span className="eyebrow">
            {ro ? "ZONA TA DE ZBOR" : "YOUR FLIGHT AREA"}
          </span>
          <h2>
            {area.length >= 3
              ? ro
                ? "Poligon selectat"
                : "Draft polygon selected"
              : ro
                ? "Selectează o zonă"
                : "Select an area"}
          </h2>
        </div>
        <p className="muted">
          {drawing && points.length >= 3
            ? ro
              ? `Previzualizare: poligonul cu ${points.length} puncte se actualizează pe măsură ce selectezi harta. Salvează-l pentru a-l folosi la cerere.`
              : `Preview: the ${points.length}-point polygon updates as you select the map. Save it to use in your request.`
            : area.length >= 3
              ? ro
                ? `${area.length} puncte salvate pe acest dispozitiv. Folosește zona în cererea de zbor.`
                : `${area.length} boundary points saved on this device. Use this area in your flight request.`
              : ro
                ? "Desenează un poligon pe hartă folosind cel puțin trei puncte, apoi închide forma."
                : "Draw a polygon on the map by placing at least three points and closing the shape."}
        </p>
        {area.length >= 3 && (
          <button
            className="button button-quiet"
            type="button"
            onClick={clearArea}
          >
            {ro ? "Șterge zona selectată" : "Clear selected area"}
          </button>
        )}
        <div className="rule-list">
          <span className="eyebrow">
            {ro ? "VERIFICARE ZONE ROMATSA" : "ROMATSA ZONE CHECK"}
          </span>
          {zoneError ? (
            <p className="notice notice-warning">
              {ro
                ? "Datele ROMATSA nu s-au încărcat. Verifică restricțiile curente pe harta oficială."
                : zoneError}
            </p>
          ) : !zones ? (
            <p className="muted">
              {ro
                ? "Se încarcă setul de date ROMATSA inclus…"
                : "Loading the bundled ROMATSA dataset…"}
            </p>
          ) : area.length < 3 ? (
            <p className="muted">
              {ro
                ? "Desenează o zonă pentru a vedea intersecțiile cu restricțiile incluse local."
                : "Draw an area to see intersections with the locally bundled restriction zones."}
            </p>
          ) : intersectingZones.length === 0 ? (
            <p className="notice notice-info">
              {ro
                ? "Nicio zonă ROMATSA din setul inclus nu intersectează poligonul. Aceasta nu confirmă permisiunea de zbor."
                : "No bundled ROMATSA UAS restriction polygon intersects this draft. This does not confirm that flight is permitted."}
            </p>
          ) : (
            <>
              <p className="notice notice-warning">
                {ro
                  ? `${intersectingZones.length} poligon${intersectingZones.length === 1 ? "" : "e"} de restricție intersectează zona.`
                  : `${intersectingZones.length} restriction polygon${intersectingZones.length === 1 ? "" : "s"} intersect this draft.`}
              </p>
              {intersectingZones.map((feature, index) => {
                const properties = feature.properties;
                const contact = properties?.contact ?? "";
                const contactEmails = extractEmailAddresses(contact);
                return (
                  <article
                    className="zone-card"
                    key={`${properties?.zone_id ?? "zone"}-${index}`}
                  >
                    <strong>{properties?.zone_id ?? "UAS restriction"}</strong>
                    <span>
                      {properties?.lower_lim ??
                        (ro
                          ? "Limită inferioară nelistată"
                          : "Lower limit not listed")}{" "}
                      –{" "}
                      {properties?.upper_lim ??
                        (ro
                          ? "Limită superioară nelistată"
                          : "Upper limit not listed")}
                    </span>
                    {contact && (
                      <span>
                        {ro ? "Contact" : "Contact"}:{" "}
                        {contact.replace(/\.For\b/g, ". For")}
                      </span>
                    )}
                    {contactEmails.map((email) => (
                      <a href={`mailto:${email}`} key={email}>
                        {email}
                      </a>
                    ))}
                  </article>
                );
              })}
            </>
          )}
        </div>
        <p className="small-note">
          {ro
            ? "Set local de date ROMATSA, valabil din 30 apr. 2026. Verifică direct restricțiile curente, NOTAM-urile, AIP-ul și instrucțiunile autorităților."
            : "Local ROMATSA data snapshot, valid from 30 Apr 2026. Verify current restrictions, NOTAMs, AIP and authority instructions directly."}{" "}
          <a
            href="https://flightplan.romatsa.ro/init/drones"
            target="_blank"
            rel="noreferrer"
          >
            {ro ? "Harta oficială ROMATSA ↗" : "Official ROMATSA map ↗"}
          </a>
        </p>
        <p className="small-note">
          {ro
            ? "Linkul AEROFOTO deschide serviciul oficial MApN; imaginile afișate aici sunt un strat public Esri, nu serviciul MApN."
            : "AEROFOTO link opens MApN’s official service; imagery displayed here is a public Esri layer and is not the MApN service."}
        </p>
      </aside>
    </div>
  );
}
