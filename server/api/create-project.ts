import { defineEventHandler, readBody } from "h3";
import { execSync } from "child_process";
import axios from "axios";
import * as path from "path";
const config = useRuntimeConfig()
const GITHUB_TOKEN = config.githubToken;
const NETLIFY_TOKEN = config.netlifyToken;
const GITHUB_USERNAME = config.githubUser;

export default defineEventHandler(async (event) => {
  const { modules } = await readBody(event);
  const projectName = `nuxt-app-${Date.now()}`;
  const projectDir = path.join("/tmp", projectName);

  try {
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

    // Step 3: Initialize Git repository
    console.log("Initializing Git repository...");
    execSync("git init", { cwd: projectDir });
    execSync("git checkout -b master", { cwd: projectDir });
    execSync("git add .", { cwd: projectDir });
    execSync(`git commit -m "Initial commit with selected modules"`, { cwd: projectDir });
    console.log("Git repository initialized and initial commit made.");

    // Step 4: Create GitHub repo and get HTTPS URL
    console.log("Creating GitHub repository...");
    const repoResponse = await axios.post(
      `https://api.github.com/user/repos`,
      { name: projectName, private: true },
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );

    const githubRepoUrl = repoResponse.data.clone_url;
    console.log("GitHub repository created:", githubRepoUrl);

    // Step 5: Set remote to HTTPS and push code to GitHub
    execSync(`git remote add origin ${githubRepoUrl}`, { cwd: projectDir });
    execSync("git push -u origin master", { cwd: projectDir });
    console.log("Code pushed to GitHub successfully on master branch.");

    // Step 6: Use Netlify API to create and link the site
    console.log("Linking GitHub repository to Netlify...");
    const netlifyResponse = await axios.post(
      "https://api.netlify.com/api/v1/sites",
      {
        name: projectName,
        repo: {
          provider: "github",
          repo: `${GITHUB_USERNAME}/${projectName}`,
          branch: "master",
          private: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const siteId = netlifyResponse.data.id; // Get the site ID from the Netlify response
    console.log("Netlify site ID:", siteId);

    // Step 7: Create a deploy hook for the Netlify site
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
    console.error("Error creating and deploying project:", error.message, error);
    return { statusCode: 500, message: "Failed to create and deploy project." };
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
            Authorization: `Bearer ${NETLIFY_TOKEN}`,
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