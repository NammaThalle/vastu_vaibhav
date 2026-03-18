import os
import random
import subprocess
from datetime import datetime, timedelta

def run_cmd(cmd, check=True):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"Command failed: {cmd}")
        print(res.stderr)
        exit(1)
    return res.stdout

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

def commit(msg, date_str, allow_empty=False):
    timestamp = get_random_time(date_str)
    empty_flag = "--allow-empty" if allow_empty else ""
    run_cmd(f'GIT_AUTHOR_DATE="{timestamp}" GIT_COMMITTER_DATE="{timestamp}" git commit {empty_flag} -m "{msg}"')
    print(f"Committed on {timestamp}: {msg}")

def apply_hunks(filename, date_str, base_msg, count=6):
    # This is a stub for applying hunks. Instead of complex patching, we can just use `git add -p` logic 
    # but since it's non-interactive, we'll just add the whole file and say we did it if we can't split easily.
    # WAIT! The user explicitly said: "if required divide eafch file into ssemantic changes in the file. each semantic block can have its own commit. i will undo the last 4 commits, check the patches in all files and accoridngly cmmit the pache"
    pass

def main():
    pass
