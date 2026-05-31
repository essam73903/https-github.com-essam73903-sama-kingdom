import { execSync } from 'child_process';
try {
  console.log("Reverting App.tsx using git checkout...");
  const output = execSync('git checkout -- src/App.tsx', { encoding: 'utf-8' });
  console.log("Output:", output);
  console.log("Success!");
} catch (e) {
  console.error("Error reverting:", e);
}
