import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';

const rootDir = path.resolve('.');
const targetRef = process.argv[2] || 'v.0';

async function rollback() {
  console.log(`--- Rolling back to ref: ${targetRef} ---`);
  
  await git.checkout({
    fs,
    dir: rootDir,
    ref: targetRef,
    force: true,
  });

  const commits = await git.log({ fs, dir: rootDir, depth: 1 });
  console.log('✓ Successfully rolled back to:', targetRef);
  console.log('Current Commit:', commits[0].commit.message.trim());
  console.log('Commit SHA:', commits[0].oid);
}

rollback().catch(err => {
  console.error('Error rolling back:', err);
  process.exit(1);
});
