# How to Update PortfolioSDK on NPM

## Quick Update Workflow

### 1. Make Your Changes
Edit files in `src/` directory.

### 2. Update Version & Publish

**For bug fixes (patch):**
```bash
npm run version:patch
npm run release
```

**For new features (minor):**
```bash
npm run version:minor
npm run release
```

**For breaking changes (major):**
```bash
npm run version:major
npm run release
```

### 3. Push to GitHub
```bash
git push --follow-tags
```

---

## Manual Process

If you prefer manual control:

### Step 1: Update Version
Edit `package.json`:
```json
{
  "version": "1.0.1"  // Increment as needed
}
```

### Step 2: Build
```bash
npm run build
```

### Step 3: Test Locally (Optional)
```bash
# In demo-portfolio
npm install ../portfoliosdk
```

### Step 4: Commit
```bash
git add .
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push --follow-tags
```

### Step 5: Publish
```bash
npm publish --access public
```

---

## What Gets Published

Only these files are published to npm:
- `dist/` - Compiled JavaScript/TypeScript
- `package.json` - Package metadata
- `README.md` - Documentation

**Excluded:**
- `src/` - Source files (users don't need these)
- `node_modules/` - Dependencies
- `.git/` - Git history
- Screenshots, config files, etc.

---

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (2.0.0): Breaking changes
  - Removed props
  - Changed API
  - Incompatible changes

- **MINOR** (1.1.0): New features (backwards compatible)
  - New props
  - New components
  - New features

- **PATCH** (1.0.1): Bug fixes
  - Bug fixes
  - Performance improvements
  - Documentation updates

---

## Example: Adding a New Feature

```bash
# 1. Make changes to src/components/AutoChat.tsx
# 2. Test locally
npm run build
cd ../demo-portfolio
npm install ../portfoliosdk

# 3. If everything works, publish
cd ../portfoliosdk
npm run version:minor  # Bumps 1.0.0 → 1.1.0
npm run release       # Builds and publishes

# 4. Push to GitHub
git push --follow-tags
```

---

## Users Update Like This

After you publish, users update with:

```bash
npm install portfoliosdk@latest
# OR
npm update portfoliosdk
```

---

## First Time Publishing

Before first publish, make sure you're logged in:

```bash
npm login
npm whoami  # Verify you're logged in
npm publish --access public
```

---

## Troubleshooting

### "Package name already exists"
- Check if someone else has the name
- You might need a scoped package: `@yourusername/portfoliosdk`

### "You must verify your email"
- Verify your email on npmjs.com

### "Insufficient permissions"
- Make sure you're the owner of the package
- Check npm account permissions

