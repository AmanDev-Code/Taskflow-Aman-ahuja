export interface Attachment {
  id: string;
  task_id: string | null;
  subtask_id?: string | null;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AttachmentWithUploader extends Attachment {
  uploader_name: string;
  uploader_email: string;
}
