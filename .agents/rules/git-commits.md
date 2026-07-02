---
trigger: always_on
---

# Git Commit Strategy & Guidelines

This repository follows a strict internal strategy for all git commits. AI agents must always read and enforce this behavior without deviation.

> [!IMPORTANT]
> **When to commit**
> Never commit to `main` or `dev` directly. Once the user has approved a task, commit as you go on that task's working branch, in small semantic commits. Without that approval, do not commit at all.
> Commits stay local. Push, open a PR or force push only when the user asks for it.

## 1. Commit Realignment & Simulation
- **Strict Time Window**: All git commits must strictly fall between **5:30 AM and 11:30 AM IST (+05:30)**. Never use the real-world current system time.
- **Both Dates**: Set both the author date and the committer date (`GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`) to the same simulated IST timestamp.
- **Natural Randomization**: Commit timestamps must be generated at highly randomized minute intervals (e.g., `05:37 AM`, `06:14 AM`, `10:56 AM`). **Do not** round times to 5-minute intervals (e.g., avoid predictable patterns like `05:00`, `05:15`, `05:30`, `05:45`).
- **Daily Pace**: Every simulated day must contain between **3 and 6 commits**. Pick each day's count at random, and make it **different from the previous day's count** (e.g., 4, 6, 3, 5, 3, 6).
- **Sequential Flow**: There must be **NO single day gap** in the repository. Commits flow sequentially day after day since the initial commit (Jan 18th). The redesign work starts on **2nd July 2026**, the day after the last existing commit.
- **Strategy Selection**: Before committing, analyze the previous commit's date and time. If adding the next commit to the same day exceeds that day's chosen count or pushes the time past 11:30 AM, bump the sequence to the *next sequential day* at a random time after 5:30 AM.

## 2. Identity
- Every commit is authored and committed by **Shravan Manerikar <manerikarshravan@gmail.com>** only.
- No AI attribution anywhere: no `Co-Authored-By` trailers, no "Generated with" lines, no mention of an AI tool in commits, PRs or docs.

## 3. Semantic Grouping
- Only logically related files should be grouped and committed together (e.g., all `models/` together, all frontend `components/` together).
- Do not dump all files into a single massive commit.
- **NEVER create empty commits.** Every commit must contain actual file changes. Do not use `--allow-empty` to simulate a commit count. If there are no more file changes to split, do not create artificial commits.

## 4. Commit Messages
- Plain, normal English sentences of **10 to 15 words**, on a single line.
- **No prefixes** such as `feat:`, `fix:`, `chore:`, `docs:` or scopes like `feat(api):`.
- **No emojis** in commits, PR titles or descriptions, or any documentation.

## 5. Post-Merge Timeline Maintenance
Upon notification that a branch has been merged and deleted on remote (e.g., via a PR), agents must perform the following maintenance flow:
- **Switch and Pull**: Checkout the target branch (usually `dev`) and pull the latest changes.
- **Back-date the Merge**: If the merge commit is the most recent, amend its date to follow the natural sequential timeline (randomly after the last commit of the feature branch).
- **Cleanup**: Delete the local feature branch that was merged.
- **Push**: Force push the back-dated merge commit to remote to ensure the timeline remains consistent (only after the user confirms).

## 6. Retrospective Note
The absence of a standardized rule file led to misaligned commit histories and date anomalies earlier in the project. This document now serves as the permanent source of truth to prevent random/un-strategized commits. Commits up to 1st July 2026 used Conventional Commit prefixes; from 2nd July 2026 onward, the plain-sentence style in section 4 applies.
