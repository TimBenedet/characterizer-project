# Analyse Technique - Characterizer

## Vue d'ensemble

**Nom du projet :** Characterizer
**Version :** 0.4.0
**Description :** Application Electron pour entraîner les valeurs des personnages et générer des conflits, dilemmes et points communs entre personnages.
**Repository :** https://github.com/wonderunit/characterizer

---

## Structure du projet

```
characterizer/
├── main.js                 # Point d'entrée Electron (main process)
├── package.json            # Configuration npm et electron-builder
├── auto-updater.js         # Gestion des mises à jour automatiques
├── welcome-window.html     # Fenêtre d'accueil
├── main-window.html        # Fenêtre principale
├── loading-status.html     # Fenêtre de chargement
├── update.html             # Fenêtre de mise à jour
├── build/                  # Assets de build (icônes)
├── css/                    # Feuilles de style
├── data/                   # Données de seed (values.txt)
├── images/                 # Images SVG
├── js/
│   ├── database-init.js    # Initialisation de la base de données
│   ├── prefs.js            # Gestion des préférences
│   ├── utils.js            # Utilitaires
│   └── views/              # Composants d'interface
└── migrations/             # Migrations Knex pour SQLite
```

---

## Problèmes identifiés

### 1. Version d'Electron obsolète (CRITIQUE)

**Fichier :** `package.json:20`

```json
"electron": "4.0.0-beta.7"
```

**Problème :**
- Electron 4.0.0-beta.7 date de **2018** (version beta !)
- Ne supporte **pas Apple Silicon** (M1/M2/M3)
- Nombreuses vulnérabilités de sécurité non corrigées
- APIs dépréciées qui ne fonctionnent plus

**Solution :**
```json
"electron": "^25.0.0"
```
ou pour une compatibilité maximale :
```json
"electron": "^18.0.0"
```

---

### 2. Modules natifs incompatibles (CRITIQUE)

**Fichier :** `package.json:24-27`

```json
"dependencies": {
  "sqlite3": "4.0.4",
  "nan": "^2.7.0"
}
```

**Problème :**
- `sqlite3` et `nan` sont des modules natifs C++ qui doivent être compilés pour chaque version de Node.js/Electron
- La version 4.0.4 de sqlite3 ne compile pas avec les versions récentes de Node.js
- `nan` 2.7.0 est obsolète et incompatible avec Node.js > 12
- Sur macOS Apple Silicon, ces modules ne compileront pas du tout

**Solution :**
```json
"dependencies": {
  "better-sqlite3": "^9.0.0"
}
```
ou mettre à jour :
```json
"sqlite3": "^5.1.6",
"nan": "^2.18.0"
```

**Note :** Si vous gardez `sqlite3`, il faudra également :
1. Utiliser `electron-rebuild` après `npm install`
2. Configurer `postinstall` correctement :
```json
"scripts": {
  "postinstall": "electron-rebuild"
}
```

---

### 3. electron-builder obsolète (MAJEUR)

**Fichier :** `package.json:21`

```json
"electron-builder": "20.36.2"
```

**Problème :**
- Version de 2018, ne supporte pas les architectures modernes
- Pas de support Apple Silicon (arm64)
- Bugs connus non corrigés

**Solution :**
```json
"electron-builder": "^24.0.0"
```

---

### 4. BrowserWindow sans configuration de sécurité (SÉCURITÉ)

**Fichier :** `main.js:19`

```javascript
welcomeWindow = new BrowserWindow({width: 800, height: 600})
```

**Problème :**
- Aucune configuration `webPreferences`
- `nodeIntegration` est `true` par défaut dans Electron 4 (vulnérabilité XSS critique)
- `contextIsolation` est désactivé

**Solution :**
```javascript
welcomeWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  }
})
```

Il faudra également créer un fichier `preload.js` pour exposer les APIs nécessaires de manière sécurisée.

---

### 5. API dialog dépréciée (MAJEUR)

**Fichier :** `main.js:63-68`

```javascript
dialog.showOpenDialog(properties, (filenames)=>{
    if (filenames) {
      showMainWindow(filenames[0])
      addToRecentDocs(filenames[0])
    }
})
```

**Problème :**
- L'API callback de `dialog.showOpenDialog` est dépréciée depuis Electron 6
- Dans les versions récentes, cette méthode retourne une Promise

**Solution :**
```javascript
const { filePaths, canceled } = await dialog.showOpenDialog(properties)
if (!canceled && filePaths.length > 0) {
  showMainWindow(filePaths[0])
  addToRecentDocs(filePaths[0])
}
```

Même problème dans `dialog.showSaveDialog` (ligne 90) et `dialog.showMessageBox` (ligne 109).

---

### 6. API dialog.showMessageBox dépréciée

**Fichier :** `auto-updater.js:14-21`

```javascript
dialog.showMessageBox(
  null,
  {
    type: 'question',
    message: `...`,
    buttons: ['Later', 'Download and Install Now']
  },
  index => { ... }
)
```

**Problème :**
- Callback API dépréciée
- Ne fonctionne plus dans Electron récent

**Solution :**
```javascript
const { response } = await dialog.showMessageBox({
  type: 'question',
  message: `An update is available...`,
  buttons: ['Later', 'Download and Install Now']
})
if (response === 1) {
  // Download and install
}
```

---

### 7. Dossier node_modules absent

**Problème :**
- Le dossier `node_modules` n'existe pas
- Les dépendances n'ont jamais été installées ou ont été supprimées

**Solution :**
```bash
npm install
```

**Attention :** Cette commande échouera probablement en raison des versions obsolètes des dépendances. Il faudra d'abord mettre à jour le `package.json`.

---

### 8. Knex avec Promise global dépréciée

**Fichier :** `migrations/001-setup.js:10`

```javascript
return Promise.resolve(true)
```

**Problème :**
- Le second argument `Promise` dans les migrations Knex est déprécié
- Les nouvelles versions de Knex ne le fournissent plus

**Fichier :** `migrations/001-setup.js:1`

```javascript
module.exports.up = function(knex, Promise) {
```

**Solution :**
```javascript
module.exports.up = function(knex) {
  // Utiliser Promise natif ou async/await
```

---

### 9. Version de Knex obsolète

**Fichier :** `package.json:25`

```json
"knex": "^0.15.2"
```

**Problème :**
- Knex 0.15.2 date de 2018
- Nombreux bugs et incompatibilités avec les nouvelles versions de Node.js
- Ne supporte pas les fonctionnalités modernes

**Solution :**
```json
"knex": "^3.0.0"
```

---

### 10. Génération d'UUID non sécurisée

**Fichier :** `js/database-init.js:27-29`

```javascript
function generateUUID() {
  return Math.floor(Math.random() * Math.pow(2, 32)).toString(32)
}
```

**Problème :**
- `Math.random()` n'est pas cryptographiquement sécurisé
- La longueur de l'UUID est insuffisante (risque de collision)

**Solution :**
```javascript
const { randomUUID } = require('crypto')
function generateUUID() {
  return randomUUID()
}
```

---

### 11. electron-updater obsolète

**Fichier :** `package.json:24`

```json
"electron-updater": "4.0.4"
```

**Problème :**
- Version incompatible avec les nouvelles versions d'Electron
- Bugs de sécurité non corrigés

**Solution :**
```json
"electron-updater": "^6.0.0"
```

---

### 12. trash package obsolète

**Fichier :** `package.json:28`

```json
"trash": "^4.0.1"
```

**Problème :**
- Version ancienne qui peut ne pas fonctionner sur les OS modernes

**Solution :**
```json
"trash": "^8.0.0"
```

---

## Package.json corrigé proposé

```json
{
  "name": "characterizer",
  "version": "0.5.0",
  "description": "The best app to train character values and generate conflicts, dilemmas, and common ground between characters.",
  "main": "main.js",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/wonderunit/characterizer.git"
  },
  "scripts": {
    "start": "electron .",
    "postinstall": "electron-rebuild",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "dist:mac": "electron-builder -m",
    "dist:win": "electron-builder -w",
    "dist:linux": "electron-builder -l"
  },
  "devDependencies": {
    "electron": "^25.0.0",
    "electron-builder": "^24.0.0",
    "electron-rebuild": "^3.2.9"
  },
  "dependencies": {
    "electron-updater": "^6.0.0",
    "knex": "^3.0.0",
    "better-sqlite3": "^9.0.0",
    "trash": "^8.0.0",
    "electron-is-dev": "^2.0.0"
  },
  "build": {
    "asar": true,
    "appId": "com.wonderunit.characterizer",
    "mac": {
      "icon": "build/icon.icns",
      "target": [
        { "target": "dmg", "arch": ["x64", "arm64"] }
      ]
    },
    "dmg": {
      "background": "build/background.png",
      "icon": "build/icon.icns",
      "iconSize": 140,
      "contents": [
        { "x": 120, "y": 250 },
        { "x": 420, "y": 250, "type": "link", "path": "/Applications" }
      ]
    },
    "win": {
      "icon": "build/icon.ico",
      "target": "nsis"
    },
    "files": [
      "**/*",
      "!*.md"
    ],
    "nsis": {
      "perMachine": true
    }
  }
}
```

---

## Plan de migration recommandé

### Phase 1 : Préparation
1. Sauvegarder le projet actuel
2. Créer une nouvelle branche git pour la migration

### Phase 2 : Mise à jour des dépendances
1. Mettre à jour `package.json` avec les nouvelles versions
2. Supprimer `package-lock.json` et `node_modules`
3. Exécuter `npm install`

### Phase 3 : Migration du code
1. **main.js** :
   - Ajouter `webPreferences` à tous les `BrowserWindow`
   - Créer un fichier `preload.js`
   - Migrer les `dialog` vers l'API Promise

2. **migrations/** :
   - Retirer le paramètre `Promise` des fonctions
   - Utiliser `async/await`

3. **js/database-init.js** :
   - Remplacer `generateUUID()` par `crypto.randomUUID()`

4. **auto-updater.js** :
   - Migrer vers l'API Promise de `dialog`

### Phase 4 : Migration SQLite
Si passage à `better-sqlite3` :
1. Adapter les appels Knex (API légèrement différente)
2. Tester la migration de données existantes

### Phase 5 : Tests
1. Tester sur macOS Intel
2. Tester sur macOS Apple Silicon (M1/M2/M3)
3. Tester sur Windows
4. Vérifier l'auto-update

---

## Résumé des priorités

| Priorité | Problème | Impact |
|----------|----------|--------|
| CRITIQUE | Electron 4.0.0-beta.7 | App ne démarre pas sur macOS récent |
| CRITIQUE | sqlite3/nan obsolètes | Compilation échoue |
| MAJEUR | Dialog API dépréciée | Fonctions bloquantes |
| MAJEUR | electron-builder obsolète | Build échoue |
| SÉCURITÉ | BrowserWindow sans webPreferences | Vulnérabilités XSS |
| MINEUR | UUID non sécurisé | Risque de collision |
| MINEUR | Knex Promise dépréciée | Warnings |

---

## Notes supplémentaires

- Le projet n'a pas été maintenu depuis 2018
- La migration nécessite des modifications significatives du code
- Il est recommandé de tester chaque étape de la migration individuellement
- Considérer l'utilisation de TypeScript pour améliorer la maintenabilité à long terme

---

*Document généré le 2 décembre 2025*
