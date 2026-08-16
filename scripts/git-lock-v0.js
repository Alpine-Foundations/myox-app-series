import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';

const rootDir = path.resolve('.');

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
  console.log('--- Initializing Git Repository ---');
  await git.init({ fs, dir: rootDir, defaultBranch: 'main' });
  console.log('✓ Git repository initialized in:', rootDir);

  const files = await getAllFiles(rootDir);
  console.log(`Adding ${files.length} project files to staging...`);

  for (const filepath of files) {
    await git.add({ fs, dir: rootDir, filepath });
  }
  console.log('✓ Staged all project files');

  console.log('Creating initial commit: v.0...');
  const sha = await git.commit({
    fs,
    dir: rootDir,
    message: 'v.0: Lock stable version with ultra-fast search and 16+ free power tools suite',
    author: {
      name: 'Alpine Document System',
      email: 'alpine@document.local',
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: 0,
    },
  });
  console.log('✓ Created commit SHA:', sha);

  console.log('Creating tag: v.0...');
  await git.tag({
    fs,
    dir: rootDir,
    ref: 'v.0',
    object: sha,
    force: true,
  });
  console.log('✓ Created tag: v.0');

  // Verify commit and tags
  const commits = await git.log({ fs, dir: rootDir, depth: 5 });
  const tags = await git.listTags({ fs, dir: rootDir });

  console.log('\n--- Repository Status ---');
  console.log('Branch: main');
  console.log('Latest Commit:', commits[0].commit.message.trim());
  console.log('Commit SHA:', commits[0].oid);
  console.log('Tags:', tags);
  console.log('Status: LOCKED at v.0 successfully.');
}

run().catch(err => {
  console.error('Error locking version:', err);
  process.exit(1);
});
