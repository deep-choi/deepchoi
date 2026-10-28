
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
  slug?: string;
  title: string;
  subtitle?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  seoKeywords?: string[];
  noIndex?: boolean;
  tech: string[];
  tags: string[];
  imageUrl?: string;
  category: string;
  type?: 'work' | 'blog' | 'page';
  /** Also list this entry under the other content type, with its own category there. */
  secondaryType?: 'work' | 'blog' | null;
  secondaryCategory?: string | null;
  /** Visible to the admin only; hidden from lists, search engines and direct links. */
  isPrivate?: boolean;
  /** Admin-chosen position at the top of lists; entries without one follow by date. */
  pinOrder?: number | null;
  link?: string;
  date: string;
  content: string;
  author: Author;
}

export interface Skill {
  name: string;
  level: number;
}
