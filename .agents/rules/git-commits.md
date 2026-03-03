---
trigger: always_on
---

# Git Commit Strategy & Guidelines

This repository follows a strict internal strategy for all git commits. **AI agents must always read and enforce this behavior without deviation.**

** IMPORTANT: Do not commit changes unless and until specified, or things are tested and approved by user **

## 1. Commit Realignment & Simulation
- **Never take the current system time**. The time frame for all git commits must strictly fall between **5:30 AM to 11:30 AM IST**.
- **Daily Pace**: Every day must have between **3 to 6 commits** (randomly distributed within the time window).
- **Sequential Flow**: There must be **NO single day gap** in the repository. Commits should flow sequentially day-after-day since the initial commit (Jan 18th).
- **Strategy Selection**: Before committing, analyze the previous commit's date and time. If adding the next commit to the same day exceeds 6 commits or pushes past 11:30 AM, bump the sequence to the *next sequential day* at a random time starting after 5:30 AM.

## 2. Semantic Commits
- All git commits must be performed **semantically**.
- Only logically related files should be grouped and committed together (e.g., all `models/` together, all frontend `components/` together).
- Do not dump all files into a single massive commit.

## 3. Standard Git Messages
- Follow conventional commits standard (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep commit descriptions actionable and descriptive but within single sentence/line. Do not exceed this limit.

## 4. Retrospective Note
The absence of a standardized rule file led to misaligned commit histories and date anomalies earlier in the project. This document now serves as the permanent source of truth to prevent random/un-strategized commits.