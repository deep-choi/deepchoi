import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const liveOrigin = (process.env.PORTFOLIO_LIVE_ORIGIN || 'https://deepchoi.com').replace(/\/$/, '');

const defaultUsers = [
  {
    email: 'admin@example.com',
    name: 'Admin Choi',
    password: 'admin',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  },
  {
    email: 'cryingonion77@gmail.com',
    name: 'cryingonion77',
    password: 'google-login-user',
    role: 'admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=cryingonion77',
  },
];

const fallbackAuthor = {
  name: 'Choi',
  role: 'UI/UX Designer & Developer',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
};

const fetchJson = async (pathname) => {
  const response = await fetch(`${liveOrigin}${pathname}`, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${pathname}`);
  }

  return response.json();
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeAuthor = (author) => {
  if (!author) return fallbackAuthor;
  if (typeof author === 'string') {
    try {
      return normalizeAuthor(JSON.parse(author));
    } catch {
      return fallbackAuthor;
    }
  }

  return {
    name: author.name || fallbackAuthor.name,
    role: author.role || fallbackAuthor.role,
    avatarUrl: author.avatarUrl || fallbackAuthor.avatarUrl,
  };
};

const normalizeProject = (project) => ({
  id: String(project.id),
  title: project.title || '',
  subtitle: project.subtitle || '',
  description: project.description || '',
  tech: asArray(project.tech),
  tags: asArray(project.tags),
  imageUrl: project.imageUrl || '',
  category: project.category || 'UI UX',
  type: project.type || 'work',
  date: project.date || '',
  content: project.content || '',
  author: normalizeAuthor(project.author),
});

const normalizeComment = (comment) => ({
  id: String(comment.id),
  projectId: String(comment.projectId),
  content: comment.content || '',
  author: normalizeAuthor(comment.author),
  date: comment.date || new Date().toISOString(),
});

const readExistingUsers = async () => {
  try {
    const dbPath = path.join(rootDir, 'server', 'data', 'db.json');
    const db = JSON.parse(await readFile(dbPath, 'utf8'));
    return Array.isArray(db.users) && db.users.length > 0 ? db.users : defaultUsers;
  } catch {
    return defaultUsers;
  }
};

const sqlText = (value) => {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
};

const buildSql = (projects, comments, users) => {
  const lines = [
    'BEGIN TRANSACTION;',
    'DELETE FROM Comment;',
    'DELETE FROM Project;',
  ];

  for (const user of users) {
    lines.push(
      `INSERT OR IGNORE INTO User (email, name, password, role, avatarUrl) VALUES (${[
        user.email,
        user.name,
        user.password || '',
        user.role || 'user',
        user.avatarUrl || '',
      ].map(sqlText).join(', ')});`,
    );
  }

  for (const project of projects) {
    lines.push(
      `INSERT INTO Project (id, title, subtitle, description, tech, tags, imageUrl, category, type, date, content, author) VALUES (${[
        project.id,
        project.title,
        project.subtitle,
        project.description,
        JSON.stringify(project.tech),
        JSON.stringify(project.tags),
        project.imageUrl,
        project.category,
        project.type,
        project.date,
        project.content,
        JSON.stringify(project.author),
      ].map(sqlText).join(', ')});`,
    );
  }

  for (const comment of comments) {
    lines.push(
      `INSERT INTO Comment (id, projectId, content, author, date) VALUES (${[
        comment.id,
        comment.projectId,
        comment.content,
        JSON.stringify(comment.author),
        comment.date,
      ].map(sqlText).join(', ')});`,
    );
  }

  lines.push('COMMIT;');
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const summaries = await fetchJson('/api/projects');
  const projects = await Promise.all(
    summaries.map(async (project) => normalizeProject(await fetchJson(`/api/projects/${encodeURIComponent(project.id)}`))),
  );
  const comments = (
    await Promise.all(
      projects.map(async (project) => {
        try {
          return await fetchJson(`/api/comments/${encodeURIComponent(project.id)}`);
        } catch {
          return [];
        }
      }),
    )
  ).flat().map(normalizeComment);

  const users = await readExistingUsers();
  const sortedProjects = projects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const db = { projects: sortedProjects, users, comments };
  const generatedDir = path.join(rootDir, '.generated');

  await mkdir(path.join(rootDir, 'server', 'data'), { recursive: true });
  await mkdir(path.join(rootDir, 'data'), { recursive: true });
  await mkdir(generatedDir, { recursive: true });

  await writeFile(path.join(rootDir, 'server', 'data', 'db.json'), `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(rootDir, 'data', 'projects.ts'),
    `import { Project } from '../types';\n\nexport const PROJECTS: Project[] = ${JSON.stringify(sortedProjects, null, 2)};\n`,
    'utf8',
  );
  await writeFile(
    path.join(rootDir, 'local_projects.json'),
    `${JSON.stringify({ source: liveOrigin, syncedAt: new Date().toISOString(), projects: sortedProjects, comments }, null, 2)}\n`,
    'utf8',
  );
  await writeFile(path.join(generatedDir, 'live-data.sql'), buildSql(sortedProjects, comments, users), 'utf8');

  console.log(`Synced ${sortedProjects.length} projects and ${comments.length} comments from ${liveOrigin}`);
  console.log('Wrote server/data/db.json, data/projects.ts, local_projects.json, .generated/live-data.sql');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
