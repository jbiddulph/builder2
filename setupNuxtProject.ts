// setupNuxtProject.js
import inquirer from 'inquirer';
import { exec } from 'child_process';
import simpleGit from 'simple-git';
import fs from 'fs';

// Define available modules
const availableModules = [
  { name: '@nuxtjs/tailwindcss', value: '@nuxtjs/tailwindcss' },
  { name: '@nuxtjs/moment', value: '@nuxtjs/moment' },
  { name: '@pinia/nuxt', value: '@pinia/nuxt' },
  { name: '@nuxt/image', value: '@nuxt/image' }
];

// Function to update nuxt.config.ts
function updateNuxtConfig(projectName, modules) {
  const configPath = `${projectName}/nuxt.config.ts`;
  const configContent = `
export default defineNuxtConfig({
  modules: ${JSON.stringify(modules)}
});
`;
  fs.writeFileSync(configPath, configContent);
}

// Run the setup process
export async function buildNuxt() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter the name of your Nuxt project:',
      validate: input => input ? true : 'Project name cannot be empty.'
    },
    {
      type: 'checkbox',
      name: 'modules',
      message: 'Select modules to install:',
      choices: availableModules
    }
  ]);

  const { projectName, modules } = answers;

  exec(`npx nuxi init ${projectName}`, (error) => {
    if (error) {
      console.error('Failed to initialize Nuxt project:', error);
      return;
    }

    process.chdir(`./${projectName}`);
    const modulesToInstall = modules.join(' ');
    exec(`npm install ${modulesToInstall}`, (installError) => {
      if (installError) {
        console.error('Failed to install modules:', installError);
        return;
      }

      updateNuxtConfig(projectName, modules);

      const git = simpleGit();
      git.init()
        .then(() => git.addRemote('origin', `https://github.com/yourusername/${projectName}.git`))
        .then(() => git.add('.'))
        .then(() => git.commit('Initial commit'))
        .then(() => git.push('origin', 'main'))
        .catch(err => console.error('Failed to push to GitHub:', err));
    });
  });
}
