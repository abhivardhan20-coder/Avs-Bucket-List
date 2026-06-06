import os
import sys
import re
import time
import argparse
import hashlib
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict, Counter

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

INCLUDED_DIRS = {
    "src", "public", "docs", "supabase", "functions", "utils"
}

INCLUDED_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".py", ".sql", ".css", ".html", 
    ".json", ".md", ".yaml", ".yml"
}

EXCLUDED_DIRS = {
    "node_modules", "dist", "build", "coverage", ".git", ".vercel", 
    ".next", ".cache", "__pycache__"
}

def get_git_info(repo_path: Path) -> tuple[str, str]:
    """Retrieve the current git branch and latest commit hash."""
    try:
        branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_path, stderr=subprocess.DEVNULL).decode("utf-8").strip()
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo_path, stderr=subprocess.DEVNULL).decode("utf-8").strip()
        return branch, commit
    except Exception:
        return "Unknown", "Unknown"

def get_next_version(root_path: Path) -> int:
    """Detect the highest existing version of README_SYNC_vX.md and return the next version number."""
    max_v = 0
    pattern = re.compile(r"^README_SYNC_v(\d+)\.md$")
    for file in root_path.iterdir():
        if file.is_file():
            match = pattern.match(file.name)
            if match:
                v = int(match.group(1))
                if v > max_v:
                    max_v = v
    return max_v + 1

def get_language(extension: str) -> str:
    """Map file extensions to markdown language identifiers."""
    ext_map = {
        ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx",
        ".py": "python", ".sql": "sql", ".css": "css", ".html": "html",
        ".json": "json", ".md": "markdown", ".yaml": "yaml", ".yml": "yaml"
    }
    return ext_map.get(extension, "text")

def minify_code(content: str, ext: str) -> str:
    """Basic minification: removes blank lines and some comments."""
    lines = content.splitlines()
    minified = []
    in_block_comment = False
    
    for line in lines:
        s_line = line.strip()
        if not s_line:
            continue
            
        if ext == ".py":
            if s_line.startswith("#"): continue
        elif ext in [".js", ".jsx", ".ts", ".tsx"]:
            if s_line.startswith("//"): continue
            if s_line.startswith("/*"):
                in_block_comment = True
            if in_block_comment:
                if "*/" in s_line:
                    in_block_comment = False
                continue
                
        minified.append(line)
        
    return "\n".join(minified)

def process_file(filepath: Path, root: Path, minify: bool) -> dict | None:
    """Read a file, compute statistics, hash, and optionally minify its content."""
    try:
        stat = filepath.stat()
        if stat.st_size > MAX_FILE_SIZE:
            return None
            
        if filepath.suffix.lower() not in INCLUDED_EXTENSIONS:
            return None
            
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(filepath, "r", encoding="latin-1") as f:
                    content = f.read()
            except Exception:
                return None
                
        if "\x00" in content:
            return None
            
        if minify:
            content = minify_code(content, filepath.suffix.lower())
            
        lines = content.splitlines()
        loc = len(lines)
        size = len(content.encode('utf-8'))
        
        file_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        rel_path = filepath.relative_to(root).as_posix()
        
        return {
            "path": rel_path,
            "name": filepath.name,
            "ext": filepath.suffix.lower(),
            "lang": get_language(filepath.suffix.lower()),
            "size": size,
            "loc": loc,
            "content": content,
            "hash": file_hash
        }
    except Exception as e:
        logging.debug(f"Error processing {filepath}: {e}")
        return None

def generate_tree(file_paths: list[str]) -> str:
    """Generate a text-based tree representation from a list of file paths."""
    paths = sorted([p.split('/') for p in file_paths])
    
    class Node:
        def __init__(self):
            self.children = defaultdict(Node)
            
    root_node = Node()
    for parts in paths:
        curr = root_node
        for part in parts:
            curr = curr.children[part]
            
    def build_tree(node, prefix=""):
        lines = []
        keys = sorted(list(node.children.keys()))
        for i, key in enumerate(keys):
            is_last = (i == len(keys) - 1)
            connector = "└── " if is_last else "├── "
            lines.append(prefix + connector + key)
            extension = "    " if is_last else "│   "
            lines.extend(build_tree(node.children[key], prefix + extension))
        return lines
        
    tree_lines = build_tree(root_node)
    return ".\n" + "\n".join(tree_lines)

def main():
    parser = argparse.ArgumentParser(description="Generate a versioned markdown snapshot of the source code.")
    parser.add_argument("--minify", action="store_true", help="Removes comments and blank lines before export.")
    parser.add_argument("--source-only", action="store_true", help="Exports only file contents.")
    parser.add_argument("--stats-only", action="store_true", help="Exports metadata without source.")
    
    args = parser.parse_args()
    
    root_path = Path.cwd()
    logging.info(f"Scanning project root: {root_path}")
    
    start_time = time.time()
    
    files_to_scan = []
    
    for dirpath, dirnames, filenames in os.walk(root_path, followlinks=False):
        dp = Path(dirpath)
        
        # Prune excluded directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]
        
        # If we are at the root, optionally prune directories not in INCLUDED_DIRS
        # This aligns with the requirement "Include: src/ public/ docs/ supabase/ functions/ utils/"
        if dp == root_path:
            dirnames[:] = [d for d in dirnames if d in INCLUDED_DIRS]
            
        for f in filenames:
            fp = dp / f
            if fp.suffix.lower() in INCLUDED_EXTENSIONS:
                files_to_scan.append(fp)
                
    logging.info(f"Found {len(files_to_scan)} potential source files.")
    
    processed_files = []
    
    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(process_file, fp, root_path, args.minify): fp for fp in files_to_scan}
        for future in as_completed(futures):
            res = future.result()
            if res:
                processed_files.append(res)
                
    processed_files.sort(key=lambda x: x["path"])
    
    if not processed_files:
        logging.warning("No files matched the criteria. Check your INCLUDED_DIRS and INCLUDED_EXTENSIONS.")
        sys.exit(0)
        
    end_scan_time = time.time()
    logging.info(f"Scanned and read {len(processed_files)} files in {end_scan_time - start_time:.2f} seconds.")
    
    total_files = len(processed_files)
    total_loc = sum(f["loc"] for f in processed_files)
    total_size = sum(f["size"] for f in processed_files)
    
    largest_file = max(processed_files, key=lambda x: x["size"])
    smallest_file = min(processed_files, key=lambda x: x["size"])
    avg_size = total_size / total_files if total_files > 0 else 0
    
    languages = set(f["lang"] for f in processed_files)
    
    filenames = [f["name"] for f in processed_files]
    duplicates = [name for name, count in Counter(filenames).items() if count > 1]
    
    version = get_next_version(root_path)
    out_filename = f"README_SYNC_v{version}.md"
    
    branch, commit = get_git_info(root_path)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    out_lines = []
    
    if not args.source_only:
        out_lines.extend([
            "# Full Project Source Snapshot\n",
            "Generated:",
            f"{timestamp}\n",
            "Version:",
            f"v{version}\n",
            "Total Files:",
            f"{total_files}\n",
            "Total Lines:",
            f"{total_loc}\n",
            "Git Branch:",
            f"{branch}\n",
            "Commit:",
            f"{commit}\n"
        ])
        
        if not args.stats_only:
            out_lines.extend([
                "## Project Tree\n",
                "```text",
                generate_tree([f["path"] for f in processed_files]),
                "```\n"
            ])
            
        out_lines.extend([
            "## File Statistics\n",
            "| File | Lines | Size |",
            "| ---- | ----- | ---- |"
        ])
        
        sorted_by_lines = sorted(processed_files, key=lambda x: x["loc"], reverse=True)
        for f in sorted_by_lines:
            out_lines.append(f"| {f['path']} | {f['loc']} | {f['size']} bytes |")
        out_lines.append("\n")
        
        out_lines.extend([
            "## Metadata\n",
            f"* Total source files: {total_files}",
            f"* Total LOC: {total_loc}",
            f"* Largest file: {largest_file['path']} ({largest_file['size']} bytes)",
            f"* Smallest file: {smallest_file['path']} ({smallest_file['size']} bytes)",
            f"* Average file size: {avg_size:.2f} bytes",
            f"* Languages detected: {', '.join(sorted(languages))}",
            f"* Duplicate filenames: {len(duplicates)}\n"
        ])
        
    if not args.stats_only:
        for f in processed_files:
            out_lines.extend([
                "---",
                f"\n# FILE: {f['path']}\n",
                "Language: " + f['lang'] + "\n",
                f"Size: {f['size']} bytes\n",
                f"Lines: {f['loc']}\n",
                f"```{f['lang']}",
                f["content"]
            ])
            if not f["content"].endswith("\n"):
                out_lines.append("")
            out_lines.append("```\n")
            
    if not args.source_only:
        out_lines.extend([
            "## SHA256 Manifest\n",
            "```text"
        ])
        for f in processed_files:
            out_lines.append(f"{f['path']} -> {f['hash']}")
        out_lines.append("```\n")
        
    out_path = root_path / out_filename
    with open(out_path, "w", encoding="utf-8") as out_f:
        out_f.write("\n".join(out_lines))
        
    logging.info(f"Snapshot successfully saved to {out_filename}")

if __name__ == "__main__":
    main()
