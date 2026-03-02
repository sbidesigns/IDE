import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import type { Project, FileInfo } from '@/types';

const PROJECTS_DIR = '/home/z/my-project/projects';
const UPLOAD_DIR = '/home/z/my-project/projects/uploaded';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectName = formData.get('name') as string;
    
    if (!file || !file.name.endsWith('.zip')) {
      return NextResponse.json(
        { success: false, error: 'A ZIP file is required' },
        { status: 400 }
      );
    }
    
    const name = projectName || file.name.replace('.zip', '').replace(/_v\d+\.\d+.*$/, '');
    
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
    
    if (!sanitizedName) {
      return NextResponse.json(
        { success: false, error: 'Invalid project name' },
        { status: 400 }
      );
    }
    
    await ensureDir(UPLOAD_DIR);
    await ensureDir(PROJECTS_DIR);
    
    const tempPath = path.join(UPLOAD_DIR, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempPath, buffer);
    
    let finalName = sanitizedName;
    let counter = 1;
    
    while (true) {
      try {
        await fs.access(path.join(PROJECTS_DIR, finalName));
        finalName = `${sanitizedName}-${counter}`;
        counter++;
      } catch {
        break;
      }
    }
    
    const finalPath = path.join(PROJECTS_DIR, finalName);
    await ensureDir(finalPath);
    
    const zip = new AdmZip(tempPath);
    zip.extractAllTo(finalPath, true);
    
    const memoryPath = path.join(finalPath, '.agent-memory.json');
    let memory = {
      anchors: [],
      summaries: [],
      lastAnalyzed: Date.now(),
      keyDecisions: [],
      context: `Project "${finalName}" imported from ${file.name} on ${new Date().toISOString()}`
    };
    
    try {
      const existingMemory = await fs.readFile(memoryPath, 'utf-8');
      const parsed = JSON.parse(existingMemory);
      memory = { ...memory, ...parsed, context: memory.context };
    } catch {}
    
    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    
    try {
      await fs.access(path.join(finalPath, '.version'));
    } catch {
      await fs.writeFile(path.join(finalPath, '.version'), 'v1.0');
    }
    
    await fs.unlink(tempPath);
    
    const project = await getProjectInfo(finalName);
    
    return NextResponse.json({
      success: true,
      data: {
        project,
        message: `Project "${finalName}" imported successfully`
      }
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import project' },
      { status: 500 }
    );
  }
}
