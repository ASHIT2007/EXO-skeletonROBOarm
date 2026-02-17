# 🦾 Exo-Skeleton Robo Arm Control System

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
</div>

<br />

> **A high-fidelity Digital Twin interface for monitoring and controlling a robotic exoskeleton arm, featuring real-time 3D visualization, automated sensor simulation, and robust safety interlock logic.**

## 🚀 Project Overview

This project provides a comprehensive control dashboard for an exoskeleton robotic arm. It bridges the physical and digital worlds by offering a **Digital Twin** visualization powered by React Three Fiber. The system is designed with safety as a priority, implementing an **AND Gate Interlock** mechanism that requires both sensor safety checks and operator permission before activation.

Whether running in simulation mode or connected to physical hardware via the Web Serial API, this dashboard ensures precise control and monitoring.

## ✨ Key Features

-   **3D Digital Twin**: Real-time, interactive 3D visualization of the robot arm using `react-three-fiber` and `@react-three/drei`.
-   **AND Gate Safety Logic**: Advanced safety system that activates only when:
    -   ✅ All sensors (Heat, Vibration, Proximity) are within nominal ranges.
    -   ✅ The Operator Master Switch is manually ENABLED.
-   **Automated Sensor Simulation**: Simulates environmental feedback with dynamic sine-wave fluctuations for heat and vibration.
-   **Manual Override**: "Operator Mode" allows for manual intervention and system lockout.
-   **Hardware Integration**: Native support for **Web Serial API** to communicate directly with Arduino/ESP32 microcontrollers.
-   **Real-time Analytics**: Live graphing of sensor data using `recharts`.
-   **Cyberpunk UI**: A futuristic, high-contrast interface built with Tailwind CSS for optimal readability in low-light environments.

## 🛠️ Tech Stack

-   **Frontend Framework**: React 18
-   **Language**: TypeScript
-   **Build Tool**: Vite
-   **3D Rendering**: Three.js, React Three Fiber
-   **Styling**: Tailwind CSS, Lucide React (Icons)
-   **State Management**: React Hooks (Custom automated simulation logic)
-   **Data Visualization**: Recharts

## ⚙️ System Logic: The "AND" Gate

The core safety mechanism relies on a logical **AND** gate. The system will only enter `NOMINAL` (Active) state if **BOTH** conditions are met:

1.  **Input A (Sensors)**: Automated sensors detect safe operating conditions (Heat < 80°C, Vibration < 80%, Proximity Safe).
2.  **Input B (Operator)**: The manual "Master Enable" switch is toggled ON by the user.

If *either* condition fails (e.g., a sensor spike or the operator disables the system), the arm immediately locks down into a `CRITICAL` or `STANDBY` state.

## 📦 Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ASHIT2007/EXO-skeletonROBOarm.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd EXO-skeletonROBOarm
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🔌 Hardware Connection

To connect a physical device:
1.  Connect your Arduino/ESP32 via USB.
2.  Click the **"CONNECT HARDWARE"** button in the dashboard.
3.  Select the appropriate COM port.
4.  The system will begin streaming data to/from the device.
5.  *(Optional)* Upload the included `arduino_sketch.ino` to your microcontroller to test the serial handshake.

## 👨‍💻 Author

**Ashit Tiwary**
-   GitHub: [@ASHIT2007](https://github.com/ASHIT2007)

---

<div align="center">
  <sub>Built with ❤️ for BEEE Project</sub>
</div>
