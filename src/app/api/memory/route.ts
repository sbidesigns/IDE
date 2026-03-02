import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { ProjectMemory, MemoryAnchor } from '@/types';

const PROJECTS_DIR = '/home/z/my-project/projects';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    const memoryPath = path.join(PROJECTS_DIR, project, '.agent-memory.json');
    
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      const memory: ProjectMemory = JSON.parse(content);
      
      return NextResponse.json({
        success: true,
        data: memory
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          anchors: [],
          summaries: [],
          lastAnalyzed: Date.now(),
          keyDecisions: [],
          context: ''
        } as ProjectMemory
      });
    }
  } catch (error) {
    console.error('Memory get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get memory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, memory } = body as { project: string; memory: ProjectMemory };
    
    if (!project || !memory) {
      return NextResponse.json(
        { success: false, error: 'Project and memory are required' },
        { status: 400 }
      );
    }
    
    const memoryPath = path.join(PROJECTS_DIR, project, '.agent-memory.json');
    
    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    
    return NextResponse.json({
      success: true,
      data: memory
    });
  } catch (error) {
    console.error('Memory save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save memory' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, anchor } = body as { 
      project: string; 
      anchor: Omit<MemoryAnchor, 'id' | 'timestamp'> 
    };
    
    if (!project || !anchor) {
      return NextResponse.json(
        { success: false, error: 'Project and anchor are required' },
        { status: 400 }
      );
    }
    
    const memoryPath = path.join(PROJECTS_DIR, project, '.agent-memory.json');
    
    let memory: ProjectMemory;
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      memory = JSON.parse(content);
    } catch {
      memory = {
        anchors: [],
        summaries: [],
        lastAnalyzed: Date.now(),
        keyDecisions: [],
        context: ''
      };
    }
    
    const newAnchor: MemoryAnchor = {
      ...anchor,
      id: `anchor_${Date.now()}`,
      timestamp: Date.now()
    };
    
    memory.anchors.push(newAnchor);
    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    
    return NextResponse.json({
      success: true,
      data: newAnchor
    });
  } catch (error) {
    console.error('Anchor add error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add anchor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const anchorId = searchParams.get('anchorId');
    
    if (!project || !anchorId) {
      return NextResponse.json(
        { success: false, error: 'Project and anchor ID are required' },
        { status: 400 }
      );
    }
    
    const memoryPath = path.join(PROJECTS_DIR, project, '.agent-memory.json');
    
    const content = await fs.readFile(memoryPath, 'utf-8');
    const memory: ProjectMemory = JSON.parse(content);
    
    memory.anchors = memory.anchors.filter(a => a.id !== anchorId);
    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    
    return NextResponse.json({
      success: true,
      data: memory
    });
  } catch (error) {
    console.error('Anchor delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete anchor' },
      { status: 500 }
    );
  }
}
