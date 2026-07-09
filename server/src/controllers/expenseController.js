import Expense from '../models/Expense.js';
import AuditLog from '../models/AuditLog.js';

export const createExpense = async (req, res, next) => {
  try {
    const { category, amount, date, description } = req.body;

    const expense = await Expense.create({
      category,
      amount,
      date,
      description,
      staff: req.user.id,
    });

    await AuditLog.create({
      user: req.user.id,
      action: 'CREATE_EXPENSE',
      details: `Logged expense of ${amount} in category ${category}: ${description}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find().populate('staff', 'name email');
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await AuditLog.create({
      user: req.user.id,
      action: 'DELETE_EXPENSE',
      details: `Deleted expense of ${expense.amount} under ${expense.category}`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};
