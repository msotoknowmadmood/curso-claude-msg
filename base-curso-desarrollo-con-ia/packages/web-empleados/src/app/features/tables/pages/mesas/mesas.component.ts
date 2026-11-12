import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { OrderStore } from '../../../orders/store/order.store';
import { Order } from '../../../orders/models/order.model';
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
  readonly orderStore = inject(OrderStore);

  readonly statuses = TABLE_STATUSES;

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
      this.orderStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  onStatusChange(table: Table, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TableStatus;
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId && status !== table.status) {
      this.tableStore.changeStatus(restaurantId, table.id, status);
    }
  }

  ordersFor(table: Table): Order[] {
    return this.orderStore.orders().filter(order => order.tableId === table.id);
  }

  getItemStatusClass(status: string): string {
    return `badge badge-${status}`;
  }

  getStatusClass(status: TableStatus): string {
    return `status-badge status-${status}`;
  }
}
