-- Migration: Content Library (Saved Blogs)
-- This allows users to save/bookmark specific blogs from their generated content

-- Create saved_contents table (junction table)
CREATE TABLE IF NOT EXISTS public.saved_contents (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    content_id uuid NOT NULL,
    tags text[] DEFAULT '{}',
    notes text,
    is_favorite boolean DEFAULT false,
    saved_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    CONSTRAINT saved_contents_pkey PRIMARY KEY (id),
    CONSTRAINT saved_contents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT saved_contents_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE,
    CONSTRAINT saved_contents_unique UNIQUE (user_id, content_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_contents_user_id ON public.saved_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_contents_content_id ON public.saved_contents(content_id);
CREATE INDEX IF NOT EXISTS idx_saved_contents_saved_at ON public.saved_contents(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_contents_is_favorite ON public.saved_contents(is_favorite) WHERE is_favorite = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.saved_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own saved content
CREATE POLICY "Users can view their own saved content"
    ON public.saved_contents
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own saved content
CREATE POLICY "Users can save their own content"
    ON public.saved_contents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own saved content
CREATE POLICY "Users can update their own saved content"
    ON public.saved_contents
    FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own saved content
CREATE POLICY "Users can delete their own saved content"
    ON public.saved_contents
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_contents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_contents_updated_at
    BEFORE UPDATE ON public.saved_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_contents_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.saved_contents IS 'Stores user-saved/bookmarked blog content from generated jobs';
COMMENT ON COLUMN public.saved_contents.tags IS 'User-defined tags for organizing saved content';
COMMENT ON COLUMN public.saved_contents.notes IS 'Personal notes about the saved content';
COMMENT ON COLUMN public.saved_contents.is_favorite IS 'Flag to mark content as favorite for quick access';
