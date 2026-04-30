import subprocess
import random
import sys

def run_cmd(cmd):
    print(f"Executing: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Command failed: {cmd}")
        print("STDOUT:", res.stdout)
        print("STDERR:", res.stderr)
        sys.exit(1)
    return res.stdout

def get_random_time(date_str, idx):
    # Generates a random time in the 5:30 AM to 11:30 AM window.
    # To avoid time ordering conflicts within the same day, we sort the times by idx.
    # We can divide the 6 hours window (360 minutes total) into 3 slots.
    # Slot 1: 05:30 to 07:30
    # Slot 2: 07:30 to 09:30
    # Slot 3: 09:30 to 11:30
    if idx == 0:
        hour = random.randint(5, 7)
        minute = random.randint(30, 59) if hour == 5 else random.randint(0, 59)
    elif idx == 1:
        hour = random.randint(7, 9)
        minute = random.randint(30, 59) if hour == 7 else random.randint(0, 59)
    else:
        hour = random.randint(9, 11)
        minute = random.randint(0, 30) if hour == 11 else random.randint(0, 59)
    second = random.randint(0, 59)
    return f"{date_str} {hour:02d}:{minute:02d}:{second:02d} +0530"

# List of days and their commits
commits_by_day = [
    {
        "date": "2026-04-20",
        "commits": [
            {
                "msg": "feat(db): add service_catalog and service_addons models",
                "files": ["backend/app/models/service_catalog.py", "backend/app/models/service_addon.py"]
            },
            {
                "msg": "feat(db): add service catalog schemas",
                "files": ["backend/app/schemas/service_catalog.py", "backend/app/schemas/service_addon.py"]
            },
            {
                "msg": "chore(db): create alembic migration for core value constraints",
                "files": ["backend/migrations/versions/e8a1f2c3d4b5_add_core_value_constraints.py"]
            }
        ]
    },
    {
        "date": "2026-04-21",
        "commits": [
            {
                "msg": "feat(db): update client and client_service models",
                "files": ["backend/app/models/client.py", "backend/app/models/client_service.py"]
            },
            {
                "msg": "feat(db): update client schemas",
                "files": ["backend/app/schemas/client.py"]
            },
            {
                "msg": "chore(db): create alembic migration for service entry type",
                "files": ["backend/migrations/versions/f4c9a0b1d2e3_add_service_entry_type.py"]
            }
        ]
    },
    {
        "date": "2026-04-22",
        "commits": [
            {
                "msg": "feat(db): update payment, service, and visit models",
                "files": ["backend/app/models/payment.py", "backend/app/models/service.py", "backend/app/models/visit.py"]
            },
            {
                "msg": "feat(db): update visit schemas",
                "files": ["backend/app/schemas/visit.py"]
            },
            {
                "msg": "chore(db): create alembic migration for fixed-point money",
                "files": ["backend/migrations/versions/a7b8c9d0e1f2_use_fixed_point_money.py"]
            }
        ]
    },
    {
        "date": "2026-04-23",
        "commits": [
            {
                "msg": "feat(backend): implement centralized ledger calculation service",
                "files": ["backend/app/services/__init__.py", "backend/app/services/ledger_service.py"]
            },
            {
                "msg": "feat(backend): update ledger schema definitions",
                "files": ["backend/app/schemas/ledger.py"]
            },
            {
                "msg": "feat(backend): integrate ledger service with api endpoint",
                "files": ["backend/app/api/api_v1/endpoints/ledger.py"]
            }
        ]
    },
    {
        "date": "2026-04-24",
        "commits": [
            {
                "msg": "feat(backend): add dynamic client config api endpoint",
                "files": ["backend/app/api/api_v1/endpoints/config.py"]
            },
            {
                "msg": "feat(backend): configure settings and main application entrypoint",
                "files": ["backend/app/core/config.py", "backend/app/main.py"]
            },
            {
                "msg": "feat(backend): define application dependencies",
                "files": ["backend/app/api/deps.py"]
            }
        ]
    },
    {
        "date": "2026-04-25",
        "commits": [
            {
                "msg": "feat(backend): update client and dashboard endpoints",
                "files": ["backend/app/api/api_v1/endpoints/clients.py", "backend/app/api/api_v1/endpoints/dashboard.py"]
            },
            {
                "msg": "feat(backend): update login authentication endpoint",
                "files": ["backend/app/api/api_v1/endpoints/login.py"]
            },
            {
                "msg": "feat(backend): mount router for endpoints",
                "files": ["backend/app/api/api_v1/api.py"]
            }
        ]
    },
    {
        "date": "2026-04-26",
        "commits": [
            {
                "msg": "chore(backend): optimize local backup retention system",
                "files": ["backend/app/utils/backup.py"]
            },
            {
                "msg": "chore(docker): optimize docker container entrypoint",
                "files": ["Dockerfile"]
            },
            {
                "msg": "docs(architecture): update system specification for configuration and ledger",
                "files": ["docs/ARCHITECTURE.md", "docs/assets/ledger_logic.png"]
            }
        ]
    },
    {
        "date": "2026-04-27",
        "commits": [
            {
                "msg": "chore(frontend): update package dependencies and configurations",
                "files": ["frontend/package.json", "frontend/tsconfig.json"]
            },
            {
                "msg": "feat(frontend): implement shared config loader for static builds",
                "files": ["frontend/lib/shared-config.ts"]
            },
            {
                "msg": "feat(frontend): set up global app layouts and state providers",
                "files": ["frontend/app/layout.tsx", "frontend/components/AppLayout.tsx", "frontend/components/QueryProvider.tsx"]
            }
        ]
    },
    {
        "date": "2026-04-28",
        "commits": [
            {
                "msg": "feat(frontend): refine navbar navigation components",
                "files": ["frontend/app/components/Navbar.tsx"]
            },
            {
                "msg": "feat(frontend): enhance login page UI flow",
                "files": ["frontend/app/login/page.tsx"]
            },
            {
                "msg": "feat(frontend): configure logging utility",
                "files": ["frontend/lib/logger.ts"]
            }
        ]
    },
    {
        "date": "2026-04-29",
        "commits": [
            {
                "msg": "feat(frontend): integrate client ledger endpoints in api service",
                "files": ["frontend/services/api.ts"]
            },
            {
                "msg": "feat(frontend): develop client detail page view",
                "files": ["frontend/app/clients/view/page.tsx"]
            },
            {
                "msg": "feat(frontend): create ledger history table component",
                "files": ["frontend/app/clients/view/LedgerHistory.tsx"]
            }
        ]
    },
    {
        "date": "2026-04-30",
        "commits": [
            {
                "msg": "docs: update project readme guide",
                "files": ["README.md"]
            },
            {
                "msg": "docs: record development log progression",
                "files": ["docs/DEVELOPMENT_LOG.md"]
            },
            {
                "msg": "chore: verify workspace cleanup and status",
                "files": [] # will add whatever is left (excluding the excel sheet)
            }
        ]
    }
]

def main():
    # Make sure we reset the index first
    run_cmd("git reset")
    
    # Track which files have been committed so far
    committed_files = set()
    
    for day_idx, day_data in enumerate(commits_by_day):
        date_str = day_data["date"]
        print(f"--- Processing Day: {date_str} ---")
        
        for commit_idx, commit_data in enumerate(day_data["commits"]):
            files = commit_data["files"]
            msg = commit_data["msg"]
            
            # If files list is empty, it's the final cleanup commit on the last day.
            # We want to stage everything left EXCEPT the excel file.
            if len(files) == 0:
                # Stage everything that is modified/untracked
                status_out = run_cmd("git status --porcelain")
                lines = status_out.splitlines()
                added_any = False
                for line in lines:
                    if line.strip():
                        parts = line.split(maxsplit=1)
                        if len(parts) == 2:
                            state, path = parts
                            # Exclude the Excel sheet
                            if "Mutual_Funds_Order_History" in path:
                                continue
                            run_cmd(f"git add {path}")
                            added_any = True
                if not added_any:
                    print("No files left to stage for cleanup. Skipping commit.")
                    continue
            else:
                for file_path in files:
                    run_cmd(f"git add {file_path}")
                    committed_files.add(file_path)
            
            # Verify if there is anything in staging
            diff_check = subprocess.run("git diff --cached --quiet", shell=True)
            if diff_check.returncode == 0:
                # No changes in staging
                print(f"No changes staged for: '{msg}'. Skipping commit.")
                continue
                
            timestamp = get_random_time(date_str, commit_idx)
            cmd = f'GIT_AUTHOR_DATE="{timestamp}" GIT_COMMITTER_DATE="{timestamp}" git commit -m "{msg}"'
            run_cmd(cmd)
            print(f"Successfully committed: {msg} at {timestamp}")

    print("All commits simulated successfully!")

if __name__ == "__main__":
    main()
