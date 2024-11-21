const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  employmentType: {
    type: [String],
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary']
  },
  workMode: {
    type: [String],
    required: true,
    enum: ['Remote', 'On-site', 'Hybrid', 'Work From Office']
  },
  salary: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  jobLocations: {  // Updated to array of locations
    type: [String],
    required: true,
    validate: {
      validator: function(locations) {
        return locations.length > 0;
      },
      message: 'At least one job location is required'
    }
  },
  companyLogo: {
    type: String,
    trim: true
  },
  companyUrl: {
    type: String,
    trim: true
  },
  rolesAndResponsibilities: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'closed', 'draft', 'expired']
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for employer email
jobSchema.virtual('employerEmail', {
  ref: 'User',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true,
  select: 'email'
});

// Pre-save hook for additional validation
jobSchema.pre('save', function(next) {
  if (this.salary.min > this.salary.max) {
    return next(new Error('Minimum salary cannot be greater than maximum salary'));
  }
  if (this.experience.min > this.experience.max) {
    return next(new Error('Minimum experience cannot be greater than maximum experience'));
  }
  next();
});

// Updated indexes for better query performance
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ companyName: 1 });
jobSchema.index({ jobTitle: 'text', description: 'text' });
jobSchema.index({ jobLocations: 1 }); // New index for job locations

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;