import Kulu from '../models/Kulu.js';
import Member from '../models/Member.js';
import AuditLog from '../models/AuditLog.js';
import WeeklyCollection from '../models/WeeklyCollection.js';

export const createKulu = async (req, res, next) => {
  try {
    const { kuluNumber, name, meetingDay, collectionTime, area, fieldOfficer, status, notes, startDate, schemeType, incharge } = req.body;

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
      incharge,
      status,
      notes,
      startDate: startDate ? new Date(startDate) : new Date(),
      schemeType: schemeType || '15k',
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
      .populate('fieldOfficer', 'name email')
      .populate('incharge', 'name phone');

    const permanentSchemes = {
      '10k': { amount: 10000, emi: 800 },
      '15k': { amount: 15000, emi: 930 },
      '20k': { amount: 20000, emi: 1100 },
    };

    // Retrieve active member count dynamically and compute aggregates
    const kulusWithStats = await Promise.all(
      kulus.map(async (kulu) => {
        const memberCount = await Member.countDocuments({ kulu: kulu._id });
        const scheme = permanentSchemes[kulu.schemeType || '15k'];
        const totalAmount = memberCount * scheme.amount;
        const weeklyRepayment = memberCount * scheme.emi;

        // Calculate current week index of the 20 weeks timeline
        const start = new Date(kulu.startDate || new Date());
        start.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        let currentWeek = Math.floor(diffDays / 7) + 1;
        if (currentWeek < 1) currentWeek = 1;
        if (currentWeek > 20) currentWeek = 20;

        // Find collections status for this week index
        const weekCollections = await WeeklyCollection.find({ kulu: kulu._id, weekNumber: currentWeek });
        let collectionStatus = 'pending';
        if (weekCollections.length > 0) {
          const allPaid = weekCollections.every(c => c.status === 'paid');
          if (allPaid) {
            collectionStatus = 'collected';
          }
        }

        return {
          ...kulu.toObject(),
          memberCount,
          totalAmount,
          weeklyRepayment,
          currentWeekNumber: currentWeek,
          collectionStatus,
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
      .populate('fieldOfficer', 'name email')
      .populate('incharge', 'name phone');
      
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
      .populate('fieldOfficer', 'name email')
      .populate('incharge', 'name phone');

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
