// Middleware to enforce multi-tenant isolation
const scopeTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Tenant check failed: User not authenticated' });
  }

  // Super Admins can manage all institutions. They can pass institutionId in headers, query, or body.
  if (req.user.role === 'SUPER_ADMIN') {
    const overrideTenantId = req.headers['x-tenant-id'] || req.query.institutionId || req.body.institutionId;
    if (overrideTenantId) {
      req.tenantId = overrideTenantId;
    } else {
      req.tenantId = null; // Stays global
    }
    return next();
  }

  // All other users must be locked to their own institution
  if (!req.user.institutionId) {
    return res.status(403).json({ error: 'Tenant isolation failed: User is not linked to any institution' });
  }

  req.tenantId = req.user.institutionId;
  next();
};

module.exports = {
  scopeTenant,
};
