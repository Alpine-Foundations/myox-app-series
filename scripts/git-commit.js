import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';

const rootDir = path.resolve('.');
const commitMessage = process.argv[2] || 'feat: add advanced E-Sign studio with Google calligraphy fonts, stamp image upload, and custom palette';

async function getAllFiles(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (['node_modules', 'dist', 'dist-ssr', '.git', '.vscode', '.idea'].includes(item)) {
      continue;
    }
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      await getAllFiles(fullPath, fileList);
    } else {
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
      fileList.push(relPath);
    }
  }
  return fileList;
}

async function run() {
  const currentBranch = await git.currentBranch({ fs, dir: rootDir, fullname: false });
  console.log(`Committing changes on branch: ${currentBranch}...`);

  const files = await getAllFiles(rootDir);
  for (const filepath of files) {
    await git.add({ fs, dir: rootDir, filepath });
  }

  const sha = await git.commit({
    fs,
    dir: rootDir,
    message: commitMessage,
    author: {
      name: 'Alpine Document System',
      email: 'alpine@document.local',
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: 0,
    },
  });

  console.log(`✓ Committed successfully to branch '${currentBranch}'!`);
  console.log('Commit SHA:', sha);
}

run().catch(err => {
  console.error('Commit error:', err);
  process.exit(1);
});
