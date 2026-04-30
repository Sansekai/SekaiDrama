// PineDrama API Types

export interface PineDramaCollection {
  collection_id: string;
  title: string;
  description: string | null;
  total_episodes: number;
  views: number;
  categories: string;
  tags: string[];
  is_limited_free: boolean;
  label_hot: boolean;
  label_new: boolean;
  cover: string;
}

export interface PineDramaResponse {
  has_more: boolean;
  cursor: string;
  collections: PineDramaCollection[];
}
