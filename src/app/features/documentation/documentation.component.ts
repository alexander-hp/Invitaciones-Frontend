import { Component, Input, OnInit } from '@angular/core';
import { DocEndpoint, DocCategory, DocEventType, DocAccessRole, DocMemberPermission } from './documentation.models';
import {
  DOC_ENDPOINTS,
  DOC_CATEGORY_ICONS,
  DOC_EVENT_TYPES,
  DOC_ACCESS_ROLES,
  DOC_MEMBER_PERMISSIONS
} from './documentation-data';

@Component({
  selector: 'app-documentation',
  templateUrl: './documentation.component.html'
})
export class DocumentationComponent implements OnInit {
  @Input() embedded = false;
  sidebarOpen = false;

  activeView: 'endpoints' | 'guide' | 'reference' = 'endpoints';

  endpoints: DocEndpoint[] = [];
  filteredEndpoints: DocEndpoint[] = [];
  categories: DocCategory[] = [];
  selectedCategory = 'all';

  searchQuery = '';
  methodFilter = '';
  authFilter = '';

  categoryIcons = DOC_CATEGORY_ICONS;
  eventTypes = DOC_EVENT_TYPES;
  accessRoles = DOC_ACCESS_ROLES;
  memberPermissions = DOC_MEMBER_PERMISSIONS;

  // Code snippets for Integration Guide
  step1Curl = `curl -X POST https://tu-dominio.com/api/events/{eventId}/access-links \\
  -H "Authorization: Bearer <tu-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{ "role": "integration_api", "label": "Mi Web Oficial", "days": 90 }'`;

  step2Curl = `curl https://tu-dominio.com/api/external/{portalSlug}/config`;

  step3Curl = `curl -X POST https://tu-dominio.com/api/external/{portalSlug}/guest/identify \\
  -H "Content-Type: application/json" \\
  -d '{ "email": "invitado@email.com" }'`;

  step4Curl = `curl -X POST https://tu-dominio.com/api/external/{portalSlug}/rsvp \\
  -H "Content-Type: application/json" \\
  -d '{
    "guest": "<guestId>",
    "name": "Carlos Mendoza",
    "response": "confirmed",
    "companions": 1,
    "companionNames": ["Sofía Pérez"]
  }'`;

  step5Iframe = `<!-- Widget RSVP Embebido -->
<iframe src="https://tu-dominio.com/embed/{portalSlug}/rsvp" width="100%" height="720" style="border:0"></iframe>

<!-- Widget Álbum Colaborativo -->
<iframe src="https://tu-dominio.com/embed/{portalSlug}/album" width="100%" height="720" style="border:0"></iframe>

<!-- Widget Mapa de Ubicaciones -->
<iframe src="https://tu-dominio.com/embed/{portalSlug}/map" width="100%" height="480" style="border:0"></iframe>`;

  // Floating Toast
  toastMessage = '';
  private toastTimeout?: any;

  ngOnInit(): void {
    this.endpoints = DOC_ENDPOINTS.map(ep => ({ ...ep, expanded: false }));
    this.calculateCategories();
    this.applyFilters();
  }

  switchView(view: 'endpoints' | 'guide' | 'reference'): void {
    this.activeView = view;
  }

  calculateCategories(): void {
    const counts: Record<string, number> = {};
    this.endpoints.forEach(ep => {
      counts[ep.tag] = (counts[ep.tag] || 0) + 1;
    });

    this.categories = Object.keys(counts).map(cat => ({
      name: cat,
      icon: this.categoryIcons[cat] || '📁',
      count: counts[cat]
    }));
  }

  setCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    const method = this.methodFilter;
    const auth = this.authFilter;

    this.filteredEndpoints = this.endpoints.filter(ep => {
      const matchCat = this.selectedCategory === 'all' || ep.tag === this.selectedCategory;
      const matchMethod = !method || ep.method === method;
      const matchAuth = !auth || ep.auth === auth;

      let matchQuery = true;
      if (q) {
        matchQuery =
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.desc.toLowerCase().includes(q) ||
          ep.tag.toLowerCase().includes(q) ||
          ep.method.toLowerCase().includes(q);
      }

      return matchCat && matchMethod && matchAuth && matchQuery;
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.methodFilter = '';
    this.authFilter = '';
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim() !== '' ||
      this.methodFilter !== '' ||
      this.authFilter !== '' ||
      this.selectedCategory !== 'all'
    );
  }

  toggleEndpoint(ep: DocEndpoint): void {
    ep.expanded = !ep.expanded;
  }

  expandAll(): void {
    this.filteredEndpoints.forEach(ep => (ep.expanded = true));
  }

  collapseAll(): void {
    this.filteredEndpoints.forEach(ep => (ep.expanded = false));
  }

  copyPath(event: Event, path: string): void {
    event.stopPropagation();
    navigator.clipboard.writeText(path).then(() => {
      this.showToast(`Ruta copiada: ${path}`);
    });
  }

  copyCurl(event: Event, ep: DocEndpoint): void {
    event.stopPropagation();
    let curl = `curl -X ${ep.method} https://tu-dominio.com${ep.path}`;
    if (ep.auth.includes('JWT')) {
      curl += ` \\\n  -H "Authorization: Bearer <tu-jwt>"`;
    } else if (ep.auth.includes('Token')) {
      curl += ` \\\n  -H "X-Kyndra-Access-Token: <tu-token>"`;
    }
    curl += ` \\\n  -H "Content-Type: application/json"`;

    navigator.clipboard.writeText(curl).then(() => {
      this.showToast('Comando cURL copiado al portapapeles');
    });
  }

  copyJson(event: Event, jsonStr?: string, label: string = 'JSON'): void {
    event.stopPropagation();
    if (!jsonStr) return;
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.showToast(`${label} copiado al portapapeles`);
    });
  }

  copySnippet(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`${label} copiado al portapapeles`);
    });
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = '';
    }, 2400);
  }

  getAuthBadgeClass(auth: string): string {
    if (auth.includes('JWT')) return 'danger';
    if (auth.includes('Token')) return 'accent';
    if (auth.includes('Multipart')) return 'warning';
    return 'success';
  }

  getAuthIcon(auth: string): string {
    if (auth.includes('JWT')) return '🔒';
    if (auth.includes('Token')) return '🔑';
    if (auth.includes('Multipart')) return '📎';
    return '🌐';
  }
}
