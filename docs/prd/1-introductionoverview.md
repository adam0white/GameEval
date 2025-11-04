# 1. Introduction/Overview

GameEval QA Pipeline is an AI-powered autonomous testing system for browser-based games. Users submit game URLs through a web dashboard, and an AI agent explores the game, captures evidence, evaluates quality metrics, and generates comprehensive test reports - all without manual configuration.

**Target Games**: Designed for HTML5 games that use **DOM-based UI elements** (not canvas-rendered). The system can optionally accept an **input schema** describing game controls to guide more targeted testing.

**Problem Statement**: Game creators need rapid, automated feedback on game quality, playability, and technical issues. Manual QA is time-consuming and doesn't scale for AI-generated games that need continuous testing during development iterations.

**Solution**: A fully serverless, AI-guided testing pipeline that autonomously plays games, evaluates quality across multiple dimensions, and provides actionable feedback with visual evidence.

---
