<p align="center">
  <img src="public/tauri.svg" width="80" alt="ScriptGrab Logo">
</p>

<h1 align="center">ScriptGrab</h1>

<p align="center">
  <strong>🎙️ Yapay Zeka Destekli Video/Ses Transkript Uygulaması</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-blue?style=flat-square&logo=tauri" alt="Tauri">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Whisper-AI-green?style=flat-square" alt="Whisper">
</p>

<p align="center">
  <img src="assets/demo.gif" width="800" alt="ScriptGrab Demo">
</p>

---

## ✨ Özellikler

- 🎯 **Kelime Bazlı Transkript** - Her kelime için hassas zaman damgası
- 🎬 **Premiere Pro Uyumlu** - Kelime bazlı SRT export ile karaoke efekti
- 🌊 **Waveform Görselleştirme** - Ses dalgası ile senkronize takip
- 📝 **Düzenlenebilir Transkript** - Metni doğrudan düzenleyin
- 🔍 **Arama** - Transkript içinde kelime arama
- 📤 **Çoklu Export** - SRT, VTT, TXT, JSON formatları
- 🌍 **Otomatik Dil Algılama** - 99+ dil desteği
- 📁 **Kuyruk Sistemi** - Birden fazla dosyayı sıraya ekleyin

## 🚀 Kurulum

### Gereksinimler

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Python](https://python.org/) (3.10+)
- [FFmpeg](https://ffmpeg.org/) (PATH'e ekli)

### Adımlar

```bash
# Repo'yu klonla
git clone https://github.com/beratr061/ScriptGrab.git
cd ScriptGrab

# Bağımlılıkları yükle
npm install

# Whisper Engine'i derle
cd whisper-engine
pip install -r requirements.txt
python build.py
cd ..

# Uygulamayı başlat
npm run tauri dev
```

## 📦 Build

```bash
# Production build
npm run tauri build
```

Çıktı: `src-tauri/target/release/`

## 🎯 Kullanım

1. **Dosya Ekle** - Video/ses dosyasını sürükleyip bırakın
2. **Bekleyin** - AI transkript oluşturur
3. **Düzenleyin** - Gerekirse metni düzenleyin
4. **Export** - İstediğiniz formatta indirin

### Export Formatları

| Format | Açıklama |
|--------|----------|
| **SRT Kelime Bazlı** | Her kelime ayrı altyazı (Premiere Pro için ideal) |
| SRT Cümle | Standart altyazı formatı |
| VTT | Web video altyazıları |
| TXT | Düz metin |
| JSON | Tüm veri yapısı |

## 🛠️ Teknolojiler

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Tauri (Rust)
- **AI**: OpenAI Whisper (whisper-timestamped)
- **Audio**: WaveSurfer.js

## 📁 Proje Yapısı

```
ScriptGrab/
├── src/                    # React frontend
│   ├── components/         # UI bileşenleri
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility fonksiyonları
│   ├── store/              # Zustand state
│   └── types/              # TypeScript tipleri
├── src-tauri/              # Rust backend
│   ├── src/                # Rust kaynak kodu
│   └── binaries/           # Whisper engine
└── whisper-engine/         # Python AI engine
```

## 📄 Lisans

MIT License

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/beratr061">beratr061</a>
</p>
