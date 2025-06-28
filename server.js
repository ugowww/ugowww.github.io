// server.js
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const app = express();

// Vérification des variables d'environnement
app.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});


const options = {
  key: fs.readFileSync(path.join(__dirname, 'private.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certificate.crt'))
};

// Middleware pour parser le JSON dans les requêtes POST
app.use(express.json());

// Sert les fichiers statiques dans public
app.use(express.static(path.join(__dirname, 'public')));

// Point d'entrée de l'application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API pour récupérer une plante selon son code
app.get('/api/get-plant/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const modelPath = path.join('models', code, `${code}.glb`);
  const fullPath = path.join(__dirname, 'public', modelPath);

  if (fs.existsSync(fullPath)) {
    res.json({ modelUrl: `/${modelPath.replace(/\\/g, '/')}` });
  } else {
    res.status(404).json({ error: 'Plante non trouvée' });
  }
});

// API pour enregistrer la position GPS d'une plante dans pos.json
app.post('/api/save-position/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { latitude, longitude } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: "Latitude et longitude requises." });
  }

  const dirPath = path.join(__dirname, 'public', 'models', code);
  const posFile = path.join(dirPath, 'pos.json');

  if (!fs.existsSync(dirPath)) {
    return res.status(404).json({ error: "Dossier de plante introuvable." });
  }

  let positions = [];
  if (fs.existsSync(posFile)) {
    try {
      positions = JSON.parse(fs.readFileSync(posFile, 'utf8'));
      if (!Array.isArray(positions)) positions = [];
    } catch (err) {
      console.error('Erreur lecture pos.json:', err);
      positions = [];
    }
  }

  positions.push({ latitude, longitude });

  fs.writeFile(posFile, JSON.stringify(positions, null, 2), err => {
    if (err) {
      console.error("Erreur écriture pos.json :", err);
      return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
    }
    res.json({ success: true });
    console.log(`Position enregistrée pour la plante ${code} : ${latitude}, ${longitude}`);
  });
});

// API pour récupérer toutes les positions GPS des plantes (pos.json)
app.get('/api/get-all-positions', (req, res) => {
  const modelsDir = path.join(__dirname, 'public', 'models');
  const allPositions = [];

  try {
    fs.readdirSync(modelsDir).forEach(code => {
      const posFile = path.join(modelsDir, code, 'pos.json');
      if (fs.existsSync(posFile)) {
        try {
          const positions = JSON.parse(fs.readFileSync(posFile, 'utf8'));
          if (Array.isArray(positions)) {
            positions.forEach(pos => {
              allPositions.push({
                code,
                latitude: pos.latitude,
                longitude: pos.longitude
              });
            });
          }
        } catch {
          // Ignore les erreurs JSON
        }
      }
    });
  } catch (err) {
    console.error("Erreur lecture dossiers models :", err);
  }

  res.json(allPositions);
});

// Démarrage serveur HTTPS
console.log('Launching HTTPS server...');

https.createServer(options, app).listen(3000, '0.0.0.0', () => {
  console.log('HTTPS Server running on port 3000');
});
