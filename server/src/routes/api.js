import express from 'express';
import multer from 'multer';
import path from 'path';

// Import Middlewares
import { protect, authorizeRoles } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

// Import Controllers
import * as authCtrl from '../controllers/authController.js';
import * as areaCtrl from '../controllers/areaController.js';
import * as kuluCtrl from '../controllers/kuluController.js';
import * as memberCtrl from '../controllers/memberController.js';
import * as schemeCtrl from '../controllers/loanSchemeController.js';
import * as loanCtrl from '../controllers/loanController.js';
import * as collectCtrl from '../controllers/collectionController.js';
import * as expCtrl from '../controllers/expenseController.js';
import * as reportCtrl from '../controllers/reportController.js';
import * as backupCtrl from '../controllers/backupController.js';
import { getDashboardStats } from '../controllers/dashboardController.js';

const router = express.Router();

// Multer Local Disk Storage for Temp Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/register', authLimiter, authCtrl.register);
router.post('/auth/login', authLimiter, authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', protect, authCtrl.getMe);
router.get('/auth/staff', protect, authorizeRoles('super_admin', 'manager'), authCtrl.getStaff);
router.patch('/auth/staff/:id', protect, authorizeRoles('super_admin'), authCtrl.updateStaffStatus);

// ==========================================
// Dashboard Routes
// ==========================================
router.get('/dashboard/stats', protect, getDashboardStats);

// ==========================================
// Area Routes
// ==========================================
router.post('/areas', protect, authorizeRoles('super_admin', 'manager'), areaCtrl.createArea);
router.get('/areas', protect, areaCtrl.getAreas);
router.get('/areas/:id', protect, areaCtrl.getAreaById);
router.put('/areas/:id', protect, authorizeRoles('super_admin', 'manager'), areaCtrl.updateArea);
router.delete('/areas/:id', protect, authorizeRoles('super_admin'), areaCtrl.deleteArea);

// ==========================================
// Kulu Routes
// ==========================================
router.post('/kulus', protect, authorizeRoles('super_admin', 'manager'), kuluCtrl.createKulu);
router.get('/kulus', protect, kuluCtrl.getKulus);
router.get('/kulus/:id', protect, kuluCtrl.getKuluById);
router.put('/kulus/:id', protect, authorizeRoles('super_admin', 'manager'), kuluCtrl.updateKulu);
router.delete('/kulus/:id', protect, authorizeRoles('super_admin'), kuluCtrl.deleteKulu);

// ==========================================
// Member Routes
// ==========================================
router.post('/members', protect, authorizeRoles('super_admin', 'manager', 'officer'), memberCtrl.createMember);
router.get('/members', protect, memberCtrl.getMembers);
router.get('/members/:id', protect, memberCtrl.getMemberById);
router.put('/members/:id', protect, authorizeRoles('super_admin', 'manager', 'officer'), memberCtrl.updateMember);
router.delete('/members/:id', protect, authorizeRoles('super_admin'), memberCtrl.deleteMember);
router.post('/members/upload', protect, upload.single('file'), memberCtrl.uploadFile);
router.post('/members/import', protect, authorizeRoles('super_admin', 'manager'), memberCtrl.bulkImportMembers);

// ==========================================
// Loan Schemes Routes
// ==========================================
router.post('/schemes', protect, authorizeRoles('super_admin', 'manager'), schemeCtrl.createScheme);
router.get('/schemes', protect, schemeCtrl.getSchemes);
router.get('/schemes/:id', protect, schemeCtrl.getSchemeById);
router.put('/schemes/:id', protect, authorizeRoles('super_admin', 'manager'), schemeCtrl.updateScheme);
router.delete('/schemes/:id', protect, authorizeRoles('super_admin'), schemeCtrl.deleteScheme);

// ==========================================
// Loan Routes
// ==========================================
router.post('/loans', protect, authorizeRoles('super_admin', 'manager'), loanCtrl.assignLoan);
router.get('/loans', protect, loanCtrl.getLoans);
router.get('/loans/:id', protect, loanCtrl.getLoanById);
router.patch('/loans/:id/status', protect, authorizeRoles('super_admin', 'manager'), loanCtrl.updateLoanStatus);

// ==========================================
// Collection Routes
// ==========================================
router.get('/collections/today', protect, collectCtrl.getTodayCollections);
router.post('/collections/collect', protect, collectCtrl.collectPayment);

// ==========================================
// Expense Routes
// ==========================================
router.post('/expenses', protect, authorizeRoles('super_admin', 'manager'), expCtrl.createExpense);
router.get('/expenses', protect, expCtrl.getExpenses);
router.delete('/expenses/:id', protect, authorizeRoles('super_admin'), expCtrl.deleteExpense);

// ==========================================
// Report Routes
// ==========================================
router.get('/reports/receipt/:receiptNumber', protect, reportCtrl.getReceiptPDF);
router.get('/reports/excel/:type', protect, reportCtrl.exportReportExcel);
router.get('/reports/summary', protect, reportCtrl.getSummaryPDFReport);

// ==========================================
// Backup & Restore Routes
// ==========================================
router.get('/backup/export', protect, authorizeRoles('super_admin'), backupCtrl.exportBackup);
router.post('/backup/import', protect, authorizeRoles('super_admin'), upload.single('file'), backupCtrl.importBackup);

export default router;
