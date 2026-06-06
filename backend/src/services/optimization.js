/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula. Returns distance in kilometers.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total distance of a route path.
 */
function calculateTotalDistance(path) {
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    distance += haversineDistance(
      path[i].lat,
      path[i].lng,
      path[i + 1].lat,
      path[i + 1].lng
    );
  }
  return distance;
}

/**
 * Solves the Traveling Salesman Problem (TSP) with fixed start and end points
 * using a Greedy Nearest Neighbor heuristic followed by 2-opt refinement.
 * 
 * @param {Object} start - Starting point { lat, lng }
 * @param {Array} stops - Array of pickup points { id, lat, lng }
 * @param {Object} end - Destination point { lat, lng }
 * @returns {Object} { optimizedStops: Array, totalDistanceKm: Number }
 */
function optimizeRoute(start, stops, end) {
  if (!stops || stops.length === 0) {
    return {
      optimizedStops: [],
      totalDistanceKm: haversineDistance(start.lat, start.lng, end.lat, end.lng),
    };
  }

  // Copy stops to avoid mutation
  let unvisited = [...stops];
  let currentLoc = { lat: start.lat, lng: start.lng };
  let tour = [];

  // 1. Nearest Neighbor Heuristic
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(
        currentLoc.lat,
        currentLoc.lng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const nextStop = unvisited[nearestIndex];
    tour.push(nextStop);
    currentLoc = { lat: nextStop.lat, lng: nextStop.lng };
    unvisited.splice(nearestIndex, 1);
  }

  // 2. 2-opt Refinement Loop (attempts to resolve path crossings)
  // Since start and end are fixed, we only permute the middle segment (the tour of stops)
  let improved = true;
  let bestTour = [...tour];
  
  // Calculate total path distance (Start -> Tour... -> End)
  const getFullPath = (t) => [start, ...t, end];
  let bestDistance = calculateTotalDistance(getFullPath(bestTour));

  let iterations = 0;
  const maxIterations = 100; // Limit execution time

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestTour.length - 1; i++) {
      for (let k = i + 1; k < bestTour.length; k++) {
        // Reverse elements from index i to k
        const newTour = [...bestTour];
        const subSegment = newTour.slice(i, k + 1).reverse();
        newTour.splice(i, subSegment.length, ...subSegment);

        const newDistance = calculateTotalDistance(getFullPath(newTour));
        if (newDistance < bestDistance) {
          bestTour = newTour;
          bestDistance = newDistance;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // Map the sequenceOrder onto the optimized stops
  const optimizedStops = bestTour.map((stop, index) => ({
    ...stop,
    sequenceOrder: index + 1,
  }));

  return {
    optimizedStops,
    totalDistanceKm: bestDistance,
  };
}

module.exports = {
  haversineDistance,
  optimizeRoute,
};
