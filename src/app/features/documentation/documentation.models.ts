export interface DocEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  tag: string;
  auth: 'JWT Bearer' | 'Token de Acceso' | 'Público' | 'Multipart / JWT';
  desc: string;
  payload?: string;
  response?: string;
  expanded?: boolean;
}

export interface DocCategory {
  name: string;
  icon: string;
  count: number;
}

export interface DocEventType {
  value: string;
  label: string;
  description: string;
}

export interface DocAccessRole {
  role: string;
  permissions: string;
  useCase: string;
}

export interface DocMemberPermission {
  permission: string;
  description: string;
}
