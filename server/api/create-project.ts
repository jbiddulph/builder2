import { defineEventHandler, readBody } from "h3";
import { execSync } from "child_process";
import axios from "axios";
import fs from "fs";
import * as path from "path";
const config = useRuntimeConfig();
const GITHUB_TOKEN = config.githubToken;
const NETLIFY_TOKEN = config.netlifyToken;
const GITHUB_USERNAME = config.githubUser;

export default defineEventHandler(async (event) => {
  const { modules } = await readBody(event);
  const projectName = `nuxt-app-${Date.now()}`;
  const projectDir = path.join("/tmp", projectName);

  try {
    const gitVersion = execSync('git --version').toString();
    console.log('Git is available:', gitVersion);
    // Step 1: Create new Nuxt app
    console.log("Creating a new Nuxt application...");
    execSync(`npx nuxi@latest init ${projectDir}`);
    console.log("Nuxt application created successfully.");

    // Step 2: Add selected modules
    if (modules && modules.length) {
      for (const module of modules) {
        console.log(`Adding module: ${module}`);
        execSync(`npx nuxi@latest module add ${module}`, { cwd: projectDir });
      }
      console.log("Modules added successfully.");
    }

  // Step 1: Create a new Nuxt app
  console.log("Creating a new Nuxt application...");
  execSync(`npx nuxi@latest init ${projectDir}`);
  console.log("Nuxt application created successfully.");

  // Step 2: Add selected modules
  if (modules && modules.length) {
    for (const module of modules) {
      console.log(`Adding module: ${module}`);
      execSync(`npx nuxi@latest module add ${module}`, { cwd: projectDir });
    }
    console.log("Modules added successfully.");
  }

  // Step 3: Initialize Git repository
  console.log("Initializing Git repository...");
  try {
    const currentEmail = execSync('git config --global user.email || echo ""').toString().trim();
    const currentName = execSync('git config --global user.name || echo ""').toString().trim();

    if (currentEmail !== process.env.GITHUB_EMAIL) {
      console.log(`Updating git user.email to '${process.env.GITHUB_EMAIL}'`);
      execSync(`git config --global user.email "${process.env.GITHUB_EMAIL}"`);
    }
    if (currentName !== process.env.GITHUB_USER) {
      console.log(`Updating git user.name to '${process.env.GITHUB_USER}'`);
      execSync(`git config --global user.name "${process.env.GITHUB_USER}"`);
    }
  } catch (gitConfigError) {
    console.error('Error while configuring git:', gitConfigError.message);
  }

  execSync("git init", { cwd: projectDir });
  execSync("git checkout -b main", { cwd: projectDir }); // Use 'main' directly
  execSync("git add .", { cwd: projectDir });
  execSync('git commit -m "Initial commit with selected modules"', { cwd: projectDir });

  // Step 4: Create GitHub repo
  console.log("Creating GitHub repository...");
  const repoResponse = await axios.post(
    "https://api.github.com/user/repos",
    { name: projectName, private: true },
    { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
  );
  const githubRepoUrl = repoResponse.data.clone_url;
  console.log("GitHub repository created:", githubRepoUrl);

  execSync(`git remote add origin ${githubRepoUrl}`, { cwd: projectDir });
  console.log("Pushing code to GitHub...");
  execSync(
    `git push -u https://${process.env.GITHUB_USER}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_USER}/${projectName} main`,
    { cwd: projectDir }
  );
  console.log("Code pushed to GitHub successfully on main branch.");

    // Step 5: Use Netlify API to create and link the site
    console.log("Linking GitHub repository to Netlify...");
    const netlifyResponse = await axios.post(
      "https://api.netlify.com/api/v1/sites",
      {
        name: projectName,
        repo: {
          provider: "github",
          repo: `${GITHUB_USERNAME}/${projectName}`,
          branch: "master",
          private: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const siteId = netlifyResponse.data.id;
    console.log("Netlify site ID:", siteId);

    // Step 6: Create a deploy hook for the Netlify site
    console.log("Creating deploy hook for Netlify site...");
    const deployHookURL = await createDeployHook(siteId);

    if (deployHookURL) {
      console.log("Deploy hook created:", deployHookURL);
      // Optionally trigger deployment immediately
      await axios.post(deployHookURL);
      console.log("Deployment triggered via deploy hook.");
    }

    console.log("Deployment to Netlify successful:", netlifyResponse.data.url);
    return { netlify_url: netlifyResponse.data.url };
  } catch (error) {
    console.error('Git is not available:', error.message);
    console.error("Error creating and deploying project:", error.message, error.stack);

    // Log full error details for better diagnosis
    if (error.response) {
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
      console.error("Error response data:", error.response.data);
    }

    return { statusCode: 500, message: "Failed to create and deploy project.", error: error.message };
  }

  async function createDeployHook(siteId) {
    const hookName = 'Auto Deploy Hook';
  
    try {
      const response = await axios.post(
        `https://api.netlify.com/api/v1/sites/${siteId}/hooks`,
        {
          type: 'url',
          event: 'deploy',
          name: hookName,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      console.log("Deploy hook created successfully:", response.data);
      return response.data.url;
    } catch (error) {
      console.error("Failed to create deploy hook:", error.response?.data || error.message);
      return null;
    }
  }
});
