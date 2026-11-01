"use client";

import { useEffect, useState } from "react";

import { DroneIcon } from "~/app/_components/drone-icon";
import { useRomanian } from "~/app/_components/language-context";
import {
  cameraPresets,
  dronePresets,
  getDroneCategory,
  normalizeDrones,
  type DroneClass,
  type PilotDrone,
} from "~/lib/drone";

type PilotProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  operatorId: string;
  location: string;
  registration: string;
  insuranceUntil: string;
  drones: PilotDrone[];
};

const emptyProfile: PilotProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  operatorId: "",
  location: "",
  registration: "",
  insuranceUntil: "",
  drones: [],
};

const droneClasses: DroneClass[] = ["none", "C0", "C1", "C2", "C3", "C4"];

export default function ProfilePage() {
  const romanian = useRomanian();
  const [profile, setProfile] = useState(emptyProfile);
  const [addingDrone, setAddingDrone] = useState(false);
  const [editingDroneId, setEditingDroneId] = useState<string | null>(null);
  const [droneForm, setDroneForm] = useState({
    presetId: "mini-4-pro",
    nickname: "",
    model: "DJI Mini 4 Pro",
    massGrams: "249",
    droneClass: "none" as DroneClass,
    cameraId: "mini-4-pro-camera",
    cameraModel: "",
    cameraResolution: "",
    customResolution: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("aerio.profile");
      if (!savedProfile) {
        setAddingDrone(true);
        return;
      }
      const parsed = JSON.parse(savedProfile) as Partial<PilotProfile> & {
        name?: string;
        signatureDataUrl?: string;
      };
      delete parsed.signatureDataUrl;
      const [legacyFirst = "", ...legacyLast] = (parsed.name ?? "")
        .trim()
        .split(/\s+/);
      const drones = normalizeDrones(parsed.drones);
      setProfile({
        ...emptyProfile,
        ...parsed,
        firstName: parsed.firstName?.trim() ? parsed.firstName : legacyFirst,
        lastName: parsed.lastName?.trim()
          ? parsed.lastName
          : legacyLast.join(" "),
        drones,
      });
      setAddingDrone(drones.length === 0);
    } catch (loadError) {
      console.error(
        "Could not load the locally saved pilot profile.",
        loadError,
      );
      setError("The saved profile could not be read.");
    }
  }, []);

  function persistProfile(nextProfile: PilotProfile): boolean {
    setError("");
    try {
      localStorage.setItem("aerio.profile", JSON.stringify(nextProfile));
      setProfile(nextProfile);
      window.dispatchEvent(new Event("aerio:profile-updated"));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (saveError) {
      console.error("Could not save the pilot profile locally.", saveError);
      setError(
        romanian
          ? "Datele nu au putut fi salvate pe acest dispozitiv."
          : "The details could not be saved on this device.",
      );
      return false;
    }
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persistProfile(profile);
  }

  function addDrone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const massGrams = Number(droneForm.massGrams);
    if (
      !droneForm.nickname.trim() ||
      !droneForm.model.trim() ||
      !Number.isFinite(massGrams) ||
      massGrams <= 0 ||
      !droneForm.cameraId ||
      !droneForm.cameraResolution ||
      (droneForm.cameraId === "custom-camera" &&
        !droneForm.cameraModel.trim()) ||
      (droneForm.cameraResolution === "Other resolution" &&
        !droneForm.customResolution.trim())
    )
      return;
    const cameraPreset = cameraPresets.find(
      (camera) => camera.id === droneForm.cameraId,
    );
    if (!cameraPreset) return;
    const drone: PilotDrone = {
      id: editingDroneId ?? crypto.randomUUID(),
      nickname: droneForm.nickname.trim(),
      model: droneForm.model.trim(),
      massGrams,
      droneClass: droneForm.droneClass,
      cameraModel:
        droneForm.cameraId === "custom-camera" && droneForm.cameraModel.trim()
          ? droneForm.cameraModel.trim()
          : cameraPreset.model,
      cameraResolution:
        droneForm.cameraResolution === "Other resolution"
          ? droneForm.customResolution.trim()
          : droneForm.cameraResolution,
    };
    const drones = editingDroneId
      ? profile.drones.map((item) =>
          item.id === editingDroneId ? drone : item,
        )
      : [...profile.drones, drone];
    if (persistProfile({ ...profile, drones })) {
      setEditingDroneId(null);
      setDroneForm({
        presetId: "mini-4-pro",
        nickname: "",
        model: "DJI Mini 4 Pro",
        massGrams: "249",
        droneClass: "none",
        cameraId: "mini-4-pro-camera",
        cameraModel: "",
        cameraResolution: "",
        customResolution: "",
      });
      setAddingDrone(false);
    }
  }

  function editDrone(drone: PilotDrone) {
    const preset = dronePresets.find((item) => item.model === drone.model);
    const cameraPreset = cameraPresets.find(
      (camera) => camera.model === drone.cameraModel,
    );
    setDroneForm({
      presetId: preset?.id ?? "custom",
      nickname: drone.nickname,
      model: drone.model,
      massGrams: drone.massGrams > 0 ? drone.massGrams.toString() : "",
      droneClass: drone.droneClass,
      cameraId: cameraPreset?.id ?? preset?.defaultCameraId ?? "custom-camera",
      cameraModel:
        cameraPreset?.id === "custom-camera" ? drone.cameraModel : "",
      cameraResolution:
        (cameraPreset?.resolutions.includes(drone.cameraResolution) ?? false)
          ? drone.cameraResolution
          : "Other resolution",
      customResolution: cameraPreset?.resolutions.includes(
        drone.cameraResolution,
      )
        ? ""
        : drone.cameraResolution,
    });
    setEditingDroneId(drone.id);
    setAddingDrone(true);
  }

  function cancelDroneForm() {
    setEditingDroneId(null);
    setDroneForm({
      presetId: "mini-4-pro",
      nickname: "",
      model: "DJI Mini 4 Pro",
      massGrams: "249",
      droneClass: "none",
      cameraId: "mini-4-pro-camera",
      cameraModel: "",
      cameraResolution: "",
      customResolution: "",
    });
    setAddingDrone(false);
  }

  function changeDronePreset(presetId: string) {
    const preset = dronePresets.find((item) => item.id === presetId);
    if (!preset) return;
    setDroneForm((current) => ({
      ...current,
      presetId,
      model: preset.model,
      massGrams: preset.massGrams?.toString() ?? "",
      droneClass: "none",
      cameraId: preset.defaultCameraId,
      cameraModel: "",
      cameraResolution: "",
      customResolution: "",
    }));
  }

  function changeCamera(cameraId: string) {
    setDroneForm((current) => ({
      ...current,
      cameraId,
      cameraModel: "",
      cameraResolution: "",
      customResolution: "",
    }));
  }

  function removeDrone(id: string) {
    if (editingDroneId === id) cancelDroneForm();
    persistProfile({
      ...profile,
      drones: profile.drones.filter((drone) => drone.id !== id),
    });
  }

  const requiresInsuranceReview = profile.drones.some(
    (drone) => drone.massGrams > 20000,
  );
  const previewMass = Number(droneForm.massGrams);
  const selectedPreset = dronePresets.find(
    (preset) => preset.id === droneForm.presetId,
  );
  const availableCameras = cameraPresets.filter((camera) =>
    selectedPreset?.cameraIds.includes(camera.id),
  );
  const selectedCamera = availableCameras.find(
    (camera) => camera.id === droneForm.cameraId,
  );
  const categoryPreview =
    Number.isFinite(previewMass) && previewMass > 0
      ? getDroneCategory(
          {
            massGrams: previewMass,
            droneClass: droneForm.droneClass,
          },
          romanian,
        )
      : null;

  return (
    <>
      <p className="route-description">
        {romanian
          ? "Datele tale rămân pe acest dispozitiv și sunt folosite la pregătirea documentelor."
          : "Your details stay on this device and are used to prepare request documents."}
      </p>
      <div className="notice notice-info prominent-notice">
        {romanian
          ? "Acesta este doar un profil local, nu un cont AACR și nu înlocuiește înregistrarea oficială a operatorului sau dronei."
          : "This is a local profile only; it is not an AACR account or a substitute for official drone/operator registration."}
      </div>
      <section className="content-card profile-card">
        <div className="section-heading">
          <span className="eyebrow">
            {romanian ? "DATE OPERATOR" : "OPERATOR DETAILS"}
          </span>
          <h2>{romanian ? "Date de contact" : "Contact details"}</h2>
        </div>
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="form-grid">
            <label className="field">
              <span>{romanian ? "Prenume" : "First name"}</span>
              <input
                value={profile.firstName}
                onChange={(event) =>
                  setProfile({ ...profile, firstName: event.target.value })
                }
                maxLength={80}
                autoComplete="given-name"
              />
            </label>
            <label className="field">
              <span>{romanian ? "Nume" : "Last name"}</span>
              <input
                value={profile.lastName}
                onChange={(event) =>
                  setProfile({ ...profile, lastName: event.target.value })
                }
                maxLength={100}
                autoComplete="family-name"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={profile.email}
                onChange={(event) =>
                  setProfile({ ...profile, email: event.target.value })
                }
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span>{romanian ? "Telefon" : "Phone"}</span>
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) =>
                  setProfile({ ...profile, phone: event.target.value })
                }
                maxLength={40}
                autoComplete="tel"
              />
            </label>
            <label className="field">
              <span>
                {romanian ? "ID operator (AACR)" : "Operator ID (AACR)"}
              </span>
              <input
                value={profile.operatorId}
                onChange={(event) =>
                  setProfile({ ...profile, operatorId: event.target.value })
                }
                maxLength={100}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>
                {romanian ? "Localitate / adresă" : "Location / address"}
              </span>
              <input
                value={profile.location}
                onChange={(event) =>
                  setProfile({ ...profile, location: event.target.value })
                }
                maxLength={180}
                autoComplete="street-address"
              />
            </label>
            <label className="field">
              <span>
                {romanian
                  ? "Înregistrarea dronei (opțional)"
                  : "Drone registration (optional)"}
              </span>
              <input
                value={profile.registration}
                onChange={(event) =>
                  setProfile({ ...profile, registration: event.target.value })
                }
                maxLength={100}
              />
            </label>
            <label className="field">
              <span>
                {romanian
                  ? "Asigurare valabilă până la (opțional)"
                  : "Insurance valid until (optional)"}
              </span>
              <input
                type="date"
                value={profile.insuranceUntil}
                onChange={(event) =>
                  setProfile({ ...profile, insuranceUntil: event.target.value })
                }
              />
            </label>
          </div>
          {requiresInsuranceReview && (
            <p className="notice notice-warning">
              {romanian
                ? "Ai adăugat o dronă de peste 20 kg. Verifică obligația de asigurare aplicabilă în România; câmpul de mai sus este doar pentru evidența ta."
                : "You added a drone over 20 kg. Check the insurance requirement applicable in Romania; the field above is for your records only."}
            </p>
          )}
          {error && (
            <p className="notice notice-warning" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary" type="submit">
            {saved
              ? romanian
                ? "Profil salvat"
                : "Profile saved"
              : romanian
                ? "Salvează profilul"
                : "Save profile"}
          </button>
        </form>
      </section>
      <section className="content-card drone-section">
        <div className="fleet-heading">
          <div className="section-heading">
            <span className="eyebrow">
              {romanian ? "FLOTA TA" : "YOUR FLEET"}
            </span>
            <h2>{romanian ? "Drone înregistrate" : "Saved drones"}</h2>
          </div>
          <div className="fleet-heading-actions">
            <span className="fleet-count">
              {profile.drones.length}{" "}
              {romanian
                ? profile.drones.length === 1
                  ? "dronă"
                  : "drone"
                : profile.drones.length === 1
                  ? "drone"
                  : "drones"}
            </span>
            <button
              className="button button-primary fleet-add-toggle"
              type="button"
              onClick={() => setAddingDrone((current) => !current)}
            >
              <span aria-hidden="true">{addingDrone ? "−" : "+"}</span>
              {addingDrone
                ? romanian
                  ? "Închide formularul"
                  : "Close form"
                : romanian
                  ? "Adaugă dronă"
                  : "Add a drone"}
            </button>
          </div>
        </div>
        <p className="muted fleet-intro">
          {romanian
            ? "Adaugă oricâte drone ai nevoie. Fiecare dronă se salvează automat și va putea fi aleasă separat în cererea de zbor."
            : "Add as many drones as you need. Each one is saved automatically and can be selected individually in a flight request."}
        </p>
        {addingDrone && (
          <form className="drone-editor" onSubmit={addDrone}>
            <div className="drone-editor-heading">
              <span className="drone-step">01</span>
              <div>
                <strong>
                  {editingDroneId
                    ? romanian
                      ? "Editează aeronava"
                      : "Edit aircraft"
                    : romanian
                      ? "Configurează drona"
                      : "Set up your aircraft"}
                </strong>
                <span>
                  {romanian
                    ? "Alege modelul, camera și rezoluția folosită."
                    : "Choose the drone, camera, and recording resolution."}
                </span>
              </div>
            </div>
            <label className="field">
              <span>{romanian ? "Model dronă" : "Drone model"}</span>
              <select
                value={droneForm.presetId}
                onChange={(event) => changeDronePreset(event.target.value)}
              >
                {dronePresets.map((preset) => (
                  <option value={preset.id} key={preset.id}>
                    {preset.id === "custom"
                      ? romanian
                        ? "Alt model / model personalizat"
                        : "Other / custom model"
                      : preset.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{romanian ? "Poreclă în flotă" : "Fleet nickname"}</span>
              <input
                required
                value={droneForm.nickname}
                onChange={(event) =>
                  setDroneForm({ ...droneForm, nickname: event.target.value })
                }
                maxLength={60}
                placeholder={
                  romanian ? "ex. Drona de călătorie" : "e.g. Travel drone"
                }
              />
            </label>
            <label className="field">
              <span>{romanian ? "Denumire model" : "Model name"}</span>
              <input
                required
                value={droneForm.model}
                readOnly={droneForm.presetId !== "custom"}
                onChange={(event) =>
                  setDroneForm({ ...droneForm, model: event.target.value })
                }
                maxLength={120}
                placeholder={
                  romanian ? "Introdu modelul dronei" : "Enter drone model"
                }
              />
            </label>
            <label className="field">
              <span>
                {romanian ? "Greutate dronă (g)" : "Aircraft mass (g)"}
              </span>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={droneForm.massGrams}
                onChange={(event) =>
                  setDroneForm({ ...droneForm, massGrams: event.target.value })
                }
                inputMode="numeric"
              />
              <span className="field-hint">
                {droneForm.presetId === "custom"
                  ? romanian
                    ? "Introdu greutatea conform specificațiilor dronei."
                    : "Enter the mass from your aircraft specifications."
                  : romanian
                    ? "Valoare orientativă din model; verifică greutatea exactă a configurației tale."
                    : "Preset reference value; verify the exact mass of your configuration."}
              </span>
            </label>
            <label className="field">
              <span>{romanian ? "Marcaj clasă C" : "C-class label"}</span>
              <select
                value={droneForm.droneClass}
                onChange={(event) =>
                  setDroneForm({
                    ...droneForm,
                    droneClass: event.target.value as DroneClass,
                  })
                }
              >
                {droneClasses.map((droneClass) => (
                  <option key={droneClass} value={droneClass}>
                    {droneClass === "none"
                      ? romanian
                        ? "Fără marcaj / necunoscut"
                        : "No label / unknown"
                      : droneClass}
                  </option>
                ))}
              </select>
            </label>
            <div className="drone-editor-heading camera-step">
              <span className="drone-step">02</span>
              <div>
                <strong>
                  {romanian ? "Datele camerei" : "Camera details"}
                </strong>
                <span>
                  {romanian
                    ? "Selectează modelul camerei și rezoluția video."
                    : "Select the camera model and video resolution."}
                </span>
              </div>
            </div>
            <label className="field">
              <span>{romanian ? "Model cameră" : "Camera model"}</span>
              <select
                required
                value={droneForm.cameraId}
                onChange={(event) => changeCamera(event.target.value)}
              >
                {availableCameras.map((camera) => (
                  <option value={camera.id} key={camera.id}>
                    {camera.model}
                  </option>
                ))}
              </select>
            </label>
            {droneForm.cameraId === "custom-camera" && (
              <label className="field">
                <span>{romanian ? "Denumire cameră" : "Camera name"}</span>
                <input
                  required
                  value={droneForm.cameraModel}
                  onChange={(event) =>
                    setDroneForm({
                      ...droneForm,
                      cameraModel: event.target.value,
                    })
                  }
                  maxLength={100}
                  placeholder={
                    romanian ? "ex. Cameră personalizată" : "e.g. Custom camera"
                  }
                />
              </label>
            )}
            <label className="field">
              <span>{romanian ? "Rezoluție video" : "Video resolution"}</span>
              <select
                required
                value={droneForm.cameraResolution}
                onChange={(event) =>
                  setDroneForm({
                    ...droneForm,
                    cameraResolution: event.target.value,
                    customResolution: "",
                  })
                }
                disabled={!selectedCamera}
              >
                <option value="">
                  {romanian ? "Alege rezoluția" : "Choose a resolution"}
                </option>
                {selectedCamera?.resolutions.map((resolution) => (
                  <option key={resolution} value={resolution}>
                    {resolution}
                  </option>
                ))}
              </select>
            </label>
            {droneForm.cameraResolution === "Other resolution" && (
              <label className="field">
                <span>
                  {romanian ? "Rezoluție personalizată" : "Custom resolution"}
                </span>
                <input
                  required
                  value={droneForm.customResolution}
                  onChange={(event) =>
                    setDroneForm({
                      ...droneForm,
                      customResolution: event.target.value,
                    })
                  }
                  maxLength={60}
                  placeholder="e.g. 3840 × 1600"
                />
              </label>
            )}
            <div className="drone-category-preview" aria-live="polite">
              <span className="drone-preview-icon">
                <DroneIcon />
              </span>
              <div>
                <span className="eyebrow">
                  {romanian ? "PREVIZUALIZARE FLOTĂ" : "FLEET PREVIEW"}
                </span>
                <strong>
                  {droneForm.nickname.trim() ||
                    droneForm.model ||
                    (romanian ? "Drona ta" : "Your drone")}
                </strong>
                <span>
                  {categoryPreview?.title ??
                    (romanian ? "Introdu greutatea" : "Enter mass")}
                  {" · "}
                  {droneForm.massGrams || "—"} g
                  {selectedCamera
                    ? ` · ${droneForm.cameraModel.trim() || selectedCamera.model}`
                    : ""}
                  {droneForm.cameraResolution
                    ? ` · ${droneForm.cameraResolution === "Other resolution" ? droneForm.customResolution || (romanian ? "rezoluție personalizată" : "custom resolution") : droneForm.cameraResolution}`
                    : ""}
                </span>
              </div>
            </div>
            <button
              className="button button-primary drone-add-button"
              type="submit"
              disabled={
                !droneForm.nickname.trim() ||
                !droneForm.model.trim() ||
                !droneForm.massGrams ||
                Number(droneForm.massGrams) <= 0 ||
                (droneForm.cameraId === "custom-camera" &&
                  !droneForm.cameraModel.trim()) ||
                !droneForm.cameraResolution ||
                (droneForm.cameraResolution === "Other resolution" &&
                  !droneForm.customResolution.trim())
              }
            >
              <span aria-hidden="true">＋</span>
              {editingDroneId
                ? romanian
                  ? "Salvează modificările"
                  : "Save changes"
                : romanian
                  ? "Salvează drona în flotă"
                  : "Save drone to fleet"}
            </button>
            <button
              className="button button-quiet drone-cancel-button"
              type="button"
              onClick={cancelDroneForm}
            >
              {romanian ? "Anulează" : "Cancel"}
            </button>
          </form>
        )}
        {profile.drones.length === 0 ? (
          <div className="fleet-empty">
            <span aria-hidden="true">✦</span>
            <strong>
              {romanian ? "Flota ta este goală" : "Your fleet is empty"}
            </strong>
            <p className="muted">
              {romanian
                ? "Adaugă o dronă pentru a o selecta la cererea de zbor."
                : "Add a drone to select it in your flight request."}
            </p>
          </div>
        ) : (
          <ul className="drone-list">
            {profile.drones.map((drone) => {
              const category = getDroneCategory(drone, romanian);
              return (
                <li key={drone.id}>
                  <span className="fleet-drone-icon" aria-hidden="true">
                    <DroneIcon />
                  </span>
                  <div className="drone-summary">
                    <strong>{drone.nickname}</strong>
                    <span>
                      {drone.model} ·{" "}
                      {drone.massGrams > 0
                        ? `${drone.massGrams} g`
                        : romanian
                          ? "greutate nespecificată"
                          : "mass not provided"}
                      {" · "}
                      {drone.droneClass === "none"
                        ? romanian
                          ? "fără clasă C"
                          : "no C class"
                        : drone.droneClass}
                    </span>
                    <span>
                      {drone.cameraModel
                        ? `${drone.cameraModel} · ${drone.cameraResolution || (romanian ? "rezoluție nespecificată" : "resolution not set")}`
                        : romanian
                          ? "Configurează camera și rezoluția"
                          : "Set up camera and resolution"}
                    </span>
                    <span>
                      {category.title} — {category.detail}
                    </span>
                  </div>
                  <div className="drone-actions">
                    <button
                      className="text-button drone-edit-button"
                      type="button"
                      onClick={() => editDrone(drone)}
                      aria-label={`${romanian ? "Editează" : "Edit"} ${drone.nickname}`}
                    >
                      {romanian ? "Editează" : "Edit"}
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => removeDrone(drone.id)}
                      aria-label={`${romanian ? "Elimină" : "Remove"} ${drone.nickname}`}
                    >
                      {romanian ? "Elimină" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {profile.drones.length > 0 && !addingDrone && (
          <button
            className="button button-quiet fleet-add-another"
            type="button"
            onClick={() => setAddingDrone(true)}
          >
            <span aria-hidden="true">＋</span>
            {romanian ? "Adaugă altă dronă" : "Add another drone"}
          </button>
        )}
        {error && (
          <p className="notice notice-warning" role="alert">
            {error}
          </p>
        )}
        <p className="small-note">
          {romanian
            ? "Încadrarea este orientativă și nu înlocuiește eticheta clasei, regulile operaționale sau verificarea AACR/EASA. Flota este salvată automat local în acest browser."
            : "This estimate does not replace the class label, operational rules, or AACR/EASA guidance. Your fleet is automatically saved in this browser."}
        </p>
      </section>
    </>
  );
}
