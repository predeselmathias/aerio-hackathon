"use client";

import dynamic from "next/dynamic";
import { useRomanian } from "~/app/_components/language-context";

const AirspaceMap = dynamic(
  () =>
    import("~/app/_components/airspace-map").then(
      (module) => module.AirspaceMap,
    ),
  {
    ssr: false,
    loading: () => <div className="map-loading">Loading Romania map…</div>,
  },
);

export default function AirspacePage() {
  const ro = useRomanian();
  return (
    <>
      <p className="route-description">
        {ro
          ? "Desenează un poligon pentru a verifica zonele de referință și a-l folosi în cererea ta."
          : "Draw a polygon to review reference zones and carry the area into your request."}
      </p>
      <AirspaceMap />
    </>
  );
}
