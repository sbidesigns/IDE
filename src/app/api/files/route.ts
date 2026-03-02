import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { FileInfo, FileOperationResponse } from '@/types';

const PROJECTS_DIR = '/home/z/my-project/projects';

const ALLOWED_EXTENSIONS = [
  '.txt', '.js', '.ts', '.tsx', '.jsx', '.py', '.json', '.md', 
  '.css', '.html', '.yaml', '.yml', '.xml', '.sql', '.sh',
  '.env', '.gitignore', '.prettierrc', '.eslintrc', '.config'
];

function isPathSafe(projectPath: string, targetPath: string): boolean {
  const resolved = path.resolve(projectPath, targetPath);
  return resolved.startsWith(projectPath);
}

function isAllowedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) || filename.startsWith('.');
}

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const filePath = searchParams.get('path') || '';
    
    if (!project) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Project is required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, project);
    const fullPath = path.join(projectPath, filePath);
    
    if (!isPathSafe(projectPath, filePath)) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        const items: FileInfo[] = entries
          .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
          .map(e => ({
            name: e.name,
            path: filePath ? path.join(filePath, e.name) : e.name,
            type: e.isDirectory() ? 'folder' : 'file',
            size: 0
          }));
        
        return NextResponse.json<FileOperationResponse>({
          success: true,
          data: items
        });
      } else {
        const content = await fs.readFile(fullPath, 'utf-8');
        return NextResponse.json<FileOperationResponse>({
          success: true,
          data: {
            name: path.basename(fullPath),
            path: filePath,
            type: 'file',
            content,
            size: stats.size,
            updatedAt: stats.mtimeMs
          }
        });
      }
    } catch {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('File read error:', error);
    return NextResponse.json<FileOperationResponse>(
      { success: false, error: 'Failed to read file' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, path: filePath, content, type = 'file' } = body;
    
    if (!project || !filePath) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Project and path are required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, project);
    const fullPath = path.join(projectPath, filePath);
    
    if (!isPathSafe(projectPath, filePath)) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    try {
      await fs.access(fullPath);
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'File already exists' },
        { status: 400 }
      );
    } catch {}
    
    if (type === 'folder') {
      await ensureDir(fullPath);
    } else {
      const filename = path.basename(filePath);
      if (!isAllowedFile(filename)) {
        return NextResponse.json<FileOperationResponse>(
          { success: false, error: 'File type not allowed' },
          { status: 400 }
        );
      }
      
      await ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content || '');
    }
    
    const stats = await fs.stat(fullPath);
    
    return NextResponse.json<FileOperationResponse>({
      success: true,
      data: {
        name: path.basename(fullPath),
        path: filePath,
        type: type === 'folder' ? 'folder' : 'file',
        size: stats.size,
        updatedAt: stats.mtimeMs
      }
    });
  } catch (error) {
    console.error('File create error:', error);
    return NextResponse.json<FileOperationResponse>(
      { success: false, error: 'Failed to create file' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, path: filePath, content } = body;
    
    if (!project || !filePath) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Project and path are required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, project);
    const fullPath = path.join(projectPath, filePath);
    
    if (!isPathSafe(projectPath, filePath)) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    await fs.writeFile(fullPath, content);
    const stats = await fs.stat(fullPath);
    
    return NextResponse.json<FileOperationResponse>({
      success: true,
      data: {
        name: path.basename(fullPath),
        path: filePath,
        type: 'file',
        size: stats.size,
        updatedAt: stats.mtimeMs
      }
    });
  } catch (error) {
    console.error('File update error:', error);
    return NextResponse.json<FileOperationResponse>(
      { success: false, error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const filePath = searchParams.get('path');
    
    if (!project || !filePath) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Project and path are required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, project);
    const fullPath = path.join(projectPath, filePath);
    
    if (!isPathSafe(projectPath, filePath)) {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'Invalid path' },
        { status: 403 }
      );
    }
    
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json<FileOperationResponse>(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    return NextResponse.json<FileOperationResponse>({
      success: true,
      data: { name: path.basename(fullPath), path: filePath, type: stats.isDirectory() ? 'folder' : 'file' }
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json<FileOperationResponse>(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
