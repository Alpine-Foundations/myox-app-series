import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';

const rootDir = path.resolve('.');
const action = process.argv[2] || 'status';
const targetBranch = process.argv[3] || 'lab';

async function run() {
  if (action === 'create' || action === 'checkout-new') {
    console.log(`Creating branch: ${targetBranch}...`);
    await git.branch({
      fs,
      dir: rootDir,
      ref: targetBranch,
      checkout: true,
    });
    console.log(`✓ Switched to new branch: ${targetBranch}`);
  } else if (action === 'checkout') {
    console.log(`Checking out branch: ${targetBranch}...`);
    await git.checkout({
      fs,
      dir: rootDir,
      ref: targetBranch,
    });
    console.log(`✓ Switched to branch: ${targetBranch}`);
  } else if (action === 'merge-to-main') {
    console.log(`Merging ${targetBranch} into main...`);
    await git.checkout({ fs, dir: rootDir, ref: 'main' });
    await git.merge({
      fs,
      dir: rootDir,
      ours: 'main',
      theirs: targetBranch,
      author: { name: 'Alpine Document', email: 'alpine@document.local' },
    });
    console.log(`✓ Successfully merged ${targetBranch} into main!`);
  }

  const currentBranch = await git.currentBranch({ fs, dir: rootDir, fullname: false });
  const branches = await git.listBranches({ fs, dir: rootDir });
  const tags = await git.listTags({ fs, dir: rootDir });

  console.log('\n--- Git Workspace Status ---');
  console.log('Active Branch:', currentBranch);
  console.log('Available Branches:', branches);
  console.log('Tags:', tags);
}

run().catch(err => {
  console.error('Git branch error:', err);
  process.exit(1);
});
