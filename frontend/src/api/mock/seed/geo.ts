import type { GeoBand } from "@/api/types";

/** Coordenadas aproximadas (centro de ciudad) usadas solo por el motor de matching del mock. */
export const CITY_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  "León": { lat: 21.1219, lng: -101.6866, state: "Guanajuato" },
  "Guadalajara": { lat: 20.6597, lng: -103.3496, state: "Jalisco" },
  "Ciudad de México": { lat: 19.4326, lng: -99.1332, state: "Ciudad de México" },
  "Monterrey": { lat: 25.6866, lng: -100.3161, state: "Nuevo León" },
  "Querétaro": { lat: 20.5888, lng: -100.3899, state: "Querétaro" },
  "Puebla": { lat: 19.0414, lng: -98.2063, state: "Puebla" },
  "Irapuato": { lat: 20.6767, lng: -101.3556, state: "Guanajuato" },
  "Celaya": { lat: 20.5232, lng: -100.8156, state: "Guanajuato" },
  "Silao": { lat: 20.9436, lng: -101.427, state: "Guanajuato" },
  "Aguascalientes": { lat: 21.8853, lng: -102.2916, state: "Aguascalientes" },
  "Toluca": { lat: 19.2926, lng: -99.6568, state: "Estado de México" },
  "San Luis Potosí": { lat: 22.1565, lng: -100.9855, state: "San Luis Potosí" },
  "Guanajuato": { lat: 21.019, lng: -101.2574, state: "Guanajuato" },
  "Salamanca": { lat: 20.5717, lng: -101.1948, state: "Guanajuato" },
  "Pachuca": { lat: 20.1011, lng: -98.7591, state: "Hidalgo" },
};

export function haversineKm(a: string, b: string): number {
  const from = CITY_COORDS[a];
  const to = CITY_COORDS[b];
  if (!from || !to) return 500; // ciudad desconocida: se trata como lejana
  if (a === b) return 0;
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function geoBandFor(candidateCity: string, vacancyCity: string): GeoBand {
  const km = haversineKm(candidateCity, vacancyCity);
  if (candidateCity === vacancyCity || km === 0) return "SAME_CITY";
  if (km <= 30) return "UNDER_30KM";
  if (km <= 80) return "UNDER_80KM";
  return "FAR";
}

export const GEO_BAND_SCORE: Record<GeoBand, number> = {
  SAME_CITY: 100,
  UNDER_30KM: 85,
  UNDER_80KM: 60,
  FAR: 25,
};
