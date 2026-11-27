import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { EventTutorialService, TutorialSectionKey, TutorialSectionMeta } from '../../core/event-tutorial.service';

@Component({
  selector: '[app-new-sidebar]',
  templateUrl: './new-sidebar.component.html'
})
export class NewSidebarComponent {
  showTutorialSections = false;

  constructor(
    public auth: AuthService,
    public tutorialService: EventTutorialService,
    private router: Router
  ) {}

  get availableTutorialSections(): TutorialSectionMeta[] {
    if (!this.tutorialService.activeEventId) {
      return this.tutorialService.sections;
    }
    return this.tutorialService.sections.filter(sec =>
      this.tutorialService.allowedSections.includes(sec.key)
    );
  }

  getActiveTutorialBadge(): string | null {
    return this.tutorialService.getActiveBadgeForUrl(this.router.url);
  }

  toggleTutorialSections(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.showTutorialSections = !this.showTutorialSections;
  }

  startInteractiveTutorial(section?: TutorialSectionKey): void {
    this.showTutorialSections = false;
    this.tutorialService.triggerFromSidebar(section);
  }

  getActiveEventId(): string | null {
    const url = this.router.url;
    const match = url.match(/\/new\/events\/([a-f0-9]{24})/i);
    return match ? match[1] : null;
  }

  isLogsActive(): boolean {
    return this.router.url.includes('tab=logs');
  }

  navigateToLogs(): void {
    const eventId = this.getActiveEventId();
    if (eventId) {
      this.router.navigate(['/new/events', eventId], { queryParams: { tab: 'logs' } });
    } else {
      this.router.navigate(['/new/events']);
    }
  }

  isGuideActive(): boolean {
    return this.router.url.includes('tab=guide') || this.router.url.includes('/new/guia');
  }

  navigateToGuide(): void {
    const eventId = this.getActiveEventId();
    if (eventId) {
      this.router.navigate(['/new/events', eventId], { queryParams: { tab: 'guide' } });
    } else {
      this.router.navigate(['/new/guia']);
    }
  }
}
