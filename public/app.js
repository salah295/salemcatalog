/* ── Memory Photo App — Frontend ─────────────────────────────────────────── */

const API = "";   // same origin

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const gallery        = document.getElementById("gallery");
const emptyState     = document.getElementById("emptyState");
const photoCount     = document.getElementById("photoCount");

const searchInput    = document.getElementById("searchInput");
const clearSearch    = document.getElementById("clearSearch");
const typeFilter     = document.getElementById("typeFilter");
const yearFilter     = document.getElementById("yearFilter");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect     = document.getElementById("sortSelect");

const modalOverlay   = document.getElementById("modalOverlay");
const modalTitle     = document.getElementById("modalTitle");
const modalClose     = document.getElementById("modalClose");
const btnOpenForm    = document.getElementById("btnOpenForm");
const btnCancel      = document.getElementById("btnCancel");
const btnSave        = document.getElementById("btnSave");
const btnSaveText    = document.getElementById("btnSaveText");
const btnSpinner     = document.getElementById("btnSpinner");

const previewZone    = document.getElementById("previewZone");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const previewImg     = document.getElementById("previewImg");
const fileInput      = document.getElementById("fileInput");
const fileTypeFilter = document.getElementById("fileTypeFilter");

const progressZone   = document.getElementById("progressZone");
const progressFill   = document.getElementById("progressFill");
const progressText   = document.getElementById("progressText");
const progressDetails = document.getElementById("progressDetails");

const titleInput     = document.getElementById("titleInput");
const dateInput      = document.getElementById("dateInput");
const descInput      = document.getElementById("descInput");
const existingCategories = document.getElementById("existingCategories");
const newCategoryInput = document.getElementById("newCategoryInput");
const btnAddCategory = document.getElementById("btnAddCategory");
const selectedCategories = document.getElementById("selectedCategories");

const lightbox       = document.getElementById("lightbox");
const lightboxMedia   = document.getElementById("lightboxMedia");
const lightboxClose  = document.getElementById("lightboxClose");
const lightboxPrev   = document.getElementById("lightboxPrev");
const lightboxNext   = document.getElementById("lightboxNext");
const toast          = document.getElementById("toast");

/* ── State ───────────────────────────────────────────────────────────────── */
let editingId    = null;
let toastTimer   = null;
let searchTimer  = null;
let currentPhotos = [];
let currentPhotoIndex = -1;
let availableCategories = [];
let availableYears = [];
let selectedCategoriesList = [];

/* ── Toast ───────────────────────────────────────────────────────────────── */
function showToast(msg, type = "success") {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ── API helpers ─────────────────────────────────────────────────────────── */
async function apiFetch(url, opts = {}) {
  const res = await fetch(API + url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

/* ── Format date ─────────────────────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Check if video ───────────────────────────────────────────────────────── */
function isVideo(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext);
}

/* ── Render gallery ─────────────────────────────────────────────────────── */
function renderGallery(photos) {
  gallery.innerHTML = "";

  if (!photos.length) {
    emptyState.classList.remove("hidden");
    photoCount.textContent = "";
    return;
  }

  emptyState.classList.add("hidden");
  photoCount.textContent = `${photos.length} photo${photos.length > 1 ? "s" : ""}`;

  photos.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${i * 0.04}s`;
    card.dataset.id = p.id;

    const isVid = isVideo(p.filename);
    const mediaTag = isVid 
      ? `<video class="card-img" src="${p.imagePath}" controls loading="lazy"></video>`
      : `<img class="card-img" src="${p.imagePath}" alt="${escHtml(p.title)}" loading="lazy" />`;

    card.innerHTML = `
      <div class="card-img-wrap" data-src="${p.imagePath}" data-filename="${p.filename}" title="Agrandir">
        ${mediaTag}
        ${p.categories.map(cat => `<span class="card-category-badge">${escHtml(cat)}</span>`).join('')}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escHtml(p.title)}</h3>
        <p class="card-date">${fmtDate(p.date)}</p>
        ${p.description ? `<p class="card-desc">${escHtml(p.description)}</p>` : ""}
      </div>`;

    gallery.appendChild(card);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Load photos ─────────────────────────────────────────────────────────── */
async function loadPhotos() {
  const search   = searchInput.value.trim();
  const type     = typeFilter.value;
  const year     = yearFilter.value;
  const category = categoryFilter.value;
  const sortBy   = sortSelect.value;

  const params = new URLSearchParams();
  if (search)   params.set("search", search);
  if (type && type !== "all")     params.set("type", type);
  if (category && category !== "all") params.set("category", category);
  if (sortBy)   params.set("sortBy", sortBy);

  try {
    let photos = await apiFetch(`/photos?${params}`);
    
    // Client-side year filtering
    if (year && year !== "all") {
      photos = photos.filter(p => {
        const photoYear = new Date(p.date + "T00:00:00").getFullYear().toString();
        return photoYear === year;
      });
    }
    
    currentPhotos = photos;
    renderGallery(photos);
  } catch (err) {
    showToast("Impossible de charger les photos", "error");
  }
}

/* ── Load categories for filter + datalist ───────────────────────────────── */
async function loadCategories() {
  try {
    const cats = await apiFetch("/categories");
    availableCategories = cats;

    // Update <select>
    const current = categoryFilter.value;
    categoryFilter.innerHTML = `<option value="all">Toutes catégories</option>`;
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      if (c === current) opt.selected = true;
      categoryFilter.appendChild(opt);
    });

    // Update existing categories checkboxes
    renderCategoryCheckboxes();
  } catch {
    // silently ignore
  }
}

/* ── Load years for filter ────────────────────────────────────────────────── */
async function loadYears() {
  try {
    const photos = await apiFetch("/photos");
    const yearsSet = new Set();
    photos.forEach(p => {
      const year = new Date(p.date + "T00:00:00").getFullYear();
      yearsSet.add(year);
    });
    availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    // Update <select>
    const current = yearFilter.value;
    yearFilter.innerHTML = `<option value="all">Toutes années</option>`;
    availableYears.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y.toString() === current) opt.selected = true;
      yearFilter.appendChild(opt);
    });
  } catch {
    // silently ignore
  }
}

/* ── Category management ────────────────────────────────────────────────────── */
function renderCategoryCheckboxes() {
  existingCategories.innerHTML = "";
  availableCategories.forEach(cat => {
    const label = document.createElement("label");
    label.className = "category-checkbox";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = cat;
    checkbox.checked = selectedCategoriesList.includes(cat);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!selectedCategoriesList.includes(cat)) {
          selectedCategoriesList.push(cat);
        }
      } else {
        selectedCategoriesList = selectedCategoriesList.filter(c => c !== cat);
      }
      renderSelectedCategories();
    });
    
    const text = document.createTextNode(cat);
    
    label.appendChild(checkbox);
    label.appendChild(text);
    existingCategories.appendChild(label);
  });
}

function renderSelectedCategories() {
  selectedCategories.innerHTML = "";
  selectedCategoriesList.forEach(cat => {
    const tag = document.createElement("span");
    tag.className = "category-tag";
    tag.textContent = cat;
    
    const removeBtn = document.createElement("span");
    removeBtn.className = "remove-tag";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      selectedCategoriesList = selectedCategoriesList.filter(c => c !== cat);
      renderCategoryCheckboxes();
      renderSelectedCategories();
    });
    
    tag.appendChild(removeBtn);
    selectedCategories.appendChild(tag);
  });
}

function addNewCategory() {
  const newCat = newCategoryInput.value.trim();
  if (newCat && !availableCategories.includes(newCat) && !selectedCategoriesList.includes(newCat)) {
    availableCategories.push(newCat);
    selectedCategoriesList.push(newCat);
    newCategoryInput.value = "";
    renderCategoryCheckboxes();
    renderSelectedCategories();
  }
}

/* ── Open modal ──────────────────────────────────────────────────────────── */
function openModal(photo = null) {
  editingId = photo ? photo.id : null;
  modalTitle.textContent = photo ? "Modifier le média" : "Nouveau média";
  fileTypeFilter.value = "image/*,video/*"; // default to both
  updateFileInputAccept();
  btnSaveText.textContent = photo ? "Enregistrer" : "Ajouter";

  // Reset
  titleInput.value    = photo ? photo.title       : "";
  dateInput.value     = photo ? photo.date        : "";
  selectedCategoriesList = photo ? [...photo.categories] : [];
  descInput.value     = photo ? photo.description : "";
  fileInput.value     = "";

  // Update category interface
  renderCategoryCheckboxes();
  renderSelectedCategories();

  // Preview
  if (photo) {
    previewImg.src = photo.imagePath;
    previewImg.classList.remove("hidden");
    previewPlaceholder.classList.add("hidden");
  } else {
    previewImg.src = "";
    previewImg.classList.add("hidden");
    previewPlaceholder.classList.remove("hidden");
  }

  modalOverlay.classList.remove("hidden");
  setTimeout(() => titleInput.focus(), 80);
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  editingId = null;
  selectedCategoriesList = [];
  newCategoryInput.value = "";
  selectedCategoriesList = [];
  newCategoryInput.value = "";
}

/* ── Submit (add / edit) ─────────────────────────────────────────────────── */
async function handleSave() {
  const title    = titleInput.value.trim();
  const date     = dateInput.value;
  const desc     = descInput.value.trim();

  if (!title || !date || !selectedCategoriesList.length) {
    showToast("Titre, date et au moins une catégorie sont requis", "error");
    return;
  }

  if (!editingId && !fileInput.files.length) {
    showToast("Veuillez sélectionner au moins une image ou vidéo", "error");
    return;
  }

  setBusy(true);

  try {
    if (editingId) {
      // Edit — PUT with JSON
      await apiFetch(`/photos/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, categories: selectedCategoriesList, description: desc }),
      });
      showToast("Photo modifiée ✓");
    } else {
      // New — POST with FormData using XMLHttpRequest for progress
      await uploadWithProgress(title, date, selectedCategoriesList, desc);
      showToast(`${fileInput.files.length} fichier(s) ajouté(s) ✓`);
    }

    closeModal();
    await loadCategories();
    await loadPhotos();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  btnSave.disabled = busy;
  if (busy) {
    btnSaveText.classList.add("hidden");
    btnSpinner.classList.add("hidden");
    progressZone.classList.remove("hidden");
    progressFill.style.width = "0%";
    progressText.textContent = "0%";
    progressDetails.textContent = "";
  } else {
    btnSaveText.classList.remove("hidden");
    btnSpinner.classList.remove("hidden");
    progressZone.classList.add("hidden");
  }
}

function uploadWithProgress(title, date, categories, desc) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    for (let file of fileInput.files) {
      fd.append("images", file);
    }
    fd.append("title", title);
    fd.append("date", date);
    fd.append("categories", JSON.stringify(categories));
    fd.append("description", desc);

    xhr.open("POST", API + "/upload");

    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + "%";
        progressText.textContent = percent + "%";

        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000; // seconds
        const loadedDiff = e.loaded - lastLoaded;
        const speed = loadedDiff / timeDiff; // bytes per second
        const remaining = e.total - e.loaded;
        const eta = remaining / speed; // seconds

        const speedText = formatBytes(speed) + "/s";
        const etaText = eta < 60 ? Math.round(eta) + "s" : Math.round(eta / 60) + "min";

        progressDetails.textContent = `Vitesse: ${speedText} | Temps restant: ${etaText}`;

        lastLoaded = e.loaded;
        lastTime = now;
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).error || "Erreur serveur"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Erreur réseau")));

    xhr.send(fd);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* ── Delete ──────────────────────────────────────────────────────────────── */
async function handleDelete(id) {
  if (!confirm("Supprimer définitivement cette photo ?")) return;
  try {
    await apiFetch(`/photos/${id}`, { method: "DELETE" });
    showToast("Photo supprimée");
    await loadCategories();
    await loadPhotos();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function updateFileInputAccept() {
  fileInput.accept = fileTypeFilter.value;
}

/* ── Image preview before upload ─────────────────────────────────────────── */
fileInput.addEventListener("change", () => {
  const files = fileInput.files;
  if (!files.length) return;
  const file = files[0]; // Show preview for first file
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.classList.remove("hidden");
  previewPlaceholder.classList.add("hidden");
});

fileTypeFilter.addEventListener("change", updateFileInputAccept);

/* ── Event delegation on gallery ─────────────────────────────────────────── */
gallery.addEventListener("click", async (e) => {
  // Delete button
  const delBtn = e.target.closest(".btn-delete");
  if (delBtn) { handleDelete(delBtn.dataset.id); return; }

  // Edit button
  const editBtn = e.target.closest(".btn-edit");
  if (editBtn) {
    try {
      const photos = await apiFetch("/photos");
      const photo = photos.find((p) => p.id === editBtn.dataset.id);
      if (photo) openModal(photo);
    } catch {
      showToast("Impossible de charger la photo", "error");
    }
    return;
  }

  // Image zoom
  const imgWrap = e.target.closest(".card-img-wrap");
  if (imgWrap) {
    const src = imgWrap.dataset.src;
    const filename = imgWrap.dataset.filename;
    const card = imgWrap.closest(".card");
    const photoId = card.dataset.id;
    currentPhotoIndex = currentPhotos.findIndex(p => p.id === photoId);
    
    showLightbox(currentPhotoIndex);
  }
});

/* ── Lightbox close ──────────────────────────────────────────────────────── */
function closeLightbox() { 
  lightbox.classList.add("hidden"); 
  lightboxMedia.innerHTML = ""; 
  currentPhotoIndex = -1;
}

function showLightbox(index) {
  if (index < 0 || index >= currentPhotos.length) return;
  
  const photo = currentPhotos[index];
  const isVid = isVideo(photo.filename);
  const mediaTag = isVid 
    ? `<video src="${photo.imagePath}" controls></video>`
    : `<img src="${photo.imagePath}" alt="${escHtml(photo.title)}" />`;
  
  lightboxMedia.innerHTML = mediaTag;
  lightbox.classList.remove("hidden");
  
  // Show/hide navigation buttons
  lightboxPrev.style.display = index > 0 ? 'flex' : 'none';
  lightboxNext.style.display = index < currentPhotos.length - 1 ? 'flex' : 'none';
}

function navigateLightbox(direction) {
  const newIndex = currentPhotoIndex + direction;
  if (newIndex >= 0 && newIndex < currentPhotos.length) {
    currentPhotoIndex = newIndex;
    showLightbox(currentPhotoIndex);
  }
}
lightbox.addEventListener("click", closeLightbox);
lightboxClose.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });
lightboxPrev.addEventListener("click", (e) => { e.stopPropagation(); navigateLightbox(-1); });
lightboxNext.addEventListener("click", (e) => { e.stopPropagation(); navigateLightbox(1); });

/* ── Modal events ─────────────────────────────────────────────────────────── */
if (btnOpenForm) btnOpenForm.addEventListener("click", () => openModal());
modalClose.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);
btnSave.addEventListener("click", handleSave);
btnAddCategory.addEventListener("click", addNewCategory);
newCategoryInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addNewCategory();
  }
});
previewZone.addEventListener("click", () => fileInput.click());

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

/* ── Search / filter events ──────────────────────────────────────────────── */
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  clearSearch.classList.toggle("hidden", !searchInput.value);
  searchTimer = setTimeout(loadPhotos, 320);
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  clearSearch.classList.add("hidden");
  loadPhotos();
});

categoryFilter.addEventListener("change", loadPhotos);
typeFilter.addEventListener("change", loadPhotos);
yearFilter.addEventListener("change", loadPhotos);
sortSelect.addEventListener("change", loadPhotos);

/* ── Keyboard shortcuts ──────────────────────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!lightbox.classList.contains("hidden")) { closeLightbox(); return; }
    if (!modalOverlay.classList.contains("hidden")) { closeModal(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    if (!modalOverlay.classList.contains("hidden")) handleSave();
  }
  
  // Lightbox navigation
  if (!lightbox.classList.contains("hidden")) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateLightbox(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateLightbox(1);
    }
  }
});

/* ── Init ─────────────────────────────────────────────────────────────────── */
(async () => {
  await loadCategories();
  await loadYears();
  await loadPhotos();
})();
