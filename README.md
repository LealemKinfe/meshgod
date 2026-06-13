# 🌌 MeshGod 3D Studio & Space Simulator

MeshGod is a premium web-based parametric 3D studio and Newtonian gravity simulator built with **Vite, React, TypeScript, and React Three Fiber**. It allows designers and developers to create celestial assets, customize dynamic shaders, capture lossless transparent video/image assets, and export production-ready scene code.

---

## ✨ Features

### 1. 🎨 Mesh Studio (Parametric Shader Editor)
- **Shader Customization**: Tweak vertex noise, cadence, spread, color, and cadence using an intuitive, real-time control panel.
- **Dynamic Geometries**: Render spheres, boxes, cylinders, Möbius strips, and Klein bottles.
- **Custom SVG Uploads**: Upload local vector files and automatically render them as custom extrusions with the dynamic mesh shader.
- **Camera-Synced Code Exporter**: Adjust your viewport camera with the mouse and instantly copy React Three Fiber component code mapping the exact camera positioning, materials, and lighting states.

### 2. 🪐 Space Studio (Space Design 1.0 & Gravity Simulator)
- **Physics Math Engines**: Switch between **Realistic Ephemeris (Astronomy Engine)** mapping real planetary vectors to J2000 ecliptic coordinates, and **Newtonian Sandbox (Gravity Physics)** with custom G-constant forces.
- **Deformable Space-Time Gravity Fabric**: Real-time rubber-sheet gravity fabric with deep wells that bend and stretch under stellar masses. Toggle between standard density and **Fine Gravity Grid** (160x160 divisions).
- **Physical Grid Bedding**: Planets and orbits visually sink into gravity wells, aligning their bottoms to rest perfectly on the fabric rather than clipping through.
- **Circular Orbit Guide Lines**: Dedicated static guide loops indicating starting/semi-major axis distances, controlled with an independent toggle.
- **NASA Eyes-Style Controls**: Hover over any planet and zoom in with the scroll wheel to automatically focus the camera on it. Click empty space to unlock focus and pan freely.

### 3. 🎥 High-Fidelity Capture Engine
- **4K Images**: Capture screenshots of your scene at 4K resolution (3840x2160) in lossless WebP or PNG format.
- **Transparent WebM Recording**: Records high-resolution streams at **60 FPS** at an ultra-high **50 Mbps** bitrate with alpha channel support.
- **Lossless PNG Sequence (ZIP)**: Exports frame-by-frame PNG sequences inside a compressed `.zip` archive. pausing the R3F clock to capture stutter-free frame states. Highly compatible with professional editors like Adobe Premiere Pro, After Effects, and DaVinci Resolve.

### 4. 🎛️ Collapsible UI & Floating Panel
- **Collapsible Settings Sidebar**: Collapse the control panel with a single chevron toggle button to expand the 3D viewport to 100% width.
- **Floating Capture Toolbar**: When collapsed, a compact floating toolbar stays active on the top-right corner, letting you capture screenshots, record WebM, and track ZIP PNG sequence progress.

---

## 🛠️ Tech Stack
- **Framework**: Vite + React + TypeScript
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **Compression**: `fflate` (for ZIP archives)
- **Icons**: `lucide-react`
- **Styling**: Modern dark glassmorphism built with vanilla CSS.

---

## 🚀 Getting Started

### Prerequisites
Make sure Node.js (v18+) is installed on your system.

### Installation
Run the following commands in the project root folder:
```bash
npm install
```

### Running Locally
To launch the development server, run:
```bash
npm run dev -- --host 127.0.0.1 --port 3030
```
Then, visit **[http://127.0.0.1:3030/](http://127.0.0.1:3030/)** in your browser.

### Building for Production
To generate a compiled production bundle:
```bash
npm run build
```
The compiled files will be located in the `dist/` directory.
