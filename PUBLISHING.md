# Publishing to GitHub

This document provides instructions for publishing the NXT HUMANS AI CX WORKBENCH to GitHub.

## Prerequisites

1. A GitHub account
2. Git installed on your computer
3. Basic knowledge of Git commands

## Steps to Publish

### 1. Create a New Repository on GitHub

1. Log in to your GitHub account
2. Click on the "+" icon in the top right corner and select "New repository"
3. Name your repository (e.g., "nxt-humans-ai-cx-workbench")
4. Add a description (optional)
5. Choose visibility (public or private)
6. Do NOT initialize with README, .gitignore, or license files
7. Click "Create repository"

### 2. Copy the Repository URL

After creating the repository, you'll see a page with setup instructions. Copy the repository URL, which will look something like:
```
https://github.com/yourusername/nxt-humans-ai-cx-workbench.git
```

### 3. Add the Remote to Your Local Repository

Run the following command in your terminal, replacing the URL with your repository URL:

```bash
cd "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH"
git remote add origin https://github.com/yourusername/nxt-humans-ai-cx-workbench.git
```

### 4. Push Your Code to GitHub

Push your main branch to GitHub:

```bash
git push -u origin main
```

If you're using HTTPS and this is your first time pushing to GitHub, you'll be prompted for your GitHub username and password or token.

### 5. Verify Your Repository

Once the push completes, go to your GitHub repository in your web browser to confirm that all your code has been uploaded successfully.

## Handling Large Files

If you encounter issues with large files during the push, consider using Git LFS (Large File Storage):

1. Install Git LFS: https://git-lfs.github.com/
2. Initialize LFS in your repository:
   ```bash
   git lfs install
   ```
3. Track large file types:
   ```bash
   git lfs track "*.zip" "*.pdf" "*.model"
   ```
4. Add, commit, and push as usual.

## Handling Sensitive Information

Before pushing to GitHub:

1. Ensure no API keys are committed in the code
2. Update any placeholder API keys in files
3. Add sensitive file patterns to .gitignore

## Troubleshooting

### Push Errors

If you encounter errors when pushing:

1. Check your internet connection
2. Verify you have the correct permissions for the repository
3. Try using a personal access token instead of password
4. If pushing large files, consider using Git LFS

### File Size Limitations

GitHub has the following limitations:
- Maximum file size: 100 MB
- Recommended repository size: less than 1 GB
- Absolute maximum repository size: 5 GB

If your repository exceeds these limits, consider:
- Using Git LFS for large files
- Breaking the repository into smaller repositories
- Removing large files that don't need to be tracked

## Notes on External Dependencies

For the component directories, each could potentially be its own repository with this main repository referencing them as submodules. For a simpler approach, we've included placeholders for these components.

When someone clones this repository, they should follow the setup instructions in README.md to get everything working properly.