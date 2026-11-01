"use client";

import { useEffect, useRef } from "react";

type SignaturePadProps = {
  value: string;
  onChange: (signature: string) => void;
  romanian: boolean;
};

export function SignaturePad({ value, onChange, romanian }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function renderSignature() {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const bounds = currentCanvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;

      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      currentCanvas.width = Math.round(bounds.width * pixelRatio);
      currentCanvas.height = Math.round(bounds.height * pixelRatio);
      const context = currentCanvas.getContext("2d");
      if (!context) throw new Error("Could not initialize the signature pad.");
      context.scale(pixelRatio, pixelRatio);
      context.lineWidth = 2.4;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#3a1d7a";

      if (value) {
        const image = new window.Image();
        image.onload = () => {
          context.drawImage(image, 0, 0, bounds.width, bounds.height);
        };
        image.src = value;
      }
    }

    renderSignature();
    const observer = new ResizeObserver(renderSignature);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [value]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function startStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) throw new Error("Could not draw the signature.");
    const point = getPoint(event);
    context.beginPath();
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    context.fillStyle = "#3a1d7a";
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
    hasStrokeRef.current = true;
  }

  function continueStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) throw new Error("Could not draw the signature.");
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function finishStroke(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (hasStrokeRef.current)
      onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawingRef.current = false;
    hasStrokeRef.current = false;
    onChange("");
  }

  return (
    <section className="signature-pad-section">
      <div className="signature-pad-heading">
        <div>
          <strong>{romanian ? "Semnează cererea" : "Sign this request"}</strong>
          <span>
            {romanian
              ? "Desenează semnătura cu mouse-ul sau cu degetul."
              : "Draw your signature with a mouse or touch screen."}
          </span>
        </div>
        <span className={`signature-pad-status ${value ? "signed" : ""}`}>
          {value
            ? romanian
              ? "Semnat"
              : "Signed"
            : romanian
              ? "Semnătură necesară"
              : "Signature required"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        aria-label={
          romanian
            ? "Desenează semnătura cu mouse-ul sau cu degetul"
            : "Draw your signature with a mouse or touch screen"
        }
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
      <div className="signature-pad-footer">
        <span>
          {romanian
            ? "Semnătura se adaugă în PDF-ul acestei cereri."
            : "Your signature is added to this request’s PDF."}
        </span>
        <button
          className="button button-quiet"
          type="button"
          onClick={clearSignature}
          disabled={!value}
        >
          {romanian ? "Șterge și semnează din nou" : "Clear and sign again"}
        </button>
      </div>
    </section>
  );
}
