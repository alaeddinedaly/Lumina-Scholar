export enum Role {
  PROFESSOR = 'PROFESSOR',
  STUDENT = 'STUDENT',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

export interface TenantDto {
  id: string;
  name: string;
}

export interface CourseDto {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  professorId: string;
}

export interface DocumentDto {
  id: string;
  originalName: string;
  status: DocumentStatus;
  chunkCount: number;
  courseId: string;
  createdAt: Date;
}

export interface CitationDto {
  id: string;
  sourceFile: string;
  pageNumber: number;
  similarityScore: number;
  chunkText: string;
}

export interface MessageDto {
  id: string;
  sessionId: string;
  query: string;
  response: string;
  createdAt: Date;
  citations: CitationDto[];
}
