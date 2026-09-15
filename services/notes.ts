import { Category, Note } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const NOTES_KEY = 'college_notes_app_notes_v2';
const CATEGORIES_KEY = 'college_notes_app_categories_v2';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_physics',
    name: 'Physics',
    color: '#6366F1',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Quantum, mechanics & electromagnetism notes',
  },
  {
    id: 'cat_chem',
    name: 'Chemistry',
    color: '#10B981',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Organic reactions, formulas & lab experiments',
  },
  {
    id: 'cat_math',
    name: 'Calculus',
    color: '#F59E0B',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Multivariable calculus, linear algebra & proofs',
  },
  {
    id: 'cat_cs',
    name: 'Computer Science',
    color: '#3B82F6',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Algorithms, data structures & system architecture',
  },
  {
    id: 'cat_whiteboard',
    name: 'Whiteboards',
    color: '#EC4899',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Classroom whiteboard diagrams & lecture brainstorms',
  },
];

export const DEFAULT_NOTES: Note[] = [
  // ─── PHYSICS (6 photos) ───
  {
    id: 'phys_1',
    title: 'Kinematics & Projectile Motion Formulas',
    category_id: 'cat_physics',
    created_at: new Date().toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    content: `# Kinematics & Projectile Motion\n\n- Range: $$R = \\frac{v_0^2 \\sin(2\\theta)}{g}$$\n- Max Height: $$H = \\frac{v_0^2 \\sin^2(\\theta)}{2g}$$\n- Time of Flight: $$T = \\frac{2v_0 \\sin(\\theta)}{g}$$`,
  },
  {
    id: 'phys_2',
    title: 'Thermodynamics & Carnot Engine Cycle',
    category_id: 'cat_physics',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    content: `# Thermodynamics Notes\n\n$$\\Delta U = Q - W$$\nEfficiency: $$\\eta = 1 - \\frac{T_C}{T_H}$$`,
  },
  {
    id: 'phys_3',
    title: 'Quantum Wavefunctions & Particle in a Box',
    category_id: 'cat_physics',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    content: `# Quantum Mechanics\n\nSchrodinger Equation: $$\\hat{H}\\psi = E\\psi$$`,
  },
  {
    id: 'phys_4',
    title: 'Electromagnetic Maxwell Equations',
    category_id: 'cat_physics',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    content: `# Electromagnetism\n\n$$\\nabla \\cdot E = \\frac{\\rho}{\\varepsilon_0}$$\n$$\\nabla \\times B = \\mu_0 J + \\mu_0\\varepsilon_0 \\frac{\\partial E}{\\partial t}$$`,
  },
  {
    id: 'phys_5',
    title: 'Optics & Snell Law Refraction',
    category_id: 'cat_physics',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    content: `# Optics\n\n$$n_1 \\sin(\\theta_1) = n_2 \\sin(\\theta_2)$$`,
  },
  {
    id: 'phys_6',
    title: 'Rotational Dynamics & Angular Momentum',
    category_id: 'cat_physics',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop&q=80',
    content: `# Rotational Mechanics\n\n$$L = I\\omega$$\n$$\\tau = I\\alpha$$`,
  },

  // ─── CHEMISTRY (6 photos) ───
  {
    id: 'chem_1',
    title: 'Benzene Ring Nucleophilic Substitution',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    content: `# Organic Chemistry - Aromatic Mechanisms\n\nElectrophilic Aromatic Substitution (EAS) steps and ortho/para directors.`,
  },
  {
    id: 'chem_2',
    title: 'DNA Replication & Polymerase Stages',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80',
    content: `# Biochemistry\n\nHelicase, Primase, and DNA Polymerase III elongation steps.`,
  },
  {
    id: 'chem_3',
    title: 'Titration Curve & Acid-Base Equilibrium',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1603555501671-8f96b3fce8b4?w=800&auto=format&fit=crop&q=80',
    content: `# Analytical Chemistry\n\nHenderson-Hasselbalch: $$pH = pKa + \\log\\frac{[A^-]}{[HA]}$$`,
  },
  {
    id: 'chem_4',
    title: 'Reaction Kinetics & Arrhenius Equation',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80',
    content: `# Physical Chemistry\n\n$$k = A e^{-E_a / (RT)}$$`,
  },
  {
    id: 'chem_5',
    title: 'Orbital Hybridization sp3 & sp2',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop&q=80',
    content: `# Molecular Geometry\n\nTetrahedral, trigonal planar and linear structures.`,
  },
  {
    id: 'chem_6',
    title: 'Spectroscopy IR & NMR Peaks Guide',
    category_id: 'cat_chem',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=800&auto=format&fit=crop&q=80',
    content: `# Spectroscopy\n\nCarbonyl peak: 1715 cm^-1. Alcohol broad O-H: 3300 cm^-1.`,
  },

  // ─── CALCULUS (6 photos) ───
  {
    id: 'math_1',
    title: 'Taylor Series & Fourier Expansion Lecture',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1635070041409-e63e783ee3c1?w=800&auto=format&fit=crop&q=80',
    content: `# Calculus III\n\n$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n$$`,
  },
  {
    id: 'math_2',
    title: 'Eigenvalues & Diagonalization Matrices',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    content: `# Linear Algebra\n\nCharacteristic equation: $$\\det(A - \\lambda I) = 0$$`,
  },
  {
    id: 'math_3',
    title: 'Stokes Theorem & Line Integrals',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800&auto=format&fit=crop&q=80',
    content: `# Vector Calculus\n\n$$\\oint_C F \\cdot dr = \\iint_S (\\nabla \\times F) \\cdot dS$$`,
  },
  {
    id: 'math_4',
    title: 'Differential Equations & Laplace Transform',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80',
    content: `# ODEs\n\n$$\\mathcal{L}\\{f(t)\\} = \\int_0^\\infty e^{-st} f(t) dt$$`,
  },
  {
    id: 'math_5',
    title: 'Integration by Parts & Trig Substitution',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1635070041409-e63e783ee3c1?w=800&auto=format&fit=crop&q=80',
    content: `# Integration Techniques\n\n$$\\int u \\, dv = uv - \\int v \\, du$$`,
  },
  {
    id: 'math_6',
    title: 'Partial Derivatives & Gradient Descent',
    category_id: 'cat_math',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    content: `# Optimization\n\n$$\\nabla f(x, y) = \\left\\langle \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right\\rangle$$`,
  },

  // ─── WHITEBOARDS (6 photos) ───
  {
    id: 'wb_1',
    title: 'Circuit Design & Kirchhoff Laws Whiteboard',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80',
    content: `# Circuits\n\nKirchhoff Current Law & Voltage Law node equations.`,
  },
  {
    id: 'wb_2',
    title: 'Database Schema ER Diagram Whiteboard',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    content: `# Database Design\n\nForeign keys, 1-to-many relationships and normalization (3NF).`,
  },
  {
    id: 'wb_3',
    title: 'System Architecture & Microservices Whiteboard',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
    content: `# Distributed Systems\n\nAPI Gateway, Auth service, and message queue architecture.`,
  },
  {
    id: 'wb_4',
    title: 'Neural Network Forward Propagation Diagram',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
    content: `# Machine Learning\n\n$$z = Wx + b$$, $$\\hat{y} = \\sigma(z)$$. Backpropagation equations.`,
  },
  {
    id: 'wb_5',
    title: 'Compiler AST Syntax Tree Whiteboard',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80',
    content: `# Compilers\n\nLexing, parsing, and abstract syntax tree generation.`,
  },
  {
    id: 'wb_6',
    title: 'Operating System Virtual Memory Page Table',
    category_id: 'cat_whiteboard',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    status: 'completed',
    image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    content: `# Operating Systems\n\nTLB lookup, page fault handling, and LRU page replacement algorithm.`,
  },
];

export const getNote = async (id: string): Promise<Note | undefined> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const notes: Note[] = raw ? JSON.parse(raw) : DEFAULT_NOTES;
    return notes.find((n) => n.id === id);
  } catch (error) {
    console.error('Error getting note:', error);
    return DEFAULT_NOTES.find((n) => n.id === id);
  }
};

export const saveNote = async (content: string, title: string = 'New Note'): Promise<Note> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [...DEFAULT_NOTES];

    const newNote: Note = {
      id: uuid.v4().toString(),
      title,
      content,
      created_at: new Date().toISOString(),
      status: 'completed',
    };

    notes.unshift(newNote);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return newNote;
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(DEFAULT_NOTES));
      return DEFAULT_NOTES;
    }
    const parsed: Note[] = JSON.parse(raw);
    if (parsed.length === 0) {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(DEFAULT_NOTES));
      return DEFAULT_NOTES;
    }
    return parsed;
  } catch (error) {
    console.error('Error getting notes:', error);
    return DEFAULT_NOTES;
  }
};

export const deleteNote = async (id: string) => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [...DEFAULT_NOTES];
    notes = notes.filter((n) => n.id !== id);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

export const createProcessingNote = async (
  imageUri: string,
  initialTitle?: string,
  initialContent?: string
): Promise<Note> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [...DEFAULT_NOTES];

    const newNote: Note = {
      id: uuid.v4().toString(),
      title: initialTitle || 'Class Lecture Note',
      content: initialContent || 'Analyzing extracted lecture formulas...',
      created_at: new Date().toISOString(),
      status: 'processing',
      image_url: imageUri,
    };

    notes.unshift(newNote);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return newNote;
  } catch (error) {
    console.error('Error creating processing note:', error);
    throw error;
  }
};

export const updateNote = async (id: string, updates: Partial<Note>): Promise<Note | null> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [...DEFAULT_NOTES];
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) return null;

    notes[index] = { ...notes[index], ...updates };
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return notes[index];
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    const parsed: Category[] = JSON.parse(raw);
    if (parsed.length === 0) {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return parsed;
  } catch (error) {
    console.error('Error getting categories:', error);
    return DEFAULT_CATEGORIES;
  }
};

export const saveCategory = async (
  category: Omit<Category, 'id' | 'created_at'> & { id?: string }
): Promise<Category> => {
  try {
    const existing = await getCategories();

    if (!category.id) {
      const duplicate = existing.find(
        (c) => c.name.toLowerCase() === category.name.toLowerCase()
      );
      if (duplicate) return duplicate;
    }

    const newCategory: Category = {
      ...category,
      id: category.id || uuid.v4().toString(),
      color: category.color || '#FBBF24',
      created_at: new Date().toISOString(),
    };

    if (category.id) {
      const index = existing.findIndex((c) => c.id === category.id);
      if (index !== -1) existing[index] = newCategory;
      else existing.push(newCategory);
    } else {
      existing.push(newCategory);
    }

    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(existing));
    return newCategory;
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};
