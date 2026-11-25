# 🌿 Folia — AI Plant Health Intelligence

> **Folia** is a full-stack agricultural AI platform that diagnoses crop leaf diseases from a single photo, synthesizes a structured 4-part treatment plan, and maintains a per-user scan history backed by Firebase.

---

## ✨ Features

- **3D Interactive Leaf Stage** — Realistic `.glb` maple leaf model with 360° OrbitControls, idle float animation, and studio lighting.
- **AI Leaf Pathology Scanner** — Upload or capture a leaf photo; Folia classifies the disease, assesses outbreak risk, and generates a Pesticide / Organic / Pruning / Watering treatment plan.
- **Firebase Auth** — Google Sign-In + Email/Password with email verification.
- **Cloud Firestore History** — Every scan is saved to the authenticated user's personal history with per-plot grouping and urgency filtering.
- **Responsive UI** — Built with React + Vite + Tailwind CSS; works on mobile, tablet and desktop.

---

## 🗂️ Project Structure

```
Plant-detection/
├── frontend/                   # React + Vite frontend
│   ├── public/
│   │   └── models/             # 3D leaf .glb model
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.jsx   # Firebase Auth modal (Google + Email)
│   │   │   ├── LeafStage3D.jsx # Three.js / R3F 3D leaf stage
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Firebase Auth context provider
│   │   ├── services/
│   │   │   ├── api.js          # Backend API client
│   │   │   └── firestoreService.js # Cloud Firestore CRUD
│   │   ├── config/
│   │   │   └── firebase.js     # Firebase app initialisation
│   │   ├── App.jsx             # Main application shell
│   │   └── index.css           # Global styles + Tailwind
│   ├── package.json
│   └── vite.config.js
├── backend-node/               # Node.js / Express API server
├── ai-engine-python/           # Python AI inference engine
├── firestore.rules             # Firestore security rules
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20
- Python ≥ 3.10 (for AI engine)
- A Firebase project with **Authentication** and **Firestore** enabled

### 1. Clone the repo
```bash
git clone https://github.com/Tushar-Ag25/Plant-detection.git
cd Plant-detection
```

### 2. Configure Firebase
Create `frontend/src/config/firebase.js` with your Firebase project credentials (already included; update if needed).

### 3. Install & run the frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### 4. Run the backend (optional)
```bash
cd backend-node
npm install
npm start
```

### 5. Run the AI engine (optional)
```bash
cd ai-engine-python
pip install -r requirements.txt
python main.py
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| 3D Graphics | Three.js, @react-three/fiber, @react-three/drei |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Backend | Node.js, Express |
| AI Engine | Python, PyTorch |
| Icons | Lucide React |

---

## 📄 License

MIT © 2026 Folia
