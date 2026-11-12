import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import type { TableStatus } from '../../models/table.model'

const ERROR_MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en este restaurante.',
  InvalidTableNumberError: 'El número de mesa debe ser un entero positivo.',
  InvalidTableCapacityError: 'La capacidad debe ser un entero positivo.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.',
  TableNotFoundError: 'La mesa no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

interface TableFormModel {
  number: number | null
  capacity: number | null
  description: string
  status: TableStatus
}

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  isEditing = false
  tableId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  form: TableFormModel = this.emptyForm()

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  private emptyForm(): TableFormModel {
    return { number: null, capacity: null, description: '', status: 'libre' }
  }

  ngOnInit(): void {
    const parentParamMap$ = this.route.parent?.paramMap ?? of(convertToParamMap({}))

    combineLatest([parentParamMap$, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams, params]) => {
        this.restaurantId = parentParams.get('restaurantId') ?? ''
        const id = params.get('id')

        if (id && this.restaurantId) {
          this.isEditing = true
          this.tableId = id
          this.loadTable()
        } else {
          this.isEditing = false
          this.tableId = null
          this.form = this.emptyForm()
        }
      })
  }

  private async loadTable(): Promise<void> {
    if (!this.tableId) return
    this.loading.set(true)
    try {
      const found = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId))
      this.form = {
        number: found.number,
        capacity: found.capacity,
        description: found.description ?? '',
        status: found.status
      }
    } catch (err: any) {
      this.error.set(this.toMessage(err, 'No se pudo cargar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }

  private toMessage(err: any, fallback: string): string {
    const code = err?.error?.error
    return ERROR_MESSAGES[code] ?? err?.error?.message ?? fallback
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.loading.set(true)
    try {
      const description = this.form.description.trim()
      const dto = {
        number: this.form.number as number,
        capacity: this.form.capacity as number,
        description: description === '' ? null : description,
        status: this.form.status
      }
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err: any) {
      this.error.set(this.toMessage(err, 'Error al guardar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }
}
