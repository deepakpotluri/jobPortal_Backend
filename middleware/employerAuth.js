// middleware/employerAuth.js

const jwt = require('jsonwebtoken');

const employerAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is an employer
    if (decoded.role !== 'employer' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Employer privileges required.'
      });
    }

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is invalid'
    });
  }
};

module.exports = employerAuth;