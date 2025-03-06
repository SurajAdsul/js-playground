# Release Process

This document describes how to create a new release of the JavaScript Playground application.

## Automated Release Process

We use GitHub Actions to automate the build and release process. When you push a tag with the format `v*` (e.g., `v1.0.0`), GitHub Actions will automatically:

1. Build the application for Windows, macOS, and Linux
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

## Manual Release Process

If you need to build the application manually:

### For macOS (without code signing):

```bash
npm run build:mac-unsigned
```

### For macOS (without notarization):

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