import LoanScheme from '../models/LoanScheme.js';
import AuditLog from '../models/AuditLog.js';

export const createScheme = async (req, res, next) => {
  try {
    const { name, loanAmount, interestRate, processingFee, duration, weeklyEMI, lateFine, graceDays, status } = req.body;

    const schemeExists = await LoanScheme.findOne({ name });
    if (schemeExists) {
      return res.status(400).json({ success: false, message: 'Scheme name must be unique' });
    }

    const scheme = await LoanScheme.create({
      name,
      loanAmount,
      interestRate,
      processingFee,
      duration,
      weeklyEMI,
      lateFine,
      graceDays,
      status,
    });

    await AuditLog.create({
      user: req.user.id,
      action: 'CREATE_SCHEME',
      details: `Created scheme ${scheme.name} (Amount: ${scheme.loanAmount}, EMI: ${scheme.weeklyEMI})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
};

export const getSchemes = async (req, res, next) => {
  try {
    const schemes = await LoanScheme.find();
    res.status(200).json({ success: true, data: schemes });
  } catch (error) {
    next(error);
  }
};

export const getSchemeById = async (req, res, next) => {
  try {
    const scheme = await LoanScheme.findById(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }
    res.status(200).json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
};

export const updateScheme = async (req, res, next) => {
  try {
    const scheme = await LoanScheme.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'UPDATE_SCHEME',
      details: `Updated scheme ${scheme.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: scheme });
  } catch (error) {
    next(error);
  }
};

export const deleteScheme = async (req, res, next) => {
  try {
    const scheme = await LoanScheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'DELETE_SCHEME',
      details: `Deleted scheme ${scheme.name}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Scheme deleted successfully' });
  } catch (error) {
    next(error);
  }
};
