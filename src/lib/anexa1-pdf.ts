import type { DroneClass } from "~/lib/drone";
import type { LatLngPoint } from "~/lib/geometry";

export type Anexa1Data = {
  pilot: string;
  email: string;
  phone: string;
  operatorId: string;
  location: string;
  registration: string;
  droneMassGrams?: number;
  droneClass?: DroneClass;
  flightDate: string;
  startTime: string;
  endTime: string;
  drone: string;
  purpose: string;
  area: LatLngPoint[];
  tower: string;
  flightCategory: string;
  operationMode: string;
  maxAltitude: string;
  signatureDataUrl: string;
};

const classOptions: Partial<Record<DroneClass, string>> = {
  C0: "C0 <250g",
  C1: "C1 250g < 900g",
  C2: "C2 900g < 4kg",
  C3: "C3 <25kg",
  C4: "C4 <25kg",
};

function formatRomanianDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}.${month}.${year}` : value;
}

function toDegreesMinutesSeconds(value: number) {
  const hundredthsOfSeconds = Math.round(Math.abs(value) * 360_000);
  const degrees = Math.floor(hundredthsOfSeconds / 360_000);
  const remainingHundredths = hundredthsOfSeconds % 360_000;
  const minutes = Math.floor(remainingHundredths / 6_000);
  const seconds = ((remainingHundredths % 6_000) / 100).toFixed(2);
  return {
    degrees: `${value < 0 ? "-" : ""}${degrees}`,
    minutes: String(minutes),
    seconds,
  };
}

export async function createFilledAnexa1(
  template: ArrayBuffer,
  fontBytes: ArrayBuffer,
  data: Anexa1Data,
): Promise<Uint8Array> {
  const [{ PDFDocument, PDFTextField }, { default: fontkit }] =
    await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes);
  const form = pdf.getForm();
  const sizedFields = new Set<string>();
  const setText = (name: string, value: string) => {
    if (!value.trim()) return;
    const field = form.getTextField(name);
    const widget = field.acroField.getWidgets()[0];
    const rectangle = widget?.getRectangle();
    if (!rectangle)
      throw new Error(`The Anexa 1 field "${name}" has no widget.`);
    const baseSize = rectangle.width < 32 ? 7 : rectangle.height < 20 ? 8 : 10;
    const availableWidth = Math.max(12, rectangle.width - 4);
    const measuredWidth = font.widthOfTextAtSize(value.trim(), baseSize);
    const fittedSize = Math.min(
      baseSize,
      (baseSize * availableWidth) / Math.max(measuredWidth, 1),
    );
    field.setFontSize(Math.max(rectangle.width < 32 ? 6 : 7, fittedSize));
    sizedFields.add(name);
    field.setText(value.trim());
  };

  setText("operator", data.pilot);
  setText("Date de contact", data.location);
  setText("pers_contact", data.pilot);
  setText("mobil", data.phone);
  setText("email", data.email);
  setText("inmatriculare", data.operatorId);
  setText(
    "greutate",
    data.droneMassGrams && data.droneMassGrams > 0
      ? String(Number((data.droneMassGrams / 1000).toFixed(3)))
      : "",
  );
  setText("Nume_pilot", data.pilot);
  setText("telefon_pilot", data.phone);
  setText("scop_zbor", data.purpose);
  const altitudeFeet = Number(data.maxAltitude);
  if (!Number.isFinite(altitudeFeet) || altitudeFeet < 1 || altitudeFeet > 400)
    throw new Error("Maximum altitude must be between 1 and 400 ft.");
  setText("inaltime_zbor", `${altitudeFeet} ft`);
  setText("localitatea", data.location);
  setText("data_zbor", formatRomanianDate(data.flightDate));
  setText("data_zbor_end", formatRomanianDate(data.flightDate));
  setText("ora_start", data.startTime);
  setText("ora_finală", data.endTime);

  const towerField = form.getDropdown("TWR");
  towerField.clear();
  if (!towerField.getOptions().includes(data.tower))
    throw new Error("Select a valid TWR before generating the Anexa 1 PDF.");
  towerField.select(data.tower);

  const categoryField = form.getDropdown("categorie_zbor");
  categoryField.clear();
  const validCategories =
    data.droneMassGrams !== undefined && data.droneMassGrams < 250
      ? ["A1"]
      : data.droneClass === "C2" &&
          data.droneMassGrams !== undefined &&
          data.droneMassGrams >= 900 &&
          data.droneMassGrams <= 4000
        ? ["A2", "A3"]
        : ["A3"];
  if (
    !validCategories.includes(data.flightCategory) ||
    !categoryField.getOptions().includes(data.flightCategory)
  )
    throw new Error("The selected flight category does not match the drone.");
  categoryField.select(data.flightCategory);

  const operationField = form.getDropdown("mod_operare");
  operationField.clear();
  if (!operationField.getOptions().includes(data.operationMode))
    throw new Error("Select a valid operation mode before generating the PDF.");
  operationField.select(data.operationMode);

  const aircraftClass = data.droneClass
    ? classOptions[data.droneClass]
    : undefined;
  const classField = form.getDropdown("Clasa");
  classField.clear();
  if (!aircraftClass || !classField.getOptions().includes(aircraftClass))
    throw new Error("Select the drone’s certified class in the pilot profile.");
  classField.select(aircraftClass);

  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    data.signatureDataUrl,
  );
  if (!match?.[1])
    throw new Error("The request signature must be a valid PNG image.");
  const binary = atob(match[1]);
  const signatureBytes = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );
  const signatureField = form.getField("semnatura");
  const signatureWidget = signatureField.acroField.getWidgets()[0];
  const signatureRect = signatureWidget?.getRectangle();
  const signaturePage = pdf.getPages()[1];
  if (!signatureRect || !signaturePage)
    throw new Error("The Anexa 1 signature field could not be located.");
  const signatureImage = await pdf.embedPng(signatureBytes);
  const fittedSize = signatureImage.scaleToFit(
    signatureRect.width,
    signatureRect.height,
  );
  signaturePage.drawImage(signatureImage, {
    x: signatureRect.x + (signatureRect.width - fittedSize.width) / 2,
    y: signatureRect.y + (signatureRect.height - fittedSize.height) / 2,
    ...fittedSize,
  });
  form.removeField(signatureField);

  data.area.slice(0, 5).forEach(([latitude, longitude], index) => {
    const pointNumber = index + 1;
    const latitudeDms = toDegreesMinutesSeconds(latitude);
    const longitudeDms = toDegreesMinutesSeconds(longitude);
    setText(`gr${pointNumber}_lat`, latitudeDms.degrees);
    setText(`min${pointNumber}_lat`, latitudeDms.minutes);
    setText(`sec${pointNumber}_lat`, latitudeDms.seconds);
    setText(`gr${pointNumber}_long`, longitudeDms.degrees);
    setText(`min${pointNumber}_long`, longitudeDms.minutes);
    setText(`sec${pointNumber}_long`, longitudeDms.seconds);
  });

  for (const field of form.getFields()) {
    if (!(field instanceof PDFTextField)) continue;
    if (sizedFields.has(field.getName())) continue;
    const rectangle = field.acroField.getWidgets()[0]?.getRectangle();
    if (!rectangle) continue;
    const fontSize =
      rectangle.width < 32
        ? 7
        : rectangle.height < 20
          ? 8
          : rectangle.width < 100
            ? 9
            : 10;
    field.setFontSize(fontSize);
  }

  form.updateFieldAppearances(font);
  pdf.setTitle("Anexa 1 - formular completat cu datele planului Aerio");
  pdf.setSubject(
    "Copie completată pentru verificare. Confirmați informațiile și cerințele oficiale înainte de transmitere.",
  );

  if (data.area.length > 5) {
    const rowsPerPage = 42;
    for (let offset = 0; offset < data.area.length; offset += rowsPerPage) {
      const page = pdf.addPage([595.32, 841.92]);
      const pageNumber = Math.floor(offset / rowsPerPage) + 1;
      page.drawText("AERIO - SUPPLEMENTAL FLIGHT AREA COORDINATES", {
        x: 48,
        y: 790,
        size: 15,
        font,
      });
      page.drawText(
        "Supplement to Anexa 1. This page is generated by Aerio and is not an official form.",
        { x: 48, y: 766, size: 9, font },
      );
      page.drawText(
        `Date: ${formatRomanianDate(data.flightDate)}    Pilot: ${data.pilot || "Not provided"}    Sheet ${pageNumber}`,
        { x: 48, y: 746, size: 9, font },
      );
      page.drawText("Point", { x: 56, y: 716, size: 9, font });
      page.drawText("Latitude", { x: 120, y: 716, size: 9, font });
      page.drawText("Longitude", { x: 280, y: 716, size: 9, font });
      page.drawText("Decimal coordinates", { x: 420, y: 716, size: 9, font });

      const points = data.area.slice(offset, offset + rowsPerPage);
      points.forEach(([latitude, longitude], rowIndex) => {
        const y = 694 - rowIndex * 14;
        const pointNumber = offset + rowIndex + 1;
        const latitudeDms = toDegreesMinutesSeconds(latitude);
        const longitudeDms = toDegreesMinutesSeconds(longitude);
        page.drawText(String(pointNumber), { x: 60, y, size: 8, font });
        page.drawText(
          `${latitudeDms.degrees}° ${latitudeDms.minutes}' ${latitudeDms.seconds}"`,
          { x: 120, y, size: 8, font },
        );
        page.drawText(
          `${longitudeDms.degrees}° ${longitudeDms.minutes}' ${longitudeDms.seconds}"`,
          { x: 280, y, size: 8, font },
        );
        page.drawText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, {
          x: 420,
          y,
          size: 8,
          font,
        });
      });
    }
  }

  return pdf.save();
}
