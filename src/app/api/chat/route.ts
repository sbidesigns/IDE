import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import ZAI from 'z-ai-web-dev-sdk';
import type { Message, Source, ChatStreamChunk, DevContext } from '@/types';

// Set max duration for chat streaming (up to 5 minutes)
export const maxDuration = 300;

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

interface ChatRequest {
  messages: Message[];
  projectId: string;
  projectContext?: string;
  searchResults?: Source[];
}

// Ensure directory exists
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory exists
  }
}

// Load fresh context for the project
async function loadFreshContext(projectName: string): Promise<DevContext | null> {
  try {
    const contextPath = path.join(PROJECTS_DIR, projectName, '.context', 'state.json');
    const data = await fs.readFile(contextPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Tool definitions for the AI
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'create_file',
      description: 'Create a new file with specified content. Use this to create new code files, configuration files, or any text-based files.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The path of the file relative to the project root (e.g., "src/components/Button.tsx")'
          },
          content: {
            type: 'string',
            description: 'The complete content to write to the file'
          },
          description: {
            type: 'string',
            description: 'Brief description of what this file is for'
          }
        },
        required: ['filepath', 'content']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Edit an existing file. Provide either the full new content OR a search-and-replace pattern.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The path of the file to edit'
          },
          content: {
            type: 'string',
            description: 'The complete new content for the file (use this OR search/replace)'
          },
          search: {
            type: 'string',
            description: 'Text to search for (use with replace for partial edits)'
          },
          replace: {
            type: 'string',
            description: 'Text to replace the search match with'
          }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the project.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The path of the file to read'
          }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_file',
      description: 'Delete a file from the project.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'The path of the file to delete'
          }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_files',
      description: 'List all files in the project or a specific directory.',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Directory path to list (optional, defaults to project root)'
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_directory',
      description: 'Create a new directory in the project.',
      parameters: {
        type: 'object',
        properties: {
          dirpath: {
            type: 'string',
            description: 'The path of the directory to create'
          }
        },
        required: ['dirpath']
      }
    }
  }
];

// Tool execution handlers
async function executeToolCall(
  toolName: string, 
  args: Record<string, unknown>, 
  projectName: string
): Promise<{ success: boolean; result: string; filesChanged?: string[] }> {
  const projectDir = path.join(PROJECTS_DIR, projectName);
  
  try {
    switch (toolName) {
      case 'create_file': {
        const filepath = args.filepath as string;
        const content = args.content as string;
        const description = args.description as string | undefined;
        const fullPath = path.join(projectDir, filepath);
        
        await ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content, 'utf-8');
        
        const lines = content.split('\n').length;
        const size = new Blob([content]).size;
        
        return { 
          success: true, 
          result: `✅ Created: ${filepath} (${lines} lines, ${size} bytes)${description ? ` - ${description}` : ''}`,
          filesChanged: [filepath]
        };
      }
      
      case 'edit_file': {
        const filepath = args.filepath as string;
        const fullPath = path.join(projectDir, filepath);
        
        let content: string;
        if (args.content) {
          content = args.content as string;
          await fs.writeFile(fullPath, content, 'utf-8');
        } else if (args.search && args.replace !== undefined) {
          const existing = await fs.readFile(fullPath, 'utf-8');
          content = existing.replace(args.search as string, args.replace as string);
          await fs.writeFile(fullPath, content, 'utf-8');
        } else {
          return { success: false, result: '❌ Must provide either content or search/replace' };
        }
        
        const lines = content.split('\n').length;
        
        return { 
          success: true, 
          result: `✏️ Updated: ${filepath} (${lines} lines)`,
          filesChanged: [filepath]
        };
      }
      
      case 'read_file': {
        const filepath = args.filepath as string;
        const fullPath = path.join(projectDir, filepath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        const size = new Blob([content]).size;
        
        // Return compact summary instead of full content for large files
        if (lines > 50) {
          return { 
            success: true, 
            result: `📄 ${filepath} (${lines} lines, ${size} bytes) - File loaded into context. Large files are summarized.`
          };
        }
        
        return { 
          success: true, 
          result: `📄 ${filepath} (${lines} lines):\n\`\`\`\n${content}\n\`\`\``
        };
      }
      
      case 'delete_file': {
        const filepath = args.filepath as string;
        const fullPath = path.join(projectDir, filepath);
        await fs.unlink(fullPath);
        
        return { 
          success: true, 
          result: `🗑️ Deleted file: ${filepath}`,
          filesChanged: [filepath]
        };
      }
      
      case 'list_files': {
        const directory = (args.directory as string) || '';
        const fullPath = path.join(projectDir, directory);
        
        const listDir = async (dir: string, prefix: string = ''): Promise<string[]> => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const files: string[] = [];
          
          for (const entry of entries) {
            // Skip hidden files and node_modules
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
              files.push(`📁 ${relativePath}/`);
              const subFiles = await listDir(path.join(dir, entry.name), relativePath);
              files.push(...subFiles.slice(0, 20)); // Limit subdirectory listings
            } else {
              files.push(`📄 ${relativePath}`);
            }
          }
          return files;
        };
        
        const files = await listDir(fullPath);
        const totalFiles = files.filter(f => f.startsWith('📄')).length;
        const totalDirs = files.filter(f => f.startsWith('📁')).length;
        
        // Show compact summary with file list
        const displayFiles = files.slice(0, 30);
        const hasMore = files.length > 30;
        
        return { 
          success: true, 
          result: `📂 ${directory || 'project root'}: ${totalFiles} files, ${totalDirs} folders\n${displayFiles.join('\n')}${hasMore ? '\n... (truncated)' : ''}`
        };
      }
      
      case 'create_directory': {
        const dirpath = args.dirpath as string;
        const fullPath = path.join(projectDir, dirpath);
        await ensureDir(fullPath);
        
        return { 
          success: true, 
          result: `📁 Created directory: ${dirpath}`
        };
      }
      
      default:
        return { success: false, result: `❌ Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { 
      success: false, 
      result: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Build the system prompt with tools
function buildSystemPrompt(context: DevContext | null, projectContext: string | undefined): string {
  let prompt = `You are an AI Agent with TOOL CALLING capabilities. You can CREATE, EDIT, READ, and DELETE files directly.

## 🛠️ YOUR TOOLS

You have access to these tools - USE THEM to create actual output:

1. **create_file** - Create a new file with content
   - Use when you need to create new code, config, or any text file
   - Always provide the complete, functional content

2. **edit_file** - Modify an existing file
   - Provide full new content OR search/replace pattern
   - Use for updating existing code

3. **read_file** - Read a file's contents
   - Use to understand existing code before modifying

4. **delete_file** - Remove a file
   - Use carefully, confirm with user if unsure

5. **list_files** - See project structure
   - Use to understand the codebase

6. **create_directory** - Create a folder
   - Use to organize project structure

## 🎯 HOW TO WORK

1. When asked to create something, USE create_file IMMEDIATELY
2. Don't just describe code - ACTUALLY CREATE IT
3. Create complete, functional, production-ready code
4. Use read_file first if you need to see existing code
5. Explain what you're doing, then DO IT with tools

## 📋 PROJECT CONTEXT

`;

  if (context) {
    prompt += `**Project:** ${context.projectName}
**Purpose:** ${context.projectPurpose}
**Tech Stack:** ${context.techStack.join(', ') || 'Not specified'}
**Phase:** ${context.currentPhase}

`;
  }

  if (projectContext) {
    prompt += `## 📁 LIVE CONTEXT

${projectContext}

`;
  }

  prompt += `## ⚠️ IMPORTANT

- When user asks you to create/write/build something -> CALL create_file
- When user asks to modify/update something -> CALL edit_file
- NEVER just output code in markdown - ACTUALLY CREATE THE FILE
- The user expects real files to appear, not just text in chat`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: ChatStreamChunk) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } catch (e) {
            console.error('Failed to send chunk:', e);
          }
        };

        // Send immediate feedback that we're processing
        sendChunk({ type: 'content', content: '⏳ ' });

        try {
          const zai = await ZAI.create();
          
          // Load fresh context
          const freshContext = await loadFreshContext(body.projectId);
          
          // Build system prompt
          const systemPrompt = buildSystemPrompt(freshContext, body.projectContext);
          
          const apiMessages: Array<{ role: string; content: string }> = [
            { role: 'system', content: systemPrompt }
          ];
          
          // Add web search results if provided
          if (body.searchResults && body.searchResults.length > 0) {
            const searchContext = body.searchResults.map(s => 
              `**${s.title}**\n${s.snippet}\nURL: ${s.url}`
            ).join('\n\n');
            apiMessages.push({
              role: 'system',
              content: `## 🔍 WEB SEARCH RESULTS\n\n${searchContext}`
            });
          }
          
          // Add recent messages
          const recentMessages = body.messages.slice(-6);
          for (const msg of recentMessages) {
            apiMessages.push({
              role: msg.role,
              content: msg.content
            });
          }
          
          // Track files changed during this conversation
          const filesChanged: string[] = [];
          let iterations = 0;
          const maxIterations = 15; // Allow more iterations for complex projects
          
          // Agentic loop - continue until no more tool calls
          while (iterations < maxIterations) {
            iterations++;
            
            // Send heartbeat to keep connection alive
            if (iterations > 1) {
              sendChunk({ type: 'content', content: '\n🔄 ' });
            }
            
            const completion = await zai.chat.completions.create({
              messages: apiMessages,
              tools: TOOLS,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 4096,
            });
            
            const message = completion.choices[0]?.message;
            if (!message) {
              sendChunk({ type: 'content', content: '\n⚠️ No response from AI. Please try again.' });
              break;
            }
            
            // Stream text content if present
            if (message.content) {
              sendChunk({ type: 'content', content: message.content });
            }
            
            // Check for tool calls
            if (message.tool_calls && message.tool_calls.length > 0) {
              // Add assistant message to history
              apiMessages.push({
                role: 'assistant',
                content: message.content || '',
                tool_calls: message.tool_calls as any
              });
              
              // Execute each tool call
              for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function.name;
                let args;
                try {
                  args = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                  sendChunk({ type: 'content', content: `\n❌ Failed to parse tool arguments\n` });
                  continue;
                }
                
                // Inform user what's happening
                sendChunk({ 
                  type: 'content', 
                  content: `\n\n🔧 **Creating:** ${args.filepath || args.dirpath || 'unknown'}\n`
                });
                
                // Execute the tool
                const result = await executeToolCall(toolName, args, body.projectId);
                
                if (result.filesChanged) {
                  filesChanged.push(...result.filesChanged);
                }
                
                // Stream result
                sendChunk({ type: 'content', content: `${result.result}\n` });
                
                // Add tool result to conversation
                apiMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: result.result
                } as any);
              }
              
              // Continue the loop to let AI respond to tool results
              continue;
            }
            
            // No tool calls, we're done
            break;
          }
          
          if (iterations >= maxIterations) {
            sendChunk({ type: 'content', content: '\n\n⚠️ Maximum iterations reached. The project may be incomplete. You can ask me to continue or add more files.' });
          }
          
          // Send final done chunk with files changed
          sendChunk({ 
            type: 'done',
            content: filesChanged.length > 0 ? JSON.stringify({ filesChanged }) : undefined
          });
          
        } catch (error) {
          console.error('Chat stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          sendChunk({
            type: 'error',
            content: errorMessage
          });
        }
        
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
