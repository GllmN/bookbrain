import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HistoryPanelComponent } from './history-panel.component';
import { HistorySession } from '../../../models/types';

const SESSION_ASK: HistorySession = {
  id: 'ask-1',
  type: 'ask',
  title: 'What is RAG?',
  createdAt: new Date().toISOString(),
  messages: [],
};

const SESSION_SEARCH: HistorySession = {
  id: 'search-1',
  type: 'search',
  title: 'machine learning',
  createdAt: new Date().toISOString(),
  searchResults: [],
  searchTook: 42,
};

describe('HistoryPanelComponent', () => {
  let fixture: ComponentFixture<HistoryPanelComponent>;
  let component: HistoryPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryPanelComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows empty hint when no sessions', () => {
    fixture.detectChanges();
    const hint = fixture.debugElement.query(By.css('.empty-hint'));
    expect(hint).toBeTruthy();
  });

  it('renders sessions grouped under "Today"', () => {
    fixture.componentRef.setInput('sessions', [SESSION_ASK, SESSION_SEARCH]);
    fixture.detectChanges();

    const labels = fixture.debugElement.queryAll(By.css('.group-label'));
    expect(labels.length).toBe(1);
    expect(labels[0].nativeElement.textContent.trim()).toBe('Today');

    const items = fixture.debugElement.queryAll(By.css('.session-item'));
    expect(items.length).toBe(2);
  });

  it('marks the active session', () => {
    fixture.componentRef.setInput('sessions', [SESSION_ASK]);
    fixture.componentRef.setInput('activeId', 'ask-1');
    fixture.detectChanges();

    const row = fixture.debugElement.query(By.css('.session-row'));
    expect(row.classes['active']).toBeTrue();
  });

  it('emits sessionSelected when clicking a session', () => {
    fixture.componentRef.setInput('sessions', [SESSION_ASK]);
    fixture.detectChanges();

    let emitted: string | undefined;
    component.sessionSelected.subscribe((id: string) => (emitted = id));

    const btn = fixture.debugElement.query(By.css('.session-item'));
    btn.nativeElement.click();

    expect(emitted).toBe('ask-1');
  });

  it('emits sessionDeleted when clicking delete button', () => {
    fixture.componentRef.setInput('sessions', [SESSION_ASK]);
    fixture.detectChanges();

    let emitted: string | undefined;
    component.sessionDeleted.subscribe((id: string) => (emitted = id));

    const btn = fixture.debugElement.query(By.css('.delete-btn'));
    btn.nativeElement.click();

    expect(emitted).toBe('ask-1');
  });

  it('emits newChat when clicking New button', () => {
    fixture.detectChanges();

    let emitted = false;
    component.newChat.subscribe(() => (emitted = true));

    const btn = fixture.debugElement.query(By.css('.new-btn'));
    btn.nativeElement.click();

    expect(emitted).toBeTrue();
  });

  it('shows clear-all button only when sessions exist', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.clear-btn'))).toBeNull();

    fixture.componentRef.setInput('sessions', [SESSION_ASK]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.clear-btn'))).toBeTruthy();
  });

  it('collapses and expands the panel', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.panel')).classes['collapsed']).toBeFalsy();

    const toggleBtn = fixture.debugElement.query(By.css('.panel-header button'));
    toggleBtn.nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.panel')).classes['collapsed']).toBeTrue();
    expect(fixture.debugElement.query(By.css('.sessions-list'))).toBeNull();
  });

  it('shows correct icon for ask vs search sessions', () => {
    fixture.componentRef.setInput('sessions', [SESSION_ASK, SESSION_SEARCH]);
    fixture.detectChanges();

    const icons = fixture.debugElement.queryAll(By.css('.session-icon'));
    expect(icons[0].nativeElement.textContent.trim()).toBe('chat_bubble_outline');
    expect(icons[1].nativeElement.textContent.trim()).toBe('search');
  });
});
