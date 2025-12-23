# HushKey Vault

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

**The Zero-Knowledge Password Manager for the Modern Web.**

HushKey Vault is a secure, privacy-first password manager built with modern web technologies. It allows you to store and manage your passwords, cards, identities, and secure notes with confidence, knowing that your data is encrypted client-side before it ever leaves your device.

## ✨ Features

- **🔐 Zero-Knowledge Architecture**: Your master password never leaves your device. All data is encrypted using AES-256-GCM.
- **🛡️ Guardian Security Dashboard**: Monitor your password health, check for breaches, and get actionable security insights.
- **📂 diverse Item Types**: Store Logins, Credit Cards, Identities, Secure Notes, WiFi credentials, SSH Keys, and more.
- **🔗 Secure Sharing**: Share items or entire vaults securely with time-limited and password-protected links.
- **📱 Progressive Web App (PWA)**: Installable on mobile and desktop for a native-like experience.
- **🔄 Import/Export**: Easily migrate from other password managers or backup your data with encrypted exports.
- **🌓 Dark/Light Mode**: Beautiful, responsive UI with customizable themes.
- **👆 Biometric Unlock**: Support for device biometrics for quick access.

## 📸 UI Showcase

<p align="center">
  <img src="docs/images/hushkey-vault-guardian-web%202025-12-15%20075218.png" width="90%" alt="Guardian Security Dashboard" />
</p>
<p align="center">
  <em>Guardian Security Dashboard</em>
</p>

<div align="center">
  <img src="docs/images/hushkey-vault-items-list-2025-12-15-080226.png" width="45%" alt="Items List" />
  <img src="docs/images/hushkey-vault-share-2025-12-15-080403.png" width="45%" alt="Secure Sharing" />
</div>
<p align="center">
  <em>Organized Vault & Secure Sharing Options</em>
</p>

<p align="center">
  <img src="docs/images/hushkey-vault-search-2025-12-15-075721.png" width="90%" alt="Search Interface" />
</p>
<p align="center">
  <em>Quickly find any item with the powerful search interface</em>
</p>

<p align="center">
  <img src="docs/images/hushkey-vault-settings-2025-12-15-075445.png" width="90%" alt="Settings" />
</p>
<p align="center">
  <em>Comprehensive Settings</em>
</p>

<p align="center">
  <img src="docs/images/hushkey-vault-item-details-mobile-2025-12-15%20080053.png" width="30%" alt="Mobile Experience" />
</p>
<p align="center">
  <em>Seamless Mobile Experience with PWA Support</em>
</p>

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: TailwindCSS, Lucide React
- **State Management**: Zustand
- **Database (Local)**: Dexie.js (IndexedDB wrapper)
- **Backend/Sync**: Supabase
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2)

## 🚀 Getting Started

Follow these instructions to run the project locally.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/hushkey-vault-app.git
   cd hushkey-vault-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open in your browser**
   Navigate to `http://localhost:5173` to see the app running.

## 🐳 Self-Hosting

HushKey Vault is a static web application and can be easily hosted on any static site provider.

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Deploy**
   Upload the contents of the `dist` folder to your preferred hosting provider (e.g., Vercel, Netlify, GitHub Pages, or an S3 bucket).

## 🔮 Roadmap

- [ ] Browser Extension for auto-fill.
- [ ] Enhancements to Cloud Sync and conflict resolution.
- [ ] Desktop Application (Electron/Tauri).
- [ ] Organization/Team Management features.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see below for details.

```text
MIT License

2025 HushKey Vault

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
