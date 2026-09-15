export interface Note {
    id: string;
    title: string;
    content: string; // Markdown or structured JSON
    category_id?: string;
    created_at: string;
    image_url?: string; // Local or remote URL
    summary?: string;
    status: 'processing' | 'completed' | 'failed';
    tags?: string[];
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    color: string;
    created_at: string;
}

export interface Profile {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    website?: string;
    updated_at: string;
}

export interface ProcessingStatus {
    status: 'idle' | 'scanning' | 'analyzing' | 'generating' | 'completed' | 'error';
    message?: string;
}
