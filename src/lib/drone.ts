export type DroneClass = "none" | "C0" | "C1" | "C2" | "C3" | "C4";

export type CameraPreset = {
  id: string;
  model: string;
  resolutions: string[];
};

export type DronePreset = {
  id: string;
  model: string;
  massGrams: number | null;
  cameraIds: string[];
  defaultCameraId: string;
};

export type PilotDrone = {
  id: string;
  nickname: string;
  model: string;
  massGrams: number;
  droneClass: DroneClass;
  cameraModel: string;
  cameraResolution: string;
};

export const cameraPresets: CameraPreset[] = [
  {
    id: "mini-4-pro-camera",
    model: "DJI Mini 4 Pro camera",
    resolutions: [
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "mini-3-pro-camera",
    model: "DJI Mini 3 Pro camera",
    resolutions: [
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "air-3-wide",
    model: "DJI Air 3 · wide-angle camera",
    resolutions: [
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "air-3-tele",
    model: "DJI Air 3 · 3× tele camera",
    resolutions: [
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "mavic-3-pro-main",
    model: "DJI Mavic 3 Pro · Hasselblad main camera",
    resolutions: [
      "5.1K · 5120 × 2700",
      "DCI 4K · 4096 × 2160",
      "4K UHD · 3840 × 2160",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "mavic-3-pro-medium",
    model: "DJI Mavic 3 Pro · medium tele camera",
    resolutions: ["4K UHD · 3840 × 2160", "Full HD · 1920 × 1080"],
  },
  {
    id: "mavic-3-pro-tele",
    model: "DJI Mavic 3 Pro · tele camera",
    resolutions: ["4K UHD · 3840 × 2160", "Full HD · 1920 × 1080"],
  },
  {
    id: "avata-2-camera",
    model: "DJI Avata 2 camera",
    resolutions: [
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
    ],
  },
  {
    id: "neo-camera",
    model: "DJI Neo camera",
    resolutions: ["4K UHD · 3840 × 2160", "Full HD · 1920 × 1080"],
  },
  {
    id: "gopro-hero-13",
    model: "GoPro HERO13 Black",
    resolutions: [
      "5.3K · 5312 × 2988",
      "4K UHD · 3840 × 2160",
      "2.7K · 2704 × 1520",
    ],
  },
  {
    id: "insta360-x5",
    model: "Insta360 X5",
    resolutions: ["8K · 7680 × 3840", "5.7K · 5760 × 2880", "4K · 3840 × 1920"],
  },
  {
    id: "custom-camera",
    model: "Other camera",
    resolutions: [
      "8K · 7680 × 4320",
      "6K · 6144 × 3160",
      "5.1K · 5120 × 2700",
      "5.3K · 5312 × 2988",
      "4K UHD · 3840 × 2160",
      "2.7K · 2720 × 1530",
      "Full HD · 1920 × 1080",
      "Other resolution",
    ],
  },
];

export const dronePresets: DronePreset[] = [
  {
    id: "mini-4-pro",
    model: "DJI Mini 4 Pro",
    massGrams: 249,
    cameraIds: ["mini-4-pro-camera"],
    defaultCameraId: "mini-4-pro-camera",
  },
  {
    id: "mini-3-pro",
    model: "DJI Mini 3 Pro",
    massGrams: 248,
    cameraIds: ["mini-3-pro-camera"],
    defaultCameraId: "mini-3-pro-camera",
  },
  {
    id: "air-3",
    model: "DJI Air 3",
    massGrams: 720,
    cameraIds: ["air-3-wide", "air-3-tele"],
    defaultCameraId: "air-3-wide",
  },
  {
    id: "mavic-3-pro",
    model: "DJI Mavic 3 Pro",
    massGrams: 958,
    cameraIds: ["mavic-3-pro-main", "mavic-3-pro-medium", "mavic-3-pro-tele"],
    defaultCameraId: "mavic-3-pro-main",
  },
  {
    id: "avata-2",
    model: "DJI Avata 2",
    massGrams: 377,
    cameraIds: ["avata-2-camera"],
    defaultCameraId: "avata-2-camera",
  },
  {
    id: "neo",
    model: "DJI Neo",
    massGrams: 135,
    cameraIds: ["neo-camera"],
    defaultCameraId: "neo-camera",
  },
  {
    id: "custom",
    model: "",
    massGrams: null,
    cameraIds: cameraPresets.map((camera) => camera.id),
    defaultCameraId: "custom-camera",
  },
];

const classMaximums: Partial<Record<DroneClass, number>> = {
  C0: 249,
  C1: 899,
  C2: 4000,
  C3: 24999,
  C4: 24999,
};

function isDroneClass(value: unknown): value is DroneClass {
  return (
    value === "none" ||
    value === "C0" ||
    value === "C1" ||
    value === "C2" ||
    value === "C3" ||
    value === "C4"
  );
}

export function normalizeDrones(value: unknown): PilotDrone[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((drone, index) => {
    if (typeof drone === "string") {
      const model = drone.trim();
      return model
        ? [
            {
              id: `legacy-${index}-${model}`,
              nickname: model,
              model,
              massGrams: 0,
              droneClass: "none" as const,
              cameraModel: "",
              cameraResolution: "",
            },
          ]
        : [];
    }
    if (!drone || typeof drone !== "object") return [];
    const item = drone as Partial<PilotDrone>;
    if (
      typeof item.id !== "string" ||
      typeof item.nickname !== "string" ||
      typeof item.model !== "string"
    )
      return [];
    return [
      {
        id: item.id,
        nickname: item.nickname,
        model: item.model,
        massGrams:
          typeof item.massGrams === "number" && Number.isFinite(item.massGrams)
            ? item.massGrams
            : 0,
        droneClass: isDroneClass(item.droneClass) ? item.droneClass : "none",
        cameraModel:
          typeof item.cameraModel === "string" ? item.cameraModel : "",
        cameraResolution:
          typeof item.cameraResolution === "string"
            ? item.cameraResolution
            : "",
      },
    ];
  });
}

export function getDroneCategory(
  drone: Pick<PilotDrone, "massGrams" | "droneClass">,
  romanian = false,
) {
  const { massGrams, droneClass } = drone;
  if (massGrams <= 0)
    return {
      title: romanian ? "Nespecificată" : "Not set",
      detail: romanian
        ? "Introdu greutatea pentru estimarea categoriei."
        : "Enter the mass to estimate a category.",
    };
  if (massGrams >= 25000)
    return {
      title: romanian ? "Categoria Specifică" : "Specific category",
      detail: romanian
        ? "La sau peste limita de 25 kg a categoriei Open."
        : "At or above the 25 kg Open category limit.",
    };

  if (droneClass !== "none") {
    const classMaximum = classMaximums[droneClass];
    if (classMaximum !== undefined && massGrams > classMaximum) {
      return {
        title: romanian ? "Verifică clasa / greutatea" : "Check class / mass",
        detail: romanian
          ? `Greutatea maximă pentru clasa ${droneClass} este ${classMaximum} g.`
          : `${droneClass} class maximum mass is ${classMaximum} g.`,
      };
    }
    if (droneClass === "C0" || droneClass === "C1")
      return {
        title: romanian ? "Categoria deschisă A1" : "Open A1",
        detail: romanian
          ? `Aeronava ${droneClass}; verifică eticheta și regulile operaționale actuale.`
          : `${droneClass} aircraft; verify its label and current operating rules.`,
      };
    if (droneClass === "C2")
      return {
        title: romanian ? "Categoria deschisă A2 / A3" : "Open A2 / A3",
        detail: romanian
          ? "A2 are cerințe suplimentare de pilotaj și distanță; A3 este o altă opțiune."
          : "A2 has additional pilot and separation requirements; A3 is another option.",
      };
    return {
      title: romanian ? "Categoria deschisă A3" : "Open A3",
      detail: romanian
        ? `Aeronava ${droneClass}; respectă distanțele față de persoane și zone construite.`
        : `${droneClass} aircraft; keep the required distance from people and built-up areas.`,
    };
  }

  return massGrams < 250
    ? {
        title: romanian ? "Greutate sub 250 g" : "Mass band under 250 g",
        detail: romanian
          ? "Adesea A1, dar statutul aeronavei și regulile aplicabile contează."
          : "Often A1, but the aircraft's status and rules still matter.",
      }
    : {
        title: romanian ? "Greutate până la 25 kg" : "Mass band up to 25 kg",
        detail: romanian
          ? "Adesea A3 pentru aeronavele fără marcaj de clasă; verifică regulile tranzitorii și statutul aeronavei."
          : "Often A3 for legacy aircraft; confirm transition rules and aircraft status.",
      };
}
