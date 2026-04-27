# SignAssist — System Diagrams

---

## 1. System Flowchart

```mermaid
flowchart TD
    subgraph INPUT["INPUT LAYER"]
        direction LR
        CAM["Webcam 30fps"] --> MP["MediaPipe Hand Landmarker"] --> HF["Hand Frames · 2 hands × 21 landmarks"]
    end

    subgraph PROCESS["PROCESSING LAYER"]
        direction LR
        BUF["Landmark Buffer · 30 frames"] --> LSTM["BiLSTM · TF.js WebGL"] --> CLASS["Gesture Classification"]
    end

    subgraph SWITCH["MODE SWITCHING"]
        direction LR
        HG["Two-Hand Gesture Heuristic\n(Fist+Thumb → sign · Thumb+Thumb → spelling)"]
        LSTM2["LSTM mode_sign /\nmode_spelling /\nmode_navigate labels"]
        HG --> MS["useModeSwitcher\n(1s hold · 1.5s cooldown)"]
        LSTM2 --> MS
    end

    subgraph MODES["MODE ROUTER"]
        direction LR
        MR{Current Mode?}
        MR --> SIGN["Sign Mode\n30 FSL signs"]
        MR --> SPELL["Spelling Mode\nA–Z fingerspelling"]
        MR --> NAV["Navigate Mode\nPinch-to-click cursor"]
    end

    subgraph OUTPUT["OUTPUT LAYER"]
        direction LR
        CONF["Confirmation Panel\n(auto-confirm 2s)"]
        WB["useWordBuilder\n(3s auto-finalize · 1.2s letter gap)"]
        THEME["ThemeProvider\nLight / Dark"]
        TRANS["Translation Display EN/FIL"] --> TTS["Web Speech API"] --> AUD["Audio Output"]
        TRANS --> VIS["Visual Display ≥48px"]
        WB --> CONF
        SIGN2["Sign Result"] --> CONF
        NAV2["Hand Cursor\n(index fingertip)"] --> CURSOR["SpellingDisplay\nOverlay Panel"]
    end

    subgraph TRAIN["TRAINING PIPELINE"]
        direction LR
        VID["training/videos/"] --> EXT["extract_from_video.py\n(MediaPipe offline)"]
        COL["/collect page"] --> SAM["JSON Samples"]
        EXT --> SAM --> PY["train_model.py\nTF/Keras BiLSTM"] --> EXP["TF.js Export\nmodel.json + labels.json"]
    end

    HF --> BUF
    HF --> HG
    CLASS --> LSTM2
    CLASS --> MR
    MS --> MR
    SIGN --> SIGN2
    SPELL --> WB
    NAV --> NAV2
    CONF --> TRANS
    EXP -.-> LSTM

    style INPUT fill:#dbeafe,stroke:#2563eb,color:#1e293b
    style PROCESS fill:#e0e7ff,stroke:#4f46e5,color:#1e293b
    style SWITCH fill:#fce7f3,stroke:#db2777,color:#1e293b
    style MODES fill:#f3e8ff,stroke:#9333ea,color:#1e293b
    style OUTPUT fill:#dcfce7,stroke:#16a34a,color:#1e293b
    style TRAIN fill:#fef3c7,stroke:#d97706,color:#1e293b
```

---

## 2. Program Flowchart

```mermaid
flowchart TD
    START([Start]) --> INIT["Init: MediaPipe + BiLSTM Model\n+ Camera + ThemeProvider"]
    INIT --> RDY{Camera &\nModel Ready?}
    RDY -->|No| ERR["Error: Camera Required"] --> INIT
    RDY -->|Yes| TRACK["Hand Tracking Loop\n(requestAnimationFrame)"]

    TRACK --> DET{Hands\nDetected?}
    DET -->|No| TRACK
    DET -->|Yes| BUF["Push to 30-frame Buffer"]
    BUF --> HEUR["Two-Hand Heuristic Check\n(useModeSwitcher)"]
    HEUR -->|Gesture held 1s| MSW["Switch Mode\n(1.5s cooldown)"] --> TRACK

    HEUR -->|No| LSTM["LSTM Classify every 300ms"]
    LSTM --> MMODE{"mode_sign /\nmode_spelling /\nmode_navigate?"}
    MMODE -->|Yes| MSW2["Switch Mode via LSTM"] --> TRACK
    MMODE -->|No| MODE{Current Mode?}

    MODE -->|Navigate| NAVM["Update Hand Cursor\n(index fingertip)"]
    NAVM -->|Pinch| CLK["Click UI Element"] --> TRACK
    NAVM -->|No Pinch| TRACK

    MODE -->|Sign| CC{Conf ≥ 45%?}
    CC -->|No| TRACK
    CC -->|Yes| SHOWSIGN["Show Sign + Confidence"] --> CONF

    MODE -->|Spelling| LC{Letter ≥ 75%?}
    LC -->|No| TRACK
    LC -->|Yes| STK{Same Letter\n3× in 900ms?}
    STK -->|No| TRACK
    STK -->|Yes| ADD["Add Letter min 1.2s gap"]
    ADD --> WF{Word Done? 3s timeout}
    WF -->|No| SPELL_DISP["SpellingDisplay Overlay + Countdown"]
    SPELL_DISP --> TRACK
    WF -->|Yes| CONF

    CONF["Confirmation Panel 2s"] --> UR{Response?}
    UR -->|Cancel| TRACK
    UR -->|Confirm| TR["Add Transcript\n→ Translate EN/FIL\n→ TTS Speak"] --> TRACK

    style START fill:#22c55e,stroke:#16a34a,color:#fff
    style ERR fill:#dc2626,stroke:#b91c1c,color:#fff
    style CONF fill:#f59e0b,stroke:#d97706,color:#000
    style TR fill:#3b82f6,stroke:#2563eb,color:#fff
    style SPELL_DISP fill:#06b6d4,stroke:#0891b2,color:#fff
    style MSW fill:#db2777,stroke:#be185d,color:#fff
    style MSW2 fill:#db2777,stroke:#be185d,color:#fff
```

---

## 3. Use Case Diagram

```mermaid
graph TD
    DHH["🧏 DHH Worker"]
    CUST["👤 Customer"]
    DEV["👨‍💻 Developer"]

    subgraph SYS["SignAssist Kiosk System"]
        direction TB

        subgraph SR["Sign Recognition"]
            direction LR
            UC1(("Perform FSL\nSign"))
            UC2(("Fingerspell\nA–Z"))
            UC3(("Switch Mode\n2-hand gesture"))
        end

        subgraph GC["Confirmation"]
            direction LR
            UC7(("Confirm\nTranslation"))
            UC8(("Cancel\nTranslation"))
        end

        subgraph TN["Navigation"]
            direction LR
            UC9(("Hand Cursor\nNavigation"))
            UC10(("Pinch\nto Click"))
            UC11(("Toggle Camera"))
        end

        subgraph TO["Translation & Output"]
            direction LR
            UC4(("View\nTranslation"))
            UC5(("Hear TTS\nAudio"))
            UC6(("Toggle EN/FIL"))
            UC17(("Toggle\nLight/Dark Theme"))
        end

        subgraph SP["Spelling"]
            direction LR
            UC18(("SpellingDisplay\nOverlay"))
            UC19(("Auto-finalize\nWord 3s"))
            UC20(("Delete Last\nLetter"))
        end

        subgraph TD2["Training"]
            direction LR
            UC12(("Record Samples\n/collect"))
            UC13(("Extract from\nVideos"))
            UC14(("Train BiLSTM\nModel"))
            UC15(("Deploy TF.js\nModel"))
        end

        subgraph SO["System"]
            direction LR
            UC16(("Init Camera\n& Models"))
            UC21(("Display System\nStatus"))
        end
    end

    DHH --> UC1
    DHH --> UC2
    DHH --> UC3
    DHH --> UC7
    DHH --> UC8
    DHH --> UC9
    DHH --> UC10
    DHH --> UC11
    DHH --> UC17
    DHH --> UC18
    DHH --> UC20

    CUST --> UC4
    CUST --> UC5
    CUST --> UC6

    DEV --> UC12
    DEV --> UC13
    DEV --> UC14
    DEV --> UC15

    UC2 -.->|"include"| UC18
    UC18 -.->|"include"| UC19
    UC1 -.->|"include"| UC7
    UC2 -.->|"include"| UC7
    UC7 -.->|"include"| UC4
    UC7 -.->|"include"| UC5
    UC8 -.->|"extend"| UC7
    UC3 -.->|"include"| UC16
    UC21 -.->|"extend"| UC16

    style SYS fill:#f8fafc,stroke:#334155,color:#1e293b
    style SR fill:#dbeafe,stroke:#2563eb,color:#1e293b
    style TO fill:#dcfce7,stroke:#22c55e,color:#1e293b
    style GC fill:#fef3c7,stroke:#f59e0b,color:#1e293b
    style TN fill:#f3e8ff,stroke:#a855f7,color:#1e293b
    style SP fill:#cffafe,stroke:#06b6d4,color:#1e293b
    style TD2 fill:#ffedd5,stroke:#ea580c,color:#1e293b
    style SO fill:#f1f5f9,stroke:#737373,color:#1e293b
```

---

## 4. Exporting Diagrams

```bash
npx @mermaid-js/mermaid-cli mmdc -i DIAGRAMS.md -o diagrams.pdf
```
