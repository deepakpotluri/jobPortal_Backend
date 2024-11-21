const express = require('express');
const router = express.Router();
const auth  = require('../middleware/auth');
const employerAuth = require('../middleware/employerAuth')
const Job = require('../models/Job');

// Get all jobs (public route)
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().populate('employerEmail');

    res.status(200).json({
      success: true,
      message: 'Jobs fetched successfully',
      data: jobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// Get single job (public route)
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('employerEmail');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job fetched successfully',
      data: job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
});

// Get jobs posted by logged-in employer
router.get('/my-jobs', employerAuth, async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Jobs fetched successfully',
      data: jobs
    });
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// Create new job
router.post('/jobs', employerAuth, async (req, res) => {
  try {
    const {
      jobTitle,
      employmentType,
      workMode,
      minPrice,
      maxPrice,
      description,
      companyName,
      jobLocations,
      companyLogo,
      companyUrl,
      rolesAndResponsibilities,
      experience,
      status
    } = req.body;

    // Validation logic (moved from main server file)
    const requiredFields = [
      'jobTitle',
      'employmentType',
      'workMode',
      'minPrice',
      'maxPrice',
      'description',
      'companyName',
      'jobLocations',
      'rolesAndResponsibilities',
      'experience'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Convert salary and experience values to numbers
    const salaryMin = Number(minPrice);
    const salaryMax = Number(maxPrice);
    const expMin = Number(experience?.min);
    const expMax = Number(experience?.max);

    // Validate numeric values
    if (isNaN(salaryMin) || isNaN(salaryMax) || isNaN(expMin) || isNaN(expMax)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid salary or experience values'
      });
    }

    // Validate salary and experience ranges
    if (salaryMin > salaryMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    if (expMin > expMax) {
      return res.status(400).json({
        success: false,
        message: 'Minimum experience cannot be greater than maximum experience'
      });
    }

    // Validate employment type and work mode
    const validEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary'];
    const validWorkModes = ['Remote', 'On-site', 'Hybrid', 'Work From Office'];

    // Ensure employmentType and workMode are arrays
    const employmentTypeArray = Array.isArray(employmentType) ? employmentType : [employmentType];
    const workModeArray = Array.isArray(workMode) ? workMode : [workMode];

    // Validate employment types
    if (!employmentTypeArray.every(type => validEmploymentTypes.includes(type))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employment type(s)',
        validTypes: validEmploymentTypes
      });
    }

    // Validate work modes
    if (!workModeArray.every(mode => validWorkModes.includes(mode))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work mode(s)',
        validModes: validWorkModes
      });
    }

    // Validate status if provided
    const validStatus = ['active', 'closed', 'draft', 'expired'];
    if (status && !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        validStatus
      });
    }

    // Create new job document
    const newJob = new Job({
      jobTitle,
      employmentType: employmentTypeArray,
      workMode: workModeArray,
      salary: {
        min: salaryMin,
        max: salaryMax
      },
      description,
      companyName,
      jobLocations,
      companyLogo,
      companyUrl,
      rolesAndResponsibilities,
      experience: {
        min: expMin,
        max: expMax
      },
      status: status || 'active',
      postedBy: req.user.userId
    });

    // Save the job to MongoDB
    const savedJob = await newJob.save();

    // Populate the employer email using the virtual field
    await savedJob.populate('employerEmail');

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: savedJob
    });
  } catch (error) {
    console.error('Error posting job:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to post job',
      error: error.message
    });
  }
});

// Update job
router.put('/jobs/:id', employerAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      postedBy: req.user.userId 
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update it'
      });
    }

    // Update job fields
    Object.keys(req.body).forEach(key => {
      job[key] = req.body[key];
    });

    const updatedJob = await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job'
    });
  }
});

// Delete job
router.delete('/jobs/:id', employerAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ 
      _id: req.params.id,
      postedBy: req.user.userId 
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete it'
      });
    }

    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job'
    });
  }
});

// Search jobs
router.get('/jobs/search', async (req, res) => {
  try {
    const { keyword, location } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { jobTitle: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { companyName: { $regex: keyword, $options: 'i' } }
      ];
    }

    if (location) {
      query.jobLocations = { $regex: location, $options: 'i' };
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error("Error searching jobs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search jobs"
    });
  }
});

module.exports = router;