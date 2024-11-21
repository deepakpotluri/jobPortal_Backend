const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient, ObjectId,ServerApiVersion } = require('mongodb');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Initialize MongoDB client
const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Submit application
router.post('/submit', upload.single('resume'), async (req, res) => {
  try {
    const db = client.db("jobBoardDemo");
    const applicationsCollection = db.collection("jobApplications");

    const applicationData = {
      jobId: req.body.jobId,
      email: req.body.email,
      linkedinUrl: req.body.linkedinUrl,
      resumePath: req.file ? req.file.path : null,
      submittedAt: new Date(),
      status: 'pending'
    };

    const result = await applicationsCollection.insertOne(applicationData);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: result.insertedId
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application"
    });
  }
});

// Fetch applications for a specific job
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const db = client.db("jobBoardDemo");
    const applicationsCollection = db.collection("jobApplications");

    const applications = await applicationsCollection.find({ jobId: jobId }).toArray();

    res.status(200).json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
});

// Download Resume 
router.get('/resume/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    res.download(filePath, (downloadErr) => {
      if (downloadErr) {
        console.error('Error downloading file:', downloadErr);
        res.status(500).json({
          success: false,
          message: 'Failed to download resume',
        });
      }
    });
  });
});

// View Resume
router.get('/resume/view/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stream resume',
      });
    });
  });
});

// Update application status
router.patch('/:applicationId/status', async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;

  try {
    const db = client.db("jobBoardDemo");
    const applicationsCollection = db.collection("jobApplications");

    const result = await applicationsCollection.updateOne(
      { _id: new ObjectId(applicationId) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
    });
  }
});

module.exports = router;