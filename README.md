# ⚡ Eco-Electricity

> **AI-Powered Smart Office IoT & Energy Analytics Platform**  
> Developed & Authored by **Jubayer Rahman Chowdhury**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-eco--electricity--ten.vercel.app-10B981?style=for-the-badge&logo=vercel)](https://eco-electricity-ten.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)

---

## 🌐 Live Application
🔗 **Experience the Dashboard Live**: [https://eco-electricity-ten.vercel.app/](https://eco-electricity-ten.vercel.app/)

---

## 📖 Overview

**Eco-Electricity** is an enterprise-grade IoT Energy Management & Smart Automation System designed to optimize electrical power consumption in modern office environments. The platform provides real-time monitoring of 15 electrical devices (2 fans & 3 lights across 3 designated rooms), automated alert engine triggers, real-time load analytics, and AI-driven energy optimization tips.

---

## ✨ Key Features

- **⚡ Real-Time IoT Control & Schematics**: Interactive 2D/3D visual floor plan mapping 15 devices with instant WebSocket sync.
- **🤖 AI Energy Assistant**: Intelligent chatbot powered by Google Gemini for energy efficiency recommendations and status queries.
- **🚨 Smart Automation & Alert Engine**: Automatic triggers for after-hours power usage, overtime room operation, and wattage threshold breaches.
- **💬 Discord Gateway Integration**: Remote office management via Discord commands (`!status`, `!usage`, `!alerts`, `!room`).
- **💰 Financial Cost Auditing**: Calculates real-time electricity costs based on official Bangladesh commercial tariff rates (৳ 12.39 / kWh).
- **🌐 Dual Language Support**: Complete English and Bangla UI localization.

---

## 🏗 Architecture & Tech Stack

```
   +-------------------------------------------------------+
   |             Simulated Device Nodes (15)               |
   +---------------------------+---------------------------+
                               |
                               v
   +-------------------------------------------------------+
   |            Node.js + Express TS Backend               |
   |           (Repository & Alert Controller)            |
   +--------------+--------------------------+-------------+
                  |                          |
                  v                          v
       +--------------------+      +--------------------+
       | Socket.IO Stream   |      |  Google Gemini AI  |
       +---------+----------+      +---------+----------+
                 |                           |
                 v                           v
   +-------------------------------------------------------+
   |               React Web Dashboard (Vite)              |
   |              https://eco-electricity-ten.vercel.app/  |
   +-------------------------------------------------------+
```

| Component | Tech Stack |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Socket.IO Client |
| **Backend** | Node.js, Express, TypeScript, Socket.IO, Discord.js |
| **AI Integration** | Google Gemini API (`gemini-2.5-flash`) |
| **Deployment** | Vercel (Frontend), Render (Backend) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher

### 1. Clone Repository
```bash
git clone https://github.com/jubayerat05/eco-electricity.git
cd eco-electricity
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### 3. Start Frontend Dashboard
```bash
cd ../frontend
npm install
npm run dev
# Access UI at http://localhost:5173
```

---

## 🔌 API Endpoints Cheat Sheet

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/devices` | Fetch status of all 15 IoT devices |
| `POST` | `/devices/:id/toggle` | Toggle individual device (`ON` / `OFF`) |
| `GET` | `/power` | Retrieve live office power draw & breakdown |
| `GET` | `/usage` | Get daily energy consumption stats (kWh & ৳) |
| `GET` | `/alerts` | Get list of active and resolved alerts |
| `POST` | `/simulation/start` | Start the automatic device simulation engine |
| `POST` | `/simulation/reset` | Reset all devices and energy accumulators |

---

## 🤖 Discord Gateway Commands

| Command | Action |
| :--- | :--- |
| `!status` | Get total office load and active device count |
| `!room <room_name>` | Room-specific power and device breakdown |
| `!usage` | Daily energy consumption summary |
| `!alerts` | List all current system warnings |
| `!help` | Display command guide |

---

## 👨‍💻 Author & Credits

Created with ❤️ by **Jubayer Rahman Chowdhury**  
- **GitHub**: [@jubayerat05](https://github.com/jubayerat05)  
- **Project Repository**: [eco-electricity](https://github.com/jubayerat05/eco-electricity)  
- **Live Demo**: [https://eco-electricity-ten.vercel.app/](https://eco-electricity-ten.vercel.app/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
