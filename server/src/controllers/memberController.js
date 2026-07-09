import Member from '../models/Member.js';
import Kulu from '../models/Kulu.js';
import Loan from '../models/Loan.js';
import AuditLog from '../models/AuditLog.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

export const createMember = async (req, res, next) => {
  try {
    const memberData = req.body;

    const memberExists = await Member.findOne({ aadhaarNumber: memberData.aadhaarNumber });
    if (memberExists) {
      return res.status(400).json({ success: false, message: 'Member with this Aadhaar already exists' });
    }

    // Verify Kulu exists
    const kulu = await Kulu.findById(memberData.kulu).populate('area');
    if (!kulu) {
      return res.status(404).json({ success: false, message: 'Assigned Kulu not found' });
    }

    // If address.areaName is missing, fill it from Kulu area name
    if (!memberData.address) memberData.address = {};
    memberData.address.areaName = kulu.area.name;

    const member = await Member.create(memberData);

    await AuditLog.create({
      user: req.user.id,
      action: 'CREATE_MEMBER',
      details: `Registered member ${member.name} under Kulu ${kulu.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req, res, next) => {
  try {
    const { kuluId, search } = req.query;
    const filter = {};

    if (kuluId) {
      filter.kulu = kuluId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { aadhaarNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const members = await Member.find(filter)
      .populate({
        path: 'kulu',
        populate: { path: 'area' },
      });

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate({
        path: 'kulu',
        populate: { path: 'area' },
      });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Include loan history
    const loans = await Loan.find({ member: member._id }).populate('scheme');

    res.status(200).json({
      success: true,
      data: {
        member,
        loans,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'UPDATE_MEMBER',
      details: `Updated member ${member.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    // Check if member has active loans
    const activeLoans = await Loan.countDocuments({
      member: req.params.id,
      status: { $in: ['active', 'defaulted'] },
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete member with active or defaulted loans.',
      });
    }

    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'DELETE_MEMBER',
      details: `Deleted member ${member.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Upload Photo/Signature handler
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let fileUrl = '';

    if (cloudinary) {
      // Upload to Cloudinary
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'seyon_microfinance',
        });
        fileUrl = result.secure_url;
        // Delete local temp file
        fs.unlinkSync(req.file.path);
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        // Fall back to local file link
        fileUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      // Local URL fallback
      fileUrl = `/uploads/${req.file.filename}`;
    }

    res.status(200).json({
      success: true,
      url: fileUrl,
    });
  } catch (error) {
    next(error);
  }
};

// Bulk Import Members
export const bulkImportMembers = async (req, res, next) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty members list' });
    }

    const importResults = {
      successCount: 0,
      errors: [],
    };

    for (const [index, mData] of members.entries()) {
      try {
        // Find Kulu
        const kulu = await Kulu.findOne({ name: mData.kuluName });
        if (!kulu) {
          importResults.errors.push(`Row ${index + 1}: Kulu "${mData.kuluName}" not found`);
          continue;
        }

        // Check if Aadhaar unique
        const exists = await Member.findOne({ aadhaarNumber: mData.aadhaarNumber });
        if (exists) {
          importResults.errors.push(`Row ${index + 1}: Member with Aadhaar ${mData.aadhaarNumber} already exists`);
          continue;
        }

        // Build member object
        const age = mData.age || 30;
        const dob = mData.dob || new Date(Date.now() - age * 365.25 * 24 * 60 * 60 * 1000);

        await Member.create({
          kulu: kulu._id,
          name: mData.name,
          fatherName: mData.fatherName || 'Father Name',
          gender: mData.gender || 'Female',
          dob,
          age,
          phone: mData.phone,
          aadhaarNumber: mData.aadhaarNumber,
          pan: mData.pan,
          address: {
            street: mData.street || 'Street',
            village: mData.village || 'Village',
            areaName: kulu.name,
            district: mData.district || 'District',
            pincode: mData.pincode || '600001',
          },
          occupation: mData.occupation || 'Self Employed',
          monthlyIncome: mData.monthlyIncome || 10000,
          nominee: {
            name: mData.nomineeName || 'Nominee',
            phone: mData.nomineePhone || mData.phone,
            relation: mData.nomineeRelation || 'Spouse',
          },
          gpsLocation: mData.gpsLocation || { latitude: 0, longitude: 0 },
        });

        importResults.successCount += 1;
      } catch (err) {
        importResults.errors.push(`Row ${index + 1}: ${err.message}`);
      }
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'BULK_IMPORT_MEMBERS',
      details: `Bulk imported ${importResults.successCount} members. Failures: ${importResults.errors.length}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      data: importResults,
    });
  } catch (error) {
    next(error);
  }
};
