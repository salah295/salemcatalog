const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, "data.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

// ─── Init directories & data file ────────────────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

// ─── Multer config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|avif|mp4|avi|mov|wmv|flv|webm|mkv/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error("Only image and video files are allowed"));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function isVideoFile(filename) {
  const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.3gp', '.wmv'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(ext);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /upload — add new photos
app.post("/upload", upload.array("images", 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    const { title, date, categories, description } = req.body;
    if (!title || !date || !categories)
      return res.status(400).json({ error: "title, date and categories are required" });

    const photos = readData();
    const parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
    const newPhotos = req.files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      date,
      categories: Array.isArray(parsedCategories) ? parsedCategories : [parsedCategories],
      description: (description || "").trim(),
      filename: file.filename,
      imagePath: `/uploads/${file.filename}`,
      createdAt: new Date().toISOString(),
    }));

    photos.push(...newPhotos);
    writeData(photos);
    res.status(201).json(newPhotos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /photos — return all photos (with optional search/filter)
app.get("/photos", (req, res) => {
  try {
    let photos = readData();
    const { search, category, type, sortBy } = req.query;

    if (search) {
      const q = search.toLowerCase();
      photos = photos.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.categories.some(cat => cat.toLowerCase().includes(q)) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    if (category && category !== "all") {
      photos = photos.filter(
        (p) => p.categories.some(cat => cat.toLowerCase() === category.toLowerCase())
      );
    }

    if (type && type !== "all") {
      const isVideoType = type === "video";
      photos = photos.filter((p) => {
        const isVid = isVideoFile(p.filename);
        return isVideoType ? isVid : !isVid;
      });
    }

    if (sortBy === "date-asc") photos.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (sortBy === "date-desc") photos.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sortBy === "title") photos.sort((a, b) => a.title.localeCompare(b.title));
    else photos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first

    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /categories — return unique categories
app.get("/categories", (req, res) => {
  try {
    const photos = readData();
    const categories = [...new Set(photos.flatMap((p) => p.categories))].sort();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /photos/:id — update photo metadata
app.put("/photos/:id", (req, res) => {
  try {
    const photos = readData();
    const idx = photos.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Photo not found" });

    const { title, date, categories, description } = req.body;
    if (title) photos[idx].title = title.trim();
    if (date) photos[idx].date = date;
    if (categories) photos[idx].categories = Array.isArray(categories) ? categories : [categories];
    if (description !== undefined) photos[idx].description = description.trim();
    photos[idx].updatedAt = new Date().toISOString();

    writeData(photos);
    res.json(photos[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /photos/:id — delete photo + image file
app.delete("/photos/:id", (req, res) => {
  try {
    const photos = readData();
    const idx = photos.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Photo not found" });

    const [removed] = photos.splice(idx, 1);
    const filePath = path.join(UPLOADS_DIR, removed.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    writeData(photos);
    res.json({ message: "Photo deleted", id: removed.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🖼  Memory Photo App is running!`);
  console.log(`   → http://localhost:${PORT}\n`);
});
