import { useEffect, useState } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'board' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'content' }
  | { name: 'goals'; id?: string }
  | { name: 'settings' };

export const href = {
  today: '#/heute',
  board: '#/board',
  projects: '#/projekte',
  project: (id: string) => `#/projekte/${id}`,
  content: '#/content',
  goals: (id?: string) => (id ? `#/ziele/${id}` : '#/ziele'),
  settings: '#/einstellungen',
};

function parse(hash: string): Route {
  const [, section, id] = hash.replace(/^#/, '').split('/');
  switch (section) {
    case 'board':
      return { name: 'board' };
    case 'projekte':
      return id ? { name: 'project', id } : { name: 'projects' };
    case 'content':
      return { name: 'content' };
    case 'ziele':
      return { name: 'goals', id };
    case 'einstellungen':
      return { name: 'settings' };
    default:
      return { name: 'today' };
  }
}

export function useRoute(): Route {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parse(hash);
}

export const go = (to: string) => {
  location.hash = to;
};
