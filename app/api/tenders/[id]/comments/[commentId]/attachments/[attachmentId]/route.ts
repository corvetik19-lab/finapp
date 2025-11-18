import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string; attachmentId: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attachmentId } = await params;

    const { data: attachment, error } = await supabase
      .from('tender_comment_attachments')
      .select('file_path, file_name, comment:tender_comments(company_id)')
      .eq('id', attachmentId)
      .single<{ file_path: string; file_name: string; comment: { company_id: string } }>();

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Получаем компанию пользователя
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!employee || employee.company_id !== attachment.comment.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('tender-attachments')
      .createSignedUrl(attachment.file_path, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to create download link' }, { status: 500 });
    }

    return NextResponse.redirect(signedUrlData.signedUrl, { status: 302 });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string; attachmentId: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attachmentId } = await params;

    const { data: attachment, error } = await supabase
      .from('tender_comment_attachments')
      .select('id, file_path, comment:tender_comments(author_id)')
      .eq('id', attachmentId)
      .single<{ id: string; file_path: string; comment: { author_id: string } }>();

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (attachment.comment.author_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: storageError } = await supabase.storage
      .from('tender-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Failed to remove file from storage:', storageError);
      return NextResponse.json({ error: 'Failed to remove file' }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from('tender_comment_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('Failed to delete attachment record:', deleteError);
      return NextResponse.json({ error: 'Failed to delete attachment record' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Attachment removed' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
