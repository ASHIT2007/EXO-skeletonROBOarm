# 🦾 Exo-Skeleton Robo Arm Control System

<div align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/MediaPipe-007f00?style=for-the-badge&logo=google&logoColor=white" />
</div>

<br />

> **A high-fidelity Digital Twin interface for monitoring and controlling a robotic exoskeleton arm, featuring real-time 3D visualization, AI-powered gesture control, and robust safety interlock logic.**

## 🌐 Live Demo
Access the live application here: [https://exo-skeleton-rob-arm.vercel.app/](https://exo-skeleton-rob-arm.vercel.app/)

## 🚀 Project Overview

The **Exo-Skeleton Robo Arm Control System** is a cutting-edge dashboard designed for the next generation of human-machine interfaces. It provides a real-time **Digital Twin** environment where users can monitor and control a robotic arm through manual inputs or advanced **AI Gesture Mirroring**.

The system is built with a "Safety-First" architecture, utilizing a logical **AND gate interlock** to ensure that hardware activation only occurs when both the environment is safe and the operator has explicitly granted permission.

## ✨ Key Features

-   **3D Digital Twin**: Interactive 3D visualization using `react-three-fiber` and `@react-three/drei`. Features wireframe and realistic rendering modes.
-   **AI Gesture Mirroring**: Real-time hand tracking powered by **MediaPipe Hands**. Control the robot arm's joints by mirroring your own hand movements via webcam.
-   **AND Gate Safety Logic**: A critical safety system that requires:
    -   ✅ **Environmental nominal**: Heat, Vibration, and Proximity sensors within safe limits.
    -   ✅ **Operator Permission**: Manual toggle of the 'Master Enable' switch.
-   **Hardware Integration**: Direct communication with Arduino/ESP32 via the **Web Serial API**.
-   **Real-time Analytics**: High-frequency telemetry sampling and live graphing of system load and sensor data.
-   **Futuristic Cyberpunk UI**: High-contrast, glassmorphic interface designed for clarity and visual impact.

## 🛠️ Tech Stack

-   **Core**: React 19, TypeScript, Vite 6
-   **3D Engine**: Three.js, React Three Fiber, Drei
-   **AI/ML**: Google MediaPipe (Hands)
-   **Styling**: Vanilla CSS with Tailwind CSS utilities
-   **Icons**: Lucide React
-   **Charts**: Recharts

## ⚙️ System Logic: The "AND" Gate

The safety core operates on a dual-input AND logic. The system status only reaches `NOMINAL` if:
1.  **Input A (Safety Sensors)**: Automated checks for Heat (< 175 threshold), Vibration, and Pressure detection.
2.  **Input B (Operator Permissive)**: The 'Permissive' toggle must be explicitly enabled by the user.

Any failure in either input triggers an immediate **LOCKDOWN** state to protect hardware and personnel.

## 📦 Getting Started

### Prerequisites
-   **Node.js**: v18 or higher (v20+ recommended)
-   **npm**: Included with Node.js
-   **Modern Browser**: Chrome, Edge, or Opera (required for Web Serial API)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ASHIT2007/EXO-skeletonROBOarm.git
    cd EXO-skeletonROBOarm
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```

### Running Locally
1.  **Start the development server**:
    ```bash
    npm run dev
    ```
2.  **Access the dashboard**:
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔌 Hardware Connection
1.  Connect your Arduino/ESP32 via USB.
2.  Upload the `arduino_sketch.ino` (located in the root directory) to your board.
3.  In the dashboard, click **"CONNECT HARDWARE"** and select the appropriate serial port.
4.  Joint angles will be streamed in real-time as `j1,j2,j3,j4\n`.

## 👨‍💻 Author
**Ashit Tiwary**
-   GitHub: [@ASHIT2007](https://github.com/ASHIT2007)

---
<div align="center">
  <sub>Built with ❤️ for the BEEE Project</sub>
</div>
