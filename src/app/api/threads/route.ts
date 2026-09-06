import { NextResponse } from 'next/server';
import { createThread, getThreadsByMode, deleteThread, type Mode } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') as Mode | null;
    
    let threads;
    if (mode && ['chat', 'learn', 'explore', 'draw'].includes(mode)) {
      threads = getThreadsByMode(mode as Mode);
    } else {
      threads = getThreadsByMode('chat');
    }
    
    return NextResponse.json(threads);
  } catch (error) {
    console.error('Failed to fetch threads:', error);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, mode } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const threadMode = (mode && ['chat', 'learn', 'explore', 'draw'].includes(mode)) ? (mode === 'explore' ? 'learn' : mode) : 'chat';
    const thread = createThread(id, threadMode, title);
    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error('Failed to create thread:', error);
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    deleteThread(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete thread:', error);
    return NextResponse.json({ error: 'Failed to delete thread' }, { status: 500 });
  }
}
