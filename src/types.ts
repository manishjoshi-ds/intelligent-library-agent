/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NodeData {
  id: string;
  name: string;
  department: string;
  x: number;
  y: number;
  restricted: boolean;
  description: string;
  zone: 'tech' | 'science' | 'humanities' | 'atrium' | 'archive' | 'services';
}

export interface EdgeData {
  source: string;
  target: string;
  distance: number;
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  shelf: string;
  department: string;
  available: boolean;
  priority: 1 | 2 | 3; // 1: High, 2: Med, 3: Low
  restricted: boolean;
  year?: number;
  callNumber: string;
}

export interface SearchNodeInfo {
  node: string;
  g: number;
  h: number;
  f: number;
  parent: string | null;
}

export interface StepSnapshot {
  stepNumber: number;
  currentNode: string;
  openList: SearchNodeInfo[];
  closedList: SearchNodeInfo[];
  actionNote: string;
}

export interface SearchResult {
  algorithm: 'BFS' | 'DFS' | 'A*';
  success: boolean;
  path: string[];
  totalCost: number;
  pathLengthEdges: number;
  nodesExpanded: number;
  snapshots: StepSnapshot[];
  message: string;
}

export interface RouteLeg {
  legIndex: number;
  fromNode: string;
  toNode: string;
  path: string[];
  distanceMeters: number;
  durationSeconds: number;
  legCost: number;
  booksCollected: BookData[];
}

export interface MultiBookPlan {
  success: boolean;
  startNode: string;
  checkoutNode: string;
  orderedShelves: string[];
  fullPath: string[];
  legs: RouteLeg[];
  collectedBooks: BookData[];
  skippedBooks: { book: BookData; reason: string }[];
  totalDistanceMeters: number;
  totalTransitSeconds: number;
  totalPickupSeconds: number;
  totalTimeSeconds: number;
  totalCost: number;
  message: string;
}

export const WALKING_SPEED_MPS = 1.2;
export const PICKUP_TIME_SECONDS = 45.0;
export const CROWD_MULTIPLIER = 2.5;

// Central University Library Catalog & Spatial Layout
export const LIBRARY_NODES: Record<string, NodeData> = {
  Entrance: {
    id: 'Entrance',
    name: 'Grand Atrium & Lobby',
    department: 'Main Concourse',
    x: 0,
    y: 0,
    restricted: false,
    description: 'Security gates, digital directory, and main circulation concourse.',
    zone: 'atrium',
  },
  Self_Checkout: {
    id: 'Self_Checkout',
    name: 'Self-Checkout & Returns',
    department: 'Circulation Services',
    x: 8,
    y: -4,
    restricted: false,
    description: 'RFID checkout kiosks, return chutes, and automated baggage drop.',
    zone: 'services',
  },
  Information_Desk: {
    id: 'Information_Desk',
    name: 'Information & Librarian Desk',
    department: 'Reference Support',
    x: 10,
    y: 5,
    restricted: false,
    description: 'Faculty assistance, inter-library loan desks, and catalog terminals.',
    zone: 'services',
  },
  Study_Commons: {
    id: 'Study_Commons',
    name: 'Central Study Commons',
    department: 'Quiet Study Area',
    x: 20,
    y: 15,
    restricted: false,
    description: 'Acoustic pods, communal reading tables, and skylit atrium connector.',
    zone: 'atrium',
  },
  Digital_Media_Lab: {
    id: 'Digital_Media_Lab',
    name: 'Digital Media & Audio Lab',
    department: 'Applied Technology',
    x: 35,
    y: 5,
    restricted: false,
    description: 'Audio production suites, microfiche scanners, and VR study stations.',
    zone: 'tech',
  },
  Fiction_Aisle_A: {
    id: 'Fiction_Aisle_A',
    name: 'Fiction Gallery (A-M)',
    department: 'World Literature',
    x: 5,
    y: 18,
    restricted: false,
    description: 'Classic literature, poetry, and dramatic texts from authors A through M.',
    zone: 'humanities',
  },
  Fiction_Aisle_B: {
    id: 'Fiction_Aisle_B',
    name: 'Fiction Gallery (N-Z)',
    department: 'World Literature',
    x: 15,
    y: 18,
    restricted: false,
    description: 'Contemporary prose, fiction, and translated texts from authors N through Z.',
    zone: 'humanities',
  },
  Periodicals_Journals: {
    id: 'Periodicals_Journals',
    name: 'Periodicals & Academics',
    department: 'Serial Publications',
    x: 2,
    y: 24,
    restricted: false,
    description: 'Current peer-reviewed scientific journals, magazines, and press prints.',
    zone: 'humanities',
  },
  Science_Wing: {
    id: 'Science_Wing',
    name: 'Natural Sciences & Physics',
    department: 'STEM Division',
    x: 25,
    y: 10,
    restricted: false,
    description: 'Physics, quantum mechanics, organic chemistry, and astrophysics.',
    zone: 'science',
  },
  Computer_Science: {
    id: 'Computer_Science',
    name: 'Computer Science & AI',
    department: 'STEM Division',
    x: 35,
    y: 15,
    restricted: false,
    description: 'Algorithms, neural networks, distributed systems, and robotics archives.',
    zone: 'tech',
  },
  Mathematics: {
    id: 'Mathematics',
    name: 'Mathematics & Statistics',
    department: 'STEM Division',
    x: 30,
    y: 25,
    restricted: false,
    description: 'Pure mathematics, probability theory, differential geometry, and logic.',
    zone: 'science',
  },
  History_Philosophy: {
    id: 'History_Philosophy',
    name: 'History & Moral Philosophy',
    department: 'Humanities Division',
    x: 10,
    y: 30,
    restricted: false,
    description: 'Ancient civilizations, ethical treatises, and historical memoirs.',
    zone: 'humanities',
  },
  Reference_Collection: {
    id: 'Reference_Collection',
    name: 'Reference & Lexicons',
    department: 'Specialized Reference',
    x: 20,
    y: 32,
    restricted: false,
    description: 'Topographic atlases, Oxford etymological indices, and encyclopedias.',
    zone: 'humanities',
  },
  Rare_Manuscripts: {
    id: 'Rare_Manuscripts',
    name: 'Special Collections (Rare)',
    department: 'Archival Vault',
    x: 38,
    y: 32,
    restricted: true,
    description: 'Hermetically sealed climate-controlled repository for historical manuscripts.',
    zone: 'archive',
  },
};

export const LIBRARY_EDGES: EdgeData[] = [
  { source: 'Entrance', target: 'Information_Desk', distance: 12.0 },
  { source: 'Entrance', target: 'Self_Checkout', distance: 10.0 },
  { source: 'Self_Checkout', target: 'Information_Desk', distance: 10.0 },
  { source: 'Information_Desk', target: 'Study_Commons', distance: 15.0 },
  { source: 'Information_Desk', target: 'Fiction_Aisle_A', distance: 16.0 },
  { source: 'Information_Desk', target: 'Digital_Media_Lab', distance: 26.0 },
  { source: 'Fiction_Aisle_A', target: 'Fiction_Aisle_B', distance: 11.0 },
  { source: 'Fiction_Aisle_A', target: 'Periodicals_Journals', distance: 8.0 },
  { source: 'Fiction_Aisle_B', target: 'Study_Commons', distance: 7.0 },
  { source: 'Fiction_Aisle_B', target: 'History_Philosophy', distance: 14.0 },
  { source: 'Study_Commons', target: 'Science_Wing', distance: 9.0 },
  { source: 'Study_Commons', target: 'Reference_Collection', distance: 18.0 },
  { source: 'Science_Wing', target: 'Computer_Science', distance: 12.0 },
  { source: 'Science_Wing', target: 'Digital_Media_Lab', distance: 13.0 },
  { source: 'Computer_Science', target: 'Mathematics', distance: 12.0 },
  { source: 'Computer_Science', target: 'Rare_Manuscripts', distance: 19.0 },
  { source: 'Mathematics', target: 'Reference_Collection', distance: 14.0 },
  { source: 'Reference_Collection', target: 'Rare_Manuscripts', distance: 20.0 },
  { source: 'Reference_Collection', target: 'History_Philosophy', distance: 12.0 },
  { source: 'History_Philosophy', target: 'Periodicals_Journals', distance: 11.0 },
];

export const LIBRARY_BOOKS: BookData[] = [
  {
    id: 'BK-101',
    title: 'Artificial Intelligence: A Modern Approach',
    author: 'Stuart Russell & Peter Norvig',
    shelf: 'Computer_Science',
    department: 'Computer Science',
    available: true,
    priority: 1,
    restricted: false,
    year: 2020,
    callNumber: 'QA 76.87 .R87',
  },
  {
    id: 'BK-102',
    title: 'Introduction to Algorithms (CLRS)',
    author: 'Cormen, Leiserson, Rivest & Stein',
    shelf: 'Computer_Science',
    department: 'Computer Science',
    available: true,
    priority: 1,
    restricted: false,
    year: 2022,
    callNumber: 'QA 76.6 .C662',
  },
  {
    id: 'BK-103',
    title: 'Deep Learning',
    author: 'Ian Goodfellow, Yoshua Bengio & Aaron Courville',
    shelf: 'Computer_Science',
    department: 'Computer Science',
    available: false,
    priority: 2,
    restricted: false,
    year: 2016,
    callNumber: 'QA 76.87 .G66',
  },
  {
    id: 'BK-104',
    title: 'The Feynman Lectures on Physics',
    author: 'Richard P. Feynman',
    shelf: 'Science_Wing',
    department: 'Physics',
    available: true,
    priority: 2,
    restricted: false,
    year: 2011,
    callNumber: 'QC 23 .F47',
  },
  {
    id: 'BK-105',
    title: 'Principles of Quantum Mechanics',
    author: 'R. Shankar',
    shelf: 'Science_Wing',
    department: 'Physics',
    available: true,
    priority: 1,
    restricted: false,
    year: 2014,
    callNumber: 'QC 174.12 .S52',
  },
  {
    id: 'BK-106',
    title: 'Linear Algebra Done Right',
    author: 'Sheldon Axler',
    shelf: 'Mathematics',
    department: 'Mathematics',
    available: true,
    priority: 2,
    restricted: false,
    year: 2024,
    callNumber: 'QA 184.2 .A95',
  },
  {
    id: 'BK-107',
    title: 'Topology from the Differentiable Viewpoint',
    author: 'John W. Milnor',
    shelf: 'Mathematics',
    department: 'Mathematics',
    available: true,
    priority: 3,
    restricted: false,
    year: 1997,
    callNumber: 'QA 611 .M54',
  },
  {
    id: 'BK-108',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    shelf: 'Fiction_Aisle_A',
    department: 'Literature',
    available: true,
    priority: 3,
    restricted: false,
    year: 1960,
    callNumber: 'PS 3562 .E353',
  },
  {
    id: 'BK-109',
    title: '1984',
    author: 'George Orwell',
    shelf: 'Fiction_Aisle_A',
    department: 'Literature',
    available: true,
    priority: 2,
    restricted: false,
    year: 1949,
    callNumber: 'PR 6029 .R8 N5',
  },
  {
    id: 'BK-110',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    shelf: 'Fiction_Aisle_B',
    department: 'Literature',
    available: true,
    priority: 3,
    restricted: false,
    year: 1925,
    callNumber: 'PS 3511 .I9 G7',
  },
  {
    id: 'BK-111',
    title: 'One Hundred Years of Solitude',
    author: 'Gabriel García Márquez',
    shelf: 'Fiction_Aisle_B',
    department: 'Literature',
    available: false,
    priority: 2,
    restricted: false,
    year: 1967,
    callNumber: 'PQ 8180.17 .A73',
  },
  {
    id: 'BK-112',
    title: 'A History of the World in 100 Objects',
    author: 'Neil MacGregor',
    shelf: 'History_Philosophy',
    department: 'History',
    available: true,
    priority: 2,
    restricted: false,
    year: 2011,
    callNumber: 'CB 69 .M33',
  },
  {
    id: 'BK-113',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    shelf: 'History_Philosophy',
    department: 'Philosophy',
    available: true,
    priority: 1,
    restricted: false,
    year: 180,
    callNumber: 'PA 3935 .A2',
  },
  {
    id: 'BK-114',
    title: 'Encyclopaedia Britannica Companion',
    author: 'Britannica Editorial Staff',
    shelf: 'Reference_Collection',
    department: 'Reference',
    available: true,
    priority: 3,
    restricted: false,
    year: 2019,
    callNumber: 'AE 5 .E363',
  },
  {
    id: 'BK-115',
    title: 'Oxford English Dictionary Etymology Index',
    author: 'Oxford University Press',
    shelf: 'Reference_Collection',
    department: 'Reference',
    available: true,
    priority: 2,
    restricted: false,
    year: 2021,
    callNumber: 'PE 1617 .M3 O9',
  },
  {
    id: 'BK-116',
    title: 'First Folio Facsimile (Shakespeare 1623)',
    author: 'William Shakespeare',
    shelf: 'Rare_Manuscripts',
    department: 'Archival Vault',
    available: true,
    priority: 1,
    restricted: true,
    year: 1623,
    callNumber: 'VAULT-SHAK-01',
  },
  {
    id: 'BK-117',
    title: "Newton's Principia Mathematica (1st Edition Notes)",
    author: 'Sir Isaac Newton',
    shelf: 'Rare_Manuscripts',
    department: 'Archival Vault',
    available: true,
    priority: 1,
    restricted: true,
    year: 1687,
    callNumber: 'VAULT-NEWT-87',
  },
  {
    id: 'BK-118',
    title: 'Nature: Weekly International Science Journal',
    author: 'Nature Publishing Group',
    shelf: 'Periodicals_Journals',
    department: 'Serials',
    available: true,
    priority: 2,
    restricted: false,
    year: 2026,
    callNumber: 'Q 1 .N2',
  },
  {
    id: 'BK-119',
    title: 'Communications of the ACM (Computing Frontiers)',
    author: 'ACM Editorial Board',
    shelf: 'Periodicals_Journals',
    department: 'Serials',
    available: true,
    priority: 3,
    restricted: false,
    year: 2026,
    callNumber: 'QA 75.5 .A14',
  },
  {
    id: 'BK-120',
    title: 'Modern Audio & Acoustic Engineering Handbook',
    author: 'Glen Ballou',
    shelf: 'Digital_Media_Lab',
    department: 'Acoustics',
    available: true,
    priority: 3,
    restricted: false,
    year: 2018,
    callNumber: 'TK 7881.4 .B35',
  },
];
