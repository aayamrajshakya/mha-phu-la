-- Create public storage bucket for post images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user can upload to their own folder
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = 'posts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Anyone can view post images (public bucket)
CREATE POLICY "Post images are publicly viewable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'posts');

-- Users can delete their own post images
CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
