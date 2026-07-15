const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const AdmZip = require('adm-zip');
const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../temp/uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DELETE_AFTER_MS = 20 * 60 * 1000; // 20 minutes

// In-memory registry of scheduled deletions
const deletionTimers = new Map();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.js', '.ts', '.py', '.txt', '.html', '.css', '.json',
    '.md', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.xml', '.yaml', '.yml', '.sh', '.env', '.gitignore'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed`));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Schedule auto-deletion
function scheduleDelete(filePath, fileId) {
  // Randomize between 20-25 minutes
  const delay = DELETE_AFTER_MS + Math.random() * 5 * 60 * 1000;
  const timer = setTimeout(async () => {
    try {
      await fs.remove(filePath);
      deletionTimers.delete(fileId);
      console.log(`[UPLOAD] Auto-deleted: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`[UPLOAD] Delete failed for ${filePath}:`, err.message);
    }
  }, delay);
  deletionTimers.set(fileId, { timer, filePath, scheduledAt: Date.now(), delay });
}

// Upload files
router.post('/', upload.array('files', 20), async (req, res) => {
  try {
    const uploadedFiles = [];

    for (const file of req.files) {
      const fileId = path.parse(file.filename).name;
      const isZip = path.extname(file.originalname).toLowerCase() === '.zip';
      let extractedFiles = [];

      if (isZip) {
        try {
          const zip = new AdmZip(file.path);
          const entries = zip.getEntries();
          const extractDir = path.join(UPLOAD_DIR, fileId + '_extracted');
          await fs.ensureDir(extractDir);
          zip.extractAllTo(extractDir, true);

          for (const entry of entries) {
            if (!entry.isDirectory) {
              extractedFiles.push({
                name: entry.entryName,
                path: path.join(extractDir, entry.entryName),
                size: entry.header.size,
              });
            }
          }
          scheduleDelete(extractDir, fileId + '_extracted');
        } catch (zipErr) {
          console.error('ZIP extraction failed:', zipErr.message);
        }
      }

      scheduleDelete(file.path, fileId);
      const expiresAt = new Date(Date.now() + 22.5 * 60 * 1000).toISOString();

      uploadedFiles.push({
        id: fileId,
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${file.filename}`,
        expiresAt,
        extractedFiles: extractedFiles.length > 0 ? extractedFiles : undefined,
      });
    }

    res.json({ success: true, files: uploadedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read uploaded file content
router.get('/:fileId', async (req, res) => {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const match = files.find(f => f.startsWith(req.params.fileId));
    if (!match) return res.status(404).json({ error: 'File not found or expired' });

    const filePath = path.join(UPLOAD_DIR, match);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content, filename: match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual delete
router.delete('/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const timer = deletionTimers.get(fileId);
  if (timer) {
    clearTimeout(timer.timer);
    await fs.remove(timer.filePath).catch(() => {});
    deletionTimers.delete(fileId);
  }
  res.json({ success: true });
});

module.exports = router;
