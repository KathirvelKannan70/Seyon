import Area from '../models/Area.js';
import Kulu from '../models/Kulu.js';
import AuditLog from '../models/AuditLog.js';

export const createArea = async (req, res, next) => {
  try {
    const { name, code, description, status, meetingNotes } = req.body;

    const areaExists = await Area.findOne({ code: code.toUpperCase() });
    if (areaExists) {
      return res.status(400).json({ success: false, message: 'Area code must be unique' });
    }

    const area = await Area.create({ name, code, description, status, meetingNotes });

    await AuditLog.create({
      user: req.user.id,
      action: 'CREATE_AREA',
      details: `Created area ${area.name} (${area.code})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
};

export const getAreas = async (req, res, next) => {
  try {
    const areas = await Area.find();
    
    // Add Kulu counts to each area dynamically
    const areasWithStats = await Promise.all(
      areas.map(async (area) => {
        const kuluCount = await Kulu.countDocuments({ area: area._id });
        return {
          ...area.toObject(),
          kuluCount,
        };
      })
    );

    res.status(200).json({ success: true, data: areasWithStats });
  } catch (error) {
    next(error);
  }
};

export const getAreaById = async (req, res, next) => {
  try {
    const area = await Area.findById(req.params.id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }
    res.status(200).json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
};

export const updateArea = async (req, res, next) => {
  try {
    const area = await Area.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'UPDATE_AREA',
      details: `Updated area ${area.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
};

export const deleteArea = async (req, res, next) => {
  try {
    const kulusCount = await Kulu.countDocuments({ area: req.params.id });
    if (kulusCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete area containing active Kulus. Reassign or delete Kulus first.',
      });
    }

    const area = await Area.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Area not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'DELETE_AREA',
      details: `Deleted area ${area.name} (${area.code})`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Area deleted successfully' });
  } catch (error) {
    next(error);
  }
};
