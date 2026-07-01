
export interface Author {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface User {
  email: string;
  name: string;
  password?: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  tech: string[];
  tags: string[];
  imageUrl?: string;
  category: string;
  type?: 'work' | 'blog' | 'page';
  link?: string;
  date: string;
  content: string;
  author: Author;
}

export interface Skill {
  name: string;
  level: number;
}
