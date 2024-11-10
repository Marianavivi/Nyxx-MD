import { exec } from 'child_process';

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${description}...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${description}:`, error);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Stderr while executing ${description}:`, stderr);
      }
      console.log(`Result of ${description}:`, stdout);
      resolve(stdout);
    });
  });
}

// Add more lines for more packages
async function installPythonDependencies() {
  try {
    await runCommand('pip install -U --pre "yt-dlp[default]"', 'Installing YT-DLP');
  } catch (error) {
    console.error('Error Installing Optional Modules, Some Plugins May Not Work.', error);
  }
}

installPythonDependencies();
