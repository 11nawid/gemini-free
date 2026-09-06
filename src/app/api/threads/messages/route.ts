import { NextResponse } from 'next/server';
import { addMessage, getMessagesByThread, clearThreadMessages } from '@/lib/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('thread_id');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    const messages = getMessagesByThread(threadId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { thread_id, role, content, reasoning, timestamp } = body;
    
    if (!thread_id || !role || !content) {
      return NextResponse.json({ error: 'thread_id, role, and content are required' }, { status: 400 });
    }

    const message = addMessage({
      thread_id,
      role,
      content,
      reasoning,
      timestamp: timestamp || new Date().toISOString(),
    });
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Failed to add message:', error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('thread_id');
    
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    clearThreadMessages(threadId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to clear messages:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}
