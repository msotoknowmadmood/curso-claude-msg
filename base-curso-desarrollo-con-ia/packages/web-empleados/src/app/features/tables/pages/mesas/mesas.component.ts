import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { TABLE_STATUSES, Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses = TABLE_STATUSES;

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  onStatusChange(table: Table, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId && status !== table.status) {
      this.tableStore.changeStatus(restaurantId, table.id, status);
    }
  }

  getStatusClass(status: TableStatus): string {
    return `status-badge status-${status}`;
  }
}
