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

function getSeedFromString(str) {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getPseudorandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate CIBIL Report based on PAN or Aadhaar
export const generateSimulatedCibil = (panOrAadhaar, name) => {
  const cleanId = String(panOrAadhaar || name || 'default').trim().toUpperCase();
  const seed = getSeedFromString(cleanId);
  
  // CIBIL score is between 300 and 900
  const score = Math.floor(300 + (getPseudorandom(seed) * 600));
  
  let status = 'Poor';
  if (score >= 750) status = 'Excellent';
  else if (score >= 680) status = 'Good';
  else if (score >= 580) status = 'Fair';
  
  // Generate simulated accounts based on score
  const numAccounts = Math.floor(getPseudorandom(seed + 1) * 6); // 0 to 5 accounts
  const activeAccounts = score > 500 ? Math.max(1, numAccounts) : numAccounts;
  
  let totalOutstanding = 0;
  const accounts = [];
  const creditAgencies = ['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Muthoot Finance', 'Seyon Finance'];
  
  for (let i = 0; i < activeAccounts; i++) {
    const accSeed = seed + 10 + i;
    const isClosed = getPseudorandom(accSeed) > 0.6;
    const sanctioned = Math.floor(getPseudorandom(accSeed + 1) * 100000 + 10000);
    const outstanding = isClosed ? 0 : Math.floor(getPseudorandom(accSeed + 2) * (sanctioned * 0.8));
    
    if (!isClosed) {
      totalOutstanding += outstanding;
    }
    
    accounts.push({
      lender: creditAgencies[i % creditAgencies.length],
      type: getPseudorandom(accSeed + 3) > 0.45 ? 'Unsecured Personal Loan' : 'Secured Gold Loan',
      sanctionedAmount: sanctioned,
      currentBalance: outstanding,
      status: isClosed ? 'Closed' : (outstanding > sanctioned * 0.7 ? 'Overdue' : 'Active'),
      openedDate: new Date(Date.now() - Math.floor(getPseudorandom(accSeed + 4) * 3 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    });
  }

  const inquiries = Math.floor(getPseudorandom(seed + 2) * 5);
  const paymentHistory = score > 600 ? Math.floor(95 + getPseudorandom(seed + 3) * 5) : Math.floor(70 + getPseudorandom(seed + 3) * 25);

  return {
    score,
    status,
    checkedAt: new Date(),
    panOrAadhaar: cleanId,
    name: name || 'Applicant',
    activeAccounts,
    totalOutstanding,
    inquiries,
    paymentHistory,
    accounts
  };
};

export const checkMemberCibil = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const docIdentifier = member.pan || member.aadhaarNumber;
    if (!docIdentifier) {
      return res.status(400).json({ success: false, message: 'Member must have a PAN or Aadhaar number for CIBIL check' });
    }

    const report = generateSimulatedCibil(docIdentifier, member.name);

    member.cibilScore = report.score;
    member.cibilStatus = report.status;
    member.cibilCheckedAt = report.checkedAt;
    member.cibilReport = report;
    await member.save();

    await AuditLog.create({
      user: req.user.id,
      action: 'CHECK_MEMBER_CIBIL',
      details: `Checked CIBIL score for member ${member.name}. Score: ${report.score}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

export const checkGeneralCibil = async (req, res, next) => {
  try {
    const { name, pan, aadhaar } = req.body;
    if (!name || (!pan && !aadhaar)) {
      return res.status(400).json({ success: false, message: 'Name and either PAN or Aadhaar is required' });
    }

    const docIdentifier = pan || aadhaar;
    const report = generateSimulatedCibil(docIdentifier, name);

    await AuditLog.create({
      user: req.user.id,
      action: 'CHECK_GENERAL_CIBIL',
      details: `Checked general CIBIL score for ${name} using document ${docIdentifier}. Score: ${report.score}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
