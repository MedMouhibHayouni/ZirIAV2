# 🌿 ZirIA Sentinel — The Deep AgriTech SaaS Ecosystem

![ZirIA Banner](https://img.shields.io/badge/ZirIA-Sentinel_V2.0-emerald?style=for-the-badge&logo=leaf)
![Build Status](https://img.shields.io/badge/Architecture-Deep_SaaS-nightblue?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/Powered_by-Gemini_1.5_Flash-orange?style=for-the-badge)

![ZirIA Hero](./Ziria-Screenshots/Landing%20Page%20Hero.png)

**ZirIA Sentinel** is a production-grade, state-of-the-art AgriTech platform designed to bridge the gap between high-precision AI analytics and ground-level farming operations. From real-time disease diagnostic vision to complex B2B supply chain logistics, ZirIA provides a unified ecosystem for Farmers, SMSA Cooperatives, B2B Sourcing Partners, and Agricultural Experts.

---

## 🚀 The Vision: Deep AgriTech
ZirIA isn't just a management tool; it's a **Spatial Intelligent System**. By crossing satellite data, local weather conditions, and on-site AI Vision, we provide actionable insights that save crops and optimize resources.

> [!TIP]
> **Why Sentinel?** Because it watches over your fields 24/7. Our "Sentinel Pipeline" cross-references AI vision hits with hyper-local weather data to predict disease progression speed before it becomes a disaster.

---

## 🖼️ Platform Preview
![Farmer Dashboard](./Ziria-Screenshots/ZirIA%20Overview%20dashboard%20farmer.png)
> *Strategic overview of the Farmer Dashboard with interactive maps and real-time KPIs.*

![AI Diagnostic](./Ziria-Screenshots/diagnostic%20Ai.png)
> *The AI Sentinel in action: Analyzing a vine leaf on the field.*

---

## 🛠️ Key SaaS Modules

### 👨‍🌾 Farmer Dashboard (Sentinel Mobile)
*   **AI Diagnostic**: Instant disease detection using Gemini Vision & TFLite.
*   **Parcel Management**: Interactive PostGIS maps tracking crop health and GDD (Growing Degree Days).
*   **Marketplace**: Direct-to-consumer and B2B listings for local produce.
*   **Financial Tracking**: Income/Expense records with automated PDF export.

### 🏢 SMSA & Cooperative Hub
*   **Member Management**: Centralized tracking of cooperative farmers and their yields.
*   **Collective Sourcing**: Streamlined procurement of inputs (seeds, fertilizers) for members.
*   **Equipment Fleet**: Shared machinery booking system with real-time status tracking.

### 🤝 B2B & Logistics
*   **Sourcing Pipeline**: Advanced search for quality-certified agricultural products.
*   **Contract Management**: Secure B2B legal and logistical workflows.
*   **Inventory Intelligence**: Real-time stock alerts for large-scale operations.

### 🧪 Expert Validation Room
*   **AI-Assisted Review**: Experts validate AI detections to improve model accuracy.
*   **Disease Heatmaps**: Regional tracking of pest outbreaks using spatial clustering.

---

## 🧠 The AI Sentinel Pipeline
Our "Killer Feature" works in three high-speed steps:
1.  **Vision Hit**: On-field photo is analyzed by **Gemini 1.5 Flash** for precision identification.
2.  **Weather Context**: The system fetches real-time data from **Open-Meteo** (Humidity, Temperature).
3.  **Risk Decision**: The **Sentinel Reasoning Engine** combines both to issue an **Urgency Level (CRITICAL/MEDIUM/LOW)** and tailored recommendations in both French and Tunisian Darija.

---

## 🏗️ Technical Stack

### 🖥️ Backend (The Core)
*   **Framework**: [NestJS V11.0](https://nestjs.com/) (Node.js)
*   **Language**: TypeScript 5.7
*   **Database**: PostgreSQL + **PostGIS** (Spatial Queries)
*   **ORM**: TypeORM 0.3
*   **Real-time**: Socket.io 4.8
*   **Documentation**: Swagger/OpenAPI 11.3
*   **Storage**: Cloudinary (Media)

### 🎨 Frontend (The Control Center)
*   **Framework**: [Angular 21 (Signals)](https://angular.io/)
*   **Styling**: Tailwind CSS 3.4
*   **Visualization**: Chart.js 4.5 & Leaflet 1.9 (Maps)
*   **Animations**: GSAP 3.15 & Three.js 0.184 (3D)
*   **Icons**: Lucide (via @ng-icons 33.2)

### 📱 Mobile (The Field Agent)
*   **Framework**: [Flutter 3.20+](https://flutter.dev/)
*   **State Management**: Riverpod 2.5
*   **Local DB**: Isar 3.1 (NoSQL Offline-first)
*   **Navigation**: GoRouter 14.2
*   **Networking**: Dio 5.4

### 🤖 AI / MLOps
*   **Main LLM/Vision**: Google Gemini 1.5 Pro & Flash
*   **Edge Inference**: TensorFlow Lite (for offline previews)
*   **Spatial Data**: PostGIS Geography & Geometry

---

## 🚦 Getting Started

### Prerequisites
*   Node.js (LTS)
*   Flutter SDK
*   PostgreSQL with PostGIS extension
*   Cloudinary Account (for uploads)
*   Google AI (Gemini) API Key

### Installation
1.  **Backend**:
    ```bash
    cd backend
    npm install
    npm run start:dev
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    ng serve
    ```
3.  **Mobile**:
    ```bash
    cd mobile
    flutter pub get
    flutter run
    ```

---

## 📜 License
© 2026 ZirIA Sentinel Team. All Rights Reserved.  
*Building the future of sustainable and intelligent agriculture.*