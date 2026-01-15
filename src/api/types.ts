export interface Comment {
  id: number;
  author: string;
  text: string;
}

export interface Photo {
  id: number;
  src: string;
  likes: number;
  comments: Comment[];
  caption: string;
  tags: string[];
}
