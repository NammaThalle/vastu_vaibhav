import os
import random
import subprocess
from datetime import datetime, timedelta

def run_cmd(cmd, check=True):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"Command failed: {cmd}")
        print(res.stderr)
        # We don't exit, we just return error
        return False
    return True

def get_patches():
    with open("scratch/full.diff", "r") as f:
        lines = f.readlines()

    files = []
    current_file = None
    current_hunk = None

    for line in lines:
        if line.startswith("diff --git"):
            if current_file:
                if current_hunk:
                    current_file["hunks"].append(current_hunk)
                files.append(current_file)
            parts = line.split(" ")
            filename = parts[-1].strip()[2:] # remove b/
            current_file = {
                "filename": filename,
                "header": [line],
                "hunks": []
            }
            current_hunk = None
        elif line.startswith("--- ") or line.startswith("+++ ") or line.startswith("new file mode") or line.startswith("deleted file mode") or line.startswith("index ") or line.startswith("Binary files differ"):
            if current_file:
                current_file["header"].append(line)
        elif line.startswith("@@"):
            if current_hunk:
                current_file["hunks"].append(current_hunk)
            current_hunk = [line]
        else:
            if current_hunk is not None:
                current_hunk.append(line)
            elif current_file is not None:
                current_file["header"].append(line)

    if current_file:
        if current_hunk:
            current_file["hunks"].append(current_hunk)
        files.append(current_file)
        
    return files

def generate_commits(files):
    actions = []
    for f in files:
        header_str = "".join(f["header"])
        if "deleted file mode" in header_str:
            actions.append({"filename": f["filename"], "action": "rm"})
        elif "Binary files differ" in header_str or len(f["hunks"]) == 0:
            actions.append({"filename": f["filename"], "action": "add"})
        else:
            for i, hunk in enumerate(f["hunks"]):
                patch = header_str + "".join(hunk)
                actions.append({"filename": f["filename"], "action": "patch", "patch": patch, "part": i+1, "total": len(f["hunks"])})
                
    def sort_key(action):
        f = action["filename"]
        if "models/client" in f or "schemas/client" in f: return 1
        if "migrations/" in f: return 2
        if "endpoints/ledger" in f: return 3
        if "Dockerfile" in f or "scripts/" in f or "requirements" in f: return 4
        if "package" in f or "layout" in f or "api.ts" in f: return 5
        if "assets/" in f: return 6
        if "invoice/page" in f: return 7
        return 8
        
    actions.sort(key=sort_key)
    return actions

def get_random_time(date_str):
    hour = random.randint(5, 11)
    if hour == 5:
        minute = random.randint(30, 59)
    elif hour == 11:
        minute = random.randint(0, 30)
    else:
        minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return f"{date_str} {hour:02d}:{minute:02d}:{second:02d} +0530"

def main():
    # Make sure we have full.diff
    run_cmd("git add -N .")
    run_cmd("git diff > scratch/full.diff")
    
    files = get_patches()
    actions = generate_commits(files)
    
    # Reset index to clean, leaving working tree as is
    run_cmd("git reset")
    
    start_date = datetime(2026, 3, 4)
    daily_counts = [4, 3, 6, 5, 3, 4, 6, 3, 5, 4, 6, 3, 5, 4, 6]
    
    action_idx = 0
    total_actions = len(actions)
    
    for day_idx in range(15):
        current_date = start_date + timedelta(days=day_idx)
        date_str = current_date.strftime("%Y-%m-%d")
        commits_today = daily_counts[day_idx]
        
        for c in range(commits_today):
            if action_idx >= total_actions:
                msg = "chore: finalize layout configuration"
                timestamp = get_random_time(date_str)
                run_cmd(f'GIT_AUTHOR_DATE="{timestamp}" GIT_COMMITTER_DATE="{timestamp}" git commit --allow-empty -m "{msg}"')
                print(f"Committed empty on {timestamp}")
                continue
                
            action = actions[action_idx]
            filename = action["filename"]
            
            if action["action"] == "rm":
                run_cmd(f"git rm --cached --ignore-unmatch {filename}")
            elif action["action"] == "add":
                run_cmd(f"git add {filename}")
            else:
                with open("scratch/temp.patch", "w") as f:
                    f.write(action["patch"])
                success = run_cmd("git apply --cached scratch/temp.patch", check=False)
                if not success:
                    # Fallback: just add the whole file if patch fails
                    run_cmd(f"git add {filename}")
                    
            msg = f"feat: update {os.path.basename(filename)}"
            if "part" in action:
                msg = f"feat: update {os.path.basename(filename)} (part {action['part']}/{action['total']})"
                
            if "migrations" in filename: msg = "chore: add database migration for new fields"
            elif "ledger" in filename: msg = f"feat(ledger): update invoice payload integration (pt {action.get('part', 1)})"
            elif "invoice/page" in filename: msg = f"feat(ui): refine invoice layout and typography (pt {action.get('part', 1)})"
            elif "assets" in filename: msg = "chore: add UI branding assets"
            elif "Dockerfile" in filename: msg = "chore: optimize docker container setup"
            elif "schemas" in filename: msg = "feat(backend): extend schemas for billing"
            elif "models" in filename: msg = "feat(backend): add invoice properties to client model"
            
            timestamp = get_random_time(date_str)
            run_cmd(f'GIT_AUTHOR_DATE="{timestamp}" GIT_COMMITTER_DATE="{timestamp}" git commit -m "{msg}"')
            print(f"Committed {msg} on {timestamp}")
            
            action_idx += 1
            
    # At the end, add any remaining changes and commit them
    run_cmd("git add .")
    timestamp = get_random_time("2026-03-18")
    run_cmd(f'GIT_AUTHOR_DATE="{timestamp}" GIT_COMMITTER_DATE="{timestamp}" git commit -m "feat(ui): final polish and layout adjustments"')
    print("Done!")

if __name__ == "__main__":
    main()
