import os
import datetime

# Configuration
EXCLUDED_DIRS = {
    "node_modules", ".git", "dist", "dev-dist", "__pycache__", 
    "venv", ".pytest_cache", ".gemini", "build", 
    "public", "assets", ".vscode", ".idea", ".next"
}
EXCLUDED_FILES = {
    "package-lock.json", "app_preview.db", 
    "app_preview.db-shm", "app_preview.db-wal", "eslint_report.json",
    "setup-environment.py", "pre-deployment-check.py", "verify_production.py",
    "sync_readme.py"
}
INCLUDED_EXTENSIONS = {
    ".ts", ".tsx", ".py", ".js", ".jsx", ".css", ".html", 
    ".json", ".yml", ".yaml", ".dockerfile", "Dockerfile", ".env.example", ".sh", ".ps1",
    ".md", ".bat", ".cmd"
}

def get_next_version():
    """Find the next available version number for README_versionX.md"""
    version = 1
    while os.path.exists(f"README_version{version}.md"):
        version += 1
    return version

def should_process(path, filename):
    """Determine if a file should be included in the README"""
    # Normalize path for comparison
    norm_path = path.replace('\\', '/')
    parts = norm_path.split('/')
    
    # Check if any part of the path is in EXCLUDED_DIRS
    if any(part in EXCLUDED_DIRS for part in parts):
        return False
            
    # Check file exclusions
    if filename in EXCLUDED_FILES:
        return False
        
    # Check extensions
    ext = os.path.splitext(filename)[1].lower()
    if ext in INCLUDED_EXTENSIONS:
        return True
    
    # Handle files like 'Dockerfile' that have no extension
    if filename in INCLUDED_EXTENSIONS:
        return True
        
    return False

def get_language(filename):
    """Determine markdown language identifier for syntax highlighting"""
    ext = os.path.splitext(filename)[1].lower()
    lang_map = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".css": "css",
        ".html": "html",
        ".json": "json",
        ".yml": "yaml",
        ".yaml": "yaml",
        ".sh": "bash",
        ".ps1": "powershell",
        ".bat": "batch",
        ".cmd": "batch",
        ".md": "markdown"
    }
    return lang_map.get(ext, "text")

def sync():
    """Generate a new versioned README with all source code files"""
    version = get_next_version()
    output_file = f"README_version{version}.md"
    
    print(f"Starting synchronization to {output_file}...")
    count = 0
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"# AV's Bucket List - Full Source Code (Version {version})\n\n")
        f.write(f"Generated on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("## Overview\n\n")
        f.write("This document contains all source code files for the AV's Bucket List application, ")
        f.write("excluding node_modules, build artifacts, and setup/deployment files.\n\n")
        f.write("## Table of Contents\n\n")
        
        # Walk twice: once for TOC, once for content
        file_list = []
        for root, dirs, files in os.walk("."):
            for file in sorted(files):
                rel_path = os.path.relpath(os.path.join(root, file), ".")
                if should_process(root, file):
                    file_list.append(rel_path)
                    
        # Generate table of contents
        for path in file_list:
            # Create anchor-friendly version of the path
            anchor = path.replace('.', '').replace('/', '-').replace('\\', '-').lower()
            f.write(f"- [{path}](#{anchor})\n")
            
        f.write("\n---\n\n")
        
        # Write file contents
        for path in file_list:
            print(f"Processing: {path}")
            
            # Create anchor-friendly version of the path
            anchor = path.replace('.', '').replace('/', '-').replace('\\', '-').lower()
            f.write(f"## {path}\n\n")
            
            # Get the appropriate language for syntax highlighting
            lang = get_language(path)
            
            f.write(f"```{lang}\n")
            try:
                with open(path, "r", encoding="utf-8") as source_f:
                    content = source_f.read()
                    f.write(content)
            except Exception as e:
                f.write(f"Error reading file: {str(e)}")
            f.write("\n```\n\n")
            count += 1
            
    print(f"\nSuccessfully generated {output_file} with {count} files.")
    print(f"Next run will create README_version{version + 1}.md")

if __name__ == "__main__":
    sync()
