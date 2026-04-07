import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SearchComponent } from './search.component';
import { ApiService } from '../../services/api.service';
import { of } from 'rxjs';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getBooks', 'search', 'ask']);
    apiSpy.getBooks.and.returnValue(of({ books: [], totalChunks: 0 }));

    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [
        provideHttpClient(),
        provideAnimations(),
        { provide: ApiService, useValue: apiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to ask mode', () => {
    expect(component.mode()).toBe('ask');
  });

  it('should not submit when query is empty', () => {
    component.query = '';
    component.submit();
    expect(apiSpy.ask).not.toHaveBeenCalled();
    expect(apiSpy.search).not.toHaveBeenCalled();
  });

  it('should toggle book selection', () => {
    component.toggleBook('book-1', true);
    expect(component.selectedBookIds()).toContain('book-1');
    component.toggleBook('book-1', false);
    expect(component.selectedBookIds()).not.toContain('book-1');
  });
});
