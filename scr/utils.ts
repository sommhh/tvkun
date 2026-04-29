const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/**
 * Calculates the true bearing between two points
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dλ = toRad(lon2 - lon1);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Calculates the distance (km) between two points using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lon2 - lon1);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculates satellite elevation and azimuth
 */
export function calculateSatellite(lat: number, lon: number, satLon: number) {
  const λ = toRad(satLon - lon);
  const φ = toRad(lat);
  
  // Azimuth from south
  const azimuthRad = Math.atan2(Math.tan(λ), Math.sin(φ));
  // Convert to azimuth from north
  const azimuth = (toDeg(azimuthRad) + 180) % 360;
  
  // Elevation
  const r = 6378.137;
  const h = 35786; // Altitude of geostationary orbit
  const k = (r + h) / r;
  const cosG = Math.cos(φ) * Math.cos(λ);
  const elevation = toDeg(
    Math.atan2(cosG - 1 / k, Math.sqrt(1 - cosG * cosG))
  );
  
  return { azimuth, elevation };
}

/**
 * Calculates terrestrial elevation angle (vertical tilt)
 * Important for close stations on mountains.
 */
export function calculateTerrestrialElevation(userLat: number, userLon: number, targetLat: number, targetLon: number): number {
  const distKm = calculateDistance(userLat, userLon, targetLat, targetLon);
  if (distKm < 0.1) return 0;

  // This is a rough estimation assuming common transmitter heights (+500m for major, +100m for relay)
  // Real world apps would need a height DB. Let's assume transmitters are higher.
  const estimatedTransmitterHeightKm = 0.3; // 300m average relative height
  const angleRad = Math.atan2(estimatedTransmitterHeightKm, distKm);
  return toDeg(angleRad);
}

/**
 * Calculates a signal score based on distance, power, and station type
 * Refined using a simplified Log-Distance Path Loss model
 */
export function calculateSignalScore(distance: number, powerWatt: number, isRelay: boolean): number {
  // Path loss exponent (2 for free space, 3-4 for urban/hilly)
  const n = isRelay ? 3.5 : 3.0; 
  const score = 10 * Math.log10(powerWatt) - (10 * n * Math.log10(distance + 0.1));
  return score;
}

/**
 * Checks for terrain obstacles using GSI elevation API (Simplified version)
 * Fetching midpoint elevation to detect major shielding
 */
export async function checkTerrainObstacle(userLat: number, userLon: number, targetLat: number, targetLon: number): Promise<boolean> {
  const midLat = (userLat + targetLat) / 2;
  const midLon = (userLon + targetLon) / 2;

  try {
    const res = await fetch(`https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${midLon}&lat=${midLat}&outtype=JSON`);
    const data = await res.json();
    // If midpoint elevation is significantly high (rough heuristic), mark as high obstacle risk
    return data.elevation > 150; 
  } catch (e) {
    return false;
  }
}

/**
 * Smoothing function for compass values (Low-pass filter)
 */
export function smoothValue(current: number, target: number, alpha: number = 0.15): number {
  let diff = ((target - current + 540) % 360) - 180;
  return (current + diff * alpha + 360) % 360;
}

/**
 * Calculates approximate magnetic declination for Tohoku region.
 * Ref: Simplified based on GSI 2020.0 model.
 * Miyagi: ~8.2, Fukushima: ~8.0, Yamagata: ~8.5
 */
export function calculateDeclination(lat: number, lon: number): number {
  // Tohoku center approx 38N, 140.5E
  // Very simplified linear approximation for the region
  const baseDeclination = 8.2;
  const latDiff = lat - 38.2;
  const lonDiff = lon - 140.8;
  
  // Declination increases toward North and West in Japan
  return baseDeclination + (latDiff * 0.2) - (lonDiff * 0.15);
}

/**
 * Returns Japanese direction name from bearing
 */
export function getDirectionNameJa(bearing: number): string {
  const directions = [
    '北', '北北東', '北東', '東北東',
    '東', '東南東', '南東', '南南東',
    '南', '南南西', '南西', '西南西',
    '西', '西北西', '北西', '北北西', '北'
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}
