# Guía de Uso: Notificaciones Toast y Diálogos de Confirmación Estilizados

Esta documentación describe la implementación y uso de los dos sistemas de interfaz de usuario para avisos y confirmaciones en la aplicación:
1. **Diálogos de Confirmación Emergentes (`ConfirmDialogService`)**: Popups de fondo oscuro/cristal que reemplazan `window.confirm()`.
2. **Notificaciones Flotantes (Toasts)**: Avisos flotantes temporales en la esquina superior derecha (`.nw-toast-container`).

---

## 1. 🖤 Diálogos de Confirmación Estilizados (`ConfirmDialogService`)

El servicio `ConfirmDialogService` proporciona una alternativa elegante, profesional y responsive a las ventanas emergentes nativas del navegador (`window.confirm()`).

### 📁 Ubicación en el Código
- **Servicio**: `src/app/core/confirm-dialog.service.ts`
- **Componente Modal**: `src/app/core/confirm-dialog/confirm-dialog.component.ts`
- **Plantilla HTML**: `src/app/core/confirm-dialog/confirm-dialog.component.html`

### 🛠️ Cómo Utilizar en un Componente TypeScript

#### Paso 1: Importar e Inyectar el Servicio
```typescript
import { Component } from '@angular/core';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

@Component({
  selector: 'app-mi-componente',
  templateUrl: './mi-componente.component.html'
})
export class MiComponente {
  constructor(private confirmDialogService: ConfirmDialogService) {}
}
```

#### Paso 2: Invocar la Función `confirm()`
El método `.confirm()` recibe un objeto de opciones o una cadena de texto y devuelve una `Promise<boolean>`:

```typescript
// Ejemplo 1: Acción Peligrosa / Eliminación (Rojo / Danger)
this.confirmDialogService.confirm({
  title: 'Eliminar Nivel',
  message: '¿Estás seguro de eliminar el nivel "Segundo Piso"? Las mesas se moverán a Planta Baja.',
  confirmText: 'Sí, eliminar',
  cancelText: 'Cancelar',
  type: 'danger'
}).then((confirmed: boolean) => {
  if (confirmed) {
    this.ejecutarEliminacion();
  }
});

// Ejemplo 2: Advertencia / Limpieza (Amarillo / Warning)
this.confirmDialogService.confirm({
  title: 'Limpiar Asignaciones',
  message: '¿Deseas desasignar a los 15 invitados de sus mesas?',
  confirmText: 'Sí, desasignar',
  cancelText: 'Cancelar',
  type: 'warning'
}).then((confirmed: boolean) => {
  if (confirmed) {
    this.desasignarInvitados();
  }
});
```

### ⚙️ Propiedades del Objeto `ConfirmDialogOptions`
| Propiedad | Tipo | Descripción | Valor por Defecto |
| :--- | :--- | :--- | :--- |
| `title` | `string` | Título del encabezado del modal. | `'¿Confirmar acción?'` |
| `message` | `string` | Mensaje descriptivo de la acción. | `''` (Requerido) |
| `confirmText` | `string` | Texto del botón principal de confirmación. | `'Aceptar'` |
| `cancelText` | `string` | Texto del botón de cancelación. | `'Cancelar'` |
| `type` | `'danger' \| 'warning' \| 'info'` | Define el esquema cromático del botón de confirmación. | `'danger'` |
| `icon` | `string` | *(Opcional)* Emoji o icono personalizado. | `undefined` |

---

## 2. ✨ Notificaciones Flotantes (Toasts)

Las notificaciones flotantes permiten mostrar mensajes informativos o de éxito/error en la esquina superior derecha sin bloquear la interacción del usuario.

### 📁 Ubicación en el Código
- **Estilos CSS**: `src/styles/new-theme.css` (`.nw-toast-container`, `.nw-toast`, `.nw-toast.success`, `.nw-toast.error`, `.nw-toast-close`)

### 🛠️ Cómo Utilizar en la Plantilla HTML

Agrega el siguiente bloque al inicio de la plantilla `.html` de tu componente:

```html
<!-- 🌟 NOTIFICACIONES EMERGENTES FLOTANTES (TOASTS) 🌟 -->
<div class="nw-toast-container" *ngIf="message || error">
  <!-- Mensaje de Éxito -->
  <div *ngIf="message" class="nw-toast success">
    <span>✨ {{ message }}</span>
    <button type="button" class="nw-toast-close" (click)="message=''">✕</button>
  </div>

  <!-- Mensaje de Error -->
  <div *ngIf="error" class="nw-toast error">
    <span>⚠️ {{ error }}</span>
    <button type="button" class="nw-toast-close" (click)="error=''">✕</button>
  </div>
</div>
```

### 💻 Ejemplo de Uso en TypeScript

```typescript
export class MiComponente {
  message = '';
  error = '';

  mostrarExito(texto: string): void {
    this.message = texto;
    // Ocultar automáticamente después de 3.5 segundos
    setTimeout(() => this.message = '', 3500);
  }

  mostrarError(texto: string): void {
    this.error = texto;
    // Ocultar automáticamente después de 4 segundos
    setTimeout(() => this.error = '', 4000);
  }
}
```

---

## 🎨 Resumen de Estilos y Clases CSS (`new-theme.css`)

```css
/* Contenedor Fijo Flotante */
.nw-toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

/* Tarjeta Toast */
.nw-toast {
  pointer-events: auto;
  min-width: 280px;
  max-width: 420px;
  padding: 12px 18px;
  border-radius: var(--nw-radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  animation: nw-slideUp 0.25s var(--nw-ease);
}

.nw-toast.success {
  background: #ffffff;
  border: 1.5px solid var(--nw-success);
  color: var(--nw-success);
}

.nw-toast.error {
  background: #ffffff;
  border: 1.5px solid var(--nw-danger);
  color: var(--nw-danger);
}
```
