import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, createWriteStream, existsSync } from 'fs';
import path from 'path';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import type { Version } from '@/types';

const PROJECTS_DIR = '/home/z/my-project/projects';
const ARCHIVES_DIR = '/home/z/my-project/projects/archives';

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function createZipArchive(sourcePath: string, outputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourcePath, false);
    archive.finalize();
  });
}

async function getFileCount(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await getFileCount(fullPath);
    } else {
      count++;
    }
  }
  
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const download = searchParams.get('download');
    const version = searchParams.get('version');
    
    await ensureDir(ARCHIVES_DIR);
    
    // Handle download request
    if (download === 'true' && project && version) {
      const entries = await fs.readdir(ARCHIVES_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.zip')) continue;
        
        const match = entry.name.match(/^(.+)_v([\d.]+)_(\d+)\.zip$/);
        if (match && match[1] === project && `v${match[2]}` === version) {
          const filePath = path.join(ARCHIVES_DIR, entry.name);
          const fileBuffer = await fs.readFile(filePath);
          
          return new Response(fileBuffer, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${entry.name}"`,
            },
          });
        }
      }
      
      return NextResponse.json(
        { success: false, error: 'Version archive not found' },
        { status: 404 }
      );
    }
    
    if (project) {
      const versions: Version[] = [];
      const entries = await fs.readdir(ARCHIVES_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.zip')) continue;
        
        // Support both v1.2 and v1.2.2 formats
        const match = entry.name.match(/^(.+)_v([\d.]+(?:\.\d+)?)_(\d+)\.zip$/);
        if (match && match[1] === project) {
          const stats = await fs.stat(path.join(ARCHIVES_DIR, entry.name));
          versions.push({
            id: entry.name.replace('.zip', ''),
            projectName: match[1],
            versionNumber: `v${match[2]}`,
            createdAt: parseInt(match[3]),
            description: '',
            archivePath: path.join(ARCHIVES_DIR, entry.name),
            fileCount: 0,
            size: stats.size,
            hasArchive: true,
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: versions.sort((a, b) => b.createdAt - a.createdAt)
      });
    } else {
      const versions: Version[] = [];
      const entries = await fs.readdir(ARCHIVES_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.zip')) continue;
        
        const match = entry.name.match(/^(.+)_v([\d.]+(?:\.\d+)?)_(\d+)\.zip$/);
        if (match) {
          const stats = await fs.stat(path.join(ARCHIVES_DIR, entry.name));
          versions.push({
            id: entry.name.replace('.zip', ''),
            projectName: match[1],
            versionNumber: `v${match[2]}`,
            createdAt: parseInt(match[3]),
            description: '',
            archivePath: path.join(ARCHIVES_DIR, entry.name),
            fileCount: 0,
            size: stats.size,
            hasArchive: true,
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: versions.sort((a, b) => b.createdAt - a.createdAt)
      });
    }
  } catch (error) {
    console.error('Versions list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list versions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, description = '', suffix = '' } = body;
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    const projectPath = path.join(PROJECTS_DIR, project);
    await ensureDir(ARCHIVES_DIR);
    
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    let currentVersion = 'v0.0';
    try {
      currentVersion = await fs.readFile(path.join(projectPath, '.version'), 'utf-8');
    } catch {}
    
    const match = currentVersion.match(/v?(\d+)\.(\d+)/);
    const major = match ? parseInt(match[1]) : 0;
    const minor = match ? parseInt(match[2]) + 1 : 1;
    
    // Append suffix if provided (e.g., ".2" for regeneration backups)
    const newVersion = `v${major}.${minor}${suffix}`;
    
    const timestamp = Date.now();
    const archiveName = `${project}_${newVersion}_${timestamp}.zip`;
    const archivePath = path.join(ARCHIVES_DIR, archiveName);
    
    const size = await createZipArchive(projectPath, archivePath);
    const fileCount = await getFileCount(projectPath);
    
    // Only update version file if no suffix (normal checkpoint)
    if (!suffix) {
      await fs.writeFile(path.join(projectPath, '.version'), `v${major}.${minor}`);
    }
    
    const version: Version = {
      id: `${project}_${newVersion}_${timestamp}`,
      projectName: project,
      versionNumber: newVersion,
      createdAt: timestamp,
      description,
      archivePath,
      fileCount,
      size,
      hasArchive: true,
    };
    
    return NextResponse.json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('Version create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { versionId, nonDestructive = true } = body;
    
    if (!versionId) {
      return NextResponse.json(
        { success: false, error: 'Version ID is required' },
        { status: 400 }
      );
    }
    
    const archivePath = path.join(ARCHIVES_DIR, `${versionId}.zip`);
    
    try {
      await fs.access(archivePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }
    
    const match = versionId.match(/^(.+)_v([\d.]+(?:\.\d+)?)_(\d+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Invalid version ID format' },
        { status: 400 }
      );
    }
    
    const projectName = match[1];
    const projectPath = path.join(PROJECTS_DIR, projectName);
    
    // Always create a backup before restore (non-destructive)
    const backupTimestamp = Date.now();
    const backupName = `${projectName}_pre-restore_${backupTimestamp}.zip`;
    const backupPath = path.join(ARCHIVES_DIR, backupName);
    
    try {
      if (existsSync(projectPath)) {
        await createZipArchive(projectPath, backupPath);
      }
    } catch {
      console.error('Failed to create pre-restore backup');
    }
    
    // Extract the archive to a new directory
    const restorePath = path.join(PROJECTS_DIR, `${projectName}_restored_${backupTimestamp}`);
    await ensureDir(restorePath);
    
    const zip = new AdmZip(archivePath);
    zip.extractAllTo(restorePath, true);
    
    if (nonDestructive) {
      // Return the path to the restored version without replacing the current
      return NextResponse.json({
        success: true,
        data: {
          message: 'Version restored to new directory (non-destructive)',
          restorePath,
          backupPath,
          originalPath: projectPath,
        }
      });
    } else {
      // Destructive restore - replace current project
      try {
        await fs.rm(projectPath, { recursive: true });
      } catch {}
      
      await ensureDir(projectPath);
      zip.extractAllTo(projectPath, true);
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'Version restored successfully',
          backupPath,
          projectPath
        }
      });
    }
  } catch (error) {
    console.error('Version restore error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const version = searchParams.get('version');
    
    if (!project || !version) {
      return NextResponse.json(
        { success: false, error: 'Project and version are required' },
        { status: 400 }
      );
    }
    
    const entries = await fs.readdir(ARCHIVES_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.zip')) continue;
      
      const match = entry.name.match(/^(.+)_v([\d.]+(?:\.\d+)?)_(\d+)\.zip$/);
      if (match && match[1] === project && `v${match[2]}` === version) {
        await fs.unlink(path.join(ARCHIVES_DIR, entry.name));
        return NextResponse.json({
          success: true,
          data: { message: `Backup ${version} deleted` }
        });
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Backup not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Version delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete version' },
      { status: 500 }
    );
  }
}
