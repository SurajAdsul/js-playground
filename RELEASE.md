# Release Process

This document describes how to create a new release of the JavaScript Playground application.

## Automated Release Process

We use GitHub Actions to automate the build and release process. When you push a tag with the format `v*` (e.g., `v1.0.0`), GitHub Actions will automatically:

1. Build the application for all supported platforms:
   - macOS: Intel (x64), Apple Silicon (arm64), and Universal builds
   - Windows: x64
   - Linux: x64
2. Create a draft release with the built artifacts
3. Generate release notes based on the commits since the last release

### Steps to Create a New Release

1. Update the version in `package.json`:

   ```json
   {
     "name": "js-playground",
     "version": "1.0.0",  // Change this to the new version
     ...
   }
   ```

2. Commit the version change:

   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.0"
   ```

3. Create and push a new tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. Monitor the GitHub Actions workflow at: `https://github.com/YOUR_USERNAME/js-playground/actions`

5. Once the workflow completes, go to the Releases page on GitHub:
   `https://github.com/YOUR_USERNAME/js-playground/releases`

6. You'll find a draft release with the built artifacts. Review it, add any additional notes, and publish it when ready.

### Release Artifacts

The automated build process creates the following artifacts:

- **macOS Intel (x64)**: For Intel-based Macs
- **macOS Apple Silicon (arm64)**: For Apple Silicon Macs (M1, M2, etc.)
- **macOS Universal**: Works on both Intel and Apple Silicon Macs
- **Windows**: Installer for Windows
- **Linux**: AppImage for Linux

### Troubleshooting Permission Issues

If you encounter permission issues with the GitHub Actions workflow (e.g., "403 Forbidden" or "Resource not accessible by integration"), you may need to use a Personal Access Token (PAT) instead of the default GITHUB_TOKEN:

1. Create a Personal Access Token:
   - Go to your GitHub account settings
   - Select "Developer settings" > "Personal access tokens" > "Tokens (classic)"
   - Click "Generate new token" and select "Generate new token (classic)"
   - Give it a descriptive name like "JS Playground Release"
   - Select the following scopes: `repo`, `workflow`
   - Click "Generate token" and copy the token

2. Add the token as a repository secret:
   - Go to your repository settings
   - Select "Secrets and variables" > "Actions"
   - Click "New repository secret"
   - Name: `RELEASE_TOKEN`
   - Value: Paste your personal access token
   - Click "Add secret"

3. Update the workflow file to use your PAT:
   - Edit `.github/workflows/build-release.yml`
   - In the "Create Release" step, change:
     ```yaml
     token: ${{ secrets.GITHUB_TOKEN }}
     ```
     to:
     ```yaml
     token: ${{ secrets.RELEASE_TOKEN }}
     ```

## Manual Release Process

If you need to build the application manually:

### For macOS:

#### Universal Build (both Intel x64 and Apple Silicon arm64):

```bash
npm run build:mac-universal
```

#### Intel x64 only:

```bash
npm run build:mac-x64
```

#### Apple Silicon arm64 only:

```bash
npm run build:mac-arm64
```

#### Without code signing:

```bash
npm run build:mac-unsigned
```

#### Without notarization:

```bash
npm run build:mac-no-notarize
```

### For Windows:

```bash
npm run build:win
```

### For Linux:

```bash
npm run build:linux
```

The built artifacts will be available in the `release/{version}` directory. 