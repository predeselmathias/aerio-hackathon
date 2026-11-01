export type LatLngPoint = [number, number];

export function geoJsonRingToLatLng(
  ring: ReadonlyArray<ReadonlyArray<number>>,
): LatLngPoint[] {
  return ring.flatMap((position) => {
    const longitude = position[0];
    const latitude = position[1];
    if (typeof latitude !== "number" || typeof longitude !== "number")
      return [];
    const point: LatLngPoint = [latitude, longitude];
    return [point];
  });
}

function pointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]!;
    const [latJ, lngJ] = polygon[j]!;
    const crosses =
      lngI > point[1] !== lngJ > point[1] &&
      point[0] < ((latJ - latI) * (point[1] - lngI)) / (lngJ - lngI) + latI;
    if (crosses) inside = !inside;
  }
  return inside;
}

function orientation(a: LatLngPoint, b: LatLngPoint, c: LatLngPoint) {
  return (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
}

function segmentsIntersect(
  a: LatLngPoint,
  b: LatLngPoint,
  c: LatLngPoint,
  d: LatLngPoint,
) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  const epsilon = 1e-10;
  const onSegment = (
    start: LatLngPoint,
    point: LatLngPoint,
    end: LatLngPoint,
  ) =>
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon;
  if (Math.abs(o1) <= epsilon && onSegment(a, c, b)) return true;
  if (Math.abs(o2) <= epsilon && onSegment(a, d, b)) return true;
  if (Math.abs(o3) <= epsilon && onSegment(c, a, d)) return true;
  if (Math.abs(o4) <= epsilon && onSegment(c, b, d)) return true;
  return (
    ((o1 > epsilon && o2 < -epsilon) || (o1 < -epsilon && o2 > epsilon)) &&
    ((o3 > epsilon && o4 < -epsilon) || (o3 < -epsilon && o4 > epsilon))
  );
}

export function areasOverlap(first: LatLngPoint[], second: LatLngPoint[]) {
  if (first.length < 3 || second.length < 3) return false;
  if (first.some((point) => pointInPolygon(point, second))) return true;
  if (second.some((point) => pointInPolygon(point, first))) return true;

  return first.some((point, index) => {
    const next = first[(index + 1) % first.length]!;
    return second.some((otherPoint, otherIndex) =>
      segmentsIntersect(
        point,
        next,
        otherPoint,
        second[(otherIndex + 1) % second.length]!,
      ),
    );
  });
}
