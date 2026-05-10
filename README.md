# 🖼 Memory Photo App

Une galerie photo locale avec Node.js + Express. Zéro base de données externe.

---

## ⚡ Installation & Lancement

### 1. Installer les dépendances
```bash
cd memory-photo-app
npm install
```

### 2. Lancer le serveur
```bash
node server.js
```

### 3. Ouvrir dans le navigateur
```
http://localhost:3000
```

---

## 📁 Structure
```
memory-photo-app/
├── server.js          ← Backend Express
├── data.json          ← Stockage des métadonnées (auto-créé)
├── package.json
├── /uploads/          ← Images stockées ici (auto-créé)
└── /public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🔌 API REST

| Méthode | Route            | Description                     |
|---------|------------------|---------------------------------|
| GET     | /photos          | Lister toutes les photos        |
| GET     | /photos?search=X | Rechercher                      |
| GET     | /categories      | Lister les catégories           |
| POST    | /upload          | Ajouter une photo (multipart)   |
| PUT     | /photos/:id      | Modifier les infos              |
| DELETE  | /photos/:id      | Supprimer photo + fichier       |

---

## ✨ Fonctionnalités
- ✅ Upload d'images (jpeg, png, gif, webp, avif — max 10 MB)
- ✅ Métadonnées : titre, date, catégorie, description
- ✅ Galerie style Pinterest (masonry columns)
- ✅ Preview image avant upload
- ✅ Modifier / supprimer une photo
- ✅ Recherche full-text
- ✅ Filtre par catégorie
- ✅ Tri par date ou titre
- ✅ Lightbox pour agrandir
- ✅ Responsive mobile/desktop
- ✅ Données persistées dans data.json

---

## 🛠 Développement (auto-reload)
```bash
npm run dev
```
Nécessite `nodemon` : `npm install -g nodemon`
