#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, loadProjectConfig, saveConfig, saveProjectConfig } from './config.js';
import { request } from './http.js';

const program = new Command();

program
  .name('devbrain')
  .description('CLI for DevBrain SaaS')
  .version('1.0.0');

program
  .command('login')
  .requiredOption('--email <email>', 'User email')
  .requiredOption('--password <password>', 'User password')
  .action(async (options) => {
    const response = await request<{ token: string; user: { email: string } }>('/login', {
      method: 'POST',
      body: {
        email: options.email,
        password: options.password
      }
    });

    if (!response.success || !response.data) {
      console.error(`Login failed: ${response.error?.message}`);
      process.exit(1);
    }

    const config = loadConfig();
    saveConfig({ ...config, token: response.data.token });
    console.log(`Logged in as ${response.data.user.email}`);
  });

program
  .command('init')
  .description('Link the current repo to a workspace')
  .action(async () => {
    ensureLoggedIn();
    const workspacesResponse = await request<{ workspaces: Workspace[] }>('/workspaces', {
      method: 'GET',
      auth: true
    });

    if (!workspacesResponse.success || !workspacesResponse.data) {
      console.error(`Init failed: ${workspacesResponse.error?.message}`);
      process.exit(1);
    }

    const workspaces = workspacesResponse.data.workspaces;
    const selection = await selectWorkspace(workspaces);
    const projectConfig = {
      workspaceId: selection.id,
      projectName: selection.name,
      repoPath: process.cwd()
    };

    saveProjectConfig(projectConfig);
    console.log(`Linked ${projectConfig.repoPath} to workspace "${selection.name}" (${selection.id})`);
  });

program
  .command('remember')
  .argument('<content>', 'Memory text to store for this workspace')
  .option('--tag <tag...>', 'Optional memory tags')
  .action(async (content, options) => {
    ensureLoggedIn();
    const projectConfig = requireProjectConfig();
    const response = await request<{ memory: { id: string } }>('/memories', {
      method: 'POST',
      auth: true,
      body: {
        workspaceId: projectConfig.workspaceId,
        content,
        tags: options.tag,
        repoPath: projectConfig.repoPath,
        commitHash: readGitCommitHash(projectConfig.repoPath)
      }
    });

    if (!response.success || !response.data) {
      console.error(`Remember failed: ${response.error?.message}`);
      process.exit(1);
    }

    console.log(`Stored memory ${response.data.memory.id} in workspace "${projectConfig.projectName}".`);
  });

program
  .command('ask')
  .argument('<query>', 'Ask a question about the current workspace')
  .action(async (query) => {
    ensureLoggedIn();
    const projectConfig = requireProjectConfig();
    const response = await request<{
      answer: string;
      memories: Array<{ id: string; content: string; repoPath?: string | null; tags: string[] }>;
      codeChunks: Array<{ path: string; content: string }>;
    }>('/ask', {
      method: 'POST',
      auth: true,
      body: {
        workspaceId: projectConfig.workspaceId,
        query
      }
    });

    if (!response.success || !response.data) {
      console.error(`Ask failed: ${response.error?.message}`);
      process.exit(1);
    }

    console.log('\nAnswer\n');
    console.log(response.data.answer);

    if (response.data.memories.length > 0) {
      console.log('\nReferenced memories\n');
      for (const memory of response.data.memories) {
        const tags = memory.tags.length > 0 ? ` [${memory.tags.join(', ')}]` : '';
        const repoPath = memory.repoPath ? ` (${memory.repoPath})` : '';
        console.log(`- ${memory.content}${tags}${repoPath}`);
      }
    }

    if (response.data.codeChunks.length > 0) {
      console.log('\nReferenced code chunks\n');
      for (const chunk of response.data.codeChunks.slice(0, 3)) {
        console.log(`- ${chunk.path}`);
      }
    }
  });

program
  .command('ingest')
  .description('Ingest files from the current repo into the linked workspace')
  .option('--code <dir>', 'Code directory to ingest', '.')
  .option('--notes <dir>', 'Notes/docs directory to ingest')
  .action(async (options) => {
    ensureLoggedIn();
    const projectConfig = requireProjectConfig();
    const files = [
      ...collectFiles(options.code, projectConfig.repoPath),
      ...(options.notes ? collectFiles(options.notes, projectConfig.repoPath) : [])
    ];

    if (files.length === 0) {
      console.error('Ingest failed: no readable files matched the requested paths.');
      process.exit(1);
    }

    const response = await request<{ filesProcessed: number; chunksStored: number }>('/ingest', {
      method: 'POST',
      auth: true,
      body: {
        workspaceId: projectConfig.workspaceId,
        files
      }
    });

    if (!response.success || !response.data) {
      console.error(`Ingest failed: ${response.error?.message}`);
      process.exit(1);
    }

    console.log(
      `Ingested ${response.data.filesProcessed} files and stored ${response.data.chunksStored} chunks for "${projectConfig.projectName}".`
    );
  });

program.parseAsync(process.argv);

type Workspace = {
  id: string;
  name: string;
  description?: string | null;
};

function ensureLoggedIn() {
  const config = loadConfig();
  if (!config.token) {
    console.error('You are not logged in. Run: devbrain login --email <email> --password <password>');
    process.exit(1);
  }
}

function requireProjectConfig() {
  const projectConfig = loadProjectConfig();
  if (!projectConfig) {
    console.error('This repo is not linked yet. Run: devbrain init');
    process.exit(1);
  }

  return projectConfig;
}

async function selectWorkspace(workspaces: Workspace[]) {
  const rl = createInterface({ input, output });

  try {
    console.log('\nWorkspaces\n');
    if (workspaces.length === 0) {
      console.log('No workspaces found. A new workspace will be created.');
      return createWorkspaceInteractively(rl);
    }

    workspaces.forEach((workspace, index) => {
      console.log(`${index + 1}. ${workspace.name}${workspace.description ? ` — ${workspace.description}` : ''}`);
    });
    console.log(`${workspaces.length + 1}. Create a new workspace`);

    const answer = await rl.question('\nSelect a workspace number: ');
    const selected = Number.parseInt(answer, 10);

    if (!Number.isFinite(selected) || selected < 1 || selected > workspaces.length + 1) {
      throw new Error('Invalid workspace selection.');
    }

    if (selected === workspaces.length + 1) {
      return createWorkspaceInteractively(rl);
    }

    return workspaces[selected - 1];
  } finally {
    rl.close();
  }
}

async function createWorkspaceInteractively(rl: ReturnType<typeof createInterface>) {
  const name = (await rl.question('Workspace name: ')).trim();
  const description = (await rl.question('Description (optional): ')).trim();

  if (!name) {
    throw new Error('Workspace name is required.');
  }

  const response = await request<{ workspace: Workspace }>('/workspaces', {
    method: 'POST',
    auth: true,
    body: {
      name,
      description: description || undefined
    }
  });

  if (!response.success || !response.data) {
    throw new Error(response.error?.message ?? 'Failed to create workspace.');
  }

  return response.data.workspace;
}

function readGitCommitHash(cwd: string) {
  try {
    return execSync('git rev-parse HEAD', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

function collectFiles(targetPath: string, cwd: string) {
  const absolute = path.resolve(cwd, targetPath);
  const files: Array<{ path: string; content: string }> = [];
  const ignoredDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage']);
  const allowedExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.mdx', '.txt', '.yml', '.yaml', '.prisma', '.php'
  ]);

  walk(absolute);
  return files.slice(0, 100);

  function walk(currentPath: string) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);
    if (stat.isDirectory()) {
      if (ignoredDirs.has(path.basename(currentPath))) {
        return;
      }

      for (const entry of fs.readdirSync(currentPath)) {
        walk(path.join(currentPath, entry));
      }
      return;
    }

    if (!allowedExtensions.has(path.extname(currentPath)) || stat.size > 200_000) {
      return;
    }

    files.push({
      path: path.relative(cwd, currentPath),
      content: fs.readFileSync(currentPath, 'utf8').slice(0, 20_000)
    });
  }
}
