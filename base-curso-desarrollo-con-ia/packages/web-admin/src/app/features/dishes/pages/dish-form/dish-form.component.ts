import { Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  fieldErrors = signal<Record<string, string>>({})

  @ViewChild('nameInput') private nameInputRef?: ElementRef<HTMLInputElement>
  @ViewChild('priceInput') private priceInputRef?: ElementRef<HTMLInputElement>
  @ViewChild('newIngredientSelect') private newIngredientSelectRef?: ElementRef<HTMLSelectElement>

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    const parentParamMap$ = this.route.parent?.paramMap ?? of(convertToParamMap({}))

    combineLatest([parentParamMap$, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams, params]) => {
        this.restaurantId = parentParams.get('restaurantId') ?? ''
        const id = params.get('id')

        if (this.restaurantId) {
          this.ingredientStore.loadByRestaurant(this.restaurantId)
        }

        this.fieldErrors.set({})

        if (id && this.restaurantId) {
          this.isEditing = true
          this.dishId = id
          this.loadDish()
        } else {
          this.isEditing = false
          this.dishId = null
          this.form = {
            name: '',
            description: null,
            price: 0,
            category: 'principal',
            available: true,
            ingredients: []
          }
        }
      })
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  addIngredient(): void {
    if (!this.newIngredientId || this.newIngredientQty <= 0) return
    const exists = this.form.ingredients.find(i => i.ingredientId === this.newIngredientId)
    if (exists) return

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.newIngredientId = ''
    this.newIngredientQty = 1
  }

  removeIngredient(ingredientId: string): void {
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    this.newIngredientSelectRef?.nativeElement.focus()
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  validate(): boolean {
    const errors: Record<string, string> = {}
    if (!this.form.name || this.form.name.trim() === '') {
      errors['name'] = 'El nombre del plato es obligatorio.'
    }
    if (!this.form.price || this.form.price <= 0) {
      errors['price'] = 'El precio debe ser mayor que 0.'
    }
    this.fieldErrors.set(errors)
    return Object.keys(errors).length === 0
  }

  private focusFirstInvalidField(): void {
    const errors = this.fieldErrors()
    if (errors['name']) {
      this.nameInputRef?.nativeElement.focus()
    } else if (errors['price']) {
      this.priceInputRef?.nativeElement.focus()
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    if (!this.validate()) {
      this.focusFirstInvalidField()
      return
    }
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
