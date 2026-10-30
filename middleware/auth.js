/**
 * Admin authentication middleware
 * Checks if user is logged in via session
 */
module.exports = function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect('/admin/login');
};
