export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO string format
}

export interface Reactions {
  like: number;
  pray: number;
  claps: number;
  downlike: number;
}
