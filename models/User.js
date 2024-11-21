// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,

  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'employer', 'admin'],
    default: 'user'
  },
  companyName: {
    type: String,
    required: function() {
      return this.role === 'employer';
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static methods
userSchema.statics.validateRole = function(role) {
  const validRoles = ['user', 'employer', 'admin'];
  return validRoles.includes(role);
};

userSchema.statics.validateEmployerData = function(userData) {
  if (userData.role === 'employer' && !userData.companyName) {
    throw new Error('Company name is required for employers');
  }
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// toJSON method
userSchema.methods.toJSON = function() {
  return {
    email: this.email,
    role: this.role,
    companyName: this.companyName,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);