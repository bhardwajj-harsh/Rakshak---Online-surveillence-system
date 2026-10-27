# ML Datasets

This directory contains dataset documentation and preprocessing scripts for training RAKSHAK detection models. **Datasets are NOT downloaded automatically** — follow the instructions below to obtain and prepare each dataset.

## Supported Datasets (Future Training)

| Dataset | Purpose | License | Source |
|---------|---------|---------|--------|
| UCF-Crime | Anomaly/action recognition | Research | [CRCV UCF](https://www.crcv.ucf.edu/projects/real-world/) |
| UCF-QNRF | Crowd counting | Research | [CRCV UCF](https://www.crcv.ucf.edu/data-sets/ucf-qnrf/) |
| UCF-CC-50 | Crowd counting (small) | Research | [CRCV UCF](https://www.crcv.ucf.edu/data-sets/ucf-cc-50/) |
| ShanghaiTech | Crowd counting | Research | [ShanghaiTech](https://github.com/desenzhou/ShanghaiTechDataset) |
| Avenue | Anomaly detection | Research | [CUHK](http://www.cse.cuhk.edu.hk/leojia/projects/detectabnormal/dataset.html) |
| UCSD Ped1/Ped2 | Anomaly detection | Research | [UCSD](http://www.svcl.ucsd.edu/projects/anomaly/) |
| VIRAT | Surveillance events | Government | [VIRAT](https://viratdata.org/) |
| Fire/Smoke | Fire and smoke detection | Varies | Multiple sources (see below) |

## Expected Directory Structure

```
ml/
├── datasets/
│   ├── README.md          # This file
│   ├── raw/               # Downloaded datasets (gitignored)
│   │   ├── ucf-crime/
│   │   ├── ucf-qnrf/
│   │   └── fire-smoke/
│   └── processed/         # Preprocessed training data
├── models/                # Trained model weights (gitignored)
│   ├── yolo-person.pt
│   └── fire-smoke.pt
├── training/              # Training scripts
└── evaluation/            # Evaluation scripts
```

## Fire/Smoke Dataset Sources

For fire/smoke detection, consider:

- **FireNet** — Fire detection in video
- **D-Fire** — Fire and smoke in wildland/urban settings
- **Foggia Fire/Smoke** — Standard benchmark

Until a custom model is trained, RAKSHAK uses a **clearly labeled simulation fallback** for fire/smoke detection.

## Preprocessing

Preprocessing scripts will be added in `/ml/training/` as models are integrated. General steps:

1. Download dataset to `ml/datasets/raw/<name>/`
2. Run preprocessing: `python ml/training/preprocess_<dataset>.py`
3. Output goes to `ml/datasets/processed/<name>/`
4. Train: `python ml/training/train_<model>.py`
5. Export weights to `ml/models/`

## Important Notes

- The MVP works **without any downloaded datasets** using pretrained YOLO weights and simulation fallbacks
- Do not commit large dataset files or model weights to git
- Always verify dataset licenses before use in competition or commercial settings
