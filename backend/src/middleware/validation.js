/**
 * Helper to validate email format
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Helper to validate coordinate boundaries
 */
const isValidCoordinate = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

/**
 * Helper to validate alphanumeric subdomain
 */
const isValidSubdomain = (subdomain) => {
  return /^[a-zA-Z0-9-]+$/.test(subdomain);
};

/**
 * Middleware for POST /api/auth/register
 */
exports.validateRegistration = (req, res, next) => {
  const { name, subdomain, email, password, firstName, lastName } = req.body;

  if (!name || !subdomain || !email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Required fields missing for registration' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (!isValidSubdomain(subdomain)) {
    return res.status(400).json({ error: 'Subdomain must be alphanumeric only (dashes permitted)' });
  }

  next();
};

/**
 * Middleware for POST /api/admin/students
 */
exports.validateStudentCreation = (req, res, next) => {
  const { email, firstName, lastName, parentEmail, pickupLat, pickupLng } = req.body;

  if (!email || !firstName || !lastName || !parentEmail || pickupLat === undefined || pickupLng === undefined) {
    return res.status(400).json({ error: 'Required fields missing: Student, Parent, or Coordinates.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid student email format' });
  }

  if (!isValidEmail(parentEmail)) {
    return res.status(400).json({ error: 'Invalid parent email format' });
  }

  if (!isValidCoordinate(pickupLat, pickupLng)) {
    return res.status(400).json({ error: 'Invalid pickup coordinates. Latitude must be -90 to 90, Longitude -180 to 180.' });
  }

  next();
};

/**
 * Middleware for POST /api/admin/buses
 */
exports.validateBusCreation = (req, res, next) => {
  const { busNumber, licensePlate, capacity } = req.body;

  if (!busNumber || !licensePlate || !capacity) {
    return res.status(400).json({ error: 'Bus number, license plate, and capacity are required' });
  }

  const parsedCapacity = parseInt(capacity);
  if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
    return res.status(400).json({ error: 'Bus capacity must be a positive integer.' });
  }

  next();
};
