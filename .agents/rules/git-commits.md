---
trigger: always_on
---

# Git Commit Strategy & Guidelines

This repository follows a strict internal strategy for all git commits. **AI agents must always read and enforce this behavior without deviation.**

> [!IMPORTANT]
> **Explicit User Approval Required**
> Agents must NEVER automatically commit changes upon completion of a task. All modifications must be tested and explicitly approved by the user before a git commit is executed.

## 1. Commit Realignment & Simulation
- **Strict Time Window**: All git commits must strictly fall between **5:30 AM and 11:30 AM IST**. Never use the real-world current system time.
- **Natural Randomization**: Commit timestamps must be generated at highly randomized minute intervals (e.g., `05:37 AM`, `06:14 AM`, `10:56 AM`). **Do not** round times to 5-minute intervals (e.g., avoid predictable patterns like `05:00`, `05:15`, `05:30`, `05:45`).
- **Daily Pace**: Every simulated day must contain between **3 to 6 commits**, randomly distributed within the approved time window.
- **Sequential Flow**: There must be **NO single day gap** in the repository. Commits must flow sequentially day-after-day since the initial commit (Jan 18th).
- **Strategy Selection**: Before committing, analyze the previous commit's date and time. If adding the next commit to the same day exceeds 6 commits or pushes the time past 11:30 AM, bump the sequence to the *next sequential day* at a random time starting after 5:30 AM.

## 2. Semantic Commits
- All git commits must be performed **semantically**.
- Only logically related files should be grouped and committed together (e.g., all `models/` together, all frontend `components/` together).
- Do not dump all files into a single massive commit.
- **NEVER create empty commits.** Every commit must contain actual file changes. Do not use `--allow-empty` to simulate a commit count. If there are no more file changes to split, do not create artificial commits.

## 3. Standard Git Messages
- Follow the Conventional Commits standard (e.g., `feat:`, `fix:`, `docs:`, `chore:`).
- Keep commit descriptions actionable and descriptive, but restricted to a single sentence/line. Do not exceed this limit.

## 4. Post-Merge Timeline Maintenance
Upon notification that a branch has been merged and deleted on remote (e.g., via a PR), agents must perform the following maintenance flow:
- **Switch and Pull**: Checkout the target branch (usually `dev`) and pull the latest changes.
- **Back-date the Merge**: If the merge commit is the most recent, amend its date to follow the natural sequential timeline (randomly after the last commit of the feature branch).
- **Cleanup**: Delete the local feature branch that was merged.
- **Push**: Force push the back-dated merge commit to remote to ensure the timeline remains consistent.

## 5. Retrospective Note
The absence of a standardized rule file led to misaligned commit histories and date anomalies earlier in the project. This document now serves as the permanent source of truth to prevent random/un-strategized commits.