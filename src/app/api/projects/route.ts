import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Project, FileInfo } from '@/types';

const PROJECTS_DIR = '/home/z/my-project/projects';

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function getFileInfo(filePath: string, basePath: string): Promise<FileInfo> {
  const stats = await fs.stat(filePath);
  const relativePath = path.relative(basePath, filePath);
  
  if (stats.isDirectory()) {
    const children = await fs.readdir(filePath);
    const childInfos: FileInfo[] = [];
    
    for (const child of children) {
      if (child.startsWith('.') || child === 'node_modules') continue;
      const childPath = path.join(filePath, child);
      childInfos.push(await getFileInfo(childPath, basePath));
    }
    
    return {
      name: path.basename(filePath),
      path: relativePath,
      type: 'folder',
      children: childInfos.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      }),
      updatedAt: stats.mtimeMs
    };
  }
  
  return {
    name: path.basename(filePath),
    path: relativePath,
    type: 'file',
    size: stats.size,
    updatedAt: stats.mtimeMs
  };
}

async function getProjectInfo(projectName: string): Promise<Project | null> {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  
  try {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) return null;
    
    const files = await getFileInfo(projectPath, projectPath);
    
    let memory = {
      anchors: [],
      summaries: [],
      lastAnalyzed: 0,
      keyDecisions: [],
      context: ''
    };
    
    try {
      const memoryPath = path.join(projectPath, '.agent-memory.json');
      const memoryData = await fs.readFile(memoryPath, 'utf-8');
      memory = JSON.parse(memoryData);
    } catch {}
    
    let currentVersion = 'v0.1';
    try {
      const versionPath = path.join(projectPath, '.version');
      currentVersion = await fs.readFile(versionPath, 'utf-8');
    } catch {}
    
    return {
      name: projectName,
      path: projectPath,
      createdAt: stats.birthtimeMs,
      updatedAt: stats.mtimeMs,
      currentVersion: currentVersion.trim(),
      files: files.children || [],
      memory
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    await ensureDir(PROJECTS_DIR);
    
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    const projects: Project[] = [];
    
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'archives' || entry.name === 'uploaded') continue;
      const project = await getProjectInfo(entry.name);
      if (project) projects.push(project);
    }
    
    return NextResponse.json({
      success: true,
      data: projects.sort((a, b) => b.updatedAt - a.updatedAt)
    });
  } catch (error) {
    console.error('Projects list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project name' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, name);
    
    try {
      await fs.access(projectPath);
      return NextResponse.json(
        { success: false, error: 'Project already exists' },
        { status: 400 }
      );
    } catch {}
    
    await ensureDir(projectPath);
    
    const memory = {
      anchors: [],
      summaries: [],
      lastAnalyzed: Date.now(),
      keyDecisions: [],
      context: `Project "${name}" created on ${new Date().toISOString()}`
    };
    await fs.writeFile(
      path.join(projectPath, '.agent-memory.json'),
      JSON.stringify(memory, null, 2)
    );
    
    await fs.writeFile(path.join(projectPath, '.version'), 'v0.1');
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      `# ${name}\n\nCreated with AI Agent Platform\n`
    );
    
    const project = await getProjectInfo(name);
    
    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Project create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Project name required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, name);
    const archivesDir = path.join(PROJECTS_DIR, 'archives');
    
    await ensureDir(archivesDir);
    
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const archiveName = `${name}_deleted_${Date.now()}`;
    const archivePath = path.join(archivesDir, archiveName);
    await fs.rename(projectPath, archivePath);
    
    return NextResponse.json({
      success: true,
      data: { message: 'Project archived', archivePath }
    });
  } catch (error) {
    console.error('Project delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
