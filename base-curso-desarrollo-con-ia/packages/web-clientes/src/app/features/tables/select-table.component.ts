import { Component, inject, signal, computed } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-select-table',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elegir mesa</h1>
          <p>Indica cuántas personas sois y elige una mesa disponible</p>
        </div>
      </div>

      <form class="people-form card" (submit)="search($event)">
        <label for="people">¿Cuántas personas?</label>
        <input
          id="people"
          type="number"
          min="1"
          step="1"
          [value]="people()"
          (input)="onPeopleInput($any($event.target).value)"
        />
        <button type="submit" class="btn btn-primary" [disabled]="!validPeople() || loading()">
          Buscar mesas
        </button>
      </form>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state">
            <p>No hay mesas libres para {{ searchedPeople() }} persona(s) en este momento</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button
                type="button"
                class="table-card card"
                [class.selected]="selectedTableId() === table.id"
                (click)="select(table)"
              >
                <h3>Mesa {{ table.number }}</h3>
                <p class="capacity">Capacidad: {{ table.capacity }}</p>
                @if (table.description) {
                  <p class="description">{{ table.description }}</p>
                }
              </button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .people-form {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .people-form input {
      width: 90px;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-card {
      text-align: left;
      padding: 16px 20px;
      cursor: pointer;
      border: 2px solid var(--border-color);
      transition: all var(--transition);
    }
    .table-card:hover {
      border-color: var(--green-medium);
    }
    .table-card.selected {
      border-color: var(--green-light);
      background: var(--green-glow);
    }
    .table-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .capacity {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .description {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
    }
  `]
})
export class SelectTableComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly tableService = inject(TableService)

  protected readonly restaurantId = this.route.snapshot.paramMap.get('id')!

  readonly people = signal<number | null>(null)
  readonly tables = signal<Table[]>([])
  readonly selectedTableId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly searched = signal(false)
  readonly searchedPeople = signal<number | null>(null)
  readonly error = signal<string | null>(null)

  readonly validPeople = computed(() => {
    const p = this.people()
    return p !== null && Number.isInteger(p) && p >= 1
  })

  onPeopleInput(value: string): void {
    this.people.set(value === '' ? null : Number(value))
  }

  search(event?: Event): void {
    event?.preventDefault()
    const people = this.people()
    if (!this.validPeople() || people === null) return

    this.loading.set(true)
    this.error.set(null)
    this.selectedTableId.set(null)

    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPeople.set(people)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  select(table: Table): void {
    this.selectedTableId.set(table.id)
  }
}
