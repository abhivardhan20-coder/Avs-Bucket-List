#!/usr/bin/env python3
import os
import sys
import argparse
import datetime
import re
import logging
from pathlib import Path

# ==========================================
# Configuration Defaults
# ==========================================

DEFAULT_EXTENSIONS = {
    '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.scss',
    '.json', '.yaml', '.yml', '.sql', '.sh', '.dockerfile', '.md'
}

DEFAULT_EXCLUDES = {
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
    '.venv', 'venv', '__pycache__', '.cache', 'logs', 'tmp', 'temp'
}

# ==========================================
# Helper Functions
# ==========================================

def parse_size(size_str):
    """Parse size strings like '20MB', '1GB' into bytes."""
    if not size_str:
        return None
    match = re.match(r"^(\d+(?:\.\d+)?)([KMG]B)$", size_str.upper())
    if match:
        val, unit = match.groups()
        val = float(val)
        if unit == 'KB': return int(val * 1024)
        if unit == 'MB': return int(val * 1024 * 1024)
        if unit == 'GB': return int(val * 1024 * 1024 * 1024)
    try:
        return int(size_str)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid size format: {size_str}")

def get_next_version(root_dir):
    """Automatically detect the latest version and increment it."""
    version = 1
    pattern = re.compile(r"^README_SYNC_v(\d+)\.md$")
    for filename in os.listdir(root_dir):
        match = pattern.match(filename)
        if match:
            v = int(match.group(1))
            if v >= version:
                version = v + 1
    return version

def generate_tree(file_paths):
    """Generate a text-based folder tree from a list of paths."""
    tree = {}
    for path in file_paths:
        parts = Path(path).parts
        curr = tree
        for part in parts:
            if part not in curr:
                curr[part] = {}
            curr = curr[part]

    def _print_tree(node, prefix=""):
        lines = []
        entries = sorted(list(node.keys()))
        for i, entry in enumerate(entries):
            is_last = (i == len(entries) - 1)
            connector = "└── " if is_last else "├── "
            # If the entry has children, we add a trailing slash to indicate it's a directory
            display_name = entry + "/" if node[entry] else entry
            lines.append(f"{prefix}{connector}{display_name}")
            new_prefix = prefix + ("    " if is_last else "│   ")
            lines.extend(_print_tree(node[entry], new_prefix))
        return lines

    if not tree:
        return ""
    
    # Root representation
    lines = ["."]
    entries = sorted(list(tree.keys()))
    for i, entry in enumerate(entries):
        is_last = (i == len(entries) - 1)
        connector = "└── " if is_last else "├── "
        display_name = entry + "/" if tree[entry] else entry
        lines.append(f"{connector}{display_name}")
        new_prefix = "    " if is_last else "│   "
        lines.extend(_print_tree(tree[entry], new_prefix))
        
    return "\n".join(lines)

def get_language_from_ext(ext):
    """Map file extensions to markdown code block languages."""
    ext = ext.lower()
    mapping = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.jsx': 'jsx',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.sql': 'sql',
        '.sh': 'bash',
        '.dockerfile': 'dockerfile',
        '.md': 'markdown'
    }
    return mapping.get(ext, '')

def is_binary(file_path):
    """Check if a file is binary by trying to read it as text."""
    try:
        with open(file_path, 'tr') as check_file:
            check_file.read(1024)
            return False
    except UnicodeDecodeError:
        return True

# ==========================================
# Main Execution Logic
# ==========================================

def main():
    # Setup Logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # Setup CLI Arguments
    parser = argparse.ArgumentParser(description="Generate a versioned README snapshot of the project source code.")
    parser.add_argument("--output", help="Custom output filename (overrides auto-versioning).")
    parser.add_argument("--max-size", type=parse_size, help="Limit output size (e.g., '20MB').")
    parser.add_argument("--extensions", nargs='*', help="Filter included extensions (e.g., py ts tsx).")
    parser.add_argument("--exclude", nargs='*', help="Additional directories or files to exclude.")
    
    args = parser.parse_args()

    root_dir = os.path.abspath(os.getcwd())
    
    # Configuration Setup
    extensions = set(f".{ext.strip('.')}" for ext in args.extensions) if args.extensions else DEFAULT_EXTENSIONS
    excludes = set(DEFAULT_EXCLUDES)
    if args.exclude:
        excludes.update(args.exclude)
        
    max_output_size = args.max_size
    
    # Version Detection
    if args.output:
        output_file = args.output
        version_str = "Custom"
    else:
        version = get_next_version(root_dir)
        output_file = f"README_SYNC_v{version}.md"
        version_str = f"v{version}"

    logging.info(f"Scanning project root: {root_dir}")
    
    collected_files = []
    total_lines = 0
    total_size = 0
    metadata = []
    
    # 1. Recursive File Scanner
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude specified directories and hidden directories
        dirnames[:] = [d for d in dirnames if d not in excludes and not d.startswith('.')]
        
        for filename in filenames:
            if filename in excludes or filename.startswith('.'):
                continue
                
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            # Special case mapping for Dockerfile
            ext = os.path.splitext(filename)[1].lower()
            if filename.lower() == 'dockerfile':
                ext = '.dockerfile'
                
            if ext not in extensions:
                continue
                
            # Skip media and binary files
            if is_binary(filepath):
                continue
                
            collected_files.append((rel_path, filepath, ext))
            
    # Sort files to ensure deterministic output
    collected_files.sort()
    
    logging.info(f"Found {len(collected_files)} eligible files. Generating snapshot...")
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # 2. README Builder
    try:
        with open(output_file, 'w', encoding='utf-8') as out_f:
            # Document Header
            out_f.write("# Project Source Snapshot\n\n")
            out_f.write(f"**Generated:** {timestamp}  \n")
            out_f.write(f"**Version:** {version_str}  \n")
            out_f.write(f"**Project Root:** `{root_dir}`\n\n")
            
            # Project Tree Generator
            out_f.write("## Project Tree\n\n")
            out_f.write("```text\n")
            out_f.write(generate_tree([f[0] for f in collected_files]))
            out_f.write("\n```\n\n")
            
            # Source Files Inclusion
            out_f.write("## Source Files\n\n")
            
            current_output_size = 0
            
            for rel_path, filepath, ext in collected_files:
                language = get_language_from_ext(ext)
                
                # Graceful Encoding Handling
                try:
                    with open(filepath, 'r', encoding='utf-8') as in_f:
                        content = in_f.read()
                except UnicodeDecodeError:
                    try:
                        with open(filepath, 'r', encoding='latin-1') as in_f:
                            content = in_f.read()
                    except Exception as e:
                        logging.warning(f"Could not read {rel_path}: {e}")
                        continue
                except Exception as e:
                    logging.warning(f"Error reading {rel_path}: {e}")
                    continue
                    
                lines_count = len(content.splitlines())
                file_size = os.path.getsize(filepath)
                
                total_lines += lines_count
                total_size += file_size
                
                metadata.append((rel_path, file_size, lines_count))
                
                # Safety Limit: Output Size Constraint
                if max_output_size and current_output_size > max_output_size:
                    logging.warning(f"Maximum output size limit reached. Truncating.")
                    out_f.write(f"\n> **Note:** Maximum output size limit reached. Further files are truncated.\n")
                    break
                    
                section = f"### File: {rel_path}\n\n```{language}\n{content}\n```\n\n"
                out_f.write(section)
                current_output_size += len(section.encode('utf-8'))
                
            # Metadata Section
            out_f.write("## Metadata Section\n\n")
            out_f.write(f"- **Total files processed:** {len(metadata)}\n")
            out_f.write(f"- **Total lines of code:** {total_lines}\n")
            out_f.write(f"- **Generation timestamp:** {timestamp}\n")
            out_f.write(f"- **README version:** {version_str}\n")
            out_f.write(f"- **Project root path:** `{root_dir}`\n\n")
            
            # Change Tracking Manifest Section
            out_f.write("## Snapshot Metadata\n\n")
            out_f.write("| File | Size | Lines |\n")
            out_f.write("| --- | --- | --- |\n")
            for rel_path, size, lines in metadata:
                if size < 1024:
                    size_str = f"{size} B"
                elif size < 1024 * 1024:
                    size_str = f"{size / 1024:.1f} KB"
                else:
                    size_str = f"{size / (1024 * 1024):.1f} MB"
                    
                out_f.write(f"| {rel_path} | {size_str} | {lines} |\n")
                
    except Exception as e:
        logging.error(f"Failed to generate README: {e}")
        sys.exit(1)
        
    # Processing Report
    logging.info(f"Successfully generated: {output_file}")
    logging.info(f"Total files processed: {len(metadata)}")
    logging.info(f"Total lines of code: {total_lines}")

if __name__ == "__main__":
    main()
