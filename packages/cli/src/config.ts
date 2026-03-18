import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG_DIR = path.join(os.homedir(), '.devbrain');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
export const PROJECT_CONFIG_FILENAME = '.devbrain.json';

export type CliConfig = {
  apiUrl: string;
  token?: string;
};

export type ProjectConfig = {
  workspaceId: string;
  projectName: string;
  repoPath: string;
};

export function loadConfig(): CliConfig {
  const defaultConfig: CliConfig = {
    apiUrl: process.env.DEVBRAIN_API_URL ?? 'http://localhost:4000',
    token: process.env.DEVBRAIN_TOKEN
  };

  if (!fs.existsSync(CONFIG_PATH)) {
    return defaultConfig;
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return {
    ...defaultConfig,
    ...JSON.parse(raw)
  };
}

export function saveConfig(config: CliConfig) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getProjectConfigPath(cwd = process.cwd()) {
  return path.join(cwd, PROJECT_CONFIG_FILENAME);
}

export function loadProjectConfig(cwd = process.cwd()): ProjectConfig | null {
  const configPath = getProjectConfigPath(cwd);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as ProjectConfig;
}

export function saveProjectConfig(config: ProjectConfig, cwd = process.cwd()) {
  const configPath = getProjectConfigPath(cwd);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
