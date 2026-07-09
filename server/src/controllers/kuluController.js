import Kulu from '../models/Kulu.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';

export const createKulu = async (req, res, next) => {
  try {
    const { kuluNumber, name, meetingDay, collectionTime, area, fieldOfficer, status, notes } = req.body;

    const kuluExists = await Kulu.findOne({ kuluNumber });
    if (kuluExists) {
      return res.status(400).json({ success: false, message: 'Kulu number must be unique' });
    }

    const kulu = await Kulu.create({
      kuluNumber,
      name,
      meetingDay,
      collectionTime,
      area,
      fieldOfficer,
      status,
      notes,
    });

    await AuditLog.create({
      user: req.user.id,
      action: 'CREATE_KULU',
      details: `Created Kulu ${kulu.name} (#${kulu.kuluNumber})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: kulu });
  } catch (error) {
    next(error);
  }
};

export const getKulus = async (req, res, next) => {
  try {
    const kulus = await Kulu.find()
      .populate('area', 'name code')
      .populate('fieldOfficer', 'name email');

    // Retrieve active member count dynamically
    const kulusWithStats = await Promise.all(
      kulus.map(async (kulu) => {
        const memberCount = await Member.countDocuments({ kulu: kulu._id });
        return {
          ...kulu.toObject(),
          memberCount,
        };
      })
    );

    res.status(200).json({ success: true, data: kulusWithStats });
  } catch (error) {
    next(error);
  }
};

export const getKuluById = async (req, res, next) => {
  try {
    const kulu = await Kulu.findById(req.params.id)
      .populate('area', 'name code')
      .populate('fieldOfficer', 'name email');
      
    if (!kulu) {
      return res.status(404).json({ success: false, message: 'Kulu not found' });
    }
    res.status(200).json({ success: true, data: kulu });
  } catch (error) {
    next(error);
  }
};

export const updateKulu = async (req, res, next) => {
  try {
    const kulu = await Kulu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('area', 'name code')
      .populate('fieldOfficer', 'name email');

    if (!kulu) {
      return res.status(404).json({ success: false, message: 'Kulu not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'UPDATE_KULU',
      details: `Updated Kulu ${kulu.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: kulu });
  } catch (error) {
    next(error);
  }
};

export const deleteKulu = async (req, res, next) => {
  try {
    const memberCount = await Member.countDocuments({ kulu: req.params.id });
    if (memberCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete Kulu containing active members. Move or deactivate members first.',
      });
    }

    const kulu = await Kulu.findByIdAndDelete(req.params.id);
    if (!kulu) {
      return res.status(404).json({ success: false, message: 'Kulu not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'DELETE_KULU',
      details: `Deleted Kulu ${kulu.name} (#${kulu.kuluNumber})`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Kulu deleted successfully' });
  } catch (error) {
    next(error);
  }
};
