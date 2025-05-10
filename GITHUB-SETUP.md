# GitHub Repository Setup Guide

This guide provides step-by-step instructions for setting up and publishing the NXT HUMANS AI CX WORKBENCH to GitHub.

## Prerequisites

1. GitHub account
2. Git installed on your computer
3. Git LFS (optional, but recommended for large files)

## Step 1: Create a New GitHub Repository

1. Go to [GitHub](https://github.com/) and sign in
2. Click the "+" icon in the top right corner and select "New repository"
3. Fill in the repository details:
   - Repository name: `nxt-humans-ai-cx-workbench` (or your preferred name)
   - Description: "A comprehensive platform for customer experience research, analysis, and visualization using AI"
   - Visibility: Choose between Public or Private
   - Do NOT initialize with README, .gitignore, or license
4. Click "Create repository"

## Step 2: Add Your Remote Repository

Copy the repository URL from GitHub, then add it as a remote to your local Git repository:

```bash
cd "/Volumes/SSK SSD/NXT HUMANS_AI_CX_WORKBENCH"
git remote add origin https://github.com/yourusername/nxt-humans-ai-cx-workbench.git
```

Replace `yourusername` with your actual GitHub username.

## Step 3: Handle Large Files with Git LFS (Recommended)

If your repository contains large files (models, datasets, etc.), set up Git LFS:

```bash
# Run the provided setup script
./setup-git-lfs.sh
```

This script will:
1. Install Git LFS if not already installed
2. Initialize Git LFS in your repository
3. Configure Git LFS to track common large file types
4. Commit the configurations

## Step 4: Push Your Repository to GitHub

Once everything is set up, push your repository to GitHub:

```bash
# Push the main branch to GitHub
git push -u origin main
```

If this is your first time using GitHub on this computer, you might be prompted for credentials:
- Username: Your GitHub username
- Password: Use a personal access token (not your GitHub password)

## Step 5: Verify Your Repository on GitHub

1. Go to your GitHub account and find your repository
2. Make sure all files have been uploaded correctly
3. Check that the README.md is displaying properly on the repository homepage

## Step 6: Start Using Your Repository

Here are some basic Git commands for working with your repository:

```bash
# Clone the repository to another computer
git clone https://github.com/yourusername/nxt-humans-ai-cx-workbench.git

# Check status of your working directory
git status

# Create a new branch for features/fixes
git checkout -b new-feature

# Add changes to staging
git add .

# Commit changes
git commit -m "Add new feature"

# Push changes to GitHub
git push origin new-feature

# Pull latest changes from GitHub
git pull origin main
```

## Handling Component Directories

Due to the size and complexity of the three main components, consider these approaches:

1. **Single Repository** (Current Setup):
   - Keep all components in one repository
   - Use Git LFS for large files
   - Add detailed README files in each component directory

2. **Submodules Approach** (Advanced):
   - Create separate repositories for each component
   - Reference them as Git submodules in the main repository
   - This provides better organization but increases complexity

3. **Release-Based Approach**:
   - Keep core code in the repository
   - Host large binaries and datasets separately
   - Link to them in documentation

## Troubleshooting

### Push Errors

If you encounter errors during push:

1. **Authentication Issues**:
   - Ensure you're using a personal access token (PAT) rather than your password
   - Generate a new token at GitHub Settings > Developer Settings > Personal Access Tokens

2. **Large File Errors**:
   - Confirm Git LFS is properly set up
   - Ensure tracked file patterns match your large files

3. **Connection Issues**:
   - Check your internet connection
   - Try pushing with the verbose flag: `git push -v origin main`

### File Size Limitations

GitHub has the following limits:
- Individual files: Maximum 100 MB (without Git LFS)
- Repository size: Recommended under 1 GB, maximum 5 GB
- Git LFS: Bandwidth and storage limitations for free accounts

## Additional Resources

- [GitHub Documentation](https://docs.github.com/)
- [Git LFS Documentation](https://git-lfs.github.com/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)